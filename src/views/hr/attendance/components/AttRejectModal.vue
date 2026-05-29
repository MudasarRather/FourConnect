<template>
  <Teleport to="body">
    <transition name="arm-fade">
      <div v-if="open" class="arm-overlay" @click.self="cancel">
        <Motion as="div" class="arm-card"
          :initial="{ opacity: 0, scale: 0.94, y: 18 }"
          :animate="{ opacity: 1, scale: 1, y: 0 }"
          :transition="{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }"
        >
          <!-- ambient decoration -->
          <span class="arm-sheen" />
          <span class="arm-perf-l" />

          <!-- HEADER -->
          <header class="arm-head">
            <div class="arm-head-icon">
              <ShieldX :size="18" />
              <span class="arm-head-icon-pulse" />
            </div>
            <div class="arm-head-text">
              <span class="arm-eyebrow">
                <span class="arm-eyebrow-dot" />
                Reject correction
              </span>
              <h3>{{ title }}</h3>
              <p class="arm-subtitle">{{ subtitle }}</p>
            </div>
            <button class="arm-close" :disabled="submitting" @click="cancel">
              <X :size="16" />
            </button>
          </header>

          <!-- BODY -->
          <div class="arm-body">
            <!-- target summary card -->
            <Motion v-if="targetLabel" class="arm-target"
              :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.34, delay: 0.08, ease: [0.22, 1, 0.36, 1] }"
            >
              <div class="arm-target-icon">
                <component :is="targetIcon || FileWarning" :size="16" />
              </div>
              <div class="arm-target-body">
                <div class="arm-target-label">{{ targetLabel }}</div>
                <div v-if="targetMeta" class="arm-target-meta">
                  <span>{{ targetMeta }}</span>
                  <span v-if="targetTag" class="arm-target-sep">·</span>
                  <span v-if="targetTag" class="arm-target-tag">{{ targetTag }}</span>
                </div>
              </div>
            </Motion>

            <!-- preset chips -->
            <Motion class="arm-presets"
              :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.32, delay: 0.14, ease: [0.22, 1, 0.36, 1] }"
            >
              <span class="arm-presets-label">Common reasons</span>
              <div class="arm-chips">
                <Motion v-for="(p, idx) in presets" :key="p"
                  as="button" type="button" class="arm-chip"
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
            <Motion class="arm-field"
              :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.32, delay: 0.24, ease: [0.22, 1, 0.36, 1] }"
            >
              <label class="arm-field-label">
                Rejection reason
                <span class="arm-req">*</span>
              </label>
              <textarea ref="reasonInputRef"
                v-model="localReason"
                class="arm-textarea"
                :class="{ 'has-error': hasError }"
                rows="4"
                :placeholder="reasonPlaceholder"
                @input="hasError = false"
              />
              <span v-if="hasError" class="arm-field-error">
                <AlertTriangle :size="11" /> A rejection reason is required so the employee knows what to do.
              </span>
            </Motion>

            <!-- info banner -->
            <Motion class="arm-warn"
              :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.32, delay: 0.30, ease: [0.22, 1, 0.36, 1] }"
            >
              <Info :size="13" />
              <span>{{ warning }}</span>
            </Motion>
          </div>

          <!-- FOOTER -->
          <footer class="arm-foot">
            <span class="arm-foot-meta">
              <Hourglass :size="11" /> Rejection is audited · employee will be notified.
            </span>
            <button class="onb-btn-ghost" :disabled="submitting" @click="cancel">Cancel</button>
            <Motion as="button" type="button" class="arm-confirm"
              :whileHover="(submitting || !localReason.trim()) ? {} : { y: -1, scale: 1.02 }"
              :whileTap="(submitting || !localReason.trim()) ? {} : { scale: 0.97 }"
              :transition="{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }"
              :disabled="submitting || !localReason.trim()"
              @click="confirm"
            >
              <Loader2 v-if="submitting" :size="13" class="arm-spin" />
              <XCircle v-else :size="13" />
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
import { ShieldX, AlertTriangle, Loader2, XCircle, Plus, FileWarning, X, Hourglass, Info } from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: 'Reject this correction?' },
  subtitle: { type: String, default: 'Tell the employee why so they can re-submit with the right info.' },
  targetLabel: { type: String, default: '' },
  targetMeta:  { type: String, default: '' },
  targetTag:   { type: String, default: '' },
  targetIcon:  { type: [Object, Function], default: null },
  presets: {
    type: Array,
    default: () => [
      'Insufficient justification',
      'Date/time outside policy',
      'Missing supporting evidence',
      'Duplicate request',
    ],
  },
  reasonPlaceholder: { type: String, default: 'Explain why this correction is being rejected — be specific so the employee can fix and resubmit…' },
  warning: { type: String, default: 'The employee sees this exact note. Keep it clear and respectful.' },
  confirmLabel: { type: String, default: 'Reject correction' },
  submittingLabel: { type: String, default: 'Rejecting…' },
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
  if (!localReason.value.trim()) {
    hasError.value = true
    return
  }
  emit('confirm', localReason.value.trim())
}
</script>

<style scoped>
@import '../../../../styles/attendance-theme.css';

/* ════════════ Overlay ════════════ */
/* z-index 1400 — see AttDeleteModal for the same reasoning: any confirmation
   that destroys/refuses an action must paint above the OnbModal it's
   launched from (which is at 1200). */
.arm-overlay {
  position: fixed; inset: 0; z-index: 1400;
  background: radial-gradient(80% 60% at 50% 30%, rgba(194, 65, 12, 0.42), rgba(0, 0, 0, 0.76));
  backdrop-filter: blur(14px) saturate(140%);
  -webkit-backdrop-filter: blur(14px) saturate(140%);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
}

/* ════════════ Card ════════════ */
.arm-card {
  position: relative;
  width: 100%; max-width: 560px;
  display: flex; flex-direction: column;
  border-radius: 22px;
  overflow: hidden;
  background:
    radial-gradient(140% 90% at 0% 0%, rgba(234, 88, 12, 0.14), transparent 55%),
    radial-gradient(120% 90% at 100% 0%, rgba(251, 191, 36, 0.10), transparent 60%),
    linear-gradient(180deg, rgba(22, 16, 14, 0.97), rgba(14, 10, 8, 0.99));
  border: 1px solid rgba(234, 88, 12, 0.34);
  box-shadow:
    0 50px 100px -30px rgba(0, 0, 0, 0.75),
    0 0 0 1px rgba(234, 88, 12, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  isolation: isolate;
}
/* sheen swipe on entry */
.arm-sheen {
  position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(115deg, transparent 35%, rgba(255, 255, 255, 0.12) 50%, transparent 65%);
  transform: translateX(-100%);
  animation: arm-sheen 1.6s var(--att-spring) 0.25s 1 forwards;
}
@keyframes arm-sheen {
  0%   { transform: translateX(-120%) skewX(-22deg); opacity: 0; }
  40%  { opacity: 0.8; }
  100% { transform: translateX(220%) skewX(-22deg); opacity: 0; }
}
/* perforated stamp edge — amber tone */
.arm-perf-l {
  position: absolute; left: 12px; top: 20px; bottom: 20px; width: 4px;
  background:
    radial-gradient(circle at 50% 5px,  rgba(251, 146, 60, 0.55) 1.4px, transparent 1.8px),
    radial-gradient(circle at 50% 13px, rgba(251, 146, 60, 0.55) 1.4px, transparent 1.8px),
    radial-gradient(circle at 50% 21px, rgba(251, 146, 60, 0.55) 1.4px, transparent 1.8px),
    radial-gradient(circle at 50% 29px, rgba(251, 146, 60, 0.55) 1.4px, transparent 1.8px);
  background-repeat: repeat-y; background-size: 4px 14px;
  opacity: 0.55;
  pointer-events: none;
}

/* ════════════ Header ════════════ */
.arm-head {
  display: grid;
  grid-template-columns: 48px 1fr auto;
  align-items: start;
  gap: 14px;
  padding: 20px 22px 16px 28px;
  border-bottom: 1px dashed rgba(234, 88, 12, 0.22);
}
.arm-head-icon {
  position: relative;
  width: 48px; height: 48px; border-radius: 14px;
  display: inline-flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #fb923c 0%, #ea580c 65%, #c2410c 100%);
  color: #fff;
  box-shadow: 0 10px 28px -8px rgba(234, 88, 12, 0.6);
}
.arm-head-icon-pulse {
  position: absolute; inset: -3px; border-radius: 16px;
  background: radial-gradient(closest-side, rgba(251, 146, 60, 0.55), transparent 70%);
  z-index: -1; opacity: 0.8;
  animation: arm-pulse 2.4s ease-in-out infinite;
}
@keyframes arm-pulse {
  0%, 100% { opacity: 0.55; transform: scale(1); }
  50%      { opacity: 0.9;  transform: scale(1.08); }
}
.arm-head-text { min-width: 0; }
.arm-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 800; letter-spacing: 1.6px;
  text-transform: uppercase; color: #fdba74;
}
.arm-eyebrow-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #fb923c;
  box-shadow: 0 0 8px #fb923c;
  animation: att-live-pulse 2.2s ease-in-out infinite;
}
.arm-head h3 {
  margin: 4px 0 0; font-size: 18px; font-weight: 800;
  letter-spacing: -0.01em; color: var(--hr-text);
}
.arm-subtitle { margin: 4px 0 0; font-size: 12px; color: var(--hr-text-muted); line-height: 1.45; }
.arm-close {
  width: 32px; height: 32px; border-radius: 9px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--hr-text-muted); cursor: pointer;
  transition: background .2s, color .2s, border-color .2s;
}
.arm-close:hover { background: rgba(255, 255, 255, 0.10); color: var(--hr-text); border-color: rgba(234, 88, 12, 0.30); }
.arm-close:disabled { opacity: 0.4; cursor: not-allowed; }

/* ════════════ Body ════════════ */
.arm-body {
  display: flex; flex-direction: column; gap: 16px;
  padding: 18px 26px 18px 32px;
  max-height: 60vh; overflow-y: auto;
}

/* target card */
.arm-target {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 14px;
  border-radius: 14px;
  background:
    linear-gradient(135deg, rgba(234, 88, 12, 0.12), rgba(251, 191, 36, 0.04)),
    rgba(20, 16, 12, 0.42);
  border: 1px solid rgba(234, 88, 12, 0.26);
  backdrop-filter: blur(10px);
}
.arm-target-icon {
  width: 38px; height: 38px; border-radius: 10px;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(234, 88, 12, 0.20);
  border: 1px solid rgba(234, 88, 12, 0.40);
  color: #fdba74;
  flex-shrink: 0;
}
.arm-target-body { min-width: 0; flex: 1; }
.arm-target-label { font-size: 13.5px; font-weight: 700; color: var(--hr-text); }
.arm-target-meta {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11px; color: var(--hr-text-muted);
  margin-top: 2px;
}
.arm-target-sep { opacity: 0.45; }
.arm-target-tag {
  font-weight: 700; letter-spacing: 0.5px; font-size: 9.5px;
  padding: 2px 7px; border-radius: 5px;
  background: rgba(234, 88, 12, 0.18); color: #fdba74;
  text-transform: uppercase;
  border: 1px solid rgba(234, 88, 12, 0.32);
}

/* presets */
.arm-presets { display: flex; flex-direction: column; gap: 8px; }
.arm-presets-label {
  font-size: 10px; font-weight: 800; letter-spacing: 1.4px;
  text-transform: uppercase; color: var(--hr-text-muted);
}
.arm-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.arm-chip {
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
.arm-chip:hover {
  border-color: rgba(234, 88, 12, 0.50);
  background: rgba(234, 88, 12, 0.12);
  color: #fdba74;
}
.arm-chip svg { color: #fb923c; }
.arm-chip:hover svg { color: #fdba74; }

/* reason textarea */
.arm-field { display: flex; flex-direction: column; gap: 6px; }
.arm-field-label {
  font-size: 11px; font-weight: 800; letter-spacing: 1px;
  text-transform: uppercase; color: var(--hr-text-muted);
  display: inline-flex; align-items: center; gap: 8px;
}
.arm-req { color: #fb923c; font-weight: 800; }
.arm-textarea {
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
.arm-textarea::placeholder { color: rgba(255, 255, 255, 0.35); }
.arm-textarea:focus {
  border-color: rgba(234, 88, 12, 0.55);
  background: rgba(234, 88, 12, 0.05);
  box-shadow: 0 0 0 3px rgba(234, 88, 12, 0.14);
}
.arm-textarea.has-error {
  border-color: #fb923c;
  box-shadow: 0 0 0 3px rgba(251, 146, 60, 0.20);
  animation: arm-shake 0.36s ease-in-out;
}
@keyframes arm-shake {
  0%, 100% { transform: translateX(0); }
  20%      { transform: translateX(-3px); }
  40%      { transform: translateX(3px); }
  60%      { transform: translateX(-2px); }
  80%      { transform: translateX(2px); }
}
.arm-field-error {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; color: #fb923c;
}

/* info banner */
.arm-warn {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 11.5px; color: var(--hr-text-muted);
  padding: 9px 13px;
  border-radius: 10px;
  background: rgba(20, 184, 166, 0.06);
  border: 1px dashed rgba(20, 184, 166, 0.28);
  line-height: 1.45;
}
.arm-warn svg { color: var(--att-success-100); flex-shrink: 0; }

/* ════════════ Footer ════════════ */
.arm-foot {
  display: flex; gap: 10px; align-items: center;
  padding: 14px 22px;
  border-top: 1px dashed rgba(234, 88, 12, 0.22);
}
.arm-foot-meta {
  display: inline-flex; align-items: center; gap: 5px;
  flex: 1;
  font-size: 10.5px; font-weight: 600; letter-spacing: 0.5px;
  color: var(--hr-text-dim); text-transform: uppercase;
}
.arm-foot-meta svg { color: var(--att-yellow-300); }

.arm-confirm {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 9px 18px;
  border-radius: 11px;
  background: linear-gradient(135deg, #fb923c 0%, #ea580c 65%, #c2410c 100%);
  color: #fff;
  font: inherit; font-size: 12.5px; font-weight: 800; letter-spacing: 0.3px;
  border: 1px solid rgba(234, 88, 12, 0.55);
  cursor: pointer;
  box-shadow: 0 12px 28px -10px rgba(234, 88, 12, 0.6);
  transition: filter .22s, box-shadow .22s, transform .18s;
}
.arm-confirm:hover:not(:disabled) {
  filter: brightness(1.06);
  box-shadow: 0 16px 36px -10px rgba(234, 88, 12, 0.75);
}
.arm-confirm:disabled { opacity: 0.45; cursor: not-allowed; }
.arm-spin { animation: arm-spin 0.85s linear infinite; }
@keyframes arm-spin { to { transform: rotate(360deg); } }

/* ════════════ Transitions ════════════ */
.arm-fade-enter-active, .arm-fade-leave-active { transition: opacity .26s ease; }
.arm-fade-enter-from, .arm-fade-leave-to { opacity: 0; }

/* ════════════════════ LIGHT THEME ════════════════════ */
[data-theme="light"] .arm-overlay {
  background: radial-gradient(80% 60% at 50% 30%, rgba(194, 65, 12, 0.30), rgba(40, 20, 15, 0.50));
}
[data-theme="light"] .arm-card {
  background:
    radial-gradient(140% 90% at 0% 0%, rgba(194, 65, 12, 0.16), transparent 55%),
    radial-gradient(120% 90% at 100% 0%, rgba(251, 191, 36, 0.10), transparent 60%),
    linear-gradient(180deg, rgba(255, 250, 240, 0.98), rgba(255, 245, 224, 0.99));
  border-color: rgba(194, 65, 12, 0.34);
  box-shadow:
    0 50px 100px -30px rgba(120, 60, 20, 0.38),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
[data-theme="light"] .arm-perf-l {
  background:
    radial-gradient(circle at 50% 5px,  rgba(194, 65, 12, 0.55) 1.4px, transparent 1.8px),
    radial-gradient(circle at 50% 13px, rgba(194, 65, 12, 0.55) 1.4px, transparent 1.8px),
    radial-gradient(circle at 50% 21px, rgba(194, 65, 12, 0.55) 1.4px, transparent 1.8px),
    radial-gradient(circle at 50% 29px, rgba(194, 65, 12, 0.55) 1.4px, transparent 1.8px);
  background-repeat: repeat-y; background-size: 4px 14px;
}
[data-theme="light"] .arm-head { border-bottom-color: rgba(194, 65, 12, 0.28); }
[data-theme="light"] .arm-head h3 { color: var(--hr-text); }
[data-theme="light"] .arm-eyebrow { color: #9a3412; }
[data-theme="light"] .arm-subtitle { color: var(--hr-text-muted); }
[data-theme="light"] .arm-head-icon {
  background: linear-gradient(135deg, #fb923c 0%, #ea580c 65%, #9a3412 100%);
}
[data-theme="light"] .arm-close {
  background: rgba(194, 65, 12, 0.06);
  border-color: rgba(194, 65, 12, 0.20);
  color: var(--hr-text-secondary);
}
[data-theme="light"] .arm-close:hover {
  background: rgba(194, 65, 12, 0.14);
  border-color: rgba(194, 65, 12, 0.42);
  color: var(--hr-text);
}
[data-theme="light"] .arm-target {
  background:
    linear-gradient(135deg, rgba(194, 65, 12, 0.10), rgba(251, 191, 36, 0.06)),
    rgba(255, 250, 240, 0.80);
  border-color: rgba(194, 65, 12, 0.30);
}
[data-theme="light"] .arm-target-icon {
  background: rgba(194, 65, 12, 0.16);
  border-color: rgba(194, 65, 12, 0.42);
  color: #9a3412;
}
[data-theme="light"] .arm-target-label { color: var(--hr-text); }
[data-theme="light"] .arm-target-tag {
  background: rgba(194, 65, 12, 0.14);
  color: #9a3412;
  border-color: rgba(194, 65, 12, 0.34);
}
[data-theme="light"] .arm-presets-label { color: var(--hr-text-muted); }
[data-theme="light"] .arm-chip {
  background: rgba(255, 250, 240, 0.72);
  border-color: rgba(40, 25, 10, 0.14);
  color: var(--hr-text-secondary);
}
[data-theme="light"] .arm-chip svg { color: #c2410c; }
[data-theme="light"] .arm-chip:hover {
  background: rgba(194, 65, 12, 0.10);
  border-color: rgba(194, 65, 12, 0.36);
  color: #9a3412;
}
[data-theme="light"] .arm-chip:hover svg { color: #9a3412; }
[data-theme="light"] .arm-field-label { color: var(--hr-text-muted); }
[data-theme="light"] .arm-req { color: #c2410c; }
[data-theme="light"] .arm-textarea {
  background: rgba(255, 250, 240, 0.78);
  border-color: rgba(40, 25, 10, 0.16);
  color: var(--hr-text);
}
[data-theme="light"] .arm-textarea::placeholder { color: rgba(40, 25, 10, 0.40); }
[data-theme="light"] .arm-textarea:focus {
  border-color: rgba(194, 65, 12, 0.55);
  background: rgba(255, 246, 226, 0.92);
  box-shadow: 0 0 0 3px rgba(194, 65, 12, 0.14);
}
[data-theme="light"] .arm-textarea.has-error {
  border-color: #c2410c;
  box-shadow: 0 0 0 3px rgba(194, 65, 12, 0.18);
}
[data-theme="light"] .arm-field-error { color: #9a3412; }
[data-theme="light"] .arm-warn {
  background: rgba(13, 148, 136, 0.08);
  border-color: rgba(13, 148, 136, 0.32);
  color: var(--hr-text-secondary);
}
[data-theme="light"] .arm-warn svg { color: #0f766e; }
[data-theme="light"] .arm-foot {
  border-top-color: rgba(194, 65, 12, 0.26);
}
[data-theme="light"] .arm-foot-meta { color: var(--hr-text-muted); }
[data-theme="light"] .arm-foot-meta svg { color: var(--att-yellow-500); }
[data-theme="light"] .arm-confirm {
  background: linear-gradient(135deg, #ea580c 0%, #c2410c 65%, #9a3412 100%);
  border-color: rgba(194, 65, 12, 0.55);
  box-shadow: 0 12px 28px -10px rgba(194, 65, 12, 0.55);
}
</style>
