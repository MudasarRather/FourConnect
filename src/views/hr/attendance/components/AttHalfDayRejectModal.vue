<template>
  <Teleport to="body">
    <transition name="hrm-fade">
      <div v-if="open && target" class="hrm-overlay" @click.self="cancel">
        <Motion as="div" class="hrm-card"
          :initial="{ opacity: 0, scale: 0.92, y: 24 }"
          :animate="{ opacity: 1, scale: 1, y: 0 }"
          :transition="{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }"
        >
          <!-- ambient decoration -->
          <span class="hrm-sheen" />
          <span class="hrm-perf-l" />

          <!-- ═══════ HEADER ═══════ -->
          <header class="hrm-head">
            <div class="hrm-head-icon">
              <ShieldAlert :size="18" />
              <span class="hrm-head-icon-pulse" />
            </div>
            <div class="hrm-head-text">
              <span class="hrm-eyebrow">
                <span class="hrm-eyebrow-dot" />
                Reject half-day request
              </span>
              <h3>Decline this time-off?</h3>
              <p class="hrm-subtitle">
                The employee gets notified with the note below — be specific so they can re-submit
                with the right context.
              </p>
            </div>
            <button class="hrm-close" :disabled="submitting" @click="cancel" aria-label="Close">
              <X :size="16" />
            </button>
          </header>

          <!-- ═══════ BODY ═══════ -->
          <div class="hrm-body">
            <!-- Request summary card with half-of-day visual -->
            <Motion class="hrm-target"
              :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.36, delay: 0.08, ease: [0.22, 1, 0.36, 1] }"
            >
              <div class="hrm-target-date">
                <span class="hrm-tgt-day">{{ formatDay(target.half_day_date) }}</span>
                <span class="hrm-tgt-mon">{{ formatMonth(target.half_day_date) }}</span>
                <span class="hrm-tgt-yr">{{ formatYear(target.half_day_date) }}</span>
              </div>
              <div class="hrm-target-half" :data-half="target.which_half">
                <div class="hrm-target-half-track">
                  <span class="hrm-target-am">AM</span>
                  <span class="hrm-target-divider" />
                  <span class="hrm-target-pm">PM</span>
                  <Motion class="hrm-target-fill"
                    :initial="{ scaleX: 0 }"
                    :animate="{ scaleX: 1 }"
                    :transition="{ duration: 0.55, delay: 0.22, ease: [0.22, 1, 0.36, 1] }"
                  />
                </div>
                <span class="hrm-target-half-tag">{{ target.which_half === 'FIRST' ? '1st half off' : '2nd half off' }}</span>
              </div>
              <div class="hrm-target-body">
                <div class="hrm-target-name">{{ target.employee_name || 'Unknown' }}<span class="hrm-target-dot">·</span><span class="hrm-target-code">{{ target.employee_code || '—' }}</span></div>
                <div class="hrm-target-dept">{{ target.department || '—' }}</div>
                <div class="hrm-target-reason">
                  <span class="hrm-target-rtype" :data-type="target.reason_type">
                    <component :is="reasonIcon(target.reason_type)" :size="10" />
                    {{ target.reason_type }}
                  </span>
                  <span class="hrm-target-rtxt"><Quote :size="10" />{{ target.reason }}</span>
                </div>
              </div>
            </Motion>

            <!-- Preset reasons -->
            <Motion class="hrm-presets"
              :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.34, delay: 0.16, ease: [0.22, 1, 0.36, 1] }"
            >
              <div class="hrm-presets-row">
                <span class="hrm-presets-label">
                  <Lightbulb :size="11" />Quick reasons
                </span>
                <span class="hrm-presets-hint">tap to append</span>
              </div>
              <div class="hrm-chips">
                <Motion v-for="(p, idx) in PRESETS" :key="p"
                  as="button" type="button" class="hrm-chip"
                  :initial="{ opacity: 0, scale: 0.85 }"
                  :animate="{ opacity: 1, scale: 1 }"
                  :transition="{ duration: 0.28, delay: 0.20 + idx * 0.04, ease: [0.34, 1.56, 0.64, 1] }"
                  :whileHover="{ y: -2, scale: 1.04 }"
                  :whileTap="{ scale: 0.94 }"
                  @click="appendPreset(p)"
                >
                  <Plus :size="11" />{{ p }}
                </Motion>
              </div>
            </Motion>

            <!-- Reason textarea -->
            <Motion class="hrm-field"
              :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.34, delay: 0.26, ease: [0.22, 1, 0.36, 1] }"
            >
              <div class="hrm-field-head">
                <label class="hrm-field-label">
                  Your decision note <span class="hrm-req">*</span>
                </label>
                <span class="hrm-counter" :data-state="counterState">
                  {{ localReason.length }} / {{ MAX_CHARS }}
                </span>
              </div>
              <textarea
                ref="reasonInputRef"
                v-model="localReason"
                class="hrm-textarea"
                :class="{ 'has-error': hasError }"
                rows="4"
                :maxlength="MAX_CHARS"
                placeholder="e.g. Conflicts with the Tuesday client demo — please choose a different date or split the time off across two short breaks instead."
                @input="hasError = false"
              />
              <span v-if="hasError" class="hrm-field-error">
                <AlertTriangle :size="11" /> Please tell the employee why so they can adjust and re-submit.
              </span>
            </Motion>

            <!-- Live preview of what the employee will see -->
            <Motion v-if="localReason.trim()" class="hrm-preview"
              :initial="{ opacity: 0, y: 8, height: 0 }"
              :animate="{ opacity: 1, y: 0, height: 'auto' }"
              :transition="{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }"
            >
              <div class="hrm-preview-tag">
                <Eye :size="11" />What the employee will see
              </div>
              <div class="hrm-preview-card">
                <div class="hrm-preview-status">
                  <span class="hrm-preview-dot" />REJECTED
                </div>
                <div class="hrm-preview-when">{{ formatLongDate(target.half_day_date) }} · {{ target.which_half === 'FIRST' ? '1st half' : '2nd half' }}</div>
                <div class="hrm-preview-note">
                  <Siren :size="11" />
                  <span>{{ localReason }}</span>
                </div>
              </div>
            </Motion>
          </div>

          <!-- ═══════ FOOTER ═══════ -->
          <footer class="hrm-foot">
            <span class="hrm-foot-meta">
              <Hourglass :size="11" /> Logged to audit trail
            </span>
            <button class="hrm-btn hrm-btn-ghost" :disabled="submitting" @click="cancel">Cancel</button>
            <Motion as="button" type="button" class="hrm-confirm"
              :whileHover="(submitting || !localReason.trim()) ? {} : { y: -1, scale: 1.025 }"
              :whileTap="(submitting || !localReason.trim()) ? {} : { scale: 0.97 }"
              :transition="{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }"
              :disabled="submitting || !localReason.trim()"
              @click="confirm"
            >
              <Loader2 v-if="submitting" :size="13" class="hrm-spin" />
              <Send v-else :size="13" />
              {{ submitting ? 'Sending…' : 'Send rejection' }}
            </Motion>
          </footer>
        </Motion>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { Motion } from 'motion-v'
import {
  ShieldAlert, AlertTriangle, Loader2, Plus, X, Hourglass,
  Quote, Lightbulb, Eye, Siren, Send,
  Heart, HeartPulse, Briefcase, Users, Sparkles,
} from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  target: { type: Object, default: null },     // half-day row being rejected
  submitting: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'confirm'])

const MAX_CHARS = 400
const PRESETS = [
  'Conflicts with active project deadline',
  'Critical business day — please reschedule',
  'Insufficient justification — share more context',
  'Already used monthly half-day quota',
  'Team capacity too low on this date',
]

const REASON_ICON_MAP = {
  PERSONAL: Heart,
  MEDICAL:  HeartPulse,
  FAMILY:   Users,
  OFFICIAL: Briefcase,
  OTHER:    Sparkles,
}
const reasonIcon = (t) => REASON_ICON_MAP[t] || Sparkles

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

const counterState = computed(() => {
  const n = localReason.value.length
  if (n > MAX_CHARS - 40) return 'warn'
  if (n >= 4) return 'ok'
  return ''
})

const appendPreset = (preset) => {
  // Stack presets (separated by " · ") instead of replacing — admins often
  // want to combine "conflicts with deadline + already used quota".
  const cur = localReason.value.trim()
  const next = cur ? `${cur} · ${preset}` : preset
  localReason.value = next.slice(0, MAX_CHARS)
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
    nextTick(() => reasonInputRef.value?.focus())
    return
  }
  emit('confirm', localReason.value.trim())
}

const formatDay = (iso) => iso ? String(new Date(iso).getDate()).padStart(2, '0') : '--'
const formatMonth = (iso) => iso ? new Date(iso).toLocaleString('en-IN', { month: 'short' }).toUpperCase() : '--'
const formatYear = (iso) => iso ? new Date(iso).getFullYear() : ''
const formatLongDate = (iso) => iso
  ? new Date(iso).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short', year: 'numeric' })
  : '—'
</script>

<style scoped>
@import '../../../../styles/attendance-theme.css';

/* ═════════════════════ Overlay ═════════════════════ */
.hrm-overlay {
  position: fixed; inset: 0; z-index: 1400;
  background:
    radial-gradient(80% 60% at 50% 30%, rgba(248, 113, 113, 0.30), rgba(0, 0, 0, 0.78));
  backdrop-filter: blur(16px) saturate(140%);
  -webkit-backdrop-filter: blur(16px) saturate(140%);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
}

/* ═════════════════════ Card ═════════════════════ */
.hrm-card {
  position: relative;
  width: 100%; max-width: 600px;
  max-height: calc(100vh - 56px);
  display: flex; flex-direction: column;
  border-radius: 24px;
  overflow: hidden;
  background:
    radial-gradient(140% 90% at 0% 0%, rgba(248, 113, 113, 0.16), transparent 55%),
    radial-gradient(120% 90% at 100% 0%, rgba(251, 146, 60, 0.12), transparent 60%),
    linear-gradient(180deg, rgba(22, 16, 14, 0.97), rgba(14, 10, 8, 0.99));
  border: 1px solid rgba(248, 113, 113, 0.36);
  box-shadow:
    0 50px 100px -30px rgba(0, 0, 0, 0.78),
    0 0 0 1px rgba(248, 113, 113, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.07);
  isolation: isolate;
}
.hrm-sheen {
  position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(115deg, transparent 35%, rgba(255, 255, 255, 0.14) 50%, transparent 65%);
  transform: translateX(-100%);
  animation: hrm-sheen 1.7s var(--att-spring, ease-out) 0.28s 1 forwards;
}
@keyframes hrm-sheen {
  0%   { transform: translateX(-120%) skewX(-22deg); opacity: 0; }
  40%  { opacity: 0.85; }
  100% { transform: translateX(220%) skewX(-22deg); opacity: 0; }
}
.hrm-perf-l {
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

/* ═════════════════════ Header ═════════════════════ */
.hrm-head {
  display: grid;
  grid-template-columns: 48px 1fr auto;
  align-items: start;
  gap: 14px;
  padding: 22px 24px 16px 30px;
  border-bottom: 1px dashed rgba(248, 113, 113, 0.24);
}
.hrm-head-icon {
  position: relative;
  width: 48px; height: 48px; border-radius: 14px;
  display: inline-flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 65%, #b91c1c 100%);
  color: #fff;
  box-shadow: 0 12px 30px -10px rgba(220, 38, 38, 0.7);
}
.hrm-head-icon-pulse {
  position: absolute; inset: -4px; border-radius: 16px;
  background: radial-gradient(closest-side, rgba(248, 113, 113, 0.55), transparent 70%);
  z-index: -1; opacity: 0.8;
  animation: hrm-pulse 2.4s ease-in-out infinite;
}
@keyframes hrm-pulse {
  0%, 100% { opacity: 0.55; transform: scale(1); }
  50%      { opacity: 0.95; transform: scale(1.10); }
}
.hrm-head-text { min-width: 0; }
.hrm-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 800; letter-spacing: 1.7px;
  text-transform: uppercase; color: #fca5a5;
}
.hrm-eyebrow-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #f87171;
  box-shadow: 0 0 8px #f87171;
  animation: hrm-pulse 2.2s ease-in-out infinite;
}
.hrm-head h3 {
  margin: 5px 0 0; font-size: 19px; font-weight: 900;
  letter-spacing: -0.015em; color: var(--hr-text);
}
.hrm-subtitle {
  margin: 5px 0 0; font-size: 12.5px; color: var(--hr-text-muted);
  line-height: 1.45;
}
.hrm-close {
  width: 32px; height: 32px; border-radius: 9px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--hr-text-muted); cursor: pointer;
  transition: background .2s, color .2s, border-color .2s;
}
.hrm-close:hover { background: rgba(255, 255, 255, 0.10); color: var(--hr-text); border-color: rgba(248, 113, 113, 0.32); }
.hrm-close:disabled { opacity: 0.4; cursor: not-allowed; }

/* ═════════════════════ Body ═════════════════════ */
.hrm-body {
  display: flex; flex-direction: column; gap: 16px;
  padding: 18px 28px 18px 32px;
  overflow-y: auto;
}

/* Request summary card (date + half-of-day + employee + reason) */
.hrm-target {
  display: grid;
  grid-template-columns: 64px auto 1fr;
  gap: 14px;
  align-items: center;
  padding: 14px 16px;
  border-radius: 16px;
  background:
    linear-gradient(135deg, rgba(248, 113, 113, 0.12), rgba(251, 146, 60, 0.04)),
    rgba(20, 16, 12, 0.50);
  border: 1px solid rgba(248, 113, 113, 0.28);
  backdrop-filter: blur(10px);
}
.hrm-target-date {
  display: flex; flex-direction: column; align-items: flex-start; gap: 1px;
  padding-right: 14px;
  border-right: 1px dashed rgba(248, 113, 113, 0.30);
}
.hrm-tgt-day { font-size: 30px; font-weight: 900; line-height: 1; color: var(--hr-text); font-variant-numeric: tabular-nums; }
.hrm-tgt-mon { font-size: 9.5px; letter-spacing: 1.5px; font-weight: 800; color: #fca5a5; }
.hrm-tgt-yr  { font-size: 9px; color: var(--hr-text-muted); font-weight: 600; }

.hrm-target-half { display: flex; flex-direction: column; gap: 4px; }
.hrm-target-half-track {
  position: relative;
  display: flex; align-items: center;
  width: 92px; height: 22px;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(248, 113, 113, 0.22);
  overflow: hidden;
}
.hrm-target-am, .hrm-target-pm {
  position: relative; z-index: 2;
  flex: 1; text-align: center;
  font-size: 9px; font-weight: 800; letter-spacing: 1px;
  color: var(--hr-text-muted);
}
.hrm-target-divider {
  width: 1px; height: 100%;
  background: rgba(248, 113, 113, 0.30);
  position: relative; z-index: 2;
}
.hrm-target-fill {
  position: absolute; top: 0; bottom: 0;
  background: linear-gradient(135deg, rgba(248, 113, 113, 0.45), rgba(251, 146, 60, 0.30));
  transform-origin: left center;
}
.hrm-target-half[data-half="FIRST"]  .hrm-target-fill { left: 0;   right: 50%; }
.hrm-target-half[data-half="SECOND"] .hrm-target-fill { left: 50%; right: 0;   }
.hrm-target-half[data-half="FIRST"]  .hrm-target-am { color: #fca5a5; }
.hrm-target-half[data-half="SECOND"] .hrm-target-pm { color: #fca5a5; }
.hrm-target-half-tag {
  font-size: 9px; letter-spacing: 0.4px; font-weight: 700;
  color: var(--hr-text-muted);
}

.hrm-target-body { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.hrm-target-name { font-size: 13.5px; font-weight: 800; color: var(--hr-text); }
.hrm-target-dot { margin: 0 6px; color: var(--hr-text-muted); opacity: 0.55; font-weight: 400; }
.hrm-target-code { font-size: 11px; font-weight: 700; color: #fca5a5; }
.hrm-target-dept { font-size: 10.5px; color: var(--hr-text-muted); font-weight: 600; }
.hrm-target-reason { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; margin-top: 2px; }
.hrm-target-rtype {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 9px; font-weight: 800; letter-spacing: 0.5px;
}
.hrm-target-rtype[data-type="PERSONAL"] { background: rgba(244, 114, 182, 0.16); color: #f9a8d4; }
.hrm-target-rtype[data-type="MEDICAL"]  { background: rgba(220, 38, 38, 0.16);   color: #fca5a5; }
.hrm-target-rtype[data-type="FAMILY"]   { background: rgba(251, 191, 36, 0.16);  color: #fcd34d; }
.hrm-target-rtype[data-type="OFFICIAL"] { background: rgba(20, 184, 166, 0.16);  color: #5eead4; }
.hrm-target-rtype[data-type="OTHER"]    { background: rgba(148, 163, 184, 0.16); color: #cbd5e1; }
.hrm-target-rtxt {
  display: inline-flex; align-items: center; gap: 4px;
  font-style: italic; font-size: 11px; color: var(--hr-text-muted);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  max-width: 280px;
}

/* Presets */
.hrm-presets { display: flex; flex-direction: column; gap: 8px; }
.hrm-presets-row {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
}
.hrm-presets-label {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 800; letter-spacing: 1.4px;
  text-transform: uppercase; color: #fcd34d;
}
.hrm-presets-hint {
  font-size: 9.5px; font-weight: 600; color: var(--hr-text-muted); font-style: italic;
}
.hrm-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.hrm-chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 11px;
  font-size: 11px; font-weight: 700;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.10);
  color: var(--hr-text-secondary);
  cursor: pointer;
  transition: border-color .2s, background .2s, color .2s;
}
.hrm-chip:hover {
  border-color: rgba(248, 113, 113, 0.45);
  background: rgba(248, 113, 113, 0.10);
  color: #fca5a5;
}
.hrm-chip svg { color: var(--att-orange-200); }
.hrm-chip:hover svg { color: #fca5a5; }

/* Field */
.hrm-field { display: flex; flex-direction: column; gap: 6px; }
.hrm-field-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.hrm-field-label {
  font-size: 10.5px; font-weight: 800; letter-spacing: 1px;
  text-transform: uppercase; color: var(--hr-text-muted);
}
.hrm-req { color: #f87171; font-weight: 800; }
.hrm-counter {
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.4px;
  color: var(--hr-text-muted); font-variant-numeric: tabular-nums;
  padding: 2px 7px; border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: color .2s, background .2s, border-color .2s;
}
.hrm-counter[data-state="ok"] {
  color: #5eead4; background: rgba(20, 184, 166, 0.10); border-color: rgba(20, 184, 166, 0.30);
}
.hrm-counter[data-state="warn"] {
  color: #fbbf24; background: rgba(251, 191, 36, 0.10); border-color: rgba(251, 191, 36, 0.30);
}
.hrm-textarea {
  width: 100%;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.10);
  border-radius: 12px;
  padding: 12px 14px;
  font-size: 13px; line-height: 1.55;
  color: var(--hr-text); font-family: inherit;
  resize: vertical; min-height: 100px;
  outline: none;
  transition: border-color .22s, box-shadow .22s, background .22s;
}
.hrm-textarea::placeholder { color: rgba(255, 255, 255, 0.36); }
.hrm-textarea:focus {
  border-color: rgba(248, 113, 113, 0.55);
  background: rgba(248, 113, 113, 0.06);
  box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.16);
}
.hrm-textarea.has-error {
  border-color: #f87171;
  box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.22);
  animation: hrm-shake 0.36s ease-in-out;
}
@keyframes hrm-shake {
  0%, 100% { transform: translateX(0); }
  20%      { transform: translateX(-4px); }
  40%      { transform: translateX(4px); }
  60%      { transform: translateX(-2px); }
  80%      { transform: translateX(2px); }
}
.hrm-field-error {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; color: #f87171; font-weight: 600;
}

/* Live preview */
.hrm-preview {
  display: flex; flex-direction: column; gap: 6px;
  overflow: hidden;
}
.hrm-preview-tag {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; letter-spacing: 1.4px; text-transform: uppercase;
  font-weight: 800; color: var(--hr-text-muted);
}
.hrm-preview-tag svg { color: #fca5a5; }
.hrm-preview-card {
  border-radius: 12px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed rgba(248, 113, 113, 0.30);
  display: flex; flex-direction: column; gap: 5px;
}
.hrm-preview-status {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 1px;
  color: #fca5a5;
  align-self: flex-start;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(248, 113, 113, 0.14);
}
.hrm-preview-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #f87171; box-shadow: 0 0 6px #f87171;
}
.hrm-preview-when {
  font-size: 12px; font-weight: 700; color: var(--hr-text);
}
.hrm-preview-note {
  display: flex; gap: 6px; align-items: flex-start;
  font-size: 11.5px; color: var(--hr-text-muted); font-style: italic;
  line-height: 1.5;
}
.hrm-preview-note svg { color: #fca5a5; flex-shrink: 0; margin-top: 2px; }
.hrm-preview-note span { word-break: break-word; }

/* ═════════════════════ Footer ═════════════════════ */
.hrm-foot {
  display: flex; gap: 10px; align-items: center;
  padding: 14px 24px;
  border-top: 1px dashed rgba(248, 113, 113, 0.24);
}
.hrm-foot-meta {
  display: inline-flex; align-items: center; gap: 5px;
  flex: 1;
  font-size: 10.5px; font-weight: 600; letter-spacing: 0.5px;
  color: var(--hr-text-muted); text-transform: uppercase;
}
.hrm-foot-meta svg { color: var(--att-teal-100); }

.hrm-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 16px;
  border-radius: 11px;
  font: inherit; font-size: 12.5px; font-weight: 800; letter-spacing: 0.3px;
  border: 1px solid;
  cursor: pointer;
  transition: background .2s, color .2s, border-color .2s;
}
.hrm-btn-ghost {
  background: transparent;
  color: var(--hr-text-muted);
  border-color: rgba(255, 255, 255, 0.10);
}
.hrm-btn-ghost:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.16);
  color: var(--hr-text);
}
.hrm-confirm {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 9px 20px;
  border-radius: 11px;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 65%, #b91c1c 100%);
  color: #fff;
  font: inherit; font-size: 12.5px; font-weight: 800; letter-spacing: 0.3px;
  border: 1px solid rgba(248, 113, 113, 0.55);
  cursor: pointer;
  box-shadow: 0 12px 28px -10px rgba(220, 38, 38, 0.65);
  transition: filter .22s, box-shadow .22s;
}
.hrm-confirm:hover:not(:disabled) {
  filter: brightness(1.08);
  box-shadow: 0 18px 38px -10px rgba(220, 38, 38, 0.78);
}
.hrm-confirm:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
.hrm-spin { animation: hrm-spin 0.85s linear infinite; }
@keyframes hrm-spin { to { transform: rotate(360deg); } }

/* ═════════════════════ Transitions ═════════════════════ */
.hrm-fade-enter-active, .hrm-fade-leave-active { transition: opacity .28s ease; }
.hrm-fade-enter-from, .hrm-fade-leave-to { opacity: 0; }

/* ═════════════════════ LIGHT THEME ═════════════════════ */
[data-theme="light"] .hrm-overlay {
  background: radial-gradient(80% 60% at 50% 30%, rgba(220, 38, 38, 0.32), rgba(40, 20, 15, 0.55));
}
[data-theme="light"] .hrm-card {
  background:
    radial-gradient(140% 90% at 0% 0%, rgba(220, 38, 38, 0.16), transparent 55%),
    radial-gradient(120% 90% at 100% 0%, rgba(251, 146, 60, 0.10), transparent 60%),
    linear-gradient(180deg, rgba(255, 250, 240, 0.98), rgba(255, 245, 224, 0.99));
  border-color: rgba(220, 38, 38, 0.36);
  box-shadow:
    0 50px 100px -30px rgba(120, 20, 20, 0.40),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
[data-theme="light"] .hrm-perf-l {
  background:
    radial-gradient(circle at 50% 5px,  rgba(220, 38, 38, 0.55) 1.4px, transparent 1.8px),
    radial-gradient(circle at 50% 13px, rgba(220, 38, 38, 0.55) 1.4px, transparent 1.8px),
    radial-gradient(circle at 50% 21px, rgba(220, 38, 38, 0.55) 1.4px, transparent 1.8px),
    radial-gradient(circle at 50% 29px, rgba(220, 38, 38, 0.55) 1.4px, transparent 1.8px);
  background-repeat: repeat-y; background-size: 4px 14px;
}
[data-theme="light"] .hrm-head { border-bottom-color: rgba(220, 38, 38, 0.30); }
[data-theme="light"] .hrm-eyebrow { color: #b91c1c; }
[data-theme="light"] .hrm-head h3 { color: var(--hr-text); }
[data-theme="light"] .hrm-subtitle { color: var(--hr-text-muted); }
[data-theme="light"] .hrm-head-icon {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 65%, #991b1b 100%);
}
[data-theme="light"] .hrm-close {
  background: rgba(220, 38, 38, 0.06);
  border-color: rgba(220, 38, 38, 0.22);
  color: var(--hr-text-secondary);
}
[data-theme="light"] .hrm-close:hover {
  background: rgba(220, 38, 38, 0.14);
  border-color: rgba(220, 38, 38, 0.44);
  color: var(--hr-text);
}
[data-theme="light"] .hrm-target {
  background:
    linear-gradient(135deg, rgba(220, 38, 38, 0.10), rgba(251, 146, 60, 0.06)),
    rgba(255, 250, 240, 0.85);
  border-color: rgba(220, 38, 38, 0.32);
}
[data-theme="light"] .hrm-target-date { border-right-color: rgba(220, 38, 38, 0.34); }
[data-theme="light"] .hrm-tgt-mon { color: #b91c1c; }
[data-theme="light"] .hrm-target-name { color: var(--hr-text); }
[data-theme="light"] .hrm-target-code { color: #b91c1c; }
[data-theme="light"] .hrm-target-half-track {
  background: rgba(255, 255, 255, 0.55);
  border-color: rgba(220, 38, 38, 0.26);
}
[data-theme="light"] .hrm-target-divider { background: rgba(220, 38, 38, 0.30); }
[data-theme="light"] .hrm-target-half[data-half="FIRST"]  .hrm-target-am { color: #b91c1c; }
[data-theme="light"] .hrm-target-half[data-half="SECOND"] .hrm-target-pm { color: #b91c1c; }
[data-theme="light"] .hrm-target-rtype[data-type="PERSONAL"] { background: rgba(244, 114, 182, 0.20); color: #be185d; }
[data-theme="light"] .hrm-target-rtype[data-type="MEDICAL"]  { background: rgba(220, 38, 38, 0.20);   color: #7f1d1d; }
[data-theme="light"] .hrm-target-rtype[data-type="FAMILY"]   { background: rgba(251, 191, 36, 0.30);  color: #92400e; }
[data-theme="light"] .hrm-target-rtype[data-type="OFFICIAL"] { background: rgba(20, 184, 166, 0.20);  color: #115e59; }
[data-theme="light"] .hrm-target-rtype[data-type="OTHER"]    { background: rgba(148, 163, 184, 0.20); color: #334155; }

[data-theme="light"] .hrm-presets-label { color: #92400e; }
[data-theme="light"] .hrm-presets-hint { color: var(--hr-text-muted); }
[data-theme="light"] .hrm-chip {
  background: rgba(255, 250, 240, 0.72);
  border-color: rgba(40, 25, 10, 0.16);
  color: var(--hr-text-secondary);
}
[data-theme="light"] .hrm-chip svg { color: var(--att-orange-500); }
[data-theme="light"] .hrm-chip:hover {
  background: rgba(220, 38, 38, 0.10);
  border-color: rgba(220, 38, 38, 0.38);
  color: #b91c1c;
}
[data-theme="light"] .hrm-chip:hover svg { color: #b91c1c; }

[data-theme="light"] .hrm-field-label { color: var(--hr-text-muted); }
[data-theme="light"] .hrm-req { color: #b91c1c; }
[data-theme="light"] .hrm-counter {
  background: rgba(255, 250, 240, 0.78);
  border-color: rgba(40, 25, 10, 0.14);
  color: var(--hr-text-secondary);
}
[data-theme="light"] .hrm-counter[data-state="ok"] {
  color: #115e59; background: rgba(20, 184, 166, 0.14); border-color: rgba(20, 184, 166, 0.32);
}
[data-theme="light"] .hrm-counter[data-state="warn"] {
  color: #92400e; background: rgba(251, 191, 36, 0.16); border-color: rgba(251, 191, 36, 0.36);
}
[data-theme="light"] .hrm-textarea {
  background: rgba(255, 250, 240, 0.80);
  border-color: rgba(40, 25, 10, 0.16);
  color: var(--hr-text);
}
[data-theme="light"] .hrm-textarea::placeholder { color: rgba(40, 25, 10, 0.42); }
[data-theme="light"] .hrm-textarea:focus {
  border-color: rgba(220, 38, 38, 0.55);
  background: rgba(255, 246, 226, 0.94);
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.14);
}
[data-theme="light"] .hrm-textarea.has-error {
  border-color: #dc2626;
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.18);
}
[data-theme="light"] .hrm-field-error { color: #b91c1c; }

[data-theme="light"] .hrm-preview-card {
  background: rgba(255, 250, 240, 0.65);
  border-color: rgba(220, 38, 38, 0.32);
}
[data-theme="light"] .hrm-preview-status {
  background: rgba(220, 38, 38, 0.14); color: #7f1d1d;
}
[data-theme="light"] .hrm-preview-when { color: var(--hr-text); }
[data-theme="light"] .hrm-preview-note { color: #6b5840; }
[data-theme="light"] .hrm-preview-note svg { color: #b91c1c; }
[data-theme="light"] .hrm-preview-tag svg { color: #b91c1c; }

[data-theme="light"] .hrm-foot { border-top-color: rgba(220, 38, 38, 0.30); }
[data-theme="light"] .hrm-foot-meta { color: var(--hr-text-muted); }
[data-theme="light"] .hrm-foot-meta svg { color: var(--att-teal-500); }
[data-theme="light"] .hrm-btn-ghost {
  color: var(--hr-text-secondary);
  border-color: rgba(40, 25, 10, 0.14);
}
[data-theme="light"] .hrm-btn-ghost:hover:not(:disabled) {
  background: rgba(40, 25, 10, 0.05);
  border-color: rgba(40, 25, 10, 0.22);
  color: var(--hr-text);
}
[data-theme="light"] .hrm-confirm {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 65%, #991b1b 100%);
  border-color: rgba(220, 38, 38, 0.55);
  box-shadow: 0 12px 28px -10px rgba(220, 38, 38, 0.55);
}

@media (max-width: 600px) {
  .hrm-target { grid-template-columns: 1fr; gap: 10px; }
  .hrm-target-date { border-right: none; border-bottom: 1px dashed rgba(248, 113, 113, 0.30); padding-right: 0; padding-bottom: 8px; flex-direction: row; align-items: baseline; gap: 8px; }
}
</style>
