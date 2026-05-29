<template>
  <Teleport to="body">
    <transition name="adm-fade">
      <div v-if="open" class="adm-overlay" @click.self="cancel">
        <Motion as="div" class="adm-card"
          :initial="{ opacity: 0, scale: 0.94, y: 18 }"
          :animate="{ opacity: 1, scale: 1, y: 0 }"
          :transition="{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }"
        >
          <!-- ambient decoration -->
          <span class="adm-sheen" />
          <span class="adm-perf-l" />

          <!-- HEADER -->
          <header class="adm-head">
            <div class="adm-head-icon">
              <ShieldAlert :size="18" />
              <span class="adm-head-icon-pulse" />
            </div>
            <div class="adm-head-text">
              <span class="adm-eyebrow">
                <span class="adm-eyebrow-dot" />
                Danger zone
              </span>
              <h3>{{ title }}</h3>
              <p class="adm-subtitle">{{ subtitle }}</p>
            </div>
            <button class="adm-close" :disabled="submitting" @click="cancel">
              <X :size="16" />
            </button>
          </header>

          <!-- BODY -->
          <div class="adm-body">
            <!-- target summary card -->
            <Motion v-if="targetLabel" class="adm-target"
              :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.34, delay: 0.08, ease: [0.22, 1, 0.36, 1] }"
            >
              <div class="adm-target-icon">
                <component :is="targetIcon || FileWarning" :size="16" />
              </div>
              <div class="adm-target-body">
                <div class="adm-target-label">{{ targetLabel }}</div>
                <div v-if="targetMeta" class="adm-target-meta">
                  <span>{{ targetMeta }}</span>
                  <span v-if="targetTag" class="adm-target-sep">·</span>
                  <span v-if="targetTag" class="adm-target-tag">{{ targetTag }}</span>
                </div>
              </div>
            </Motion>

            <!-- preset chips -->
            <Motion class="adm-presets"
              :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.32, delay: 0.14, ease: [0.22, 1, 0.36, 1] }"
            >
              <span class="adm-presets-label">Common reasons</span>
              <div class="adm-chips">
                <Motion v-for="(p, idx) in presets" :key="p"
                  as="button" type="button" class="adm-chip"
                  :initial="{ opacity: 0, scale: 0.85 }"
                  :animate="{ opacity: 1, scale: 1 }"
                  :transition="{ duration: 0.26, delay: 0.18 + idx * 0.04, ease: [0.34, 1.56, 0.64, 1] }"
                  :whileHover="{ y: -2 }"
                  :whileTap="{ scale: 0.95 }"
                  @click="pick(p)"
                >
                  <Plus :size="11" /> {{ p }}
                </Motion>
              </div>
            </Motion>

            <!-- reason textarea -->
            <Motion class="adm-field"
              :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.32, delay: 0.24, ease: [0.22, 1, 0.36, 1] }"
            >
              <label class="adm-field-label">
                Reason for deletion
                <span v-if="reasonRequired" class="adm-req">*</span>
                <span v-else class="adm-opt">(optional)</span>
              </label>
              <textarea ref="reasonInputRef"
                v-model="localReason"
                class="adm-textarea"
                :class="{ 'has-error': hasError }"
                rows="4"
                :placeholder="reasonPlaceholder"
                @input="hasError = false"
              />
              <span v-if="hasError" class="adm-field-error">
                <AlertTriangle :size="11" /> Reason is required.
              </span>
            </Motion>

            <!-- warning banner -->
            <Motion class="adm-warn"
              :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.32, delay: 0.30, ease: [0.22, 1, 0.36, 1] }"
            >
              <ShieldAlert :size="13" />
              <span>{{ warning }}</span>
            </Motion>
          </div>

          <!-- FOOTER -->
          <footer class="adm-foot">
            <span class="adm-foot-meta">
              <Hourglass :size="11" /> All deletions are written to the audit log.
            </span>
            <button class="onb-btn-ghost" :disabled="submitting" @click="cancel">Cancel</button>
            <Motion as="button" type="button" class="adm-confirm"
              :whileHover="(submitting || (reasonRequired && !localReason.trim())) ? {} : { y: -1, scale: 1.02 }"
              :whileTap="(submitting || (reasonRequired && !localReason.trim())) ? {} : { scale: 0.97 }"
              :transition="{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }"
              :disabled="submitting || (reasonRequired && !localReason.trim())"
              @click="confirm"
            >
              <Loader2 v-if="submitting" :size="13" class="adm-spin" />
              <Trash2 v-else :size="13" />
              {{ submitting ? submittingLabel : confirmLabel }}
            </Motion>
          </footer>
        </Motion>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { Motion } from 'motion-v'
import { ShieldAlert, AlertTriangle, Loader2, Trash2, Plus, FileWarning, X, Hourglass } from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: 'Delete item?' },
  subtitle: { type: String, default: 'This action cannot be undone.' },
  targetLabel: { type: String, default: '' },
  targetMeta:  { type: String, default: '' },
  targetTag:   { type: String, default: '' },
  targetIcon:  { type: [Object, Function], default: null },
  presets: {
    type: Array,
    default: () => [
      'Created by mistake',
      'Duplicate entry',
      'No longer required',
      'Replacing with updated record',
    ],
  },
  reasonRequired: { type: Boolean, default: true },
  reasonPlaceholder: { type: String, default: 'Briefly explain why this is being removed…' },
  warning: { type: String, default: 'This will permanently remove the record. Affected workflows will be notified.' },
  confirmLabel: { type: String, default: 'Delete' },
  submittingLabel: { type: String, default: 'Deleting…' },
  submitting: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'confirm'])

const localReason = ref('')
const hasError = ref(false)
const reasonInputRef = ref(null)

watch(() => props.open, async (v) => {
  if (v) {
    localReason.value = ''
    hasError.value = false
    await nextTick()
    reasonInputRef.value?.focus()
  }
})

const pick = (preset) => {
  localReason.value = localReason.value
    ? `${localReason.value.replace(/\s*$/, '')}\n${preset}`
    : preset
  hasError.value = false
  nextTick(() => reasonInputRef.value?.focus())
}

const cancel = () => {
  if (props.submitting) return
  emit('close')
}

const confirm = () => {
  if (props.submitting) return
  if (props.reasonRequired && !localReason.value.trim()) {
    hasError.value = true
    return
  }
  emit('confirm', localReason.value.trim())
}
</script>

<style scoped>
@import '../../../../styles/attendance-theme.css';

/* ════════════ Overlay ════════════ */
/* z-index 1400 sits ABOVE the OnbModal shell (1200) so a Delete confirmation
   opened from inside an OnbModal-hosted edit form paints on top of it, not
   hidden behind. Higher-stakes confirmations always win. */
.adm-overlay {
  position: fixed; inset: 0; z-index: 1400;
  background: radial-gradient(80% 60% at 50% 30%, rgba(120, 30, 30, 0.42), rgba(0, 0, 0, 0.76));
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
}

/* ════════════ Card ════════════ */
.adm-card {
  position: relative;
  width: 100%; max-width: 540px;
  display: flex; flex-direction: column;
  border-radius: 22px;
  overflow: hidden;
  background:
    radial-gradient(140% 90% at 0% 0%, rgba(248, 113, 113, 0.14), transparent 55%),
    radial-gradient(120% 90% at 100% 0%, rgba(251, 146, 60, 0.10), transparent 60%),
    linear-gradient(180deg, rgba(22, 16, 14, 0.97), rgba(14, 10, 8, 0.99));
  border: 1px solid rgba(248, 113, 113, 0.32);
  box-shadow:
    0 50px 100px -30px rgba(0, 0, 0, 0.75),
    0 0 0 1px rgba(248, 113, 113, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  isolation: isolate;
}
/* sheen swipe on entry */
.adm-sheen {
  position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(115deg, transparent 35%, rgba(255, 255, 255, 0.12) 50%, transparent 65%);
  transform: translateX(-100%);
  animation: adm-sheen 1.6s var(--att-spring) 0.25s 1 forwards;
}
@keyframes adm-sheen {
  0%   { transform: translateX(-120%) skewX(-22deg); opacity: 0; }
  40%  { opacity: 0.8; }
  100% { transform: translateX(220%) skewX(-22deg); opacity: 0; }
}
/* perforated stamp edge (danger red instead of warm gold) */
.adm-perf-l {
  position: absolute; left: 12px; top: 20px; bottom: 20px; width: 4px;
  background:
    radial-gradient(circle at 50% 5px,  rgba(248, 113, 113, 0.55) 1.4px, transparent 1.8px),
    radial-gradient(circle at 50% 13px, rgba(248, 113, 113, 0.55) 1.4px, transparent 1.8px),
    radial-gradient(circle at 50% 21px, rgba(248, 113, 113, 0.55) 1.4px, transparent 1.8px),
    radial-gradient(circle at 50% 29px, rgba(248, 113, 113, 0.55) 1.4px, transparent 1.8px);
  background-repeat: repeat-y; background-size: 4px 14px;
  opacity: 0.55;
  pointer-events: none;
}

/* ════════════ Header ════════════ */
.adm-head {
  display: grid;
  grid-template-columns: 48px 1fr auto;
  align-items: start;
  gap: 14px;
  padding: 20px 22px 16px 28px;
  border-bottom: 1px dashed rgba(248, 113, 113, 0.22);
}
.adm-head-icon {
  position: relative;
  width: 48px; height: 48px; border-radius: 14px;
  display: inline-flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 65%, #b91c1c 100%);
  color: #fff;
  box-shadow: 0 10px 28px -8px rgba(220, 38, 38, 0.6);
}
.adm-head-icon-pulse {
  position: absolute; inset: -3px; border-radius: 16px;
  background: radial-gradient(closest-side, rgba(248, 113, 113, 0.55), transparent 70%);
  z-index: -1; opacity: 0.8;
  animation: adm-pulse 2.4s ease-in-out infinite;
}
@keyframes adm-pulse {
  0%, 100% { opacity: 0.55; transform: scale(1); }
  50%      { opacity: 0.9;  transform: scale(1.08); }
}
.adm-head-text { min-width: 0; }
.adm-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 800; letter-spacing: 1.6px;
  text-transform: uppercase; color: #fca5a5;
}
.adm-eyebrow-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #f87171;
  box-shadow: 0 0 8px #f87171;
  animation: att-live-pulse 2.2s ease-in-out infinite;
}
.adm-head h3 {
  margin: 4px 0 0; font-size: 18px; font-weight: 800;
  letter-spacing: -0.01em; color: var(--hr-text);
}
.adm-subtitle { margin: 4px 0 0; font-size: 12px; color: var(--hr-text-muted); line-height: 1.45; }
.adm-close {
  width: 32px; height: 32px; border-radius: 9px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--hr-text-muted); cursor: pointer;
  transition: background .2s, color .2s, border-color .2s;
}
.adm-close:hover { background: rgba(255, 255, 255, 0.10); color: var(--hr-text); border-color: rgba(248, 113, 113, 0.30); }
.adm-close:disabled { opacity: 0.4; cursor: not-allowed; }

/* ════════════ Body ════════════ */
.adm-body {
  display: flex; flex-direction: column; gap: 16px;
  padding: 18px 26px 18px 32px;
  max-height: 60vh; overflow-y: auto;
}

/* target card */
.adm-target {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  background:
    linear-gradient(135deg, rgba(248, 113, 113, 0.12), rgba(251, 146, 60, 0.04)),
    rgba(20, 16, 12, 0.42);
  border: 1px solid rgba(248, 113, 113, 0.26);
  backdrop-filter: blur(10px);
}
.adm-target-icon {
  width: 38px; height: 38px; border-radius: 10px;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(248, 113, 113, 0.20);
  border: 1px solid rgba(248, 113, 113, 0.40);
  color: #fca5a5;
  flex-shrink: 0;
}
.adm-target-body { min-width: 0; flex: 1; }
.adm-target-label { font-size: 13.5px; font-weight: 700; color: var(--hr-text); }
.adm-target-meta {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11px; color: var(--hr-text-muted);
  margin-top: 2px;
}
.adm-target-sep { opacity: 0.45; }
.adm-target-tag {
  font-weight: 700; letter-spacing: 0.5px; font-size: 9.5px;
  padding: 2px 7px; border-radius: 5px;
  background: rgba(248, 113, 113, 0.18); color: #fca5a5;
  text-transform: uppercase;
  border: 1px solid rgba(248, 113, 113, 0.32);
}

/* presets */
.adm-presets { display: flex; flex-direction: column; gap: 8px; }
.adm-presets-label {
  font-size: 10px; font-weight: 800; letter-spacing: 1.4px;
  text-transform: uppercase; color: var(--hr-text-muted);
}
.adm-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.adm-chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 11px;
  font-size: 11px; font-weight: 600;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.10);
  color: var(--hr-text-secondary);
  cursor: pointer;
  transition: border-color .2s var(--att-spring), background .2s var(--att-spring), color .2s var(--att-spring);
}
.adm-chip:hover {
  border-color: rgba(248, 113, 113, 0.40);
  background: rgba(248, 113, 113, 0.10);
  color: #fca5a5;
}
.adm-chip svg { color: var(--att-orange-200); }
.adm-chip:hover svg { color: #fca5a5; }

/* reason textarea */
.adm-field { display: flex; flex-direction: column; gap: 6px; }
.adm-field-label {
  font-size: 11px; font-weight: 800; letter-spacing: 1px;
  text-transform: uppercase; color: var(--hr-text-muted);
  display: inline-flex; align-items: center; gap: 8px;
}
.adm-req { color: #f87171; font-weight: 800; }
.adm-opt { color: var(--hr-text-dim); font-weight: 500; letter-spacing: 0.2px; text-transform: none; }
.adm-textarea {
  width: 100%;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 13px; line-height: 1.55;
  color: var(--hr-text);
  font-family: inherit;
  resize: vertical;
  min-height: 96px;
  outline: none;
  transition: border-color .22s var(--att-spring), box-shadow .22s var(--att-spring), background .22s var(--att-spring);
}
.adm-textarea::placeholder { color: rgba(255, 255, 255, 0.35); }
.adm-textarea:focus {
  border-color: rgba(248, 113, 113, 0.55);
  background: rgba(248, 113, 113, 0.05);
  box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.14);
}
.adm-textarea.has-error {
  border-color: #f87171;
  box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.20);
  animation: adm-shake 0.36s ease-in-out;
}
@keyframes adm-shake {
  0%, 100% { transform: translateX(0); }
  20%      { transform: translateX(-3px); }
  40%      { transform: translateX(3px); }
  60%      { transform: translateX(-2px); }
  80%      { transform: translateX(2px); }
}
.adm-field-error {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; color: #f87171;
}

/* warning banner */
.adm-warn {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 11.5px; color: var(--hr-text-muted);
  padding: 9px 13px;
  border-radius: 10px;
  background: rgba(251, 191, 36, 0.06);
  border: 1px dashed rgba(251, 191, 36, 0.28);
  line-height: 1.45;
}
.adm-warn svg { color: var(--att-yellow-300); flex-shrink: 0; }

/* ════════════ Footer ════════════ */
.adm-foot {
  display: flex; gap: 10px; align-items: center;
  padding: 14px 22px;
  border-top: 1px dashed rgba(248, 113, 113, 0.22);
}
.adm-foot-meta {
  display: inline-flex; align-items: center; gap: 5px;
  flex: 1;
  font-size: 10.5px; font-weight: 600; letter-spacing: 0.5px;
  color: var(--hr-text-dim); text-transform: uppercase;
}
.adm-foot-meta svg { color: var(--att-teal-100); }

.adm-confirm {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 9px 18px;
  border-radius: 11px;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 65%, #b91c1c 100%);
  color: #fff;
  font: inherit; font-size: 12.5px; font-weight: 800; letter-spacing: 0.3px;
  border: 1px solid rgba(248, 113, 113, 0.55);
  cursor: pointer;
  box-shadow: 0 12px 28px -10px rgba(220, 38, 38, 0.6);
  transition: filter .22s, box-shadow .22s, transform .18s;
}
.adm-confirm:hover:not(:disabled) {
  filter: brightness(1.06);
  box-shadow: 0 16px 36px -10px rgba(220, 38, 38, 0.75);
}
.adm-confirm:disabled { opacity: 0.55; cursor: not-allowed; }
.adm-spin { animation: adm-spin 0.85s linear infinite; }
@keyframes adm-spin { to { transform: rotate(360deg); } }

/* ════════════ Transitions ════════════ */
.adm-fade-enter-active, .adm-fade-leave-active { transition: opacity .26s ease; }
.adm-fade-enter-from, .adm-fade-leave-to { opacity: 0; }

/* ════════════════════ LIGHT THEME ════════════════════ */
[data-theme="light"] .adm-overlay {
  background: radial-gradient(80% 60% at 50% 30%, rgba(220, 38, 38, 0.30), rgba(40, 20, 15, 0.50));
}
[data-theme="light"] .adm-card {
  background:
    radial-gradient(140% 90% at 0% 0%, rgba(220, 38, 38, 0.16), transparent 55%),
    radial-gradient(120% 90% at 100% 0%, rgba(251, 146, 60, 0.10), transparent 60%),
    linear-gradient(180deg, rgba(255, 250, 240, 0.98), rgba(255, 245, 224, 0.99));
  border-color: rgba(220, 38, 38, 0.34);
  box-shadow:
    0 50px 100px -30px rgba(120, 20, 20, 0.38),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
[data-theme="light"] .adm-perf-l {
  background:
    radial-gradient(circle at 50% 5px,  rgba(220, 38, 38, 0.55) 1.4px, transparent 1.8px),
    radial-gradient(circle at 50% 13px, rgba(220, 38, 38, 0.55) 1.4px, transparent 1.8px),
    radial-gradient(circle at 50% 21px, rgba(220, 38, 38, 0.55) 1.4px, transparent 1.8px),
    radial-gradient(circle at 50% 29px, rgba(220, 38, 38, 0.55) 1.4px, transparent 1.8px);
  background-repeat: repeat-y; background-size: 4px 14px;
}
[data-theme="light"] .adm-head { border-bottom-color: rgba(220, 38, 38, 0.28); }
[data-theme="light"] .adm-head h3 { color: var(--hr-text); }
[data-theme="light"] .adm-eyebrow { color: #b91c1c; }
[data-theme="light"] .adm-subtitle { color: var(--hr-text-muted); }
[data-theme="light"] .adm-head-icon {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 65%, #991b1b 100%);
}
[data-theme="light"] .adm-close {
  background: rgba(220, 38, 38, 0.06);
  border-color: rgba(220, 38, 38, 0.20);
  color: var(--hr-text-secondary);
}
[data-theme="light"] .adm-close:hover {
  background: rgba(220, 38, 38, 0.14);
  border-color: rgba(220, 38, 38, 0.42);
  color: var(--hr-text);
}
[data-theme="light"] .adm-target {
  background:
    linear-gradient(135deg, rgba(220, 38, 38, 0.10), rgba(251, 146, 60, 0.06)),
    rgba(255, 250, 240, 0.80);
  border-color: rgba(220, 38, 38, 0.30);
}
[data-theme="light"] .adm-target-icon {
  background: rgba(220, 38, 38, 0.16);
  border-color: rgba(220, 38, 38, 0.42);
  color: #b91c1c;
}
[data-theme="light"] .adm-target-label { color: var(--hr-text); }
[data-theme="light"] .adm-target-tag {
  background: rgba(220, 38, 38, 0.14);
  color: #b91c1c;
  border-color: rgba(220, 38, 38, 0.34);
}
[data-theme="light"] .adm-presets-label { color: var(--hr-text-muted); }
[data-theme="light"] .adm-chip {
  background: rgba(255, 250, 240, 0.72);
  border-color: rgba(40, 25, 10, 0.14);
  color: var(--hr-text-secondary);
}
[data-theme="light"] .adm-chip svg { color: var(--att-orange-500); }
[data-theme="light"] .adm-chip:hover {
  background: rgba(220, 38, 38, 0.10);
  border-color: rgba(220, 38, 38, 0.36);
  color: #b91c1c;
}
[data-theme="light"] .adm-chip:hover svg { color: #b91c1c; }
[data-theme="light"] .adm-field-label { color: var(--hr-text-muted); }
[data-theme="light"] .adm-req { color: #b91c1c; }
[data-theme="light"] .adm-textarea {
  background: rgba(255, 250, 240, 0.78);
  border-color: rgba(40, 25, 10, 0.16);
  color: var(--hr-text);
}
[data-theme="light"] .adm-textarea::placeholder { color: rgba(40, 25, 10, 0.40); }
[data-theme="light"] .adm-textarea:focus {
  border-color: rgba(220, 38, 38, 0.55);
  background: rgba(255, 246, 226, 0.92);
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.14);
}
[data-theme="light"] .adm-textarea.has-error {
  border-color: #dc2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.18);
}
[data-theme="light"] .adm-field-error { color: #b91c1c; }
[data-theme="light"] .adm-warn {
  background: rgba(217, 119, 6, 0.08);
  border-color: rgba(217, 119, 6, 0.32);
  color: var(--hr-text-secondary);
}
[data-theme="light"] .adm-warn svg { color: var(--att-yellow-500); }
[data-theme="light"] .adm-foot {
  border-top-color: rgba(220, 38, 38, 0.26);
}
[data-theme="light"] .adm-foot-meta { color: var(--hr-text-muted); }
[data-theme="light"] .adm-foot-meta svg { color: var(--att-teal-500); }
[data-theme="light"] .adm-confirm {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 65%, #991b1b 100%);
  border-color: rgba(220, 38, 38, 0.55);
  box-shadow: 0 12px 28px -10px rgba(220, 38, 38, 0.55);
}
</style>
