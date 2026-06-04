<template>
  <Teleport to="body">
    <transition name="dpm">
      <div v-if="open" class="dpm-scrim" @click.self="onCancel">
        <!-- Decorative orbital rings -->
        <span class="dpm-orbit dpm-orbit-1" aria-hidden="true" />
        <span class="dpm-orbit dpm-orbit-2" aria-hidden="true" />
        <span class="dpm-orbit dpm-orbit-3" aria-hidden="true" />

        <!-- Drifting ambient crimson orbs -->
        <span class="dpm-drift dpm-drift-1" aria-hidden="true" />
        <span class="dpm-drift dpm-drift-2" aria-hidden="true" />

        <Motion class="dpm-card" as="div" role="dialog" aria-modal="true"
          aria-labelledby="dpm-title"
          :initial="{ opacity: 0, y: 30, scale: 0.92, rotateX: -8 }"
          :animate="{ opacity: 1, y: 0, scale: 1, rotateX: 0 }"
          :exit="{ opacity: 0, y: 18, scale: 0.94 }"
          :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }"
        >
          <!-- ════════════════════════ Ambient layers ════════════════════════ -->
          <div class="dpm-atm" aria-hidden="true">
            <span class="dpm-grid" />
            <span class="dpm-scan" />
          </div>

          <!-- ════════════════════════ HEADER ════════════════════════ -->
          <header class="dpm-head">
            <span class="dpm-head-grain" aria-hidden="true" />
            <span class="dpm-head-aura" aria-hidden="true" />

            <Motion class="dpm-glyph" as="div"
              :initial="{ scale: 0, rotate: -45 }"
              :animate="{ scale: 1, rotate: 0 }"
              :transition="{ duration: 0.55, delay: 0.18, ease: [0.34, 1.56, 0.64, 1] }"
            >
              <span class="dpm-glyph-aura" />
              <span class="dpm-glyph-ring" />
              <Trash2 :size="26" />
            </Motion>

            <div class="dpm-head-meta">
              <Motion as="span" class="dpm-eye leave-mono"
                :initial="{ opacity: 0, y: -6 }"
                :animate="{ opacity: 1, y: 0 }"
                :transition="{ duration: 0.4, delay: 0.24 }"
              >
                <span class="dpm-eye-led" />
                DELETE · CONFIRM
              </Motion>
              <Motion as="h3" id="dpm-title" class="dpm-title"
                :initial="{ opacity: 0, y: -4 }"
                :animate="{ opacity: 1, y: 0 }"
                :transition="{ duration: 0.42, delay: 0.30 }"
              >
                Remove this attachment?
              </Motion>
              <Motion as="p" class="dpm-sub"
                :initial="{ opacity: 0, y: -3 }"
                :animate="{ opacity: 1, y: 0 }"
                :transition="{ duration: 0.42, delay: 0.36 }"
              >
                This soft-deletes the file. HR will no longer see it on this request.
              </Motion>
            </div>

            <button class="dpm-close" @click="onCancel" aria-label="Close" :disabled="submitting">
              <X :size="14" />
            </button>
          </header>

          <!-- ════════════════════════ BODY ════════════════════════ -->
          <div class="dpm-body">

            <!-- ───────────── 01 — Attachment preview ───────────── -->
            <Motion class="dpm-section" as="section"
              :initial="{ opacity: 0, y: 8 }"
              :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.45, delay: 0.42 }"
            >
              <header class="dpm-sec-head">
                <span class="dpm-sec-num leave-mono">01</span>
                <span class="dpm-sec-rule" />
                <h4 class="dpm-sec-title">Attachment</h4>
                <span class="dpm-sec-meta leave-mono">REVIEW</span>
              </header>

              <div class="dpm-preview">
                <span class="dpm-preview-glow" aria-hidden="true" />

                <span class="dpm-thumb" :class="{ 'is-img': isImage }">
                  <img v-if="isImage && attachment?.previewUrl" :src="attachment.previewUrl"
                    alt="" class="dpm-thumb-img" />
                  <ImageIcon v-else-if="isImage" :size="26" />
                  <FileText v-else :size="26" />
                </span>

                <div class="dpm-preview-meta">
                  <strong class="dpm-preview-name" :title="attachment?.name || ''">
                    {{ attachment?.name || 'document' }}
                  </strong>
                  <span class="dpm-preview-sub leave-mono">
                    <span>{{ fmtSize(attachment?.size) }}</span>
                    <span class="dpm-preview-dot" />
                    <span>{{ attachment?.mime || 'unknown' }}</span>
                  </span>
                </div>

                <Motion as="span" class="dpm-preview-chip"
                  :initial="{ opacity: 0, scale: 0.7 }"
                  :animate="{ opacity: 1, scale: 1 }"
                  :transition="{ duration: 0.4, delay: 0.6, ease: [0.34, 1.56, 0.64, 1] }"
                >
                  <AlertTriangle :size="10" />
                  <span>Will be removed</span>
                </Motion>
              </div>
            </Motion>

            <!-- ───────────── 02 — Reason chips ───────────── -->
            <Motion class="dpm-section" as="section"
              :initial="{ opacity: 0, y: 8 }"
              :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.45, delay: 0.5 }"
            >
              <header class="dpm-sec-head">
                <span class="dpm-sec-num leave-mono">02</span>
                <span class="dpm-sec-rule" />
                <h4 class="dpm-sec-title">Why are you removing it?</h4>
                <span class="dpm-sec-meta leave-mono" :data-warn="!selectedReason">
                  {{ selectedReason ? 'PICKED' : 'PICK ONE' }}
                </span>
              </header>

              <div class="dpm-chips">
                <Motion v-for="(reason, i) in REASONS" :key="reason"
                  as="button" type="button"
                  class="dpm-chip"
                  :class="{ 'is-active': selectedReason === reason }"
                  :initial="{ opacity: 0, scale: 0.8, y: 8 }"
                  :animate="{ opacity: 1, scale: 1, y: 0 }"
                  :transition="{ duration: 0.36, delay: 0.58 + i * 0.05, ease: [0.34, 1.56, 0.64, 1] }"
                  :whileHover="{ y: -2, scale: 1.04 }"
                  :whileTap="{ scale: 0.95 }"
                  @click="pickReason(reason)"
                >
                  <span class="chip-dot" :class="{ on: selectedReason === reason }" />
                  <span class="chip-label">{{ reason }}</span>
                </Motion>
              </div>
            </Motion>

            <!-- ───────────── 03 — Optional note ───────────── -->
            <Motion class="dpm-section" as="section"
              :initial="{ opacity: 0, y: 8 }"
              :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.45, delay: 0.7 }"
            >
              <header class="dpm-sec-head">
                <span class="dpm-sec-num leave-mono">03</span>
                <span class="dpm-sec-rule" />
                <h4 class="dpm-sec-title">Note (optional, helps HR understand)</h4>
                <span class="dpm-sec-meta leave-mono">{{ note.length }}/500</span>
              </header>

              <div class="dpm-textarea-wrap" :class="{ 'is-focused': focused }">
                <textarea v-model="note" rows="3"
                  class="dpm-textarea"
                  placeholder="Add any context — was the file outdated? wrong document? privacy concern?"
                  maxlength="500"
                  @focus="focused = true"
                  @blur="focused = false"
                />
                <span class="dpm-ta-glow" aria-hidden="true" />
                <span class="dpm-ta-corner tl" aria-hidden="true" />
                <span class="dpm-ta-corner tr" aria-hidden="true" />
                <span class="dpm-ta-corner bl" aria-hidden="true" />
                <span class="dpm-ta-corner br" aria-hidden="true" />
              </div>

              <Motion v-if="auditPreview" as="div" class="dpm-audit"
                :initial="{ opacity: 0, y: 4 }"
                :animate="{ opacity: 1, y: 0 }"
                :transition="{ duration: 0.3 }"
              >
                <span class="dpm-audit-eye leave-mono">
                  <Quote :size="9" />
                  HR'S AUDIT LOG WILL SEE
                </span>
                <p class="dpm-audit-text">{{ auditPreview }}</p>
              </Motion>
            </Motion>
          </div>

          <!-- ════════════════════════ FOOTER ════════════════════════ -->
          <Motion class="dpm-foot" as="footer"
            :initial="{ opacity: 0, y: 8 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.45, delay: 0.86 }"
          >
            <div class="dpm-foot-l">
              <Motion as="button" type="button"
                class="leave-btn leave-btn-sm dpm-cancel"
                :disabled="submitting"
                :whileHover="!submitting ? { y: -2 } : {}"
                :whileTap="!submitting ? { scale: 0.97 } : {}"
                @click="onCancel"
              >
                Cancel
              </Motion>
            </div>

            <div class="dpm-foot-r">
              <span v-if="!canConfirm" class="dpm-hint leave-mono">
                <Clock :size="10" />
                Pick a reason to continue
              </span>

              <Motion as="button" type="button"
                class="leave-btn leave-btn-sm dpm-confirm"
                :disabled="!canConfirm || submitting"
                :whileHover="canConfirm && !submitting ? { y: -2, scale: 1.02 } : {}"
                :whileTap="canConfirm && !submitting ? { scale: 0.96 } : {}"
                @click="onConfirm"
              >
                <Trash2 :size="13" />
                <span class="dpm-confirm-label">
                  {{ submitting ? 'Deleting…' : 'Delete attachment' }}
                </span>
                <span class="dpm-confirm-glow" aria-hidden="true" />
              </Motion>
            </div>
          </Motion>
        </Motion>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { Motion } from 'motion-v'
import {
  Trash2, X, Quote, FileText, Image as ImageIcon, AlertTriangle, Clock,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'

const props = defineProps({
  open: { type: Boolean, default: false },
  attachment: { type: Object, default: null },
})
const emit = defineEmits(['cancel', 'confirm'])

const toast = useToast()

// ─── Preset reasons ───────────────────────────────────────────────────
const REASONS = [
  'Wrong file',
  'Outdated',
  'Updated version available',
  'Mistake — re-uploading',
  'Privacy concern',
  'Other',
]

// ─── State ────────────────────────────────────────────────────────────
const selectedReason = ref(null)
const note = ref('')
const submitting = ref(false)
const focused = ref(false)

// ─── Derived ──────────────────────────────────────────────────────────
const isImage = computed(() => {
  const m = (props.attachment?.mime || '').toLowerCase()
  if (m.startsWith('image/')) return true
  const n = (props.attachment?.name || '').toLowerCase()
  return /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(n)
})

const canConfirm = computed(() => !!selectedReason.value)

const auditPreview = computed(() => {
  const r = selectedReason.value
  const n = note.value.trim()
  if (!r && !n) return ''
  if (r && n) return `${r} — ${n}`
  return r || n
})

// ─── Actions ──────────────────────────────────────────────────────────
const pickReason = (label) => {
  if (submitting.value) return
  selectedReason.value = label
  if (!note.value.trim()) {
    note.value = label
  }
}

const onConfirm = () => {
  if (submitting.value) return
  if (!selectedReason.value) {
    toast.warning('Pick a reason')
    return
  }
  submitting.value = true
  emit('confirm', {
    reason: selectedReason.value,
    note: note.value.trim(),
  })
  // Parent is expected to close the modal on success. Keep `submitting`
  // true so a double-click can't fire a second emit; the reset on next
  // open() will clear it.
}

const onCancel = () => {
  if (submitting.value) return
  emit('cancel')
}

// ─── Reset on open ────────────────────────────────────────────────────
watch(() => props.open, async (v) => {
  if (v) {
    selectedReason.value = null
    note.value = ''
    submitting.value = false
    focused.value = false
    await nextTick()
  }
})

// ─── Helpers ──────────────────────────────────────────────────────────
const fmtSize = (n) => {
  const v = Number(n) || 0
  if (!v) return '—'
  if (v < 1024) return `${v} B`
  if (v < 1024 * 1024) return `${(v / 1024).toFixed(1)} KB`
  return `${(v / 1024 / 1024).toFixed(2)} MB`
}
</script>

<style scoped>
@import '@/styles/leave-theme.css';

/* ═══════════════════════════════════════════════════════════════════
   SCRIM — crimson + amber backdrop, 16px blur
   ═══════════════════════════════════════════════════════════════════ */
.dpm-scrim {
  position: fixed; inset: 0; z-index: 1300;
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  perspective: 1500px;
  background:
    radial-gradient(60% 60% at 50% 30%, rgba(248, 113, 113, 0.30), transparent 65%),
    radial-gradient(40% 50% at 25% 75%, rgba(251, 146, 60, 0.20), transparent 65%),
    rgba(20, 14, 8, 0.55);
  backdrop-filter: blur(16px) saturate(150%);
  -webkit-backdrop-filter: blur(16px) saturate(150%);
  overflow: hidden;
}
[data-theme="light"] .dpm-scrim {
  background:
    radial-gradient(60% 60% at 50% 30%, rgba(248, 113, 113, 0.26), transparent 65%),
    radial-gradient(40% 50% at 25% 75%, rgba(217, 119, 6, 0.22), transparent 65%),
    rgba(60, 24, 14, 0.40);
}

/* Enter / leave */
.dpm-enter-active, .dpm-leave-active { transition: opacity .32s ease; }
.dpm-enter-from, .dpm-leave-to { opacity: 0; }

/* ─── Decorative orbital rings ─── */
.dpm-orbit {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(0.6px);
}
.dpm-orbit-1 { width: 540px; height: 540px; border: 1px solid rgba(248, 113, 113, 0.28); animation: dpm-spin 40s linear infinite; }
.dpm-orbit-2 { width: 720px; height: 720px; border: 1px solid rgba(251, 146, 60, 0.18); animation: dpm-spin 58s linear infinite reverse; }
.dpm-orbit-3 { width: 900px; height: 900px; border: 1px solid rgba(185, 28, 28, 0.12); animation: dpm-spin 82s linear infinite; }
@keyframes dpm-spin { to { transform: rotate(360deg); } }

/* ─── Drifting crimson orbs ─── */
.dpm-drift {
  position: absolute;
  border-radius: 50%;
  filter: blur(60px);
  pointer-events: none;
}
.dpm-drift-1 {
  width: 320px; height: 320px;
  top: -120px; left: -100px;
  background: radial-gradient(circle, rgba(248, 113, 113, 0.50), transparent 70%);
  opacity: 0.5;
  animation: dpm-drift-a 22s ease-in-out infinite;
}
.dpm-drift-2 {
  width: 280px; height: 280px;
  bottom: -100px; right: -90px;
  background: radial-gradient(circle, rgba(251, 146, 60, 0.40), transparent 70%);
  opacity: 0.55;
  animation: dpm-drift-b 26s ease-in-out infinite;
}
@keyframes dpm-drift-a {
  0%,100% { transform: translate(0,0) scale(1); }
  50%     { transform: translate(36px, 48px) scale(1.08); }
}
@keyframes dpm-drift-b {
  0%,100% { transform: translate(0,0) scale(1); }
  50%     { transform: translate(-32px, -40px) scale(1.10); }
}

/* ═══════════════════════════════════════════════════════════════════
   CARD
   ═══════════════════════════════════════════════════════════════════ */
.dpm-card {
  position: relative;
  width: 580px; max-width: calc(100vw - 32px);
  max-height: calc(100vh - 40px);
  border-radius: 22px;
  background:
    radial-gradient(120% 70% at 0% 0%, rgba(248, 113, 113, 0.22), transparent 55%),
    radial-gradient(80% 60% at 100% 100%, rgba(251, 146, 60, 0.14), transparent 60%),
    linear-gradient(180deg, rgba(22, 12, 10, 0.97), rgba(14, 8, 6, 0.97));
  border: 1px solid rgba(248, 113, 113, 0.45);
  box-shadow:
    0 60px 140px -30px rgba(0, 0, 0, 0.88),
    0 0 0 1px rgba(248, 113, 113, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  display: flex; flex-direction: column;
  overflow: hidden;
  isolation: isolate;
  transform-style: preserve-3d;
}
[data-theme="light"] .dpm-card {
  background:
    radial-gradient(120% 70% at 0% 0%, rgba(248, 113, 113, 0.20), transparent 55%),
    radial-gradient(80% 60% at 100% 100%, rgba(251, 191, 36, 0.20), transparent 60%),
    linear-gradient(180deg, rgba(255, 250, 240, 0.98), rgba(255, 242, 222, 0.98));
  border-color: rgba(185, 28, 28, 0.40);
  box-shadow:
    0 50px 120px -30px rgba(127, 29, 29, 0.40),
    0 0 0 1px rgba(185, 28, 28, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}

/* ─── Ambient inside the card ─── */
.dpm-atm {
  position: absolute; inset: 0; pointer-events: none;
  z-index: 0; overflow: hidden;
}
.dpm-grid {
  position: absolute; inset: 0;
  background-image: radial-gradient(rgba(248, 113, 113, 0.06) 1px, transparent 1px);
  background-size: 22px 22px;
  mask-image: linear-gradient(180deg, rgba(0,0,0,0.55) 0%, transparent 80%);
  opacity: 0.7;
}
[data-theme="light"] .dpm-grid {
  background-image: radial-gradient(rgba(185, 28, 28, 0.10) 1px, transparent 1px);
}
.dpm-scan {
  position: absolute; left: 0; right: 0; height: 140px;
  background: linear-gradient(180deg, transparent, rgba(248, 113, 113, 0.14), transparent);
  filter: blur(18px);
  transform: translateY(-100%);
  animation: dpm-scan 13s 0.3s linear infinite;
}
@keyframes dpm-scan {
  0%   { transform: translateY(-100%); opacity: 0; }
  8%   { opacity: 1; }
  92%  { opacity: 1; }
  100% { transform: translateY(120vh); opacity: 0; }
}

/* ═══════════════════════════════════════════════════════════════════
   HEADER
   ═══════════════════════════════════════════════════════════════════ */
.dpm-head {
  position: relative; z-index: 2;
  display: grid;
  grid-template-columns: 56px 1fr auto;
  gap: 14px;
  align-items: center;
  padding: 22px 22px 18px;
  border-bottom: 1px solid rgba(248, 113, 113, 0.22);
  overflow: hidden;
  background:
    linear-gradient(90deg, rgba(248, 113, 113, 0.14), rgba(185, 28, 28, 0.04) 60%, transparent);
}
[data-theme="light"] .dpm-head {
  background: linear-gradient(90deg, rgba(248, 113, 113, 0.12), rgba(251, 191, 36, 0.08) 60%, transparent);
  border-bottom-color: rgba(185, 28, 28, 0.22);
}
.dpm-head-grain {
  position: absolute; inset: 0; opacity: 0.06;
  background-image: radial-gradient(rgba(252, 165, 165, 0.7) 1px, transparent 1px);
  background-size: 7px 7px;
  pointer-events: none;
}
.dpm-head-aura {
  position: absolute; left: -10%; top: -50%;
  width: 60%; height: 200%;
  background: radial-gradient(50% 30% at 50% 50%, rgba(248, 113, 113, 0.42), transparent 65%);
  filter: blur(28px);
  pointer-events: none;
}

/* ─── Glyph ─── */
.dpm-glyph {
  position: relative;
  width: 56px; height: 56px;
  display: grid; place-items: center;
  border-radius: 16px;
  background:
    radial-gradient(60% 60% at 30% 30%, rgba(254, 202, 202, 0.35), transparent 70%),
    linear-gradient(135deg, rgba(239, 68, 68, 0.32), rgba(127, 29, 29, 0.28));
  border: 1px solid rgba(248, 113, 113, 0.50);
  color: #fecaca;
  box-shadow:
    0 12px 32px -10px rgba(239, 68, 68, 0.62),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
  animation: dpm-glyph-pulse 6s ease-in-out infinite;
}
[data-theme="light"] .dpm-glyph {
  color: #7f1d1d;
  background:
    radial-gradient(60% 60% at 30% 30%, rgba(254, 202, 202, 0.40), transparent 70%),
    linear-gradient(135deg, rgba(248, 113, 113, 0.35), rgba(251, 191, 36, 0.20));
  border-color: rgba(185, 28, 28, 0.45);
}
@keyframes dpm-glyph-pulse {
  0%, 100% {
    box-shadow:
      0 12px 32px -10px rgba(239, 68, 68, 0.62),
      0 0 0 0 rgba(239, 68, 68, 0.0),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }
  50% {
    box-shadow:
      0 16px 40px -10px rgba(239, 68, 68, 0.80),
      0 0 32px -6px rgba(239, 68, 68, 0.45),
      inset 0 1px 0 rgba(255, 255, 255, 0.10);
  }
}
.dpm-glyph-aura {
  position: absolute; inset: -8px;
  border-radius: 50%;
  border: 1.5px solid rgba(248, 113, 113, 0.55);
  opacity: 0.7;
  animation: dpm-aura-pulse 2.4s ease-in-out infinite;
}
@keyframes dpm-aura-pulse {
  0%, 100% { transform: scale(0.9); opacity: 0.6; }
  50%      { transform: scale(1.18); opacity: 0; }
}
.dpm-glyph-ring {
  position: absolute; inset: -14px;
  border-radius: 50%;
  border: 1px dashed rgba(252, 165, 165, 0.50);
  opacity: 0.55;
  animation: dpm-ring-rot 20s linear infinite;
}
@keyframes dpm-ring-rot { to { transform: rotate(360deg); } }

/* ─── Header meta ─── */
.dpm-head-meta {
  min-width: 0;
  display: flex; flex-direction: column; gap: 3px;
  position: relative; z-index: 1;
}
.dpm-eye {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; font-weight: 800;
  letter-spacing: 0.20em; text-transform: uppercase;
  color: #fca5a5;
  align-self: flex-start;
}
[data-theme="light"] .dpm-eye { color: #b91c1c; }
.dpm-eye-led {
  width: 6px; height: 6px; border-radius: 50%;
  background: #ef4444;
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.85);
  animation: dpm-led-blink 0.9s ease-in-out infinite;
}
[data-theme="light"] .dpm-eye-led {
  background: #b91c1c;
  box-shadow: 0 0 8px rgba(185, 28, 28, 0.7);
}
@keyframes dpm-led-blink {
  0%, 100% { opacity: 0.55; transform: scale(1); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
  50%      { opacity: 1; transform: scale(1.35); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
}
.dpm-title {
  margin: 0;
  font-size: 19px; font-weight: 800;
  color: var(--leave-text);
  letter-spacing: -0.014em;
  line-height: 1.15;
}
[data-theme="light"] .dpm-title { color: #5b1a1a; }
.dpm-sub {
  margin: 0;
  font-size: 11.5px; line-height: 1.45;
  color: var(--leave-text-muted);
}

/* ─── Close ─── */
.dpm-close {
  position: relative;
  display: grid; place-items: center;
  width: 32px; height: 32px;
  border-radius: 10px;
  border: 1px solid rgba(248, 113, 113, 0.30);
  background: rgba(20, 12, 10, 0.4);
  color: var(--leave-text-muted);
  cursor: pointer;
  transition: transform .35s var(--leave-ease), color .22s, border-color .22s, background .22s;
}
[data-theme="light"] .dpm-close {
  background: rgba(255, 250, 240, 0.7);
  border-color: rgba(185, 28, 28, 0.28);
  color: #6b3d12;
}
.dpm-close:hover:not(:disabled) {
  transform: rotate(90deg) scale(1.08);
  color: #fca5a5;
  border-color: rgba(248, 113, 113, 0.65);
  background: rgba(239, 68, 68, 0.18);
}
[data-theme="light"] .dpm-close:hover:not(:disabled) { color: #b91c1c; background: rgba(248, 113, 113, 0.18); }
.dpm-close:disabled { opacity: 0.4; cursor: not-allowed; }

/* ═══════════════════════════════════════════════════════════════════
   BODY
   ═══════════════════════════════════════════════════════════════════ */
.dpm-body {
  position: relative; z-index: 2;
  padding: 18px 22px 6px;
  flex: 1;
  overflow-y: auto;
  display: flex; flex-direction: column; gap: 18px;
  scrollbar-width: thin;
  scrollbar-color: rgba(248, 113, 113, 0.30) transparent;
}
.dpm-body::-webkit-scrollbar { width: 5px; }
.dpm-body::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(248, 113, 113, 0.30), rgba(185, 28, 28, 0.45));
  border-radius: 3px;
}

.dpm-section { display: flex; flex-direction: column; gap: 10px; }
.dpm-sec-head { display: flex; align-items: center; gap: 10px; }
.dpm-sec-num {
  font-size: 9.5px; font-weight: 800;
  color: #fca5a5;
  padding: 2px 7px; border-radius: 5px;
  background: rgba(239, 68, 68, 0.14);
  border: 1px solid rgba(248, 113, 113, 0.32);
  letter-spacing: 0.06em;
}
[data-theme="light"] .dpm-sec-num {
  color: #b91c1c;
  background: rgba(239, 68, 68, 0.16);
  border-color: rgba(185, 28, 28, 0.34);
}
.dpm-sec-rule {
  flex: 0 0 20px; height: 1px;
  background: linear-gradient(90deg, #ef4444, transparent);
}
.dpm-sec-title {
  margin: 0;
  font-size: 13.5px; font-weight: 800;
  color: var(--leave-text);
  letter-spacing: -0.008em;
}
[data-theme="light"] .dpm-sec-title { color: #3a1f0b; }
.dpm-sec-meta {
  margin-left: auto;
  font-size: 9px; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--leave-text-muted);
}
.dpm-sec-meta[data-warn="true"] { color: #ef4444; }
[data-theme="light"] .dpm-sec-meta[data-warn="true"] { color: #b91c1c; }

/* ─── 01: Attachment preview ─── */
.dpm-preview {
  position: relative;
  display: flex; align-items: center; gap: 14px;
  padding: 14px 16px;
  border-radius: 14px;
  background:
    radial-gradient(120% 80% at 0% 0%, rgba(248, 113, 113, 0.10), transparent 55%),
    linear-gradient(180deg, rgba(40, 22, 18, 0.65), rgba(28, 16, 12, 0.75));
  border: 1px solid rgba(248, 113, 113, 0.28);
  overflow: hidden;
}
[data-theme="light"] .dpm-preview {
  background:
    radial-gradient(120% 80% at 0% 0%, rgba(248, 113, 113, 0.14), transparent 55%),
    rgba(255, 250, 240, 0.65);
  border-color: rgba(185, 28, 28, 0.24);
  backdrop-filter: blur(18px);
}
.dpm-preview-glow {
  position: absolute; left: -20%; top: -60%;
  width: 50%; height: 200%;
  background: radial-gradient(50% 30% at 50% 50%, rgba(248, 113, 113, 0.25), transparent 65%);
  filter: blur(28px);
  pointer-events: none;
}
.dpm-thumb {
  position: relative;
  display: grid; place-items: center;
  width: 60px; height: 60px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(248, 113, 113, 0.22), rgba(127, 29, 29, 0.06));
  border: 1px solid rgba(248, 113, 113, 0.40);
  color: #fecaca;
  flex-shrink: 0;
  overflow: hidden;
}
[data-theme="light"] .dpm-thumb {
  background: linear-gradient(135deg, rgba(248, 113, 113, 0.22), rgba(255, 250, 240, 0.6));
  border-color: rgba(185, 28, 28, 0.34);
  color: #7f1d1d;
}
.dpm-thumb.is-img { padding: 0; }
.dpm-thumb-img {
  width: 100%; height: 100%; object-fit: cover;
  border-radius: 12px;
}

.dpm-preview-meta {
  flex: 1; min-width: 0;
  display: flex; flex-direction: column; gap: 4px;
}
.dpm-preview-name {
  font-size: 13.5px; font-weight: 800;
  color: var(--leave-text);
  letter-spacing: -0.005em;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
[data-theme="light"] .dpm-preview-name { color: #3a1f0b; }
.dpm-preview-sub {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10.5px; font-weight: 600;
  color: var(--leave-text-muted);
}
.dpm-preview-dot {
  width: 3px; height: 3px; border-radius: 50%;
  background: var(--leave-text-muted); opacity: 0.55;
}

.dpm-preview-chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(251, 191, 36, 0.16);
  border: 1px solid rgba(251, 191, 36, 0.40);
  color: #fde68a;
  font-size: 9.5px; font-weight: 800;
  letter-spacing: 0.08em; text-transform: uppercase;
  flex-shrink: 0;
}
[data-theme="light"] .dpm-preview-chip {
  background: rgba(251, 191, 36, 0.24);
  border-color: rgba(180, 83, 9, 0.40);
  color: #92400e;
}
.dpm-preview-chip svg {
  filter: drop-shadow(0 0 4px rgba(251, 191, 36, 0.55));
}
[data-theme="light"] .dpm-preview-chip svg {
  filter: none;
}

/* ─── 02: Chips ─── */
.dpm-chips {
  display: flex; flex-wrap: wrap; gap: 7px;
}
.dpm-chip {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(255, 250, 235, 0.04);
  border: 1px solid rgba(248, 113, 113, 0.22);
  color: var(--leave-text-secondary);
  font-size: 11.5px; font-weight: 600;
  cursor: pointer;
  transition: border-color .22s, color .22s, background .22s, transform .22s;
  position: relative;
}
[data-theme="light"] .dpm-chip {
  background: rgba(255, 250, 240, 0.7);
  border-color: rgba(185, 28, 28, 0.22);
  color: #6b3d12;
}
.dpm-chip:hover {
  border-color: rgba(248, 113, 113, 0.55);
  color: var(--leave-text);
  background: rgba(239, 68, 68, 0.10);
}
[data-theme="light"] .dpm-chip:hover { color: #5b1a1a; background: rgba(248, 113, 113, 0.12); }
.dpm-chip.is-active {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.30), rgba(245, 158, 11, 0.18));
  border-color: rgba(251, 191, 36, 0.65);
  color: #fef3c7;
  font-weight: 800;
  box-shadow: 0 8px 22px -10px rgba(251, 191, 36, 0.55);
  transform: scale(1.03);
}
[data-theme="light"] .dpm-chip.is-active {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.30), rgba(217, 119, 6, 0.18));
  color: #7c2d12;
  border-color: rgba(180, 83, 9, 0.50);
}
.chip-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: rgba(248, 113, 113, 0.30);
  transition: background .22s, transform .22s, box-shadow .22s;
}
.chip-dot.on {
  background: #fde047;
  box-shadow: 0 0 10px #fbbf24;
  animation: chip-dot-pulse 1.4s ease-in-out infinite;
}
[data-theme="light"] .chip-dot.on { background: #b45309; box-shadow: 0 0 8px #d97706; }
@keyframes chip-dot-pulse {
  0%, 100% { transform: scale(1); }
  50%      { transform: scale(1.5); }
}

/* ─── 03: Textarea ─── */
.dpm-textarea-wrap {
  position: relative;
  border-radius: 14px;
  background: rgba(14, 8, 6, 0.55);
  border: 1px solid rgba(248, 113, 113, 0.24);
  transition: border-color .26s var(--leave-ease), box-shadow .26s var(--leave-ease);
  overflow: hidden;
}
[data-theme="light"] .dpm-textarea-wrap {
  background: rgba(255, 248, 230, 0.85);
  border-color: rgba(185, 28, 28, 0.22);
}
.dpm-textarea-wrap.is-focused {
  border-color: rgba(248, 113, 113, 0.65);
  box-shadow: 0 0 0 4px rgba(239, 68, 68, 0.14);
}
.dpm-textarea {
  width: 100%;
  padding: 12px 14px; min-height: 80px;
  background: transparent;
  border: none; outline: none;
  color: var(--leave-text); font: inherit; font-size: 13px;
  line-height: 1.55; resize: vertical;
}
[data-theme="light"] .dpm-textarea { color: #3a1f0b; }
.dpm-textarea::placeholder { color: var(--leave-text-placeholder); }
[data-theme="light"] .dpm-textarea::placeholder { color: #b08a4a; }
.dpm-ta-glow {
  position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, rgba(248, 113, 113, 0.12), transparent);
  background-size: 200% 100%;
  opacity: 0; pointer-events: none;
  transition: opacity .3s;
}
.dpm-textarea-wrap.is-focused .dpm-ta-glow {
  opacity: 1;
  animation: dpm-ta-pan 2.6s linear infinite;
}
@keyframes dpm-ta-pan {
  0%   { background-position: -100% 0; }
  100% { background-position: 200% 0; }
}
.dpm-ta-corner {
  position: absolute; width: 12px; height: 12px;
  border: 1.5px solid rgba(248, 113, 113, 0.65);
  opacity: 0; pointer-events: none;
  transition: opacity .26s var(--leave-ease);
}
.dpm-ta-corner.tl { top: 6px; left: 6px;     border-right: 0; border-bottom: 0; }
.dpm-ta-corner.tr { top: 6px; right: 6px;    border-left: 0;  border-bottom: 0; }
.dpm-ta-corner.bl { bottom: 6px; left: 6px;  border-right: 0; border-top: 0; }
.dpm-ta-corner.br { bottom: 6px; right: 6px; border-left: 0;  border-top: 0; }
.dpm-textarea-wrap.is-focused .dpm-ta-corner { opacity: 0.9; }

/* ─── Audit preview ─── */
.dpm-audit {
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(248, 113, 113, 0.06);
  border: 1px dashed rgba(248, 113, 113, 0.30);
}
[data-theme="light"] .dpm-audit {
  background: rgba(254, 226, 226, 0.5);
  border-color: rgba(185, 28, 28, 0.30);
}
.dpm-audit-eye {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 8.5px; font-weight: 800;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: #fca5a5;
  font-style: italic;
}
[data-theme="light"] .dpm-audit-eye { color: #b91c1c; }
.dpm-audit-eye svg { opacity: 0.85; }
.dpm-audit-text {
  margin: 4px 0 0;
  font-size: 11.5px; line-height: 1.55;
  color: var(--leave-text-secondary);
  white-space: pre-wrap;
  font-style: italic;
}
[data-theme="light"] .dpm-audit-text { color: #6b3d12; }

/* ═══════════════════════════════════════════════════════════════════
   FOOTER
   ═══════════════════════════════════════════════════════════════════ */
.dpm-foot {
  position: relative; z-index: 2;
  display: flex; gap: 10px; align-items: center; justify-content: space-between;
  padding: 14px 22px 18px;
  border-top: 1px solid rgba(248, 113, 113, 0.20);
  background:
    linear-gradient(180deg, transparent, rgba(239, 68, 68, 0.05));
  flex-wrap: wrap;
}
[data-theme="light"] .dpm-foot {
  border-top-color: rgba(185, 28, 28, 0.20);
  background: linear-gradient(180deg, transparent, rgba(254, 226, 226, 0.40));
}
.dpm-foot-l, .dpm-foot-r {
  display: inline-flex; align-items: center; gap: 10px;
}
.dpm-foot-r { flex-wrap: wrap; justify-content: flex-end; }

.dpm-cancel {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(252, 165, 165, 0.22);
  color: var(--leave-text-secondary);
  transition: border-color .22s, color .22s, background .22s, transform .22s;
}
[data-theme="light"] .dpm-cancel {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(185, 28, 28, 0.22);
  color: #6b3d12;
}
.dpm-cancel:hover:not(:disabled) {
  border-color: rgba(248, 113, 113, 0.65);
  color: var(--leave-text);
}
[data-theme="light"] .dpm-cancel:hover:not(:disabled) { color: #5b1a1a; }
.dpm-cancel:disabled { opacity: 0.5; cursor: not-allowed; }

.dpm-hint {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--leave-text-muted);
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed rgba(252, 165, 165, 0.30);
}
[data-theme="light"] .dpm-hint {
  background: rgba(255, 250, 240, 0.7);
  border-color: rgba(185, 28, 28, 0.28);
}

/* ─── Primary confirm (crimson gradient with sheen) ─── */
.dpm-confirm {
  position: relative; overflow: hidden;
  background: linear-gradient(120deg, #ef4444 0%, #dc2626 35%, #b91c1c 65%, #ef4444 100%);
  background-size: 220% 100%;
  background-position: 0 0;
  color: #fff5f5;
  border: 1px solid rgba(252, 165, 165, 0.55);
  box-shadow:
    0 12px 28px -10px rgba(239, 68, 68, 0.65),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
  font-weight: 800;
  letter-spacing: 0.04em;
  transition:
    transform .22s cubic-bezier(0.34, 1.56, 0.64, 1),
    background-position .8s var(--leave-ease),
    box-shadow .25s;
}
.dpm-confirm:not(:disabled):hover {
  background-position: 100% 0;
  box-shadow:
    0 18px 36px -10px rgba(239, 68, 68, 0.80),
    inset 0 1px 0 rgba(255, 255, 255, 0.30);
}
.dpm-confirm:disabled {
  opacity: 0.42; cursor: not-allowed; filter: grayscale(0.4);
}
.dpm-confirm-glow {
  position: absolute; inset: 0;
  background: linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.40), transparent);
  background-size: 220% 100%;
  background-position: -100% 0;
  pointer-events: none;
  transition: background-position .7s var(--leave-ease);
}
.dpm-confirm:not(:disabled):hover .dpm-confirm-glow { background-position: 100% 0; }

/* ═══════════════════════════════════════════════════════════════════
   REDUCED MOTION
   ═══════════════════════════════════════════════════════════════════ */
@media (prefers-reduced-motion: reduce) {
  .dpm-orbit, .dpm-drift, .dpm-scan, .dpm-glyph, .dpm-glyph-aura,
  .dpm-glyph-ring, .dpm-eye-led, .chip-dot.on, .dpm-ta-glow {
    animation: none !important;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   RESPONSIVE
   ═══════════════════════════════════════════════════════════════════ */
@media (max-width: 600px) {
  .dpm-card { width: calc(100vw - 24px); border-radius: 16px; }
  .dpm-head { grid-template-columns: 44px 1fr auto; padding: 18px 16px 14px; }
  .dpm-glyph { width: 44px; height: 44px; border-radius: 12px; }
  .dpm-title { font-size: 16px; }
  .dpm-body { padding: 14px 16px 4px; }
  .dpm-foot { padding: 12px 16px 16px; }
  .dpm-foot-r { width: 100%; justify-content: flex-end; }
  .dpm-thumb { width: 52px; height: 52px; }
}
</style>
