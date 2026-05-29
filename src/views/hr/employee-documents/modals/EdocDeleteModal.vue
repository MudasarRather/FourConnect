<template>
  <Teleport to="body">
    <transition name="edoc-del" appear>
      <div v-if="open" class="edoc-del-scrim" @click.self="onCancel">
        <!-- Floating particles drift behind the modal -->
        <div class="del-particles" aria-hidden="true">
          <span v-for="n in 14" :key="n" class="del-particle" :style="particleStyle(n)" />
        </div>

        <Motion as="div" class="edoc-del-modal" role="dialog" aria-modal="true"
          :initial="{ opacity: 0, y: 28, scale: 0.92, rotateX: -8 }"
          :animate="{ opacity: 1, y: 0, scale: 1, rotateX: 0 }"
          :exit="{ opacity: 0, y: 16, scale: 0.95 }"
          :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }"
        >
          <!-- Ambient: shifting crimson aurora + grid + scan line -->
          <div class="del-aurora" aria-hidden="true">
            <span class="aurora-orb a1" />
            <span class="aurora-orb a2" />
            <span class="aurora-orb a3" />
          </div>
          <div class="del-grid" aria-hidden="true" />
          <div class="del-scan" aria-hidden="true" />

          <!-- ═════════════════════════════════════════════════════════════
               HERO — danger badge + headline
               ═════════════════════════════════════════════════════════════ -->
          <header class="del-hero">
            <button class="del-close" @click="onCancel" aria-label="Close">
              <X :size="15" />
            </button>

            <Motion as="div" class="del-hero-row"
              :initial="{ y: -10, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
              :transition="{ duration: 0.5, delay: 0.08, ease: [0.16, 1, 0.3, 1] }"
            >
              <div class="del-hero-icon">
                <Trash2 :size="22" />
                <span class="icon-ring" />
                <span class="icon-pulse" />
                <span class="icon-glow" />
              </div>
              <div class="del-hero-text">
                <span class="del-eyebrow edoc-mono">
                  <span class="eye-dot" />
                  Permanent action · audit recorded
                </span>
                <h2 class="del-title">Delete this document?</h2>
                <p class="del-sub">
                  This soft-deletes the record from the active register.
                  An entry will be retained in the audit trail for compliance.
                </p>
              </div>
            </Motion>
          </header>

          <!-- ═════════════════════════════════════════════════════════════
               DOC PREVIEW — animated dissolve hint
               ═════════════════════════════════════════════════════════════ -->
          <Motion v-if="doc" as="div" class="del-preview-wrap"
            :initial="{ y: 14, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
            :transition="{ duration: 0.5, delay: 0.16, ease: [0.16, 1, 0.3, 1] }"
          >
            <div class="del-preview" :data-status="doc.verification_status || 'PENDING'">
              <div class="prev-icon">
                <component :is="catIcon" :size="18" />
                <span class="prev-icon-glow" />
              </div>
              <div class="prev-info">
                <div class="prev-row">
                  <span class="prev-title">{{ doc.title || 'Untitled document' }}</span>
                  <span class="prev-pill" :class="`is-${(doc.verification_status || 'PENDING').toLowerCase()}`">
                    {{ statusLabel }}
                  </span>
                </div>
                <div class="prev-meta edoc-mono">
                  <span class="prev-cat">{{ (doc.category || '').replace(/_/g, ' ') }}</span>
                  <span class="prev-sep">·</span>
                  <span class="prev-type">{{ (doc.doc_type || 'DOC').replace(/_/g, ' ') }}</span>
                </div>
                <div class="prev-emp">
                  <UserRound :size="11" />
                  <span class="prev-emp-name">{{ doc.employee_name || 'Unknown employee' }}</span>
                  <span v-if="doc.employee_code" class="prev-emp-code edoc-mono">{{ doc.employee_code }}</span>
                </div>
              </div>
              <span class="prev-shred" aria-hidden="true" />
            </div>
          </Motion>

          <!-- ═════════════════════════════════════════════════════════════
               REASON PICKER — category-aware
               ═════════════════════════════════════════════════════════════ -->
          <Motion as="section" class="del-section"
            :initial="{ y: 14, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
            :transition="{ duration: 0.45, delay: 0.24, ease: [0.16, 1, 0.3, 1] }"
          >
            <div class="del-section-head">
              <ScrollText :size="11" />
              <span>Reason for deletion</span>
              <span class="head-required">required</span>
            </div>
            <div class="reason-grid">
              <Motion as="button" type="button" v-for="(r, i) in reasons" :key="r.key"
                class="reason-card" :class="{ 'is-active': pickedReason === r.key }"
                :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
                :transition="{ duration: 0.32, delay: 0.30 + i * 0.04, ease: [0.16, 1, 0.3, 1] }"
                :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }"
                @click="pick(r.key)"
              >
                <span class="reason-tick">
                  <Check v-if="pickedReason === r.key" :size="11" />
                </span>
                <span class="reason-label">{{ r.label }}</span>
                <span class="reason-hint">{{ r.hint }}</span>
              </Motion>
            </div>
          </Motion>

          <!-- ═════════════════════════════════════════════════════════════
               NOTES — required when "OTHER"
               ═════════════════════════════════════════════════════════════ -->
          <Motion as="section" class="del-section"
            :initial="{ y: 14, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
            :transition="{ duration: 0.45, delay: 0.34, ease: [0.16, 1, 0.3, 1] }"
          >
            <div class="del-section-head">
              <NotebookPen :size="11" />
              <span>{{ pickedReason === 'OTHER' ? 'Describe the reason' : 'Additional notes' }}</span>
              <span v-if="pickedReason === 'OTHER'" class="head-required">required</span>
              <span v-else class="head-hint">optional</span>
            </div>
            <div class="notes-wrap">
              <textarea
                v-model.trim="notes"
                class="del-textarea"
                :placeholder="pickedReason === 'OTHER'
                  ? 'Explain why this document is being deleted…'
                  : 'Add any extra context for the audit log…'"
                :maxlength="1000"
                :rows="3"
              />
              <span class="notes-count edoc-mono">{{ notes.length }}/1000</span>
            </div>
          </Motion>

          <!-- ═════════════════════════════════════════════════════════════
               CONSEQUENCES — explicit, calm, factual
               ═════════════════════════════════════════════════════════════ -->
          <Motion as="section" class="del-section"
            :initial="{ y: 14, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
            :transition="{ duration: 0.45, delay: 0.42, ease: [0.16, 1, 0.3, 1] }"
          >
            <div class="del-section-head">
              <ShieldAlert :size="11" />
              <span>What will happen</span>
            </div>
            <ul class="del-conseq">
              <li><span class="cq-dot" /><span><strong>Removed</strong> from active document register, dashboards & counters.</span></li>
              <li><span class="cq-dot" /><span><strong>Audit entry</strong> recorded with your name, this reason & timestamp.</span></li>
              <li v-if="doc?.source === 'ONBOARDING'"><span class="cq-dot warn" /><span>The originating <strong>onboarding slot</strong> reverts to pending — employee may need to re-upload.</span></li>
              <li v-if="doc?.verification_status === 'VERIFIED'"><span class="cq-dot warn" /><span>This was a <strong>verified</strong> document. Verification will be lost.</span></li>
              <li v-if="doc?.has_file"><span class="cq-dot" /><span>The attached file remains in storage but is <strong>unlinked</strong> from this record.</span></li>
            </ul>
          </Motion>

          <!-- ═════════════════════════════════════════════════════════════
               TYPE-TO-CONFIRM
               ═════════════════════════════════════════════════════════════ -->
          <Motion as="section" class="del-section"
            :initial="{ y: 14, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
            :transition="{ duration: 0.45, delay: 0.5, ease: [0.16, 1, 0.3, 1] }"
          >
            <div class="del-section-head">
              <KeyRound :size="11" />
              <span>Type <code class="kbd">DELETE</code> to confirm</span>
            </div>
            <div class="confirm-wrap" :data-ok="confirmOk">
              <input
                v-model="confirmText"
                class="del-input"
                placeholder="DELETE"
                autocomplete="off"
                spellcheck="false"
                @keyup.enter="onConfirm"
              />
              <transition name="ok-tick">
                <span v-if="confirmOk" class="confirm-tick">
                  <CheckCircle2 :size="14" />
                </span>
              </transition>
            </div>
          </Motion>

          <!-- ═════════════════════════════════════════════════════════════
               FOOTER ACTIONS
               ═════════════════════════════════════════════════════════════ -->
          <footer class="del-foot">
            <Motion as="button" type="button" class="del-btn ghost"
              :whileHover="{ y: -1 }" :whileTap="{ scale: 0.96 }"
              :disabled="busy" @click="onCancel"
            >
              Cancel
            </Motion>
            <div class="foot-gap" />
            <Motion as="button" type="button" class="del-btn danger"
              :class="{ 'is-armed': canConfirm }"
              :disabled="!canConfirm || busy"
              :whileHover="canConfirm ? { y: -2 } : {}"
              :whileTap="canConfirm ? { scale: 0.96 } : {}"
              @click="onConfirm"
            >
              <Loader2 v-if="busy" :size="14" class="spin" />
              <Trash2 v-else :size="14" />
              <span>{{ busy ? 'Deleting…' : 'Delete document' }}</span>
              <span class="armed-flare" v-if="canConfirm && !busy" aria-hidden="true" />
            </Motion>
          </footer>
        </Motion>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  X, Trash2, ScrollText, NotebookPen, ShieldAlert, KeyRound, Check, CheckCircle2,
  Loader2, UserRound,
  IdCard, FileSignature, Award, ReceiptIndianRupee, Fingerprint, GraduationCap, ShieldCheck, FileText,
} from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  doc: { type: Object, default: null },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['cancel', 'confirm'])

// ─── Category-aware reason library ─────────────────────────────────────────
const COMMON_END = [
  { key: 'DUPLICATE',           label: 'Duplicate upload',          hint: 'Same document exists elsewhere' },
  { key: 'WRONG_EMPLOYEE',      label: 'Wrong employee mapping',    hint: 'Attached to the wrong person' },
  { key: 'REPLACED',            label: 'Replaced by newer version', hint: 'Superseded by a fresh upload' },
  { key: 'EMPLOYEE_REQUEST',    label: 'Employee request',          hint: 'Removed at the request of the employee' },
  { key: 'OTHER',               label: 'Other — explain below',     hint: 'Capture the context in notes' },
]

const REASONS_BY_CATEGORY = {
  KYC: [
    { key: 'INCORRECT_DOC',     label: 'Incorrect document',        hint: 'Wrong KYC artefact uploaded' },
    { key: 'INVALID_EXPIRED',   label: 'Document expired/invalid',  hint: 'No longer a valid identity proof' },
    { key: 'CONFIDENTIAL',      label: 'Redaction request',         hint: 'Sensitive PII must be removed' },
    { key: 'RECOLLECT',         label: 'Re-collect required',       hint: 'Compliance — must be gathered again' },
    ...COMMON_END,
  ],
  CONTRACT: [
    { key: 'SUPERSEDED',        label: 'Contract superseded',       hint: 'Replaced by a new agreement' },
    { key: 'WRONG_VERSION',     label: 'Wrong contract version',    hint: 'Earlier or unsigned draft attached' },
    { key: 'TERMINATED',        label: 'Agreement terminated',      hint: 'Contract is no longer in force' },
    { key: 'LEGAL_REISSUE',     label: 'Legal — re-issue required', hint: 'Counsel asked to re-execute' },
    ...COMMON_END,
  ],
  CERTIFICATE: [
    { key: 'INVALID_CERT',      label: 'Invalid certificate',       hint: 'Issuing body unverifiable' },
    { key: 'EXPIRED_CERT',      label: 'Expired / lapsed',          hint: 'Certification has lapsed' },
    { key: 'RECERTIFIED',       label: 'Re-certified version filed',hint: 'Renewed certificate uploaded separately' },
    ...COMMON_END,
  ],
  SALARY_SLIP: [
    { key: 'WRONG_PERIOD',      label: 'Wrong month / period',      hint: 'Slip is for the wrong pay cycle' },
    { key: 'WRONG_AMOUNT',      label: 'Wrong amount — regenerate', hint: 'Payroll value incorrect' },
    { key: 'PAYROLL_CORRECTION',label: 'Payroll correction',        hint: 'Adjustment processed; old slip invalid' },
    ...COMMON_END,
  ],
  EXPERIENCE_LETTER: [
    { key: 'LETTER_SUPERSEDED', label: 'Letter superseded',         hint: 'A newer letter has been issued' },
    { key: 'WRONG_CONTENT',     label: 'Wrong content / typo',      hint: 'Material error in the letter body' },
    { key: 'REISSUED',          label: 'Re-issued by HR',           hint: 'Corrected copy filed separately' },
    ...COMMON_END,
  ],
  ID_PROOF: [
    { key: 'NEW_ID',            label: 'Replaced by newer ID',      hint: 'A more recent ID is on file' },
    { key: 'LOST_INVALID',      label: 'Lost / invalid',            hint: 'No longer a valid identity proof' },
    ...COMMON_END,
  ],
  EDUCATION: [
    { key: 'INVALID_EDU',       label: 'Invalid certificate',       hint: 'Issuing institution unverifiable' },
    { key: 'REVERIFIED',        label: 'Re-verified version filed', hint: 'Newer attested copy uploaded' },
    ...COMMON_END,
  ],
  COMPLIANCE: [
    { key: 'NEWER_FILING',      label: 'Replaced by newer filing',  hint: 'A more recent return is on file' },
    { key: 'WRONG_PERIOD',      label: 'Wrong period',              hint: 'Belongs to a different cycle' },
    { key: 'RECOMPLIANCE',      label: 'Compliance re-run required',hint: 'Filing was rejected upstream' },
    ...COMMON_END,
  ],
}

const reasons = computed(() => REASONS_BY_CATEGORY[props.doc?.category] || COMMON_END)

const CAT_ICON = {
  KYC: IdCard, CONTRACT: FileSignature, CERTIFICATE: Award,
  SALARY_SLIP: ReceiptIndianRupee, EXPERIENCE_LETTER: ScrollText,
  ID_PROOF: Fingerprint, EDUCATION: GraduationCap, COMPLIANCE: ShieldCheck,
}
const catIcon = computed(() => CAT_ICON[props.doc?.category] || FileText)

const STATUS_LABEL = {
  PENDING: 'Pending', VERIFIED: 'Verified', REJECTED: 'Rejected',
  RESUBMIT_REQUIRED: 'Resubmit', EXPIRED: 'Expired',
}
const statusLabel = computed(() => STATUS_LABEL[props.doc?.verification_status] || 'Pending')

// ─── Local form state ──────────────────────────────────────────────────────
const pickedReason = ref(null)
const notes = ref('')
const confirmText = ref('')

const confirmOk = computed(() => confirmText.value.trim().toUpperCase() === 'DELETE')

const canConfirm = computed(() => {
  if (!pickedReason.value) return false
  if (pickedReason.value === 'OTHER' && !notes.value.trim()) return false
  if (!confirmOk.value) return false
  return true
})

const pick = (key) => { pickedReason.value = pickedReason.value === key ? null : key }

const reset = () => {
  pickedReason.value = null
  notes.value = ''
  confirmText.value = ''
}
watch(() => props.open, (v) => { if (v) reset() })

// Build the human-readable reason string sent to the audit trail.
const composedReason = computed(() => {
  if (!pickedReason.value) return ''
  const picked = reasons.value.find(r => r.key === pickedReason.value)
  const label = picked?.label || pickedReason.value
  const trimmed = notes.value.trim()
  if (pickedReason.value === 'OTHER') return trimmed || label
  return trimmed ? `${label} — ${trimmed}` : label
})

const onCancel = () => { if (!props.busy) emit('cancel') }
const onConfirm = () => {
  if (!canConfirm.value || props.busy) return
  emit('confirm', {
    reason: composedReason.value,
    reason_category: pickedReason.value,
  })
}

// ─── Particles — pseudo-random but deterministic per index ────────────────
const particleStyle = (n) => {
  const sx = (n * 53) % 100
  const sy = (n * 71) % 100
  const dur = 5 + ((n * 3) % 7)
  const delay = (n % 6) * 0.4
  const size = 3 + (n % 4)
  return {
    left: `${sx}%`, top: `${sy}%`,
    width: `${size}px`, height: `${size}px`,
    animationDuration: `${dur}s`,
    animationDelay: `${delay}s`,
  }
}
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════════════════════
   SCRIM
   ═══════════════════════════════════════════════════════════════════════════ */
.edoc-del-scrim {
  position: fixed; inset: 0; z-index: 1200;
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
  background:
    radial-gradient(60% 60% at 50% 40%, rgba(127, 29, 29, 0.42), transparent 65%),
    radial-gradient(80% 80% at 50% 50%, rgba(20, 6, 8, 0.65), rgba(0, 0, 0, 0.75));
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  perspective: 1400px;
}

/* Floating embers */
.del-particles { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.del-particle {
  position: absolute; border-radius: 50%;
  background: radial-gradient(circle, rgba(248, 113, 113, 0.85), rgba(248, 113, 113, 0));
  box-shadow: 0 0 12px rgba(248, 113, 113, 0.55);
  opacity: 0.7;
  animation: del-float-up linear infinite;
}
@keyframes del-float-up {
  0%   { transform: translate3d(0, 20vh, 0) scale(0.6); opacity: 0; }
  15%  { opacity: 0.7; }
  85%  { opacity: 0.7; }
  100% { transform: translate3d(40px, -120vh, 0) scale(1.2); opacity: 0; }
}

/* ═══════════════════════════════════════════════════════════════════════════
   MODAL SHELL
   ═══════════════════════════════════════════════════════════════════════════ */
.edoc-del-modal {
  position: relative;
  width: 560px; max-width: calc(100vw - 32px); max-height: calc(100vh - 48px);
  display: flex; flex-direction: column; gap: 18px;
  padding: 28px 28px 22px;
  border-radius: 24px;
  background:
    radial-gradient(120% 70% at 0% 0%, rgba(239, 68, 68, 0.10), transparent 55%),
    radial-gradient(90% 60% at 100% 100%, rgba(127, 29, 29, 0.18), transparent 60%),
    linear-gradient(180deg, rgba(20, 12, 12, 0.96), rgba(14, 10, 10, 0.96));
  border: 1px solid rgba(248, 113, 113, 0.28);
  box-shadow:
    0 60px 120px -40px rgba(0, 0, 0, 0.95),
    0 0 0 1px rgba(248, 113, 113, 0.04),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  overflow: hidden auto;
  isolation: isolate;
  scrollbar-width: thin;
  scrollbar-color: rgba(248, 113, 113, 0.3) transparent;
}
.edoc-del-modal::-webkit-scrollbar { width: 6px; }
.edoc-del-modal::-webkit-scrollbar-thumb { background: rgba(248, 113, 113, 0.28); border-radius: 3px; }

/* Crimson aurora */
.del-aurora { position: absolute; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
.del-aurora .aurora-orb { position: absolute; border-radius: 50%; filter: blur(70px); opacity: 0.55; }
.del-aurora .a1 {
  width: 340px; height: 340px; top: -130px; right: -120px;
  background: radial-gradient(circle, rgba(248, 113, 113, 0.55), transparent 70%);
  animation: del-orb-a 18s ease-in-out infinite;
}
.del-aurora .a2 {
  width: 280px; height: 280px; bottom: -100px; left: -90px;
  background: radial-gradient(circle, rgba(220, 38, 38, 0.45), transparent 70%);
  animation: del-orb-b 22s ease-in-out infinite;
}
.del-aurora .a3 {
  width: 220px; height: 220px; top: 50%; right: -60px;
  background: radial-gradient(circle, rgba(185, 28, 28, 0.30), transparent 70%);
  animation: del-orb-c 26s ease-in-out infinite;
}
@keyframes del-orb-a { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-30px,40px) scale(1.08); } }
@keyframes del-orb-b { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(35px,-25px) scale(1.10); } }
@keyframes del-orb-c { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-15px,18px) scale(0.94); } }

/* Faint dot grid */
.del-grid {
  position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background-image: radial-gradient(rgba(248, 113, 113, 0.08) 1px, transparent 1px);
  background-size: 22px 22px;
  mask-image: linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.15) 50%, transparent 90%);
  opacity: 0.65;
}

/* One-shot scan-line on mount */
.del-scan {
  position: absolute; inset: 0; pointer-events: none; z-index: 1; overflow: hidden;
}
.del-scan::after {
  content: ''; position: absolute; left: 0; right: 0; height: 80px;
  background: linear-gradient(180deg, transparent, rgba(248, 113, 113, 0.18), transparent);
  filter: blur(6px);
  animation: del-scan-sweep 1.6s 0.2s cubic-bezier(0.16,1,0.3,1) forwards;
  transform: translateY(-100%);
}
@keyframes del-scan-sweep {
  to { transform: translateY(calc(100vh)); opacity: 0; }
}

/* ═══════════════════════════════════════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════════════════════════════════════ */
.del-hero { position: relative; z-index: 2; padding-right: 36px; }
.del-close {
  position: absolute; top: -6px; right: -6px;
  display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px;
  background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(248, 113, 113, 0.22);
  color: #fca5a5; cursor: pointer;
  transition: transform .35s var(--edoc-spring), background .25s, border-color .25s, color .25s;
}
.del-close:hover {
  transform: rotate(90deg);
  background: rgba(239, 68, 68, 0.18); border-color: rgba(248, 113, 113, 0.5);
  color: #fecaca;
}

.del-hero-row { display: flex; align-items: flex-start; gap: 14px; }
.del-hero-icon {
  position: relative;
  display: grid; place-items: center;
  width: 52px; height: 52px; border-radius: 16px; flex-shrink: 0;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(127, 29, 29, 0.25));
  border: 1px solid rgba(248, 113, 113, 0.42);
  color: #fecaca;
  box-shadow: 0 10px 30px -10px rgba(239, 68, 68, 0.65);
}
.icon-ring {
  position: absolute; inset: -5px; border-radius: 19px; pointer-events: none;
  background:
    conic-gradient(from 0deg,
      transparent, rgba(248, 113, 113, 0.6), transparent 25%,
      transparent 50%, rgba(220, 38, 38, 0.6), transparent 75%);
  -webkit-mask: radial-gradient(transparent 56%, #000 58%);
          mask: radial-gradient(transparent 56%, #000 58%);
  animation: del-ring-rot 6s linear infinite;
  opacity: 0.85;
}
@keyframes del-ring-rot { to { transform: rotate(360deg); } }
.icon-pulse {
  position: absolute; inset: 0; border-radius: 16px; pointer-events: none;
  box-shadow: 0 0 0 0 rgba(248, 113, 113, 0.6);
  animation: del-pulse 2.2s ease-out infinite;
}
@keyframes del-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(248, 113, 113, 0.55); }
  70%  { box-shadow: 0 0 0 14px rgba(248, 113, 113, 0); }
  100% { box-shadow: 0 0 0 0 rgba(248, 113, 113, 0); }
}
.icon-glow {
  position: absolute; inset: -18px; border-radius: 30px; pointer-events: none;
  background: radial-gradient(circle, rgba(239, 68, 68, 0.30), transparent 65%);
  z-index: -1;
  animation: del-glow 3.6s ease-in-out infinite;
}
@keyframes del-glow {
  0%,100% { opacity: 0.6; transform: scale(1); }
  50%     { opacity: 1;   transform: scale(1.12); }
}

.del-hero-text { display: flex; flex-direction: column; gap: 5px; min-width: 0; flex: 1; }
.del-eyebrow {
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase;
  color: #fca5a5;
  width: max-content;
}
.eye-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #f87171; box-shadow: 0 0 8px rgba(248, 113, 113, 0.85);
  animation: del-eye-pulse 1.6s ease-in-out infinite;
}
@keyframes del-eye-pulse {
  0%,100% { opacity: 0.7; transform: scale(1); }
  50%     { opacity: 1;   transform: scale(1.45); }
}
.del-title {
  margin: 0;
  font-size: 22px; font-weight: 800; letter-spacing: -0.018em; line-height: 1.15;
  background: linear-gradient(135deg, #fff 0%, #fee2e2 60%, #fca5a5 100%);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
.del-sub {
  margin: 2px 0 0;
  font-size: 12.5px; line-height: 1.5;
  color: var(--hr-text-secondary, #c9c2b8);
}

/* ═══════════════════════════════════════════════════════════════════════════
   DOC PREVIEW
   ═══════════════════════════════════════════════════════════════════════════ */
.del-preview-wrap { position: relative; z-index: 2; }
.del-preview {
  position: relative;
  display: flex; align-items: center; gap: 14px;
  padding: 13px 14px; border-radius: 14px;
  background: linear-gradient(135deg, rgba(40, 20, 20, 0.65), rgba(28, 18, 18, 0.55));
  border: 1px solid rgba(248, 113, 113, 0.18);
  overflow: hidden;
}
.del-preview::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 2px;
  background: linear-gradient(180deg, #f87171, #dc2626);
  opacity: 0.85;
}
.prev-icon {
  position: relative;
  display: grid; place-items: center;
  width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.20), rgba(127, 29, 29, 0.20));
  border: 1px solid rgba(248, 113, 113, 0.30);
  color: #fecaca;
}
.prev-icon-glow {
  position: absolute; inset: -10px; border-radius: 22px; pointer-events: none;
  background: radial-gradient(circle, rgba(248, 113, 113, 0.24), transparent 65%);
  z-index: -1;
  animation: del-glow 3.4s ease-in-out infinite;
}
.prev-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.prev-row { display: flex; align-items: center; gap: 8px; }
.prev-title {
  font-size: 13.5px; font-weight: 700; color: #fef3c7;
  letter-spacing: -0.005em;
  word-break: break-word;
  flex: 1;
}
.prev-pill {
  display: inline-flex; padding: 2px 8px; border-radius: 999px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
  border: 1px solid;
}
.prev-pill.is-pending   { color: #fde68a; background: rgba(251, 191, 36, 0.14); border-color: rgba(251, 191, 36, 0.30); }
.prev-pill.is-verified  { color: #6ee7b7; background: rgba(16, 185, 129, 0.14); border-color: rgba(52, 211, 153, 0.30); }
.prev-pill.is-rejected  { color: #fca5a5; background: rgba(239, 68, 68, 0.16); border-color: rgba(248, 113, 113, 0.32); }
.prev-pill.is-resubmit_required { color: #fed7aa; background: rgba(251, 146, 60, 0.14); border-color: rgba(251, 146, 60, 0.32); }
.prev-pill.is-expired   { color: #fca5a5; background: rgba(239, 68, 68, 0.18); border-color: rgba(239, 68, 68, 0.35); }

.prev-meta {
  display: flex; align-items: center; gap: 6px;
  font-size: 10px; color: #cbb89e; letter-spacing: 0.03em; text-transform: uppercase;
}
.prev-sep { opacity: 0.5; }
.prev-emp {
  display: flex; align-items: center; gap: 6px;
  font-size: 11.5px; color: var(--hr-text-secondary, #d1c9bd);
}
.prev-emp > svg { color: #fca5a5; }
.prev-emp-name { font-weight: 600; }
.prev-emp-code { color: #b3a78f; font-size: 10.5px; }

/* Shred shimmer accent — subtle diagonal stripes that drift */
.prev-shred {
  position: absolute; right: 0; top: 0; bottom: 0; width: 80px; pointer-events: none;
  background:
    repeating-linear-gradient(115deg,
      transparent 0 8px,
      rgba(248, 113, 113, 0.06) 8px 16px);
  mask-image: linear-gradient(90deg, transparent, #000 80%);
  animation: del-shred-drift 14s linear infinite;
}
@keyframes del-shred-drift {
  from { background-position: 0 0; }
  to   { background-position: 100px 0; }
}

/* ═══════════════════════════════════════════════════════════════════════════
   SECTIONS
   ═══════════════════════════════════════════════════════════════════════════ */
.del-section { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 8px; }
.del-section-head {
  display: flex; align-items: center; gap: 6px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--hr-text-muted, #a08e75);
  padding-left: 2px;
}
.del-section-head > svg { color: #f87171; }
.head-required {
  margin-left: auto;
  font-size: 9px; font-weight: 800; letter-spacing: 0.08em;
  color: #fca5a5;
  padding: 2px 7px; border-radius: 999px;
  background: rgba(239, 68, 68, 0.16); border: 1px solid rgba(248, 113, 113, 0.30);
}
.head-hint { margin-left: auto; font-size: 10px; font-weight: 600; letter-spacing: 0; text-transform: none; color: var(--hr-text-muted, #a08e75); }
.del-section-head .kbd {
  display: inline-block; padding: 1px 5px; margin: 0 2px;
  font-family: 'SF Mono', 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px; font-weight: 800; letter-spacing: 0.05em;
  background: rgba(239, 68, 68, 0.20); color: #fee2e2;
  border: 1px solid rgba(248, 113, 113, 0.42);
  border-radius: 5px;
  text-transform: none;
}

/* Reason grid */
.reason-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
}
.reason-card {
  position: relative;
  display: flex; flex-direction: column; align-items: flex-start; gap: 4px;
  text-align: left;
  padding: 10px 12px 10px 34px; border-radius: 12px;
  background: linear-gradient(135deg, rgba(40, 20, 20, 0.4), rgba(28, 18, 18, 0.32));
  border: 1px solid rgba(248, 113, 113, 0.14);
  color: var(--hr-text);
  cursor: pointer;
  transition: border-color .25s, background .25s, transform .25s, box-shadow .25s;
}
.reason-card:hover {
  border-color: rgba(248, 113, 113, 0.32);
  background: linear-gradient(135deg, rgba(50, 24, 24, 0.55), rgba(35, 22, 22, 0.45));
}
.reason-card.is-active {
  border-color: rgba(248, 113, 113, 0.65);
  background: linear-gradient(135deg, rgba(127, 29, 29, 0.35), rgba(60, 22, 22, 0.45));
  box-shadow:
    0 8px 22px -10px rgba(239, 68, 68, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
}
.reason-tick {
  position: absolute; left: 10px; top: 12px;
  display: grid; place-items: center;
  width: 16px; height: 16px; border-radius: 5px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(248, 113, 113, 0.30);
  color: #fee2e2;
  transition: background .25s, border-color .25s;
}
.reason-card.is-active .reason-tick {
  background: linear-gradient(135deg, #f87171, #dc2626);
  border-color: #f87171;
  color: #fff;
}
.reason-label {
  font-size: 12px; font-weight: 700; color: #fef3c7; letter-spacing: -0.005em;
  line-height: 1.25;
}
.reason-card.is-active .reason-label { color: #fff; }
.reason-hint {
  font-size: 10.5px; line-height: 1.35; color: var(--hr-text-muted, #a08e75);
}
.reason-card.is-active .reason-hint { color: rgba(254, 226, 226, 0.85); }

/* Notes */
.notes-wrap { position: relative; }
.del-textarea {
  width: 100%; resize: vertical; min-height: 76px;
  padding: 10px 12px 22px; border-radius: 12px;
  background: rgba(20, 12, 12, 0.55);
  border: 1px solid rgba(248, 113, 113, 0.22);
  color: var(--hr-text); font-size: 12.5px; line-height: 1.5;
  font-family: inherit;
  outline: none;
  transition: border-color .25s, background .25s, box-shadow .25s;
}
.del-textarea::placeholder { color: var(--hr-text-muted, #a08e75); }
.del-textarea:focus {
  border-color: rgba(248, 113, 113, 0.55);
  background: rgba(28, 14, 14, 0.7);
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.10);
}
.notes-count {
  position: absolute; right: 10px; bottom: 8px;
  font-size: 9.5px; color: var(--hr-text-muted, #a08e75);
  pointer-events: none;
}

/* Consequences */
.del-conseq { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
.del-conseq li {
  display: flex; gap: 9px; align-items: flex-start;
  font-size: 12px; line-height: 1.5; color: var(--hr-text-secondary, #cdbfa9);
  padding: 9px 11px; border-radius: 10px;
  background: rgba(40, 20, 20, 0.32);
  border: 1px solid rgba(248, 113, 113, 0.10);
}
.del-conseq li strong { color: #fef3c7; font-weight: 700; }
.cq-dot {
  width: 6px; height: 6px; border-radius: 50%; margin-top: 6px;
  background: #f87171; box-shadow: 0 0 8px rgba(248, 113, 113, 0.55);
  flex-shrink: 0;
}
.cq-dot.warn { background: #fbbf24; box-shadow: 0 0 8px rgba(251, 191, 36, 0.55); }

/* Confirm input */
.confirm-wrap {
  position: relative;
  display: flex; align-items: center;
  padding: 2px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.18), rgba(127, 29, 29, 0.18));
  transition: background .3s, box-shadow .3s;
}
.confirm-wrap[data-ok="true"] {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.22), rgba(4, 120, 87, 0.22));
  box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.12);
}
.del-input {
  flex: 1;
  height: 40px; padding: 0 14px;
  border-radius: 10px;
  background: rgba(20, 12, 12, 0.7);
  border: 1px solid rgba(248, 113, 113, 0.28);
  color: #fef3c7; font-size: 13px; font-weight: 700; letter-spacing: 0.18em;
  font-family: 'SF Mono', 'JetBrains Mono', ui-monospace, monospace;
  text-transform: uppercase;
  outline: none;
  transition: border-color .25s, background .25s;
}
.del-input::placeholder { color: rgba(252, 165, 165, 0.45); letter-spacing: 0.18em; }
.confirm-wrap[data-ok="true"] .del-input {
  border-color: rgba(52, 211, 153, 0.5);
  background: rgba(6, 22, 18, 0.7);
  color: #d1fae5;
}
.confirm-tick {
  display: grid; place-items: center;
  width: 32px; height: 32px; border-radius: 9px; margin: 0 4px;
  background: linear-gradient(135deg, #34d399, #10b981);
  color: #06140f;
  box-shadow: 0 8px 18px -6px rgba(16, 185, 129, 0.55);
}
.ok-tick-enter-active { transition: transform .35s var(--edoc-spring), opacity .35s; }
.ok-tick-enter-from { opacity: 0; transform: scale(0.5) rotate(-20deg); }
.ok-tick-leave-active { transition: opacity .15s; }
.ok-tick-leave-to { opacity: 0; }

/* ═══════════════════════════════════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════════════════════════════════ */
.del-foot {
  position: relative; z-index: 2;
  display: flex; align-items: center; gap: 10px;
  padding-top: 12px;
  border-top: 1px solid rgba(248, 113, 113, 0.14);
}
.foot-gap { flex: 1; }
.del-btn {
  position: relative;
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  height: 40px; padding: 0 18px; border-radius: 12px;
  font-size: 12.5px; font-weight: 700; letter-spacing: 0.02em;
  cursor: pointer; overflow: hidden; isolation: isolate;
  transition: background .25s, border-color .25s, color .25s, box-shadow .25s, letter-spacing .3s, transform .25s;
}
.del-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.del-btn.ghost {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--hr-text-secondary);
}
.del-btn.ghost:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(248, 113, 113, 0.28);
  color: var(--hr-text);
}
.del-btn.danger {
  background: linear-gradient(135deg, rgba(127, 29, 29, 0.55), rgba(60, 14, 14, 0.55));
  border: 1px solid rgba(248, 113, 113, 0.28);
  color: #fca5a5;
}
.del-btn.danger.is-armed:not(:disabled) {
  background: linear-gradient(135deg, #fca5a5 0%, #f87171 35%, #dc2626 70%, #7f1d1d 100%);
  background-size: 200% 200%;
  border-color: rgba(220, 38, 38, 0.65);
  color: #fff;
  box-shadow:
    0 14px 32px -10px rgba(220, 38, 38, 0.75),
    inset 0 1px 0 rgba(255, 255, 255, 0.30),
    inset 0 -1px 0 rgba(127, 29, 29, 0.45);
  letter-spacing: 0.04em;
  animation: del-armed-pulse 2s ease-in-out infinite;
}
.del-btn.danger.is-armed:hover:not(:disabled) {
  background-position: 100% 0;
  box-shadow:
    0 18px 40px -10px rgba(220, 38, 38, 0.95),
    inset 0 1px 0 rgba(255, 255, 255, 0.40);
}
@keyframes del-armed-pulse {
  0%,100% { box-shadow: 0 14px 32px -10px rgba(220, 38, 38, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.30); }
  50%     { box-shadow: 0 14px 38px -8px  rgba(220, 38, 38, 0.95), inset 0 1px 0 rgba(255, 255, 255, 0.40); }
}
.armed-flare {
  position: absolute; inset: 0;
  background: linear-gradient(115deg, transparent 30%, rgba(255, 255, 255, 0.32) 50%, transparent 70%);
  transform: translateX(-110%);
  animation: del-flare 2.4s linear infinite;
  pointer-events: none;
}
@keyframes del-flare {
  0%   { transform: translateX(-120%); }
  50%  { transform: translateX(120%); }
  100% { transform: translateX(120%); }
}
.spin { animation: del-spin 0.9s linear infinite; }
@keyframes del-spin { to { transform: rotate(360deg); } }

/* ═══════════════════════════════════════════════════════════════════════════
   TRANSITION
   ═══════════════════════════════════════════════════════════════════════════ */
.edoc-del-enter-active { transition: opacity .35s var(--edoc-spring); }
.edoc-del-leave-active { transition: opacity .25s ease; }
.edoc-del-enter-from, .edoc-del-leave-to { opacity: 0; }

/* ═══════════════════════════════════════════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════════════════════════════════════════ */
@media (max-width: 640px) {
  .edoc-del-modal { padding: 22px 18px 18px; }
  .reason-grid { grid-template-columns: 1fr; }
  .del-title { font-size: 19px; }
}

/* ═══════════════════════════════════════════════════════════════════════════
   LIGHT THEME OVERRIDES
   ═══════════════════════════════════════════════════════════════════════════ */
[data-theme="light"] .edoc-del-scrim {
  background:
    radial-gradient(60% 60% at 50% 40%, rgba(220, 38, 38, 0.20), transparent 65%),
    radial-gradient(80% 80% at 50% 50%, rgba(60, 20, 20, 0.30), rgba(40, 14, 14, 0.40));
}
[data-theme="light"] .edoc-del-modal {
  background:
    radial-gradient(120% 70% at 0% 0%, rgba(239, 68, 68, 0.10), transparent 55%),
    radial-gradient(90% 60% at 100% 100%, rgba(220, 38, 38, 0.10), transparent 60%),
    rgba(255, 250, 240, 0.97);
  border-color: rgba(220, 38, 38, 0.30);
  box-shadow:
    0 60px 120px -40px rgba(127, 29, 29, 0.40),
    0 0 0 1px rgba(220, 38, 38, 0.06),
    inset 0 1px 0 rgba(255, 255, 255, 0.6);
}
[data-theme="light"] .del-aurora .aurora-orb { opacity: 0.32; }
[data-theme="light"] .del-grid {
  background-image: radial-gradient(rgba(220, 38, 38, 0.10) 1px, transparent 1px);
  opacity: 0.45;
}
[data-theme="light"] .del-close {
  background: rgba(255, 250, 240, 0.9); border-color: rgba(220, 38, 38, 0.24); color: #991b1b;
}
[data-theme="light"] .del-close:hover {
  background: rgba(239, 68, 68, 0.14); border-color: rgba(220, 38, 38, 0.55); color: #7f1d1d;
}
[data-theme="light"] .del-hero-icon {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.22), rgba(220, 38, 38, 0.16));
  color: #7f1d1d;
  border-color: rgba(220, 38, 38, 0.45);
}
[data-theme="light"] .del-eyebrow { color: #b91c1c; }
[data-theme="light"] .del-title {
  background: linear-gradient(135deg, #1a0e0e 0%, #7f1d1d 60%, #b91c1c 100%);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
[data-theme="light"] .del-sub { color: #6b5840; }

[data-theme="light"] .del-preview {
  background: linear-gradient(135deg, rgba(255, 244, 244, 0.94), rgba(255, 250, 240, 0.85));
  border-color: rgba(220, 38, 38, 0.22);
}
[data-theme="light"] .prev-icon {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.20), rgba(220, 38, 38, 0.12));
  border-color: rgba(220, 38, 38, 0.35);
  color: #7f1d1d;
}
[data-theme="light"] .prev-title { color: #1a0e0e; }
[data-theme="light"] .prev-meta { color: #6b5840; }
[data-theme="light"] .prev-emp { color: #4b3a2a; }
[data-theme="light"] .prev-emp > svg { color: #b91c1c; }
[data-theme="light"] .prev-emp-code { color: #8a7556; }
[data-theme="light"] .prev-pill.is-pending { color: #92400e; background: rgba(251, 191, 36, 0.22); border-color: rgba(180, 83, 9, 0.30); }
[data-theme="light"] .prev-pill.is-verified { color: #047857; background: rgba(16, 185, 129, 0.20); border-color: rgba(16, 185, 129, 0.35); }
[data-theme="light"] .prev-pill.is-rejected { color: #991b1b; background: rgba(239, 68, 68, 0.18); border-color: rgba(220, 38, 38, 0.40); }
[data-theme="light"] .prev-pill.is-resubmit_required { color: #9a3412; background: rgba(251, 146, 60, 0.20); border-color: rgba(234, 88, 12, 0.38); }
[data-theme="light"] .prev-pill.is-expired { color: #991b1b; background: rgba(239, 68, 68, 0.22); border-color: rgba(220, 38, 38, 0.45); }

[data-theme="light"] .del-section-head { color: #6b5840; }
[data-theme="light"] .del-section-head > svg { color: #b91c1c; }
[data-theme="light"] .head-required { color: #991b1b; background: rgba(239, 68, 68, 0.14); border-color: rgba(220, 38, 38, 0.32); }
[data-theme="light"] .head-hint { color: #8a7556; }
[data-theme="light"] .del-section-head .kbd {
  background: rgba(239, 68, 68, 0.16); color: #7f1d1d;
  border-color: rgba(220, 38, 38, 0.40);
}

[data-theme="light"] .reason-card {
  background: linear-gradient(135deg, rgba(255, 250, 240, 0.85), rgba(255, 244, 244, 0.65));
  border-color: rgba(220, 38, 38, 0.14);
}
[data-theme="light"] .reason-card:hover {
  background: linear-gradient(135deg, rgba(255, 244, 244, 0.95), rgba(254, 226, 226, 0.65));
  border-color: rgba(220, 38, 38, 0.32);
}
[data-theme="light"] .reason-card.is-active {
  background: linear-gradient(135deg, rgba(254, 202, 202, 0.55), rgba(252, 165, 165, 0.40));
  border-color: rgba(220, 38, 38, 0.55);
  box-shadow: 0 8px 22px -10px rgba(220, 38, 38, 0.50), inset 0 1px 0 rgba(255, 255, 255, 0.6);
}
[data-theme="light"] .reason-tick {
  background: rgba(255, 250, 240, 0.85); border-color: rgba(220, 38, 38, 0.32); color: #7f1d1d;
}
[data-theme="light"] .reason-label { color: #1a0e0e; }
[data-theme="light"] .reason-card.is-active .reason-label { color: #7f1d1d; }
[data-theme="light"] .reason-hint { color: #6b5840; }
[data-theme="light"] .reason-card.is-active .reason-hint { color: #7f1d1d; opacity: 0.9; }

[data-theme="light"] .del-textarea {
  background: rgba(255, 250, 240, 0.92);
  border-color: rgba(220, 38, 38, 0.22);
  color: #1a1410;
}
[data-theme="light"] .del-textarea::placeholder { color: #a8895c; }
[data-theme="light"] .del-textarea:focus {
  background: rgba(255, 244, 244, 0.95);
  border-color: rgba(220, 38, 38, 0.55);
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.08);
}
[data-theme="light"] .notes-count { color: #8a7556; }

[data-theme="light"] .del-conseq li {
  background: rgba(255, 250, 240, 0.7);
  border-color: rgba(220, 38, 38, 0.12);
  color: #4b3a2a;
}
[data-theme="light"] .del-conseq li strong { color: #1a0e0e; }

[data-theme="light"] .del-input {
  background: rgba(255, 250, 240, 0.95);
  border-color: rgba(220, 38, 38, 0.30);
  color: #7f1d1d;
}
[data-theme="light"] .del-input::placeholder { color: rgba(127, 29, 29, 0.45); }
[data-theme="light"] .confirm-wrap[data-ok="true"] .del-input {
  background: rgba(220, 252, 231, 0.7);
  border-color: rgba(16, 185, 129, 0.55);
  color: #065f46;
}

[data-theme="light"] .del-foot { border-top-color: rgba(220, 38, 38, 0.14); }
[data-theme="light"] .del-btn.ghost {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(120, 53, 15, 0.18);
  color: #6b5840;
}
[data-theme="light"] .del-btn.ghost:hover:not(:disabled) {
  background: rgba(255, 244, 220, 0.65);
  border-color: rgba(220, 38, 38, 0.32);
  color: #1a0e0e;
}
[data-theme="light"] .del-btn.danger {
  background: linear-gradient(135deg, rgba(254, 226, 226, 0.8), rgba(252, 165, 165, 0.55));
  border-color: rgba(220, 38, 38, 0.30);
  color: #991b1b;
}
[data-theme="light"] .del-btn.danger.is-armed:not(:disabled) {
  background: linear-gradient(135deg, #f87171, #dc2626 60%, #7f1d1d);
  background-size: 200% 200%;
  color: #fff;
  border-color: rgba(127, 29, 29, 0.55);
  box-shadow:
    0 14px 32px -10px rgba(220, 38, 38, 0.65),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
}
</style>
