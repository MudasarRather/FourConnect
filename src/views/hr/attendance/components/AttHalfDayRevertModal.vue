<template>
  <Teleport to="body">
    <transition name="hrv-fade">
      <div v-if="open && target" class="hrv-overlay" @click.self="cancel">
        <Motion as="div" class="hrv-card"
          :initial="{ opacity: 0, scale: 0.92, y: 24 }"
          :animate="{ opacity: 1, scale: 1, y: 0 }"
          :transition="{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }"
        >
          <!-- ambient decoration -->
          <span class="hrv-sheen" />
          <span class="hrv-perf-l" />
          <span class="hrv-orbit-a" aria-hidden="true" />
          <span class="hrv-orbit-b" aria-hidden="true" />

          <!-- ═══════ HEADER ═══════ -->
          <header class="hrv-head">
            <div class="hrv-head-icon">
              <Motion as="span" class="hrv-head-icon-inner"
                :animate="{ rotate: [-18, 0] }"
                :transition="{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }"
              >
                <Undo2 :size="18" />
              </Motion>
              <span class="hrv-head-icon-arc hrv-arc-1" />
              <span class="hrv-head-icon-arc hrv-arc-2" />
            </div>
            <div class="hrv-head-text">
              <span class="hrv-eyebrow">
                <RotateCcw :size="9" />
                Rewind half-day · attendance recomputes
              </span>
              <h3>Roll this half-day back?</h3>
              <p class="hrv-subtitle">
                The <strong>HALF_DAY</strong> tag will be removed and the daily roster will recompute
                from the actual punches. Tell us why — the note lands in the audit trail.
              </p>
            </div>
            <button class="hrv-close" :disabled="submitting" @click="cancel" aria-label="Close">
              <X :size="16" />
            </button>
          </header>

          <!-- ═══════ BODY ═══════ -->
          <div class="hrv-body">
            <!-- Target card with strike-through visual to signal the undo -->
            <Motion class="hrv-target"
              :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.40, delay: 0.08, ease: [0.22, 1, 0.36, 1] }"
            >
              <div class="hrv-target-date">
                <span class="hrv-tgt-day">{{ formatDay(target.half_day_date) }}</span>
                <span class="hrv-tgt-mon">{{ formatMonth(target.half_day_date) }}</span>
                <span class="hrv-tgt-yr">{{ formatYear(target.half_day_date) }}</span>
              </div>
              <div class="hrv-target-half" :data-half="target.which_half">
                <div class="hrv-target-half-track">
                  <span class="hrv-target-am">AM</span>
                  <span class="hrv-target-divider" />
                  <span class="hrv-target-pm">PM</span>
                  <Motion class="hrv-target-fill"
                    :initial="{ scaleX: 1, opacity: 1 }"
                    :animate="{ scaleX: 0, opacity: 0.35 }"
                    :transition="{ duration: 0.85, delay: 0.42, ease: [0.22, 1, 0.36, 1] }"
                  />
                </div>
                <span class="hrv-target-half-tag">
                  <Motion as="span" class="hrv-target-strike"
                    :initial="{ scaleX: 0 }"
                    :animate="{ scaleX: 1 }"
                    :transition="{ duration: 0.55, delay: 0.65, ease: [0.22, 1, 0.36, 1] }"
                  />
                  {{ target.which_half === 'FIRST' ? '1st half off' : '2nd half off' }}
                </span>
              </div>
              <div class="hrv-target-body">
                <div class="hrv-target-name">
                  {{ target.employee_name || 'Unknown' }}
                  <span class="hrv-target-dot">·</span>
                  <span class="hrv-target-code">{{ target.employee_code || '—' }}</span>
                </div>
                <div class="hrv-target-dept">{{ target.department || '—' }}</div>
                <div class="hrv-target-reason">
                  <span class="hrv-target-rtype" :data-type="target.reason_type">
                    <component :is="reasonIcon(target.reason_type)" :size="10" />
                    {{ target.reason_type }}
                  </span>
                  <span class="hrv-target-rtxt"><Quote :size="10" />{{ target.reason }}</span>
                </div>
              </div>
            </Motion>

            <!-- "What will change" effect panel -->
            <Motion class="hrv-effects"
              :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.38, delay: 0.16, ease: [0.22, 1, 0.36, 1] }"
            >
              <div class="hrv-effects-tag">
                <Workflow :size="11" />What will change
              </div>
              <div class="hrv-effects-grid">
                <Motion v-for="(eff, idx) in EFFECTS" :key="eff.title" class="hrv-effect"
                  :initial="{ opacity: 0, scale: 0.92, y: 8 }"
                  :animate="{ opacity: 1, scale: 1, y: 0 }"
                  :transition="{ duration: 0.34, delay: 0.22 + idx * 0.07, ease: [0.34, 1.56, 0.64, 1] }"
                  :whileHover="{ y: -2 }"
                >
                  <span class="hrv-effect-ico" :data-tone="eff.tone">
                    <component :is="eff.icon" :size="13" />
                  </span>
                  <div class="hrv-effect-text">
                    <span class="hrv-effect-title">{{ eff.title }}</span>
                    <span class="hrv-effect-desc">{{ eff.desc }}</span>
                  </div>
                </Motion>
              </div>
            </Motion>

            <!-- Preset reasons -->
            <Motion class="hrv-presets"
              :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.34, delay: 0.30, ease: [0.22, 1, 0.36, 1] }"
            >
              <div class="hrv-presets-row">
                <span class="hrv-presets-label">
                  <Lightbulb :size="11" />Quick reasons
                </span>
                <span class="hrv-presets-hint">tap to append</span>
              </div>
              <div class="hrv-chips">
                <Motion v-for="(p, idx) in PRESETS" :key="p"
                  as="button" type="button" class="hrv-chip"
                  :initial="{ opacity: 0, scale: 0.85 }"
                  :animate="{ opacity: 1, scale: 1 }"
                  :transition="{ duration: 0.28, delay: 0.34 + idx * 0.04, ease: [0.34, 1.56, 0.64, 1] }"
                  :whileHover="{ y: -2, scale: 1.04 }"
                  :whileTap="{ scale: 0.94 }"
                  @click="appendPreset(p)"
                >
                  <Plus :size="11" />{{ p }}
                </Motion>
              </div>
            </Motion>

            <!-- Reason textarea -->
            <Motion class="hrv-field"
              :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.34, delay: 0.40, ease: [0.22, 1, 0.36, 1] }"
            >
              <div class="hrv-field-head">
                <label class="hrv-field-label">
                  Audit note <span class="hrv-req">*</span>
                </label>
                <span class="hrv-counter" :data-state="counterState">
                  {{ localReason.length }} / {{ MAX_CHARS }}
                </span>
              </div>
              <textarea
                ref="reasonInputRef"
                v-model="localReason"
                class="hrv-textarea"
                :class="{ 'has-error': hasError }"
                rows="4"
                :maxlength="MAX_CHARS"
                placeholder="e.g. Employee confirmed full-day attendance — biometric punches show 09:12 in / 18:34 out; the half-day was tagged in error during the Tuesday backfill."
                @input="hasError = false"
              />
              <span v-if="hasError" class="hrv-field-error">
                <AlertTriangle :size="11" /> Please record why this revert is happening — it'll live in the audit trail.
              </span>
            </Motion>

            <!-- Live preview of audit trail entry -->
            <Motion v-if="localReason.trim()" class="hrv-preview"
              :initial="{ opacity: 0, y: 8, height: 0 }"
              :animate="{ opacity: 1, y: 0, height: 'auto' }"
              :transition="{ duration: 0.36, ease: [0.22, 1, 0.36, 1] }"
            >
              <div class="hrv-preview-tag">
                <Eye :size="11" />Audit trail entry
              </div>
              <div class="hrv-preview-card">
                <div class="hrv-preview-status">
                  <span class="hrv-preview-dot" />HALF_DAY_REVERTED
                </div>
                <div class="hrv-preview-when">
                  <Calendar :size="11" />
                  {{ formatLongDate(target.half_day_date) }} ·
                  {{ target.which_half === 'FIRST' ? '1st half' : '2nd half' }}
                </div>
                <div class="hrv-preview-note">
                  <ScrollText :size="11" />
                  <span>{{ localReason }}</span>
                </div>
              </div>
            </Motion>
          </div>

          <!-- ═══════ FOOTER ═══════ -->
          <footer class="hrv-foot">
            <span class="hrv-foot-meta">
              <ShieldCheck :size="11" /> Append-only · cannot be undone
            </span>
            <button class="hrv-btn hrv-btn-ghost" :disabled="submitting" @click="cancel">Keep half-day</button>
            <Motion as="button" type="button" class="hrv-confirm"
              :whileHover="(submitting || !localReason.trim()) ? {} : { y: -1, scale: 1.025 }"
              :whileTap="(submitting || !localReason.trim()) ? {} : { scale: 0.97 }"
              :transition="{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }"
              :disabled="submitting || !localReason.trim()"
              @click="confirm"
            >
              <Loader2 v-if="submitting" :size="13" class="hrv-spin" />
              <RotateCcw v-else :size="13" />
              {{ submitting ? 'Reverting…' : 'Confirm revert' }}
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
  Undo2, RotateCcw, AlertTriangle, Loader2, Plus, X,
  Quote, Lightbulb, Eye, ScrollText, ShieldCheck, Workflow, Calendar,
  Heart, HeartPulse, Briefcase, Users, Sparkles,
  Calculator, Tag, Activity,
} from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  target: { type: Object, default: null },
  submitting: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'confirm'])

const MAX_CHARS = 400
const PRESETS = [
  'Tagged in error — punches show full day',
  'Employee confirms they worked full day',
  'Wrong date — should have been a different day',
  'Manager rescinded the half-day approval',
  'Compensatory adjustment applied elsewhere',
]

const EFFECTS = [
  {
    title: 'HALF_DAY tag removed',
    desc: 'The request is soft-deleted from the half-day roster.',
    icon: Tag,
    tone: 'amber',
  },
  {
    title: 'Attendance recomputed',
    desc: 'Daily status is rebuilt from in/out punches automatically.',
    icon: Calculator,
    tone: 'teal',
  },
  {
    title: 'Audit trail captured',
    desc: 'Your note + actor + timestamp are saved on the log.',
    icon: Activity,
    tone: 'orange',
  },
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
.hrv-overlay {
  position: fixed; inset: 0; z-index: 1400;
  background:
    radial-gradient(80% 60% at 50% 30%, rgba(251, 191, 36, 0.30), rgba(20, 14, 8, 0.78));
  backdrop-filter: blur(16px) saturate(140%);
  -webkit-backdrop-filter: blur(16px) saturate(140%);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
}

/* ═════════════════════ Card ═════════════════════ */
.hrv-card {
  position: relative;
  width: 100%; max-width: 620px;
  max-height: calc(100vh - 56px);
  display: flex; flex-direction: column;
  border-radius: 24px;
  overflow: hidden;
  background:
    radial-gradient(140% 90% at 0% 0%, rgba(251, 191, 36, 0.18), transparent 55%),
    radial-gradient(120% 90% at 100% 0%, rgba(234, 88, 12, 0.14), transparent 60%),
    linear-gradient(180deg, rgba(28, 20, 12, 0.97), rgba(18, 12, 7, 0.99));
  border: 1px solid rgba(251, 191, 36, 0.38);
  box-shadow:
    0 50px 100px -30px rgba(0, 0, 0, 0.78),
    0 0 0 1px rgba(251, 191, 36, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.07);
  isolation: isolate;
}
.hrv-sheen {
  position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(115deg, transparent 35%, rgba(255, 255, 255, 0.14) 50%, transparent 65%);
  transform: translateX(-100%);
  animation: hrv-sheen 1.7s var(--att-spring, ease-out) 0.28s 1 forwards;
}
@keyframes hrv-sheen {
  0%   { transform: translateX(-120%) skewX(-22deg); opacity: 0; }
  40%  { opacity: 0.85; }
  100% { transform: translateX(220%) skewX(-22deg); opacity: 0; }
}
.hrv-perf-l {
  position: absolute; left: 12px; top: 20px; bottom: 20px; width: 4px;
  background:
    radial-gradient(circle at 50% 5px,  rgba(251, 191, 36, 0.55) 1.4px, transparent 1.8px),
    radial-gradient(circle at 50% 13px, rgba(251, 191, 36, 0.55) 1.4px, transparent 1.8px),
    radial-gradient(circle at 50% 21px, rgba(251, 191, 36, 0.55) 1.4px, transparent 1.8px),
    radial-gradient(circle at 50% 29px, rgba(251, 191, 36, 0.55) 1.4px, transparent 1.8px);
  background-repeat: repeat-y; background-size: 4px 14px;
  opacity: 0.55;
  pointer-events: none;
}

/* Orbiting "rewind" rings — silent ambient motion that reinforces the undo metaphor */
.hrv-orbit-a, .hrv-orbit-b {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  border: 1px dashed rgba(251, 191, 36, 0.20);
  z-index: 0;
}
.hrv-orbit-a {
  top: -120px; right: -80px;
  width: 280px; height: 280px;
  animation: hrv-orbit 60s linear infinite reverse;
}
.hrv-orbit-b {
  top: -60px; right: -20px;
  width: 180px; height: 180px;
  border-color: rgba(234, 88, 12, 0.18);
  animation: hrv-orbit 38s linear infinite;
}
@keyframes hrv-orbit { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* ═════════════════════ Header ═════════════════════ */
.hrv-head {
  position: relative; z-index: 1;
  display: grid;
  grid-template-columns: 50px 1fr auto;
  align-items: start;
  gap: 14px;
  padding: 22px 24px 16px 30px;
  border-bottom: 1px dashed rgba(251, 191, 36, 0.24);
}
.hrv-head-icon {
  position: relative;
  width: 50px; height: 50px; border-radius: 14px;
  display: inline-flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #fcd34d 0%, #f59e0b 65%, #c2410c 100%);
  color: #1f1408;
  box-shadow: 0 12px 30px -10px rgba(234, 88, 12, 0.70);
}
.hrv-head-icon-inner {
  display: inline-flex; align-items: center; justify-content: center;
  position: relative; z-index: 2;
}
.hrv-head-icon-arc {
  position: absolute;
  border-radius: 50%;
  border: 1.5px dashed rgba(255, 255, 255, 0.55);
  pointer-events: none;
}
.hrv-arc-1 {
  inset: -6px;
  border-color: rgba(251, 191, 36, 0.55);
  border-style: dashed;
  animation: hrv-orbit 4.5s linear infinite reverse;
}
.hrv-arc-2 {
  inset: -2px;
  border-color: rgba(255, 255, 255, 0.20);
  animation: hrv-orbit 6s linear infinite;
}

.hrv-head-text { min-width: 0; }
.hrv-eyebrow {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 10px; font-weight: 800; letter-spacing: 1.6px;
  text-transform: uppercase; color: #fcd34d;
}
.hrv-eyebrow svg { color: #fbbf24; }
.hrv-head h3 {
  margin: 5px 0 0; font-size: 19px; font-weight: 900;
  letter-spacing: -0.015em; color: var(--hr-text);
}
.hrv-subtitle {
  margin: 5px 0 0; font-size: 12.5px; color: var(--hr-text-muted);
  line-height: 1.45;
}
.hrv-subtitle strong {
  color: #fbbf24; font-weight: 800;
  padding: 0 4px;
  border-radius: 4px;
  background: rgba(251, 191, 36, 0.10);
}
.hrv-close {
  width: 32px; height: 32px; border-radius: 9px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--hr-text-muted); cursor: pointer;
  transition: background .2s, color .2s, border-color .2s;
}
.hrv-close:hover { background: rgba(255, 255, 255, 0.10); color: var(--hr-text); border-color: rgba(251, 191, 36, 0.32); }
.hrv-close:disabled { opacity: 0.4; cursor: not-allowed; }

/* ═════════════════════ Body ═════════════════════ */
.hrv-body {
  position: relative; z-index: 1;
  display: flex; flex-direction: column; gap: 16px;
  padding: 18px 28px 18px 32px;
  overflow-y: auto;
}

/* Target card */
.hrv-target {
  display: grid;
  grid-template-columns: 64px auto 1fr;
  gap: 14px;
  align-items: center;
  padding: 14px 16px;
  border-radius: 16px;
  background:
    linear-gradient(135deg, rgba(251, 191, 36, 0.12), rgba(234, 88, 12, 0.06)),
    rgba(20, 16, 12, 0.50);
  border: 1px solid rgba(251, 191, 36, 0.28);
  backdrop-filter: blur(10px);
}
.hrv-target-date {
  display: flex; flex-direction: column; align-items: flex-start; gap: 1px;
  padding-right: 14px;
  border-right: 1px dashed rgba(251, 191, 36, 0.30);
}
.hrv-tgt-day { font-size: 30px; font-weight: 900; line-height: 1; color: var(--hr-text); font-variant-numeric: tabular-nums; }
.hrv-tgt-mon { font-size: 9.5px; letter-spacing: 1.5px; font-weight: 800; color: #fcd34d; }
.hrv-tgt-yr  { font-size: 9px; color: var(--hr-text-muted); font-weight: 600; }

.hrv-target-half { display: flex; flex-direction: column; gap: 4px; }
.hrv-target-half-track {
  position: relative;
  display: flex; align-items: center;
  width: 92px; height: 22px;
  border-radius: 7px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(251, 191, 36, 0.22);
  overflow: hidden;
}
.hrv-target-am, .hrv-target-pm {
  position: relative; z-index: 2;
  flex: 1; text-align: center;
  font-size: 9px; font-weight: 800; letter-spacing: 1px;
  color: var(--hr-text-muted);
}
.hrv-target-divider {
  width: 1px; height: 100%;
  background: rgba(251, 191, 36, 0.30);
  position: relative; z-index: 2;
}
.hrv-target-fill {
  position: absolute; top: 0; bottom: 0;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.45), rgba(234, 88, 12, 0.30));
  transform-origin: left center;
}
.hrv-target-half[data-half="FIRST"]  .hrv-target-fill { left: 0;   right: 50%; }
.hrv-target-half[data-half="SECOND"] .hrv-target-fill { left: 50%; right: 0;   }
.hrv-target-half[data-half="FIRST"]  .hrv-target-am { color: #fcd34d; }
.hrv-target-half[data-half="SECOND"] .hrv-target-pm { color: #fcd34d; }
.hrv-target-half-tag {
  position: relative;
  font-size: 9px; letter-spacing: 0.4px; font-weight: 700;
  color: var(--hr-text-muted);
  display: inline-block;
  padding: 0 4px;
}
.hrv-target-strike {
  position: absolute;
  left: 0; right: 0;
  top: 50%;
  height: 1.5px;
  background: linear-gradient(90deg, transparent, #fbbf24 22%, #ea580c 78%, transparent);
  transform-origin: left center;
  pointer-events: none;
  box-shadow: 0 0 6px rgba(251, 191, 36, 0.55);
}

.hrv-target-body { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.hrv-target-name { font-size: 13.5px; font-weight: 800; color: var(--hr-text); }
.hrv-target-dot { margin: 0 6px; color: var(--hr-text-muted); opacity: 0.55; font-weight: 400; }
.hrv-target-code { font-size: 11px; font-weight: 700; color: #fcd34d; }
.hrv-target-dept { font-size: 10.5px; color: var(--hr-text-muted); font-weight: 600; }
.hrv-target-reason { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; margin-top: 2px; }
.hrv-target-rtype {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 9px; font-weight: 800; letter-spacing: 0.5px;
}
.hrv-target-rtype[data-type="PERSONAL"] { background: rgba(244, 114, 182, 0.16); color: #f9a8d4; }
.hrv-target-rtype[data-type="MEDICAL"]  { background: rgba(220, 38, 38, 0.16);   color: #fca5a5; }
.hrv-target-rtype[data-type="FAMILY"]   { background: rgba(251, 191, 36, 0.16);  color: #fcd34d; }
.hrv-target-rtype[data-type="OFFICIAL"] { background: rgba(20, 184, 166, 0.16);  color: #5eead4; }
.hrv-target-rtype[data-type="OTHER"]    { background: rgba(148, 163, 184, 0.16); color: #cbd5e1; }
.hrv-target-rtxt {
  display: inline-flex; align-items: center; gap: 4px;
  font-style: italic; font-size: 11px; color: var(--hr-text-muted);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  max-width: 280px;
}

/* "What will change" effect panel */
.hrv-effects { display: flex; flex-direction: column; gap: 8px; }
.hrv-effects-tag {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 800; letter-spacing: 1.4px;
  text-transform: uppercase; color: #fcd34d;
}
.hrv-effects-tag svg { color: #fbbf24; }
.hrv-effects-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.hrv-effect {
  position: relative;
  display: flex; flex-direction: column; gap: 6px;
  padding: 12px;
  border-radius: 13px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(251, 191, 36, 0.18);
  overflow: hidden;
  isolation: isolate;
  cursor: default;
}
.hrv-effect::before {
  content: '';
  position: absolute; inset: auto -30% -50% -30%; height: 100%;
  background: radial-gradient(60% 70% at 50% 100%, rgba(251, 191, 36, 0.15), transparent 60%);
  filter: blur(20px); z-index: -1; opacity: 0;
  transition: opacity .3s;
}
.hrv-effect:hover::before { opacity: 1; }
.hrv-effect-ico {
  width: 28px; height: 28px;
  border-radius: 8px;
  display: inline-flex; align-items: center; justify-content: center;
}
.hrv-effect-ico[data-tone="amber"]  { background: linear-gradient(135deg, rgba(251, 191, 36, 0.20), rgba(245, 158, 11, 0.10)); color: #fcd34d; border: 1px solid rgba(251, 191, 36, 0.30); }
.hrv-effect-ico[data-tone="teal"]   { background: linear-gradient(135deg, rgba(20, 184, 166, 0.20), rgba(15, 118, 110, 0.10)); color: #5eead4; border: 1px solid rgba(20, 184, 166, 0.30); }
.hrv-effect-ico[data-tone="orange"] { background: linear-gradient(135deg, rgba(234, 88, 12, 0.22), rgba(194, 65, 12, 0.10));  color: #fdba74; border: 1px solid rgba(234, 88, 12, 0.32); }
.hrv-effect-text { display: flex; flex-direction: column; gap: 2px; }
.hrv-effect-title { font-size: 11.5px; font-weight: 800; color: var(--hr-text); letter-spacing: -0.1px; }
.hrv-effect-desc  { font-size: 10px; color: var(--hr-text-muted); line-height: 1.4; }

/* Presets */
.hrv-presets { display: flex; flex-direction: column; gap: 8px; }
.hrv-presets-row {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
}
.hrv-presets-label {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 800; letter-spacing: 1.4px;
  text-transform: uppercase; color: #fcd34d;
}
.hrv-presets-hint {
  font-size: 9.5px; font-weight: 600; color: var(--hr-text-muted); font-style: italic;
}
.hrv-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.hrv-chip {
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
.hrv-chip:hover {
  border-color: rgba(251, 191, 36, 0.45);
  background: rgba(251, 191, 36, 0.10);
  color: #fcd34d;
}
.hrv-chip svg { color: var(--att-orange-200); }
.hrv-chip:hover svg { color: #fcd34d; }

/* Field */
.hrv-field { display: flex; flex-direction: column; gap: 6px; }
.hrv-field-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.hrv-field-label {
  font-size: 10.5px; font-weight: 800; letter-spacing: 1px;
  text-transform: uppercase; color: var(--hr-text-muted);
}
.hrv-req { color: #fbbf24; font-weight: 800; }
.hrv-counter {
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.4px;
  color: var(--hr-text-muted); font-variant-numeric: tabular-nums;
  padding: 2px 7px; border-radius: 6px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: color .2s, background .2s, border-color .2s;
}
.hrv-counter[data-state="ok"] {
  color: #5eead4; background: rgba(20, 184, 166, 0.10); border-color: rgba(20, 184, 166, 0.30);
}
.hrv-counter[data-state="warn"] {
  color: #fbbf24; background: rgba(251, 191, 36, 0.10); border-color: rgba(251, 191, 36, 0.30);
}
.hrv-textarea {
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
.hrv-textarea::placeholder { color: rgba(255, 255, 255, 0.36); }
.hrv-textarea:focus {
  border-color: rgba(251, 191, 36, 0.55);
  background: rgba(251, 191, 36, 0.06);
  box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.16);
}
.hrv-textarea.has-error {
  border-color: #fbbf24;
  box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.22);
  animation: hrv-shake 0.36s ease-in-out;
}
@keyframes hrv-shake {
  0%, 100% { transform: translateX(0); }
  20%      { transform: translateX(-4px); }
  40%      { transform: translateX(4px); }
  60%      { transform: translateX(-2px); }
  80%      { transform: translateX(2px); }
}
.hrv-field-error {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 11px; color: #fbbf24; font-weight: 600;
}

/* Live preview */
.hrv-preview {
  display: flex; flex-direction: column; gap: 6px;
  overflow: hidden;
}
.hrv-preview-tag {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; letter-spacing: 1.4px; text-transform: uppercase;
  font-weight: 800; color: var(--hr-text-muted);
}
.hrv-preview-tag svg { color: #fcd34d; }
.hrv-preview-card {
  border-radius: 12px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed rgba(251, 191, 36, 0.30);
  display: flex; flex-direction: column; gap: 6px;
}
.hrv-preview-status {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 1px;
  color: #fcd34d;
  align-self: flex-start;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(251, 191, 36, 0.14);
  border: 1px solid rgba(251, 191, 36, 0.30);
}
.hrv-preview-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #fbbf24; box-shadow: 0 0 6px #fbbf24;
}
.hrv-preview-when {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 12px; font-weight: 700; color: var(--hr-text);
}
.hrv-preview-when svg { color: #fcd34d; }
.hrv-preview-note {
  display: flex; gap: 6px; align-items: flex-start;
  font-size: 11.5px; color: var(--hr-text-muted); font-style: italic;
  line-height: 1.5;
}
.hrv-preview-note svg { color: #fcd34d; flex-shrink: 0; margin-top: 2px; }
.hrv-preview-note span { word-break: break-word; }

/* ═════════════════════ Footer ═════════════════════ */
.hrv-foot {
  position: relative; z-index: 1;
  display: flex; gap: 10px; align-items: center;
  padding: 14px 24px;
  border-top: 1px dashed rgba(251, 191, 36, 0.24);
}
.hrv-foot-meta {
  display: inline-flex; align-items: center; gap: 5px;
  flex: 1;
  font-size: 10.5px; font-weight: 600; letter-spacing: 0.5px;
  color: var(--hr-text-muted); text-transform: uppercase;
}
.hrv-foot-meta svg { color: var(--att-success-100); }

.hrv-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 9px 16px;
  border-radius: 11px;
  font: inherit; font-size: 12.5px; font-weight: 800; letter-spacing: 0.3px;
  border: 1px solid;
  cursor: pointer;
  transition: background .2s, color .2s, border-color .2s;
}
.hrv-btn-ghost {
  background: transparent;
  color: var(--hr-text-muted);
  border-color: rgba(255, 255, 255, 0.10);
}
.hrv-btn-ghost:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.16);
  color: var(--hr-text);
}
.hrv-confirm {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 9px 20px;
  border-radius: 11px;
  background: linear-gradient(135deg, #fde68a 0%, #fbbf24 50%, #ea580c 100%);
  background-size: 200% 200%;
  background-position: 0% 50%;
  color: #1f1408;
  font: inherit; font-size: 12.5px; font-weight: 800; letter-spacing: 0.3px;
  border: 1px solid rgba(251, 191, 36, 0.55);
  cursor: pointer;
  box-shadow: 0 12px 28px -10px rgba(234, 88, 12, 0.65);
  transition: background-position .35s, filter .22s, box-shadow .22s;
}
.hrv-confirm:hover:not(:disabled) {
  background-position: 100% 50%;
  filter: brightness(1.06);
  box-shadow: 0 18px 38px -10px rgba(234, 88, 12, 0.78);
}
.hrv-confirm:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
.hrv-spin { animation: hrv-spin 0.85s linear infinite; }
@keyframes hrv-spin { to { transform: rotate(360deg); } }

/* ═════════════════════ Transitions ═════════════════════ */
.hrv-fade-enter-active, .hrv-fade-leave-active { transition: opacity .28s ease; }
.hrv-fade-enter-from, .hrv-fade-leave-to { opacity: 0; }

/* ═════════════════════ LIGHT THEME ═════════════════════ */
[data-theme="light"] .hrv-overlay {
  background: radial-gradient(80% 60% at 50% 30%, rgba(251, 146, 60, 0.32), rgba(40, 22, 8, 0.55));
}
[data-theme="light"] .hrv-card {
  background:
    radial-gradient(140% 90% at 0% 0%, rgba(251, 191, 36, 0.18), transparent 55%),
    radial-gradient(120% 90% at 100% 0%, rgba(234, 88, 12, 0.12), transparent 60%),
    linear-gradient(180deg, rgba(255, 250, 240, 0.98), rgba(255, 245, 224, 0.99));
  border-color: rgba(180, 83, 9, 0.40);
  box-shadow:
    0 50px 100px -30px rgba(120, 53, 15, 0.40),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
[data-theme="light"] .hrv-perf-l {
  background:
    radial-gradient(circle at 50% 5px,  rgba(180, 83, 9, 0.55) 1.4px, transparent 1.8px),
    radial-gradient(circle at 50% 13px, rgba(180, 83, 9, 0.55) 1.4px, transparent 1.8px),
    radial-gradient(circle at 50% 21px, rgba(180, 83, 9, 0.55) 1.4px, transparent 1.8px),
    radial-gradient(circle at 50% 29px, rgba(180, 83, 9, 0.55) 1.4px, transparent 1.8px);
  background-repeat: repeat-y; background-size: 4px 14px;
}
[data-theme="light"] .hrv-orbit-a { border-color: rgba(180, 83, 9, 0.22); }
[data-theme="light"] .hrv-orbit-b { border-color: rgba(234, 88, 12, 0.22); }
[data-theme="light"] .hrv-head { border-bottom-color: rgba(180, 83, 9, 0.30); }
[data-theme="light"] .hrv-eyebrow { color: #b45309; }
[data-theme="light"] .hrv-eyebrow svg { color: #d97706; }
[data-theme="light"] .hrv-head h3 { color: var(--hr-text); }
[data-theme="light"] .hrv-subtitle { color: var(--hr-text-muted); }
[data-theme="light"] .hrv-subtitle strong { color: #b45309; background: rgba(251, 191, 36, 0.16); }
[data-theme="light"] .hrv-head-icon {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 65%, #c2410c 100%);
  color: #1f1408;
}
[data-theme="light"] .hrv-head-icon-arc { border-color: rgba(255, 255, 255, 0.75); }
[data-theme="light"] .hrv-arc-1 { border-color: rgba(255, 250, 240, 0.85); }
[data-theme="light"] .hrv-arc-2 { border-color: rgba(255, 255, 255, 0.40); }
[data-theme="light"] .hrv-close {
  background: rgba(180, 83, 9, 0.06);
  border-color: rgba(180, 83, 9, 0.22);
  color: var(--hr-text-secondary);
}
[data-theme="light"] .hrv-close:hover {
  background: rgba(251, 191, 36, 0.14);
  border-color: rgba(180, 83, 9, 0.44);
  color: var(--hr-text);
}
[data-theme="light"] .hrv-target {
  background:
    linear-gradient(135deg, rgba(251, 191, 36, 0.14), rgba(234, 88, 12, 0.06)),
    rgba(255, 250, 240, 0.85);
  border-color: rgba(180, 83, 9, 0.32);
}
[data-theme="light"] .hrv-target-date { border-right-color: rgba(180, 83, 9, 0.34); }
[data-theme="light"] .hrv-tgt-mon { color: #b45309; }
[data-theme="light"] .hrv-target-name { color: var(--hr-text); }
[data-theme="light"] .hrv-target-code { color: #b45309; }
[data-theme="light"] .hrv-target-half-track {
  background: rgba(255, 255, 255, 0.55);
  border-color: rgba(180, 83, 9, 0.26);
}
[data-theme="light"] .hrv-target-divider { background: rgba(180, 83, 9, 0.30); }
[data-theme="light"] .hrv-target-half[data-half="FIRST"]  .hrv-target-am { color: #b45309; }
[data-theme="light"] .hrv-target-half[data-half="SECOND"] .hrv-target-pm { color: #b45309; }
[data-theme="light"] .hrv-target-rtype[data-type="PERSONAL"] { background: rgba(244, 114, 182, 0.20); color: #be185d; }
[data-theme="light"] .hrv-target-rtype[data-type="MEDICAL"]  { background: rgba(220, 38, 38, 0.20);   color: #7f1d1d; }
[data-theme="light"] .hrv-target-rtype[data-type="FAMILY"]   { background: rgba(251, 191, 36, 0.30);  color: #92400e; }
[data-theme="light"] .hrv-target-rtype[data-type="OFFICIAL"] { background: rgba(20, 184, 166, 0.20);  color: #115e59; }
[data-theme="light"] .hrv-target-rtype[data-type="OTHER"]    { background: rgba(148, 163, 184, 0.20); color: #334155; }

[data-theme="light"] .hrv-effects-tag { color: #b45309; }
[data-theme="light"] .hrv-effects-tag svg { color: #d97706; }
[data-theme="light"] .hrv-effect {
  background: rgba(255, 250, 240, 0.78);
  border-color: rgba(180, 83, 9, 0.22);
}
[data-theme="light"] .hrv-effect-title { color: var(--hr-text); }
[data-theme="light"] .hrv-effect-desc  { color: #6b5840; }
[data-theme="light"] .hrv-effect-ico[data-tone="amber"]  { color: #b45309; }
[data-theme="light"] .hrv-effect-ico[data-tone="teal"]   { color: #115e59; }
[data-theme="light"] .hrv-effect-ico[data-tone="orange"] { color: #9a3412; }

[data-theme="light"] .hrv-presets-label { color: #b45309; }
[data-theme="light"] .hrv-presets-hint { color: var(--hr-text-muted); }
[data-theme="light"] .hrv-chip {
  background: rgba(255, 250, 240, 0.72);
  border-color: rgba(40, 25, 10, 0.16);
  color: var(--hr-text-secondary);
}
[data-theme="light"] .hrv-chip svg { color: var(--att-orange-500); }
[data-theme="light"] .hrv-chip:hover {
  background: rgba(251, 191, 36, 0.14);
  border-color: rgba(180, 83, 9, 0.38);
  color: #b45309;
}
[data-theme="light"] .hrv-chip:hover svg { color: #b45309; }

[data-theme="light"] .hrv-field-label { color: var(--hr-text-muted); }
[data-theme="light"] .hrv-req { color: #b45309; }
[data-theme="light"] .hrv-counter {
  background: rgba(255, 250, 240, 0.78);
  border-color: rgba(40, 25, 10, 0.14);
  color: var(--hr-text-secondary);
}
[data-theme="light"] .hrv-counter[data-state="ok"] {
  color: #115e59; background: rgba(20, 184, 166, 0.14); border-color: rgba(20, 184, 166, 0.32);
}
[data-theme="light"] .hrv-counter[data-state="warn"] {
  color: #92400e; background: rgba(251, 191, 36, 0.16); border-color: rgba(251, 191, 36, 0.36);
}
[data-theme="light"] .hrv-textarea {
  background: rgba(255, 250, 240, 0.80);
  border-color: rgba(40, 25, 10, 0.16);
  color: var(--hr-text);
}
[data-theme="light"] .hrv-textarea::placeholder { color: rgba(40, 25, 10, 0.42); }
[data-theme="light"] .hrv-textarea:focus {
  border-color: rgba(180, 83, 9, 0.55);
  background: rgba(255, 246, 226, 0.94);
  box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.18);
}
[data-theme="light"] .hrv-textarea.has-error {
  border-color: #b45309;
  box-shadow: 0 0 0 3px rgba(180, 83, 9, 0.18);
}
[data-theme="light"] .hrv-field-error { color: #b45309; }

[data-theme="light"] .hrv-preview-tag svg { color: #b45309; }
[data-theme="light"] .hrv-preview-card {
  background: rgba(255, 250, 240, 0.72);
  border-color: rgba(180, 83, 9, 0.32);
}
[data-theme="light"] .hrv-preview-status {
  background: rgba(251, 191, 36, 0.18); color: #92400e;
  border-color: rgba(180, 83, 9, 0.30);
}
[data-theme="light"] .hrv-preview-when { color: var(--hr-text); }
[data-theme="light"] .hrv-preview-when svg { color: #b45309; }
[data-theme="light"] .hrv-preview-note { color: #6b5840; }
[data-theme="light"] .hrv-preview-note svg { color: #b45309; }

[data-theme="light"] .hrv-foot { border-top-color: rgba(180, 83, 9, 0.30); }
[data-theme="light"] .hrv-foot-meta { color: var(--hr-text-muted); }
[data-theme="light"] .hrv-foot-meta svg { color: var(--att-success-400); }
[data-theme="light"] .hrv-btn-ghost {
  color: var(--hr-text-secondary);
  border-color: rgba(40, 25, 10, 0.14);
}
[data-theme="light"] .hrv-btn-ghost:hover:not(:disabled) {
  background: rgba(40, 25, 10, 0.05);
  border-color: rgba(40, 25, 10, 0.22);
  color: var(--hr-text);
}
[data-theme="light"] .hrv-confirm {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 55%, #ea580c 100%);
  color: #fff;
  border-color: rgba(180, 83, 9, 0.55);
  box-shadow: 0 12px 28px -10px rgba(180, 83, 9, 0.55);
}

@media (max-width: 700px) {
  .hrv-effects-grid { grid-template-columns: 1fr; }
}
@media (max-width: 600px) {
  .hrv-target { grid-template-columns: 1fr; gap: 10px; }
  .hrv-target-date { border-right: none; border-bottom: 1px dashed rgba(251, 191, 36, 0.30); padding-right: 0; padding-bottom: 8px; flex-direction: row; align-items: baseline; gap: 8px; }
}
</style>
