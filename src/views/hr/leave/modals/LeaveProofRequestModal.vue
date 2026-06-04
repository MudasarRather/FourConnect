<template>
  <Teleport to="body">
    <transition name="pm">
      <div v-if="open" class="pm-scrim" @click.self="$emit('cancel')">
        <!-- Decorative orbital rings -->
        <span class="pm-orbit pm-orbit-1" aria-hidden="true" />
        <span class="pm-orbit pm-orbit-2" aria-hidden="true" />
        <span class="pm-orbit pm-orbit-3" aria-hidden="true" />

        <!-- Drifting document silhouettes (ambient) -->
        <span class="pm-drift pm-drift-1" aria-hidden="true">
          <FileText :size="80" />
        </span>
        <span class="pm-drift pm-drift-2" aria-hidden="true">
          <FileSearch :size="64" />
        </span>
        <span class="pm-drift pm-drift-3" aria-hidden="true">
          <ShieldCheck :size="56" />
        </span>

        <Motion class="pm-card" as="div" role="dialog" aria-modal="true"
          :initial="{ opacity: 0, y: 30, scale: 0.94, rotateX: -6 }"
          :animate="{ opacity: 1, y: 0, scale: 1, rotateX: 0 }"
          :exit="{ opacity: 0, y: 20, scale: 0.95 }"
          :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }"
        >
          <!-- ═══ Ribbon header ═══ -->
          <header class="pm-ribbon">
            <span class="rb-grain" aria-hidden="true" />
            <span class="rb-aura" aria-hidden="true" />

            <Motion class="rb-glyph" as="div"
              :initial="{ scale: 0, rotate: -45 }"
              :animate="{ scale: 1, rotate: 0 }"
              :transition="{ duration: 0.55, delay: 0.18, ease: [0.34, 1.56, 0.64, 1] }"
            >
              <span class="rb-glyph-aura" />
              <span class="rb-glyph-ring" />
              <component :is="glyphIcon" :size="26" />
            </Motion>

            <div class="rb-meta">
              <Motion as="span" class="rb-eye leave-mono"
                :initial="{ opacity: 0, y: -6 }"
                :animate="{ opacity: 1, y: 0 }"
                :transition="{ duration: 0.4, delay: 0.24 }"
              >
                <span class="rb-eye-led" />
                PROOF · REQUEST
              </Motion>
              <Motion as="h3" class="rb-title"
                :initial="{ opacity: 0, y: -4 }"
                :animate="{ opacity: 1, y: 0 }"
                :transition="{ duration: 0.42, delay: 0.30 }"
              >
                Need supporting documents?
              </Motion>
              <Motion as="p" class="rb-sub" v-if="leave"
                :initial="{ opacity: 0, y: -3 }"
                :animate="{ opacity: 1, y: 0 }"
                :transition="{ duration: 0.42, delay: 0.36 }"
              >
                <span class="rb-emp">{{ leave.employee_name || leave.employee_code || 'Employee' }}</span>
                <span class="rb-sep">·</span>
                <span class="rb-msg">will be notified</span>
                <span class="rb-sep">·</span>
                <span class="rb-ref leave-mono">{{ leave.reference_no }}</span>
              </Motion>
            </div>

            <button class="pm-close" @click="$emit('cancel')" aria-label="Close">
              <X :size="14" />
            </button>
          </header>

          <!-- ═══ Body ═══ -->
          <div class="pm-body">
            <!-- 01 — Preset chips -->
            <Motion class="pm-section" as="section"
              :initial="{ opacity: 0, y: 8 }"
              :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.45, delay: 0.42 }"
            >
              <header class="pm-sec-head">
                <span class="pm-sec-num leave-mono">01</span>
                <span class="pm-sec-rule" />
                <h4 class="pm-sec-title">Quick presets</h4>
                <span class="pm-sec-meta leave-mono">{{ presets.length }} for {{ typeLabel.toLowerCase() }}</span>
              </header>

              <div class="pm-chips">
                <Motion v-for="(p, i) in presets" :key="p" as="button" type="button"
                  class="pm-chip"
                  :initial="{ opacity: 0, scale: 0.8, y: 8 }"
                  :animate="{ opacity: 1, scale: 1, y: 0 }"
                  :transition="{ duration: 0.36, delay: 0.5 + i * 0.05, ease: [0.34, 1.56, 0.64, 1] }"
                  :whileHover="{ y: -2, scale: 1.04 }"
                  :whileTap="{ scale: 0.95 }"
                  @click="applyPreset(p)"
                >
                  <Sparkles :size="11" class="chip-spark" />
                  <span class="chip-label">{{ p }}</span>
                </Motion>
              </div>
            </Motion>

            <!-- 02 — Custom note -->
            <Motion class="pm-section" as="section"
              :initial="{ opacity: 0, y: 8 }"
              :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.45, delay: 0.62 }"
            >
              <header class="pm-sec-head">
                <span class="pm-sec-num leave-mono">02</span>
                <span class="pm-sec-rule" />
                <h4 class="pm-sec-title">Your request note</h4>
                <span class="pm-sec-meta leave-mono" :data-warn="note.length > 0 && note.trim().length < 5">
                  {{ note.length }}/2000
                </span>
              </header>

              <div class="pm-textarea-wrap" :class="{ 'is-focused': focused, 'is-empty': !note.trim() }">
                <textarea ref="ta" v-model="note" rows="4"
                  class="pm-textarea"
                  placeholder="Describe exactly what you need (e.g. 'Please upload your medical certificate from your physician covering the leave dates')."
                  maxlength="2000"
                  @focus="focused = true"
                  @blur="focused = false"
                />
                <span class="pm-ta-glow" aria-hidden="true" />
                <span class="pm-ta-corner tl" aria-hidden="true" />
                <span class="pm-ta-corner tr" aria-hidden="true" />
                <span class="pm-ta-corner bl" aria-hidden="true" />
                <span class="pm-ta-corner br" aria-hidden="true" />
              </div>

              <Motion v-if="note.trim()" as="div" class="pm-preview"
                :initial="{ opacity: 0, y: 4 }"
                :animate="{ opacity: 1, y: 0 }"
                :transition="{ duration: 0.32 }"
              >
                <span class="pm-preview-eye leave-mono">
                  <Quote :size="9" /> PREVIEW · what the employee will see
                </span>
                <p class="pm-preview-text">{{ note.trim() }}</p>
              </Motion>
            </Motion>
          </div>

          <!-- ═══ Footer ═══ -->
          <Motion class="pm-foot" as="footer"
            :initial="{ opacity: 0, y: 8 }"
            :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.45, delay: 0.78 }"
          >
            <button class="leave-btn leave-btn-sm pm-cancel" @click="$emit('cancel')" :disabled="submitting">
              <ArrowLeft :size="13" /> Cancel
            </button>
            <Motion as="button" type="button"
              class="leave-btn leave-btn-sm pm-confirm"
              :disabled="!canSubmit || submitting"
              :whileHover="canSubmit && !submitting ? { y: -2, scale: 1.02 } : {}"
              :whileTap="canSubmit && !submitting ? { scale: 0.97 } : {}"
              @click="onConfirm"
            >
              <Loader2 v-if="submitting" :size="13" class="spin" />
              <Send v-else :size="13" />
              <span class="pm-confirm-label">{{ submitting ? 'Sending…' : 'Send request' }}</span>
              <span class="pm-confirm-glow" aria-hidden="true" />
            </Motion>
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
  FileSearch, FileText, Send, X, Quote, Sparkles, ShieldCheck,
  Stethoscope, Heart, GraduationCap, Plane, ArrowLeft, Loader2,
  Baby,
} from 'lucide-vue-next'
import { typeMeta } from '@/composables/useLeaves'

const props = defineProps({
  open: { type: Boolean, default: false },
  leave: { type: Object, default: null },
})
const emit = defineEmits(['cancel', 'confirm'])

// ─── Preset proof types by leave type ────────────────────────────────────
const PRESETS_BY_TYPE = {
  SICK: [
    'Medical certificate',
    "Doctor's prescription",
    'Hospital discharge summary',
    'Diagnostic test report',
  ],
  BEREAVEMENT: [
    'Death certificate',
    'Funeral notice',
    'Family proof / relationship document',
  ],
  MATERNITY: [
    'Hospital admission documents',
    'Birth certificate',
    'Pregnancy / medical proof',
    'Doctor advisory letter',
  ],
  PATERNITY: [
    'Birth certificate',
    'Hospital documents',
    'Spouse delivery proof',
  ],
  STUDY: [
    'Course enrollment confirmation',
    'Exam schedule',
    'Acceptance letter',
    'Institute ID / fee receipt',
  ],
  COMP_OFF: [
    'Original OT day approval',
    'Manager endorsement',
    'Project deliverable proof',
  ],
  EARNED: [
    'Travel itinerary',
    'Booking confirmation',
    'Coverage plan from manager',
  ],
  LWP: [
    'Justification letter',
    'Manager endorsement',
    'Supporting evidence',
  ],
  BEREAV: [], // alias safeguard
}
const DEFAULT_PRESETS = [
  'Supporting document',
  'Receipt / proof of activity',
  'Travel itinerary',
  'Manager endorsement',
]

// ─── Icon picker per leave type ──────────────────────────────────────────
const ICON_BY_TYPE = {
  SICK: Stethoscope,
  BEREAVEMENT: Heart,
  MATERNITY: Baby,
  PATERNITY: Baby,
  STUDY: GraduationCap,
  EARNED: Plane,
}

// ─── Computeds ───────────────────────────────────────────────────────────
const typeKey = computed(() => props.leave?.leave_type || 'CASUAL')
const typeLabel = computed(() => typeMeta(typeKey.value).label || 'leave')
const presets = computed(() => PRESETS_BY_TYPE[typeKey.value] || DEFAULT_PRESETS)
const glyphIcon = computed(() => ICON_BY_TYPE[typeKey.value] || FileSearch)

// ─── Internal state ──────────────────────────────────────────────────────
const note = ref('')
const focused = ref(false)
const submitting = ref(false)
const ta = ref(null)

const canSubmit = computed(() => note.value.trim().length >= 5)

// Preset chip: append to textarea with a separator if there's existing text
const applyPreset = (preset) => {
  const cur = note.value.trim()
  if (!cur) {
    note.value = `Please share: ${preset}.`
  } else {
    note.value = `${cur}\n· ${preset}`
  }
  // Focus the textarea after applying so users can continue typing
  nextTick(() => { ta.value?.focus() })
}

const onConfirm = async () => {
  if (!canSubmit.value || submitting.value) return
  submitting.value = true
  try {
    emit('confirm', { note: note.value.trim() })
  } finally {
    // Parent closes the modal on success; reset the flag so a re-open is clean.
    // Use a short tick so the disabled state survives the network roundtrip
    // visually even if the parent closes immediately.
    setTimeout(() => { submitting.value = false }, 300)
  }
}

// Reset state every time the modal opens.
watch(() => props.open, async (v) => {
  if (v) {
    note.value = ''
    focused.value = false
    submitting.value = false
    await nextTick()
  }
})
</script>

<style scoped>
@import '@/styles/leave-theme.css';

/* ═══════════════════════════════════════════════════════════════════
   Scrim — radial gold + emerald/cyan backdrop with blur
   ═══════════════════════════════════════════════════════════════════ */
.pm-scrim {
  position: fixed; inset: 0; z-index: 1200;
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  background:
    radial-gradient(60% 60% at 50% 40%, rgba(6, 182, 212, 0.26), transparent 60%),
    radial-gradient(40% 50% at 25% 70%, rgba(251, 191, 36, 0.20), transparent 60%),
    radial-gradient(35% 50% at 75% 30%, rgba(20, 184, 166, 0.16), transparent 60%),
    rgba(4, 12, 18, 0.74);
  backdrop-filter: blur(12px) saturate(140%);
  perspective: 1200px;
  overflow: hidden;
}
[data-theme="light"] .pm-scrim {
  background:
    radial-gradient(60% 60% at 50% 40%, rgba(6, 182, 212, 0.22), transparent 60%),
    radial-gradient(40% 50% at 25% 70%, rgba(251, 191, 36, 0.22), transparent 60%),
    radial-gradient(35% 50% at 75% 30%, rgba(20, 184, 166, 0.16), transparent 60%),
    rgba(8, 30, 38, 0.42);
}

/* Decorative orbital rings */
.pm-orbit {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  filter: blur(0.6px);
}
.pm-orbit-1 { width: 540px; height: 540px; border: 1px solid rgba(6, 182, 212, 0.24); animation: pm-spin 42s linear infinite; }
.pm-orbit-2 { width: 720px; height: 720px; border: 1px solid rgba(251, 191, 36, 0.16); animation: pm-spin 60s linear infinite reverse; }
.pm-orbit-3 { width: 900px; height: 900px; border: 1px solid rgba(20, 184, 166, 0.10); animation: pm-spin 84s linear infinite; }
@keyframes pm-spin { to { transform: rotate(360deg); } }

/* Drifting documents — ambient */
.pm-drift {
  position: absolute;
  color: rgba(94, 234, 212, 0.18);
  pointer-events: none;
  filter: blur(0.4px) drop-shadow(0 0 12px rgba(6, 182, 212, 0.18));
}
.pm-drift-1 { top: 12%; left: 8%;  animation: pm-drift-a 18s ease-in-out infinite; }
.pm-drift-2 { bottom: 14%; right: 10%; animation: pm-drift-b 22s ease-in-out infinite; color: rgba(251, 191, 36, 0.20); }
.pm-drift-3 { top: 60%; left: 18%; animation: pm-drift-c 26s ease-in-out infinite; color: rgba(20, 184, 166, 0.16); }
[data-theme="light"] .pm-drift-1 { color: rgba(8, 145, 178, 0.22); }
[data-theme="light"] .pm-drift-2 { color: rgba(180, 83, 9, 0.22); }
[data-theme="light"] .pm-drift-3 { color: rgba(15, 118, 110, 0.20); }
@keyframes pm-drift-a {
  0%,100% { transform: translate(0,0) rotate(-6deg); opacity: 0.5; }
  50%     { transform: translate(20px,-18px) rotate(4deg); opacity: 0.85; }
}
@keyframes pm-drift-b {
  0%,100% { transform: translate(0,0) rotate(8deg); opacity: 0.55; }
  50%     { transform: translate(-22px,16px) rotate(-2deg); opacity: 0.85; }
}
@keyframes pm-drift-c {
  0%,100% { transform: translate(0,0) rotate(-2deg); opacity: 0.4; }
  50%     { transform: translate(14px,-20px) rotate(6deg); opacity: 0.75; }
}

/* ═══════════════════════════════════════════════════════════════════
   Card — frosted cyan-amber surface
   ═══════════════════════════════════════════════════════════════════ */
.pm-card {
  position: relative;
  width: 600px; max-width: calc(100vw - 32px);
  max-height: calc(100vh - 40px);
  border-radius: 22px;
  background:
    radial-gradient(120% 70% at 0% 0%, rgba(6, 182, 212, 0.20), transparent 55%),
    radial-gradient(80% 60% at 100% 100%, rgba(251, 191, 36, 0.10), transparent 60%),
    linear-gradient(180deg, rgba(10, 18, 24, 0.96), rgba(6, 12, 18, 0.96));
  border: 1px solid rgba(6, 182, 212, 0.30);
  box-shadow:
    0 60px 140px -30px rgba(0, 0, 0, 0.88),
    0 0 0 1px rgba(94, 234, 212, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  overflow: hidden;
  display: flex; flex-direction: column;
  transform-style: preserve-3d;
}
[data-theme="light"] .pm-card {
  background:
    radial-gradient(120% 70% at 0% 0%, rgba(6, 182, 212, 0.16), transparent 55%),
    radial-gradient(80% 60% at 100% 100%, rgba(251, 191, 36, 0.18), transparent 60%),
    linear-gradient(180deg, rgba(255, 250, 240, 0.98), rgba(247, 254, 252, 0.98));
  border-color: rgba(8, 145, 178, 0.32);
  box-shadow:
    0 50px 120px -30px rgba(8, 51, 68, 0.36),
    0 0 0 1px rgba(8, 145, 178, 0.10);
}

/* ═══════════════════════════════════════════════════════════════════
   Ribbon header
   ═══════════════════════════════════════════════════════════════════ */
.pm-ribbon {
  position: relative;
  display: grid;
  grid-template-columns: 56px 1fr auto;
  gap: 14px;
  align-items: center;
  padding: 22px 22px 18px;
  border-bottom: 1px solid rgba(6, 182, 212, 0.22);
  overflow: hidden;
  background:
    linear-gradient(90deg, rgba(6, 182, 212, 0.12), rgba(251, 191, 36, 0.04) 60%, transparent);
}
[data-theme="light"] .pm-ribbon {
  background: linear-gradient(90deg, rgba(6, 182, 212, 0.10), rgba(251, 191, 36, 0.08) 60%, transparent);
  border-color: rgba(8, 145, 178, 0.20);
}
.rb-grain {
  position: absolute; inset: 0; opacity: 0.06;
  background-image: radial-gradient(rgba(94, 234, 212, 0.7) 1px, transparent 1px);
  background-size: 7px 7px;
  pointer-events: none;
}
.rb-aura {
  position: absolute; left: -10%; top: -50%;
  width: 60%; height: 200%;
  background: radial-gradient(50% 30% at 50% 50%, rgba(6, 182, 212, 0.40), transparent 65%);
  filter: blur(28px);
  pointer-events: none;
}

.rb-glyph {
  position: relative;
  width: 56px; height: 56px;
  display: grid; place-items: center;
  border-radius: 16px;
  background:
    radial-gradient(60% 60% at 30% 30%, rgba(94, 234, 212, 0.30), transparent 70%),
    linear-gradient(135deg, rgba(6, 182, 212, 0.32), rgba(20, 184, 166, 0.28));
  border: 1px solid rgba(6, 182, 212, 0.42);
  color: #cffafe;
  box-shadow:
    0 12px 32px -10px rgba(6, 182, 212, 0.62),
    inset 0 1px 0 rgba(255, 255, 255, 0.08);
}
[data-theme="light"] .rb-glyph {
  color: #0e7490;
  background:
    radial-gradient(60% 60% at 30% 30%, rgba(94, 234, 212, 0.34), transparent 70%),
    linear-gradient(135deg, rgba(6, 182, 212, 0.30), rgba(20, 184, 166, 0.30));
  border-color: rgba(8, 145, 178, 0.40);
}
.rb-glyph-aura {
  position: absolute; inset: -8px;
  border-radius: 50%;
  border: 1.5px solid rgba(6, 182, 212, 0.55);
  opacity: 0.7;
  animation: rb-pulse 2.4s ease-in-out infinite;
}
.rb-glyph-ring {
  position: absolute; inset: -14px;
  border-radius: 50%;
  border: 1px dashed rgba(94, 234, 212, 0.45);
  opacity: 0.55;
  animation: rb-rot 10s linear infinite;
}
@keyframes rb-pulse {
  0%, 100% { transform: scale(0.9); opacity: 0.6; }
  50%      { transform: scale(1.18); opacity: 0; }
}
@keyframes rb-rot { to { transform: rotate(360deg); } }

.rb-meta { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.rb-eye {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; font-weight: 800;
  letter-spacing: 0.18em; text-transform: uppercase;
  color: #67e8f9;
}
[data-theme="light"] .rb-eye { color: #0e7490; }
.rb-eye-led {
  width: 6px; height: 6px; border-radius: 50%;
  background: #10b981; box-shadow: 0 0 8px #10b981;
  animation: rb-eye-pulse 1.6s ease-in-out infinite;
}
[data-theme="light"] .rb-eye-led { background: #059669; box-shadow: 0 0 6px #059669; }
@keyframes rb-eye-pulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50%      { opacity: 1; transform: scale(1.45); }
}
.rb-title {
  margin: 0;
  font-size: 19px; font-weight: 800;
  color: var(--leave-text);
  letter-spacing: -0.014em;
  line-height: 1.15;
}
.rb-sub {
  margin: 0;
  font-size: 11.5px;
  color: var(--leave-text-muted);
  display: flex; flex-wrap: wrap; gap: 6px;
  align-items: center;
}
.rb-emp { color: var(--leave-text-secondary); font-weight: 700; }
.rb-msg { color: var(--leave-text-muted); }
.rb-ref { color: #67e8f9; font-weight: 700; }
[data-theme="light"] .rb-ref { color: #0e7490; }
.rb-sep { opacity: 0.5; }

.pm-close {
  position: relative;
  display: grid; place-items: center;
  width: 32px; height: 32px;
  border-radius: 10px;
  border: 1px solid rgba(6, 182, 212, 0.30);
  background: rgba(10, 18, 24, 0.4);
  color: var(--leave-text-muted);
  cursor: pointer;
  transition: transform .26s var(--leave-ease), color .22s, border-color .22s, background .22s;
}
[data-theme="light"] .pm-close { background: rgba(247, 254, 252, 0.6); }
.pm-close:hover {
  transform: rotate(90deg) scale(1.08);
  color: #67e8f9;
  border-color: #06b6d4;
  background: rgba(6, 182, 212, 0.18);
}
[data-theme="light"] .pm-close:hover { color: #0e7490; }

/* ═══════════════════════════════════════════════════════════════════
   Body
   ═══════════════════════════════════════════════════════════════════ */
.pm-body {
  padding: 16px 22px 4px;
  overflow-y: auto;
  display: flex; flex-direction: column; gap: 18px;
}
.pm-section { display: flex; flex-direction: column; gap: 10px; }
.pm-sec-head { display: flex; align-items: center; gap: 10px; }
.pm-sec-num {
  font-size: 9.5px; font-weight: 800;
  color: #67e8f9;
  padding: 2px 7px; border-radius: 5px;
  background: rgba(6, 182, 212, 0.14);
  border: 1px solid rgba(6, 182, 212, 0.32);
  letter-spacing: 0.06em;
}
[data-theme="light"] .pm-sec-num { color: #0e7490; background: rgba(6, 182, 212, 0.18); border-color: rgba(8, 145, 178, 0.36); }
.pm-sec-rule {
  flex: 0 0 20px; height: 1px;
  background: linear-gradient(90deg, #06b6d4, transparent);
}
.pm-sec-title {
  margin: 0;
  font-size: 13.5px; font-weight: 800;
  color: var(--leave-text);
  letter-spacing: -0.008em;
}
.pm-sec-meta {
  margin-left: auto;
  font-size: 9px; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--leave-text-muted);
}
.pm-sec-meta[data-warn="true"] { color: #fb923c; }

/* ═══ Chips ═══ */
.pm-chips {
  display: flex; flex-wrap: wrap; gap: 7px;
}
.pm-chip {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(255, 250, 235, 0.04);
  border: 1px solid rgba(6, 182, 212, 0.22);
  color: var(--leave-text-secondary);
  font-size: 11.5px; font-weight: 600;
  cursor: pointer;
  transition: border-color .22s, color .22s, background .22s, transform .22s;
  position: relative;
}
[data-theme="light"] .pm-chip {
  background: rgba(247, 254, 252, 0.7);
  border-color: rgba(8, 145, 178, 0.22);
}
.pm-chip:hover {
  border-color: #06b6d4;
  color: var(--leave-text);
  background: rgba(6, 182, 212, 0.12);
}
[data-theme="light"] .pm-chip:hover {
  background: rgba(6, 182, 212, 0.14);
  color: #0e7490;
}
.chip-spark {
  color: #67e8f9;
  filter: drop-shadow(0 0 4px rgba(6, 182, 212, 0.5));
}
[data-theme="light"] .chip-spark { color: #0891b2; }

/* ═══ Textarea ═══ */
.pm-textarea-wrap {
  position: relative;
  border-radius: 14px;
  background: rgba(8, 14, 20, 0.55);
  border: 1px solid rgba(6, 182, 212, 0.24);
  transition: border-color .26s var(--leave-ease), box-shadow .26s var(--leave-ease);
  overflow: hidden;
}
[data-theme="light"] .pm-textarea-wrap {
  background: rgba(255, 252, 245, 0.88);
  border-color: rgba(8, 145, 178, 0.24);
}
.pm-textarea-wrap.is-focused {
  border-color: #06b6d4;
  box-shadow: 0 0 0 4px rgba(6, 182, 212, 0.14);
}
.pm-textarea {
  width: 100%;
  padding: 12px 14px; min-height: 96px;
  background: transparent;
  border: none; outline: none;
  color: var(--leave-text); font: inherit; font-size: 13px;
  line-height: 1.55; resize: vertical;
}
.pm-textarea::placeholder { color: var(--leave-text-placeholder); }
.pm-ta-glow {
  position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.12), transparent);
  background-size: 200% 100%;
  opacity: 0; pointer-events: none;
  transition: opacity .3s;
}
.pm-textarea-wrap.is-focused .pm-ta-glow {
  opacity: 1;
  animation: leave-gradient-pan 2.6s linear infinite;
}
.pm-ta-corner {
  position: absolute; width: 12px; height: 12px;
  border: 1.5px solid #06b6d4;
  opacity: 0; pointer-events: none;
  transition: opacity .26s var(--leave-ease);
}
.pm-ta-corner.tl { top: 6px; left: 6px;     border-right: 0; border-bottom: 0; }
.pm-ta-corner.tr { top: 6px; right: 6px;    border-left: 0;  border-bottom: 0; }
.pm-ta-corner.bl { bottom: 6px; left: 6px;  border-right: 0; border-top: 0; }
.pm-ta-corner.br { bottom: 6px; right: 6px; border-left: 0;  border-top: 0; }
.pm-textarea-wrap.is-focused .pm-ta-corner { opacity: 0.9; }

/* ═══ Preview ═══ */
.pm-preview {
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(6, 182, 212, 0.06);
  border: 1px dashed rgba(6, 182, 212, 0.28);
}
[data-theme="light"] .pm-preview {
  background: rgba(207, 250, 254, 0.55);
  border-color: rgba(8, 145, 178, 0.30);
}
.pm-preview-eye {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 8.5px; font-weight: 800;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: #67e8f9;
  font-style: italic;
}
[data-theme="light"] .pm-preview-eye { color: #0e7490; }
.pm-preview-eye svg { opacity: 0.8; }
.pm-preview-text {
  margin: 4px 0 0;
  font-size: 11.5px; line-height: 1.55;
  color: var(--leave-text-secondary);
  white-space: pre-wrap;
  font-style: italic;
}

/* ═══ Footer ═══ */
.pm-foot {
  display: flex; gap: 10px; justify-content: flex-end;
  padding: 14px 22px 20px;
  border-top: 1px solid rgba(6, 182, 212, 0.18);
  background:
    linear-gradient(180deg, transparent, rgba(6, 182, 212, 0.04));
}
[data-theme="light"] .pm-foot {
  border-color: rgba(8, 145, 178, 0.18);
  background: linear-gradient(180deg, transparent, rgba(207, 250, 254, 0.40));
}
.pm-cancel {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(94, 234, 212, 0.22);
  color: var(--leave-text-secondary);
}
[data-theme="light"] .pm-cancel {
  background: rgba(247, 254, 252, 0.85);
  border-color: rgba(8, 145, 178, 0.22);
  color: #0e7490;
}
.pm-cancel:hover:not(:disabled) {
  border-color: #06b6d4;
  color: var(--leave-text);
}
[data-theme="light"] .pm-cancel:hover:not(:disabled) { color: #164e63; }

.pm-confirm {
  position: relative; overflow: hidden;
  background: linear-gradient(120deg, #fbbf24 0%, #f59e0b 30%, #06b6d4 70%, #0891b2 100%);
  background-size: 220% 100%;
  background-position: 0 0;
  color: #08313c;
  border: 1px solid rgba(6, 182, 212, 0.65);
  box-shadow:
    0 12px 24px -10px rgba(6, 182, 212, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.40);
  font-weight: 800;
  letter-spacing: 0.04em;
  transition:
    transform .22s cubic-bezier(0.34, 1.56, 0.64, 1),
    background-position .8s var(--leave-ease),
    box-shadow .25s;
}
.pm-confirm:not(:disabled):hover {
  background-position: 100% 0;
  box-shadow:
    0 18px 32px -10px rgba(6, 182, 212, 0.70),
    inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
.pm-confirm:disabled { opacity: 0.42; cursor: not-allowed; filter: grayscale(0.4); }
.pm-confirm-glow {
  position: absolute; inset: 0;
  background: linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.36), transparent);
  background-size: 220% 100%;
  background-position: -100% 0;
  pointer-events: none;
  transition: background-position .7s var(--leave-ease);
}
.pm-confirm:not(:disabled):hover .pm-confirm-glow { background-position: 100% 0; }
.spin { animation: pm-spin-fast 1s linear infinite; }
@keyframes pm-spin-fast { to { transform: rotate(360deg); } }

.pm-enter-active, .pm-leave-active { transition: opacity .28s; }
.pm-enter-from, .pm-leave-to { opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .pm-orbit, .pm-drift, .rb-glyph-aura, .rb-glyph-ring,
  .rb-eye-led, .pm-ta-glow, .spin { animation: none !important; }
}

@media (max-width: 600px) {
  .pm-card { width: calc(100vw - 24px); border-radius: 16px; }
  .pm-ribbon { grid-template-columns: 44px 1fr auto; padding: 18px 16px 14px; }
  .rb-glyph { width: 44px; height: 44px; border-radius: 12px; }
  .rb-title { font-size: 16px; }
  .pm-body { padding: 14px 16px 4px; }
  .pm-foot { padding: 12px 16px 18px; }
}
</style>
