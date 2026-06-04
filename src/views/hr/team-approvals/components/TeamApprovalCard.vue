<template>
  <!-- ═════════════════════════════════════════════════════════════════
       TeamApprovalCard
       A motion-rich card representing one pending leave request that
       the current user (as reporting manager) must decide.

       Inline quick-actions (Approve / Reject) for one-tap calls.
       Click the card body to open the full review drawer.

       Props:
         leave        — full LeaveRequestResponse from /manager/queue
         busy         — true while a parent-side decision is in flight
         decided      — 'APPROVED' | 'REJECTED' | null. When non-null,
                        the card plays an exit transition before
                        unmounting (parent listens to @decision-done).
       Emits:
         open(leave)               — request full review
         quick-decide(leave, kind) — kind in 'APPROVED' | 'REJECTED'
         decision-done(leave, kind)— after the exit animation
       ════════════════════════════════════════════════════════════════ -->
  <Motion as="article"
    class="ta-card"
    :class="['tone-' + decided, { 'is-busy': busy }]"
    :initial="{ opacity: 0, y: 18, scale: 0.96 }"
    :animate="exitAnim"
    :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }"
    @animationcomplete="onAnimDone"
  >
    <!-- ───── Ambient corner glow keyed to leave-type ───── -->
    <span class="ta-glow" :style="{ '--c': typeMeta(leave.leave_type).hex }" aria-hidden="true" />

    <!-- ───── Pulsing pending indicator ───── -->
    <span v-if="!decided" class="ta-pulse" aria-hidden="true">
      <span class="ta-pulse-dot" />
      <span class="ta-pulse-ring" />
    </span>

    <!-- ───── Header row ───── -->
    <header class="ta-head" @click="$emit('open', leave)">
      <div class="ta-id">
        <span class="ta-avatar" :style="{ '--c': typeMeta(leave.leave_type).hex }">
          <span class="ta-avatar-glow" />
          <span class="ta-avatar-initial">{{ initial }}</span>
        </span>
        <div class="ta-name-block">
          <h3 class="ta-name">{{ leave.employee_name || '—' }}</h3>
          <p class="ta-meta leave-mono">
            <span class="ta-code">{{ leave.employee_code || 'NO CODE' }}</span>
            <span class="ta-sep">·</span>
            <span class="ta-dept">{{ leave.department_name || 'Unassigned' }}</span>
          </p>
        </div>
      </div>

      <div class="ta-typebox">
        <LeaveTypeIcon :type="leave.leave_type" :size="14" />
        <div class="ta-typelabel">
          <span class="ta-typeword">{{ typeMeta(leave.leave_type).label }}</span>
          <span class="ta-days leave-mono">{{ leave.total_days }}d</span>
        </div>
      </div>
    </header>

    <!-- ───── Date span — animated rail ───── -->
    <div class="ta-span" @click="$emit('open', leave)">
      <div class="ta-span-rail">
        <span class="ta-span-fill" />
      </div>
      <div class="ta-span-row">
        <div class="ta-span-side">
          <span class="ta-span-label leave-mono">FROM</span>
          <span class="ta-span-date">{{ fmtDate(leave.from_date) }}</span>
        </div>
        <div class="ta-span-arc" aria-hidden="true">
          <svg viewBox="0 0 90 22" preserveAspectRatio="none">
            <path d="M2 18 Q45 -2 88 18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 3" />
          </svg>
          <span class="ta-span-arc-dot" />
        </div>
        <div class="ta-span-side ta-span-right">
          <span class="ta-span-label leave-mono">TO</span>
          <span class="ta-span-date">{{ fmtDate(leave.to_date) }}</span>
        </div>
      </div>
      <div v-if="leave.is_half_day" class="ta-half-badge">
        <Clock4 :size="10" /> Half-day · {{ leave.which_session || '' }}
      </div>
    </div>

    <!-- ───── Reason snippet ───── -->
    <p class="ta-reason" @click="$emit('open', leave)">
      <Quote :size="11" class="ta-quote" />
      <span class="ta-reason-text">{{ truncate(leave.reason, 120) }}</span>
    </p>

    <!-- ───── Footer: applied + actions ───── -->
    <footer class="ta-foot">
      <span class="ta-applied leave-mono">
        <Clock :size="10" /> applied {{ relTime(leave.created_at) }}
        <span class="ta-applied-ref">· {{ leave.reference_no }}</span>
      </span>
      <div class="ta-actions">
        <Motion as="button"
          class="ta-btn reject"
          :disabled="busy || !!decided"
          :whileHover="{ y: -1, scale: 1.04 }"
          :whileTap="{ scale: 0.94 }"
          :transition="{ duration: 0.18 }"
          @click="$emit('quick-decide', leave, 'REJECTED')"
        >
          <X :size="13" /><span>Reject</span>
        </Motion>
        <Motion as="button"
          class="ta-btn approve"
          :disabled="busy || !!decided"
          :whileHover="{ y: -1, scale: 1.04 }"
          :whileTap="{ scale: 0.94 }"
          :transition="{ duration: 0.18 }"
          @click="$emit('quick-decide', leave, 'APPROVED')"
        >
          <Check :size="13" /><span>Approve</span>
          <span class="ta-btn-flare" />
        </Motion>
      </div>
    </footer>

    <!-- ───── Decision wash ───── -->
    <transition name="ta-wash">
      <span v-if="decided" :class="['ta-wash', 'ta-wash-' + decided]" aria-hidden="true">
        <span class="ta-wash-icon">
          <Check v-if="decided === 'APPROVED'" :size="34" />
          <X v-else :size="34" />
        </span>
      </span>
    </transition>
  </Motion>
</template>

<script setup>
import { computed } from 'vue'
import { Motion } from 'motion-v'
import { Check, X, Clock, Clock4, Quote } from 'lucide-vue-next'
import LeaveTypeIcon from '@/views/hr/leave/components/LeaveTypeIcon.vue'
import { typeMeta } from '@/composables/useLeaves'

const props = defineProps({
  leave: { type: Object, required: true },
  busy: { type: Boolean, default: false },
  // When set, plays the exit animation. Parent removes the card after
  // the @decision-done emit fires.
  decided: { type: String, default: null },
})
defineEmits(['open', 'quick-decide', 'decision-done'])

const initial = computed(() => (props.leave?.employee_name || '?').trim().charAt(0).toUpperCase())

// Reactive animate target — switches to the slide-away frame once decided.
const exitAnim = computed(() => {
  if (props.decided === 'APPROVED') return { opacity: 0, x: 60, scale: 0.92 }
  if (props.decided === 'REJECTED') return { opacity: 0, x: -60, scale: 0.92 }
  return { opacity: 1, y: 0, scale: 1 }
})

const onAnimDone = () => {
  if (props.decided) {
    // Wait one tick so the wash overlay has played out, then bubble up.
    setTimeout(() => {
      // Re-emit through the parent
      const ev = new CustomEvent('ta-card-done')
      window.dispatchEvent(ev)
    }, 0)
  }
}

const fmtDate = (v) => {
  if (!v) return '—'
  const d = new Date(v)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const relTime = (v) => {
  if (!v) return ''
  const m = (Date.now() - new Date(v).getTime()) / 60000
  if (m < 1) return 'just now'
  if (m < 60) return `${Math.floor(m)}m ago`
  const h = m / 60
  if (h < 24) return `${Math.floor(h)}h ago`
  const d = h / 24
  if (d < 7) return `${Math.floor(d)}d ago`
  return `${Math.floor(d / 7)}w ago`
}

const truncate = (s, n) =>
  (s || '').length > n ? `${(s || '').slice(0, n - 1)}…` : (s || '')
</script>

<style scoped>
@import '@/styles/leave-theme.css';

.ta-card {
  position: relative;
  display: flex; flex-direction: column; gap: 14px;
  padding: 16px 18px 14px;
  border-radius: 18px;
  background: var(--leave-surface);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: var(--leave-shadow-card);
  isolation: isolate;
  overflow: hidden;
  cursor: default;
  transition: border-color .35s var(--leave-ease), transform .35s var(--leave-ease), box-shadow .35s var(--leave-ease);
}
[data-theme="light"] .ta-card { border-color: rgba(120, 53, 15, 0.14); }

.ta-card::before {
  content: ''; position: absolute; inset: 0; border-radius: inherit;
  padding: 1.5px;
  background: linear-gradient(135deg,
    var(--leave-pending-mgr) 0%,
    transparent 30%,
    transparent 70%,
    var(--leave-pending-mgr) 100%);
  -webkit-mask: linear-gradient(#000, #000) content-box, linear-gradient(#000, #000);
          mask: linear-gradient(#000, #000) content-box, linear-gradient(#000, #000);
  -webkit-mask-composite: xor; mask-composite: exclude;
  opacity: 0.55;
  z-index: 2;
  pointer-events: none;
}

.ta-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 28px 60px -32px var(--leave-pending-mgr);
  border-color: color-mix(in srgb, var(--leave-pending-mgr) 38%, transparent);
}

/* Ambient glow keyed to leave type */
.ta-glow {
  position: absolute; right: -40px; top: -40px;
  width: 220px; height: 220px; border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--c) 38%, transparent), transparent 70%);
  filter: blur(40px);
  opacity: 0.65;
  z-index: 0; pointer-events: none;
}

/* Pulsing pending dot — top-right corner */
.ta-pulse {
  position: absolute; top: 14px; right: 14px;
  width: 12px; height: 12px;
  display: grid; place-items: center;
  z-index: 3; pointer-events: none;
}
.ta-pulse-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--leave-pending-mgr);
  box-shadow: 0 0 12px var(--leave-pending-mgr);
}
.ta-pulse-ring {
  position: absolute; inset: -6px; border-radius: 50%;
  border: 1.5px solid var(--leave-pending-mgr);
  animation: ta-pulse-ring 1.8s ease-out infinite;
}
@keyframes ta-pulse-ring {
  0%   { transform: scale(0.6); opacity: 0.85; }
  100% { transform: scale(1.7); opacity: 0; }
}

/* ───── Header ───── */
.ta-head {
  position: relative;
  display: flex; justify-content: space-between; align-items: flex-start;
  gap: 14px;
  cursor: pointer;
}

.ta-id { display: flex; align-items: center; gap: 11px; min-width: 0; }
.ta-avatar {
  position: relative;
  width: 40px; height: 40px;
  display: grid; place-items: center;
  border-radius: 12px;
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--c) 38%, transparent),
    color-mix(in srgb, var(--c) 14%, transparent));
  border: 1px solid color-mix(in srgb, var(--c) 45%, transparent);
  color: var(--c);
  flex-shrink: 0;
  isolation: isolate;
}
.ta-avatar-glow {
  position: absolute; inset: -8px; border-radius: 18px;
  background: radial-gradient(circle, color-mix(in srgb, var(--c) 50%, transparent), transparent 70%);
  z-index: -1;
  opacity: 0.6;
  animation: ta-avatar-breathe 3.4s ease-in-out infinite;
}
@keyframes ta-avatar-breathe {
  0%, 100% { opacity: 0.45; transform: scale(0.95); }
  50%      { opacity: 0.85; transform: scale(1.08); }
}
.ta-avatar-initial {
  font-size: 16px; font-weight: 800; letter-spacing: -0.02em;
}

.ta-name-block { min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.ta-name {
  margin: 0;
  font-size: 13.5px; font-weight: 800; letter-spacing: -0.005em;
  color: var(--hr-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  max-width: 200px;
}
.ta-meta {
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--hr-text-muted);
  display: flex; align-items: center; gap: 6px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
[data-theme="light"] .ta-meta { color: #8a7556; }
.ta-sep { opacity: 0.45; }

.ta-typebox {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 10px; border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}
[data-theme="light"] .ta-typebox {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(120, 53, 15, 0.14);
}
.ta-typelabel { display: flex; flex-direction: column; gap: 1px; line-height: 1; }
.ta-typeword { font-size: 11px; font-weight: 700; color: var(--hr-text); }
.ta-days {
  font-size: 9.5px; font-weight: 800;
  color: var(--leave-approved);
  letter-spacing: 0.05em;
}

/* ───── Date span ───── */
.ta-span {
  position: relative;
  padding: 12px 14px;
  border-radius: 12px;
  background: linear-gradient(135deg,
    rgba(245, 158, 11, 0.06),
    rgba(255, 255, 255, 0.02));
  border: 1px solid rgba(245, 158, 11, 0.18);
  cursor: pointer;
}
[data-theme="light"] .ta-span {
  background: linear-gradient(135deg,
    rgba(245, 158, 11, 0.10),
    rgba(255, 250, 240, 0.65));
  border-color: rgba(180, 83, 9, 0.22);
}
.ta-span-rail {
  position: absolute; left: 14px; right: 14px; top: 0;
  height: 1.5px;
  background: rgba(245, 158, 11, 0.18);
  border-radius: 999px;
  overflow: hidden;
}
.ta-span-fill {
  display: block; height: 100%; width: 100%;
  background: linear-gradient(90deg, transparent, var(--leave-pending-mgr), transparent);
  animation: ta-span-sweep 3.5s linear infinite;
}
@keyframes ta-span-sweep {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.ta-span-row {
  display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px;
}
.ta-span-side { display: flex; flex-direction: column; gap: 2px; }
.ta-span-right { align-items: flex-end; text-align: right; }
.ta-span-label {
  font-size: 9px; font-weight: 800; letter-spacing: 0.18em;
  color: var(--hr-text-muted);
}
.ta-span-date {
  font-size: 12.5px; font-weight: 700; color: var(--hr-text);
  letter-spacing: -0.01em;
}
.ta-span-arc {
  position: relative;
  width: 90px; height: 22px;
  color: rgba(245, 158, 11, 0.55);
}
.ta-span-arc svg { width: 100%; height: 100%; }
.ta-span-arc-dot {
  position: absolute; left: 50%; top: -3px; transform: translateX(-50%);
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--leave-pending-mgr);
  box-shadow: 0 0 10px var(--leave-pending-mgr);
}

.ta-half-badge {
  position: absolute; right: 10px; top: 10px;
  display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 7px; border-radius: 999px;
  font-size: 8.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase;
  background: rgba(217, 119, 6, 0.18);
  border: 1px solid rgba(217, 119, 6, 0.34);
  color: #fbbf24;
}
[data-theme="light"] .ta-half-badge { color: #92400e; border-color: rgba(180, 83, 9, 0.30); }

/* ───── Reason ───── */
.ta-reason {
  margin: 0;
  display: flex; gap: 8px; align-items: flex-start;
  font-size: 12px; line-height: 1.55;
  color: var(--hr-text-secondary, var(--hr-text-muted));
  cursor: pointer;
}
.ta-quote {
  color: var(--leave-pending-mgr);
  flex-shrink: 0;
  margin-top: 3px;
  opacity: 0.7;
}
.ta-reason-text { word-break: break-word; }
[data-theme="light"] .ta-reason { color: #4b3a2a; }

/* ───── Footer ───── */
.ta-foot {
  display: flex; justify-content: space-between; align-items: center;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px dashed rgba(255, 255, 255, 0.06);
}
[data-theme="light"] .ta-foot { border-top-color: rgba(120, 53, 15, 0.16); }
.ta-applied {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 10px; color: var(--hr-text-muted);
  letter-spacing: 0.04em;
}
.ta-applied-ref { opacity: 0.6; margin-left: 2px; }

.ta-actions { display: flex; gap: 6px; }
.ta-btn {
  position: relative;
  display: inline-flex; align-items: center; gap: 5px;
  padding: 7px 12px;
  border-radius: 10px;
  font: inherit;
  font-size: 11.5px; font-weight: 800; letter-spacing: 0.04em;
  cursor: pointer;
  border: 1px solid;
  isolation: isolate;
  overflow: hidden;
  transition: box-shadow .25s var(--leave-ease);
}
.ta-btn:disabled { opacity: 0.45; cursor: not-allowed; }

.ta-btn.reject {
  background: rgba(244, 63, 94, 0.10);
  border-color: rgba(244, 63, 94, 0.42);
  color: #fda4af;
}
.ta-btn.reject:hover:not(:disabled) {
  background: rgba(244, 63, 94, 0.18);
  border-color: rgba(244, 63, 94, 0.65);
  box-shadow: 0 10px 24px -10px rgba(244, 63, 94, 0.55);
}
[data-theme="light"] .ta-btn.reject {
  background: rgba(244, 63, 94, 0.10);
  border-color: rgba(244, 63, 94, 0.42);
  color: #be123c;
}

.ta-btn.approve {
  background: linear-gradient(135deg, #34d399, #10b981);
  border-color: rgba(16, 185, 129, 0.65);
  color: #022c22;
}
.ta-btn.approve:hover:not(:disabled) {
  box-shadow: 0 12px 30px -10px rgba(16, 185, 129, 0.75);
}
.ta-btn-flare {
  position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(115deg, transparent 30%, rgba(255, 255, 255, 0.4) 50%, transparent 70%);
  transform: translateX(-130%);
}
.ta-btn.approve:hover:not(:disabled) .ta-btn-flare {
  animation: ta-flare 1.1s ease-out;
}
@keyframes ta-flare {
  0%   { transform: translateX(-130%); }
  100% { transform: translateX(130%); }
}

/* ───── Decision wash overlay ───── */
.ta-wash {
  position: absolute; inset: 0;
  display: grid; place-items: center;
  border-radius: inherit;
  z-index: 5;
  pointer-events: none;
  backdrop-filter: blur(3px);
}
.ta-wash-APPROVED {
  background: radial-gradient(60% 60% at 50% 50%, rgba(16, 185, 129, 0.55), rgba(4, 120, 87, 0.85));
  color: #d1fae5;
}
.ta-wash-REJECTED {
  background: radial-gradient(60% 60% at 50% 50%, rgba(244, 63, 94, 0.55), rgba(159, 18, 57, 0.85));
  color: #ffe4e6;
}
.ta-wash-icon {
  width: 64px; height: 64px;
  display: grid; place-items: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.12);
  border: 2px solid rgba(255, 255, 255, 0.45);
  box-shadow: 0 18px 38px -12px currentColor;
  animation: ta-wash-pop 0.55s var(--leave-spring);
}
@keyframes ta-wash-pop {
  0%   { transform: scale(0.35) rotate(-12deg); opacity: 0; }
  60%  { transform: scale(1.18); opacity: 1; }
  100% { transform: scale(1); }
}
.ta-wash-enter-active { transition: opacity .25s; }
.ta-wash-enter-from { opacity: 0; }
.ta-wash-leave-active { transition: opacity .35s ease; }
.ta-wash-leave-to { opacity: 0; }

.ta-card.is-busy { pointer-events: none; }
</style>
