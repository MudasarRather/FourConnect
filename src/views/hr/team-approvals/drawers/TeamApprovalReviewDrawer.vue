<template>
  <Teleport to="body">
    <transition name="ta-drawer-scrim">
      <div v-if="open" class="ta-drawer-scrim" @click.self="$emit('close')" />
    </transition>

    <transition name="ta-drawer-panel">
      <Motion v-if="open" as="aside"
        class="ta-drawer"
        role="dialog" aria-modal="true"
        :initial="{ x: 60, opacity: 0 }"
        :animate="{ x: 0, opacity: 1 }"
        :exit="{ x: 60, opacity: 0 }"
        :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }"
      >
        <!-- Ambient -->
        <div class="ta-drawer-aura" aria-hidden="true">
          <span class="ta-drawer-orb a1" />
          <span class="ta-drawer-orb a2" />
          <span class="ta-drawer-grid" />
        </div>

        <!-- Close -->
        <button class="ta-drawer-close" @click="$emit('close')" aria-label="Close">
          <X :size="16" />
        </button>

        <!-- ───── Header ───── -->
        <header v-if="leave" class="ta-drawer-head">
          <Motion as="span" class="ta-drawer-eye leave-mono"
            :initial="{ opacity: 0, y: -6 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.4 }"
          >
            <span class="ta-drawer-eye-dot" /> Review · {{ leave.reference_no }}
          </Motion>
          <Motion as="h2" class="ta-drawer-title"
            :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.5, delay: 0.06, ease: [0.16, 1, 0.3, 1] }"
          >
            <span class="ta-grad">{{ leave.employee_name }}</span>
            <span class="ta-drawer-title-sub">is requesting {{ typeMeta(leave.leave_type).label }}</span>
          </Motion>
        </header>

        <!-- ───── Body — scroll area ───── -->
        <div v-if="leave" class="ta-drawer-body">

          <!-- Identity card -->
          <Motion as="article" class="ta-block ta-identity"
            :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.45, delay: 0.12 }"
          >
            <div class="ta-identity-row">
              <span class="ta-id-avatar" :style="{ '--c': typeMeta(leave.leave_type).hex }">
                {{ (leave.employee_name || '?').trim().charAt(0).toUpperCase() }}
                <span class="ta-id-glow" />
              </span>
              <div class="ta-id-info">
                <div class="ta-id-name">{{ leave.employee_name }}</div>
                <div class="ta-id-meta leave-mono">
                  {{ leave.employee_code || 'NO CODE' }}
                  <span v-if="leave.designation_name"> · {{ leave.designation_name }}</span>
                  <span v-if="leave.department_name"> · {{ leave.department_name }}</span>
                </div>
              </div>
              <LeaveTypeIcon :type="leave.leave_type" :size="22" ambient />
            </div>
          </Motion>

          <!-- Date range + days -->
          <Motion as="article" class="ta-block ta-range"
            :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.45, delay: 0.18 }"
          >
            <div class="ta-range-stat">
              <span class="ta-range-num leave-mono">{{ leave.total_days }}</span>
              <span class="ta-range-unit">day{{ Number(leave.total_days) === 1 ? '' : 's' }}</span>
            </div>
            <div class="ta-range-arrow">
              <div class="ta-range-from">
                <span class="ta-range-label leave-mono">FROM</span>
                <span class="ta-range-date">{{ fmtFullDate(leave.from_date) }}</span>
                <span class="ta-range-dow leave-mono">{{ dayOfWeek(leave.from_date) }}</span>
              </div>
              <span class="ta-range-dash" aria-hidden="true">
                <ArrowRight :size="18" />
              </span>
              <div class="ta-range-to">
                <span class="ta-range-label leave-mono">TO</span>
                <span class="ta-range-date">{{ fmtFullDate(leave.to_date) }}</span>
                <span class="ta-range-dow leave-mono">{{ dayOfWeek(leave.to_date) }}</span>
              </div>
            </div>
            <div v-if="leave.is_half_day" class="ta-range-half">
              <Clock4 :size="11" /> Half-day request — <strong>{{ leave.which_session || 'Session unspecified' }}</strong>
            </div>
          </Motion>

          <!-- Mini calendar strip -->
          <Motion as="article" class="ta-block ta-calendar"
            :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.45, delay: 0.24 }"
          >
            <div class="ta-cal-head">
              <CalendarDays :size="11" />
              <span>Day-by-day</span>
              <span v-if="calendarStrip.length > 18" class="ta-cal-note">first 18 of {{ calendarStrip.length }}</span>
            </div>
            <div class="ta-cal-grid">
              <Motion v-for="(d, i) in calendarStrip.slice(0, 18)" :key="d.iso" as="div"
                class="ta-cal-cell"
                :class="['kind-' + d.kind]"
                :initial="{ opacity: 0, y: 8, scale: 0.9 }"
                :animate="{ opacity: 1, y: 0, scale: 1 }"
                :transition="{ duration: 0.32, delay: 0.26 + Math.min(i * 0.025, 0.6) }"
              >
                <span class="ta-cal-dow leave-mono">{{ d.dow }}</span>
                <span class="ta-cal-num">{{ d.day }}</span>
                <span v-if="d.kind !== 'work'" class="ta-cal-tag leave-mono">{{ d.tag }}</span>
              </Motion>
            </div>
            <div class="ta-cal-legend">
              <span><i class="dot work" />Working day</span>
              <span><i class="dot weekend" />Weekend</span>
            </div>
          </Motion>

          <!-- Reason -->
          <Motion as="article" class="ta-block ta-reason-block"
            :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.45, delay: 0.30 }"
          >
            <div class="ta-block-head">
              <MessageCircle :size="11" />
              <span>Reason from {{ firstName(leave.employee_name) }}</span>
            </div>
            <blockquote class="ta-reason-quote">
              <Quote :size="14" class="ta-reason-mark" />
              <p>{{ leave.reason }}</p>
            </blockquote>
            <div v-if="leave.contact_during_leave || leave.emergency_contact" class="ta-extras">
              <div v-if="leave.contact_during_leave" class="ta-extra-row">
                <Phone :size="11" /><span>Contact:</span> <strong>{{ leave.contact_during_leave }}</strong>
              </div>
              <div v-if="leave.emergency_contact" class="ta-extra-row">
                <AlertOctagon :size="11" /><span>Emergency:</span> <strong>{{ leave.emergency_contact }}</strong>
              </div>
            </div>
          </Motion>

          <!-- Decision picker -->
          <Motion as="article" class="ta-block ta-decide"
            :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.45, delay: 0.36 }"
          >
            <div class="ta-block-head">
              <Scale :size="11" />
              <span>Your decision</span>
            </div>
            <div class="ta-decide-pickers">
              <Motion as="button" type="button"
                class="ta-pick ta-pick-approve"
                :class="{ active: action === 'APPROVED' }"
                :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }"
                :transition="{ duration: 0.18 }"
                @click="action = 'APPROVED'"
              >
                <span class="ta-pick-ico"><CheckCircle2 :size="20" /></span>
                <strong>Approve</strong>
                <small>Pass to HR for final stage</small>
              </Motion>
              <Motion as="button" type="button"
                class="ta-pick ta-pick-reject"
                :class="{ active: action === 'REJECTED' }"
                :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }"
                :transition="{ duration: 0.18 }"
                @click="action = 'REJECTED'"
              >
                <span class="ta-pick-ico"><XCircle :size="20" /></span>
                <strong>Reject</strong>
                <small>Decline with a written reason</small>
              </Motion>
            </div>

            <label class="ta-notes-label leave-mono">
              <PenLine :size="11" />
              {{ action === 'REJECTED' ? 'Reason (required for rejection)' : 'Note for HR / employee (optional)' }}
              <span v-if="action === 'REJECTED'" class="ta-required">*</span>
            </label>
            <div class="ta-notes-wrap" :data-action="action">
              <textarea
                v-model="notes"
                class="ta-notes"
                rows="4"
                :placeholder="notesPlaceholder"
                :maxlength="1000"
              />
              <span class="ta-notes-count leave-mono">{{ notes.length }} / 1000</span>
            </div>
          </Motion>
        </div>

        <!-- ───── Footer ───── -->
        <footer class="ta-drawer-foot">
          <button class="ta-drawer-cancel" @click="$emit('close')" :disabled="submitting">Cancel</button>
          <Motion as="button"
            class="ta-drawer-submit"
            :class="['tone-' + (action || 'idle'), { armed: canSubmit && !submitting }]"
            :disabled="!canSubmit || submitting"
            :whileHover="canSubmit && !submitting ? { y: -2, scale: 1.02 } : {}"
            :whileTap="canSubmit && !submitting ? { scale: 0.97 } : {}"
            :transition="{ duration: 0.18 }"
            @click="submit"
          >
            <span v-if="submitting" class="ta-spin" />
            <CheckCircle2 v-else-if="action === 'APPROVED'" :size="14" />
            <XCircle v-else-if="action === 'REJECTED'" :size="14" />
            <Scale v-else :size="14" />
            <span>{{ submitLabel }}</span>
            <span v-if="canSubmit && !submitting" class="ta-drawer-submit-flare" />
          </Motion>
        </footer>
      </Motion>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  X, ArrowRight, Clock4, CalendarDays, MessageCircle, Quote, Phone,
  AlertOctagon, Scale, CheckCircle2, XCircle, PenLine,
} from 'lucide-vue-next'
import LeaveTypeIcon from '@/views/hr/leave/components/LeaveTypeIcon.vue'
import { typeMeta } from '@/composables/useLeaves'

const props = defineProps({
  open: { type: Boolean, default: false },
  leave: { type: Object, default: null },
  submitting: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'submit'])

const action = ref(null)
const notes = ref('')

// Reset on every fresh open
watch(() => props.open, (v) => {
  if (v) { action.value = null; notes.value = '' }
})

const canSubmit = computed(() => {
  if (!action.value) return false
  if (action.value === 'REJECTED' && notes.value.trim().length < 3) return false
  return true
})

const notesPlaceholder = computed(() => {
  if (action.value === 'REJECTED') {
    return 'e.g. The dates conflict with a critical client demo — please reschedule…'
  }
  return "Add a brief note — e.g. 'Coverage confirmed with Priya, OK to approve'"
})

const submitLabel = computed(() => {
  if (props.submitting) {
    return action.value === 'APPROVED' ? 'Approving…' :
           action.value === 'REJECTED' ? 'Rejecting…' : 'Saving…'
  }
  if (action.value === 'APPROVED') return 'Approve & send to HR'
  if (action.value === 'REJECTED') return 'Reject this request'
  return 'Pick a decision'
})

const submit = () => {
  if (!canSubmit.value || props.submitting) return
  emit('submit', { decision: action.value, notes: notes.value.trim() || null })
}

// ─── Calendar strip — per-day kind ('work' | 'weekend' | 'half') ───
const calendarStrip = computed(() => {
  if (!props.leave?.from_date || !props.leave?.to_date) return []
  const start = new Date(props.leave.from_date)
  const end = new Date(props.leave.to_date)
  const out = []
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay()
    const isWeekend = dow === 0 || dow === 6
    out.push({
      iso: d.toISOString().slice(0, 10),
      day: d.getDate(),
      dow: DOW[dow],
      kind: isWeekend ? 'weekend' : 'work',
      tag: isWeekend ? 'W/O' : '',
    })
    if (out.length > 60) break
  }
  return out
})

const fmtFullDate = (v) => {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
const dayOfWeek = (v) => {
  if (!v) return ''
  return new Date(v).toLocaleDateString('en-IN', { weekday: 'long' })
}
const firstName = (n) => (n || '').trim().split(/\s+/)[0] || 'them'
</script>

<style scoped>
@import '@/styles/leave-theme.css';

/* ═════ Scrim ═════ */
.ta-drawer-scrim {
  position: fixed; inset: 0;
  background: radial-gradient(60% 60% at 70% 30%, rgba(245, 158, 11, 0.20), rgba(0, 0, 0, 0.55));
  backdrop-filter: blur(8px) saturate(140%);
  z-index: 1150;
}
[data-theme="light"] .ta-drawer-scrim {
  background: radial-gradient(60% 60% at 70% 30%, rgba(217, 119, 6, 0.20), rgba(40, 25, 10, 0.40));
}
.ta-drawer-scrim-enter-active, .ta-drawer-scrim-leave-active { transition: opacity .3s; }
.ta-drawer-scrim-enter-from, .ta-drawer-scrim-leave-to { opacity: 0; }

/* ═════ Drawer panel ═════ */
.ta-drawer {
  position: fixed; top: 0; right: 0; bottom: 0;
  width: min(560px, calc(100vw - 48px));
  z-index: 1155;
  display: flex; flex-direction: column;
  background:
    radial-gradient(80% 60% at 100% 0%, rgba(245, 158, 11, 0.14), transparent 60%),
    radial-gradient(60% 60% at 0% 100%, rgba(16, 185, 129, 0.10), transparent 60%),
    linear-gradient(180deg, rgba(18, 14, 8, 0.97), rgba(12, 10, 6, 0.99));
  border-left: 1px solid rgba(245, 158, 11, 0.30);
  box-shadow: -40px 0 80px -10px rgba(0, 0, 0, 0.75);
  isolation: isolate;
  overflow: hidden;
}
[data-theme="light"] .ta-drawer {
  background:
    radial-gradient(80% 60% at 100% 0%, rgba(245, 158, 11, 0.18), transparent 60%),
    radial-gradient(60% 60% at 0% 100%, rgba(16, 185, 129, 0.10), transparent 60%),
    rgba(255, 250, 240, 0.98);
  border-left-color: rgba(180, 83, 9, 0.30);
  box-shadow: -40px 0 80px -10px rgba(40, 25, 10, 0.30);
}

/* Ambient aura inside */
.ta-drawer-aura { position: absolute; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
.ta-drawer-orb {
  position: absolute; border-radius: 50%;
  filter: blur(70px); opacity: 0.55;
}
.ta-drawer-orb.a1 {
  width: 280px; height: 280px; top: -90px; right: -90px;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.55), transparent 70%);
  animation: ta-orb-a 20s ease-in-out infinite;
}
.ta-drawer-orb.a2 {
  width: 220px; height: 220px; bottom: -80px; left: -60px;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.40), transparent 70%);
  animation: ta-orb-b 26s ease-in-out infinite;
}
@keyframes ta-orb-a { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-24px,30px) scale(1.08); } }
@keyframes ta-orb-b { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(28px,-20px) scale(1.10); } }
.ta-drawer-grid {
  position: absolute; inset: 0;
  background-image: radial-gradient(rgba(245, 158, 11, 0.08) 1px, transparent 1px);
  background-size: 22px 22px;
  mask-image: linear-gradient(180deg, rgba(0,0,0,0.45) 0%, transparent 80%);
  opacity: 0.7;
}

/* ═════ Close ═════ */
.ta-drawer-close {
  position: absolute; top: 18px; right: 18px;
  width: 34px; height: 34px;
  display: grid; place-items: center;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(245, 158, 11, 0.30);
  color: var(--hr-text-muted);
  z-index: 4;
  cursor: pointer;
  transition: transform .35s var(--leave-spring), background .25s, color .25s, border-color .25s;
}
.ta-drawer-close:hover {
  transform: rotate(90deg);
  background: rgba(245, 158, 11, 0.18);
  border-color: rgba(245, 158, 11, 0.55);
  color: var(--hr-text);
}
[data-theme="light"] .ta-drawer-close {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(180, 83, 9, 0.30);
  color: #6b5840;
}

/* ═════ Drawer header ═════ */
.ta-drawer-head {
  position: relative; z-index: 2;
  padding: 24px 26px 14px 26px;
  border-bottom: 1px dashed rgba(245, 158, 11, 0.22);
}
[data-theme="light"] .ta-drawer-head { border-bottom-color: rgba(180, 83, 9, 0.22); }

.ta-drawer-eye {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 1.4px;
  text-transform: uppercase;
  color: #fbbf24;
}
[data-theme="light"] .ta-drawer-eye { color: #b45309; }
.ta-drawer-eye-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #fbbf24; box-shadow: 0 0 8px rgba(251, 191, 36, 0.85);
  animation: ta-eye-pulse 1.6s ease-in-out infinite;
}
@keyframes ta-eye-pulse {
  0%,100% { opacity: 0.7; transform: scale(1); }
  50%     { opacity: 1; transform: scale(1.45); }
}

.ta-drawer-title {
  margin: 6px 0 0;
  font-size: 22px; font-weight: 800; letter-spacing: -0.018em;
  line-height: 1.18;
  color: var(--hr-text);
}
.ta-grad {
  background: linear-gradient(135deg, #fbbf24, #fb923c 50%, #f43f5e);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
.ta-drawer-title-sub {
  display: block;
  font-size: 13.5px; font-weight: 600;
  color: var(--hr-text-muted);
  margin-top: 4px;
}
[data-theme="light"] .ta-drawer-title-sub { color: #6b5840; }

/* ═════ Body ═════ */
.ta-drawer-body {
  position: relative; z-index: 2;
  flex: 1; min-height: 0;
  padding: 18px 26px;
  display: flex; flex-direction: column; gap: 14px;
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: rgba(245, 158, 11, 0.28) transparent;
}
.ta-drawer-body::-webkit-scrollbar { width: 5px; }
.ta-drawer-body::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, rgba(245, 158, 11, 0.28), rgba(217, 119, 6, 0.40));
  border-radius: 3px;
}

.ta-block {
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(245, 158, 11, 0.16);
}
[data-theme="light"] .ta-block {
  background: rgba(255, 250, 240, 0.88);
  border-color: rgba(180, 83, 9, 0.18);
}

.ta-block-head {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase;
  color: var(--hr-text-muted);
  margin-bottom: 8px;
}
.ta-block-head > svg { color: #fbbf24; }
[data-theme="light"] .ta-block-head > svg { color: #b45309; }

/* Identity */
.ta-identity-row { display: flex; align-items: center; gap: 14px; }
.ta-id-avatar {
  position: relative;
  width: 54px; height: 54px;
  display: grid; place-items: center;
  border-radius: 16px;
  background: linear-gradient(135deg,
    color-mix(in srgb, var(--c) 38%, transparent),
    color-mix(in srgb, var(--c) 14%, transparent));
  border: 1px solid color-mix(in srgb, var(--c) 48%, transparent);
  color: var(--c);
  font-size: 22px; font-weight: 800;
  isolation: isolate;
}
.ta-id-glow {
  position: absolute; inset: -12px; border-radius: 22px;
  background: radial-gradient(circle, color-mix(in srgb, var(--c) 50%, transparent), transparent 65%);
  z-index: -1;
  animation: ta-id-glow 3.6s ease-in-out infinite;
}
@keyframes ta-id-glow {
  0%,100% { opacity: 0.45; transform: scale(0.95); }
  50%     { opacity: 0.85; transform: scale(1.08); }
}
.ta-id-info { flex: 1; min-width: 0; }
.ta-id-name {
  font-size: 16px; font-weight: 800; color: var(--hr-text);
  letter-spacing: -0.01em;
}
.ta-id-meta {
  margin-top: 2px;
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--hr-text-muted);
}
[data-theme="light"] .ta-id-meta { color: #8a7556; }

/* Range */
.ta-range { display: flex; flex-direction: column; gap: 12px; }
.ta-range-stat {
  display: inline-flex; align-items: baseline; gap: 6px;
}
.ta-range-num {
  font-size: 30px; font-weight: 900;
  background: linear-gradient(135deg, #fbbf24, #f97316 60%, #f43f5e);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: -0.025em;
}
.ta-range-unit {
  font-size: 12.5px; font-weight: 700; color: var(--hr-text-muted);
  text-transform: uppercase; letter-spacing: 0.08em;
}
.ta-range-arrow {
  display: grid; grid-template-columns: 1fr auto 1fr;
  align-items: center; gap: 14px;
  padding: 12px 14px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.10), rgba(245, 158, 11, 0.03));
  border: 1px solid rgba(245, 158, 11, 0.24);
}
[data-theme="light"] .ta-range-arrow {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.14), rgba(255, 250, 240, 0.65));
  border-color: rgba(180, 83, 9, 0.24);
}
.ta-range-from, .ta-range-to { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.ta-range-to { text-align: right; align-items: flex-end; }
.ta-range-label {
  font-size: 9px; font-weight: 800; letter-spacing: 0.18em;
  color: var(--hr-text-muted);
}
.ta-range-date {
  font-size: 13px; font-weight: 800; color: var(--hr-text);
  letter-spacing: -0.005em;
}
.ta-range-dow {
  font-size: 10px; font-weight: 700; color: var(--hr-text-muted);
  letter-spacing: 0.06em;
}
.ta-range-dash {
  display: grid; place-items: center;
  width: 36px; height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #fbbf24, #f97316);
  color: #1a0e0e;
  box-shadow: 0 8px 22px -8px rgba(251, 146, 60, 0.65);
  animation: ta-arrow-pulse 2.4s ease-in-out infinite;
}
@keyframes ta-arrow-pulse {
  0%,100% { transform: scale(1); }
  50%     { transform: scale(1.08); }
}

.ta-range-half {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 11px; font-weight: 700;
  padding: 5px 10px; border-radius: 999px;
  background: rgba(217, 119, 6, 0.18);
  border: 1px solid rgba(217, 119, 6, 0.32);
  color: #fbbf24;
}
[data-theme="light"] .ta-range-half { color: #92400e; border-color: rgba(180, 83, 9, 0.30); }

/* Calendar strip */
.ta-cal-head {
  display: flex; align-items: center; gap: 6px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase;
  color: var(--hr-text-muted);
  margin-bottom: 10px;
}
.ta-cal-head > svg { color: #fbbf24; }
.ta-cal-note { margin-left: auto; font-size: 9px; opacity: 0.7; text-transform: none; letter-spacing: 0; }

.ta-cal-grid {
  display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px;
}
.ta-cal-cell {
  position: relative;
  padding: 8px 4px 6px;
  border-radius: 10px;
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
[data-theme="light"] .ta-cal-cell {
  background: rgba(255, 248, 232, 0.7);
  border-color: rgba(180, 83, 9, 0.12);
}
.ta-cal-cell.kind-work {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.14), rgba(16, 185, 129, 0.05));
  border-color: rgba(16, 185, 129, 0.32);
}
.ta-cal-cell.kind-weekend {
  background: linear-gradient(135deg, rgba(148, 163, 184, 0.14), rgba(148, 163, 184, 0.05));
  border-color: rgba(148, 163, 184, 0.28);
  opacity: 0.65;
}
.ta-cal-dow {
  font-size: 8.5px; font-weight: 800; letter-spacing: 0.12em;
  color: var(--hr-text-muted);
}
.ta-cal-num {
  font-size: 14px; font-weight: 800;
  color: var(--hr-text);
}
.ta-cal-cell.kind-work .ta-cal-num { color: var(--leave-approved); }
.ta-cal-tag {
  position: absolute; bottom: -1px;
  font-size: 7.5px; font-weight: 800; letter-spacing: 0.08em;
  color: var(--hr-text-muted);
  background: rgba(0,0,0,0.4); padding: 1px 4px; border-radius: 999px;
}
[data-theme="light"] .ta-cal-tag { background: rgba(255, 248, 232, 0.9); color: #6b5840; }

.ta-cal-legend {
  margin-top: 8px;
  display: flex; gap: 14px;
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.04em;
  color: var(--hr-text-muted);
}
.ta-cal-legend i.dot {
  display: inline-block;
  width: 7px; height: 7px; border-radius: 50%;
  margin-right: 5px;
  vertical-align: middle;
}
.ta-cal-legend i.dot.work     { background: var(--leave-approved); }
.ta-cal-legend i.dot.weekend  { background: #94a3b8; }

/* Reason */
.ta-reason-quote {
  margin: 0;
  position: relative;
  padding: 10px 12px 10px 30px;
  border-left: 3px solid var(--leave-pending-mgr);
  background: rgba(245, 158, 11, 0.06);
  border-radius: 0 10px 10px 0;
  font-size: 13px; line-height: 1.55;
  color: var(--hr-text);
}
[data-theme="light"] .ta-reason-quote {
  background: rgba(255, 244, 220, 0.7);
  color: #1a1410;
}
.ta-reason-mark {
  position: absolute; top: 8px; left: 8px;
  color: var(--leave-pending-mgr);
  opacity: 0.7;
}
.ta-reason-quote p { margin: 0; }

.ta-extras { margin-top: 10px; display: flex; flex-direction: column; gap: 4px; }
.ta-extra-row {
  font-size: 11px; color: var(--hr-text-muted);
  display: inline-flex; align-items: center; gap: 5px;
}
.ta-extra-row svg { color: var(--leave-pending-mgr); }
.ta-extra-row strong { color: var(--hr-text); margin-left: 3px; }

/* Decision picker */
.ta-decide-pickers {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
  margin-bottom: 14px;
}
.ta-pick {
  position: relative;
  display: flex; flex-direction: column; align-items: flex-start; gap: 2px;
  padding: 12px 14px;
  border-radius: 13px;
  background: rgba(40, 30, 22, 0.4);
  border: 1.5px solid rgba(255, 255, 255, 0.08);
  color: var(--hr-text);
  cursor: pointer; text-align: left;
  font: inherit;
  isolation: isolate;
  transition: border-color .22s, background .22s, box-shadow .22s var(--leave-ease);
}
[data-theme="light"] .ta-pick {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(120, 53, 15, 0.18);
}
.ta-pick-ico {
  display: inline-grid; place-items: center;
  width: 30px; height: 30px; border-radius: 9px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 4px;
}
.ta-pick strong { font-size: 13.5px; font-weight: 800; }
.ta-pick small { font-size: 10.5px; color: var(--hr-text-muted); }

.ta-pick-approve.active {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.22), rgba(16, 185, 129, 0.06));
  border-color: rgba(16, 185, 129, 0.62);
  box-shadow: 0 16px 36px -14px rgba(16, 185, 129, 0.55);
}
.ta-pick-approve.active .ta-pick-ico {
  background: linear-gradient(135deg, #34d399, #10b981);
  border-color: transparent;
  color: #022c22;
}
.ta-pick-reject.active {
  background: linear-gradient(135deg, rgba(244, 63, 94, 0.22), rgba(244, 63, 94, 0.06));
  border-color: rgba(244, 63, 94, 0.62);
  box-shadow: 0 16px 36px -14px rgba(244, 63, 94, 0.55);
}
.ta-pick-reject.active .ta-pick-ico {
  background: linear-gradient(135deg, #fda4af, #f43f5e);
  border-color: transparent;
  color: #4c0519;
}

/* Notes */
.ta-notes-label {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase;
  color: var(--hr-text-muted);
  margin-bottom: 5px;
}
.ta-notes-label > svg { color: #fbbf24; }
.ta-required { color: var(--leave-rejected); margin-left: 3px; }
.ta-notes-wrap {
  position: relative;
  border-radius: 11px;
  padding: 1.5px;
  background: rgba(255, 255, 255, 0.06);
  transition: background .25s;
}
.ta-notes-wrap[data-action="APPROVED"] { background: linear-gradient(135deg, rgba(16,185,129,0.42), rgba(16,185,129,0.10)); }
.ta-notes-wrap[data-action="REJECTED"] { background: linear-gradient(135deg, rgba(244,63,94,0.42), rgba(244,63,94,0.10)); }
.ta-notes {
  width: 100%;
  padding: 11px 13px 24px;
  background: rgba(20, 14, 8, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  font: inherit; font-size: 13px; line-height: 1.55;
  color: var(--hr-text);
  outline: none; resize: vertical;
  min-height: 90px;
  font-family: inherit;
  color-scheme: dark;
}
[data-theme="light"] .ta-notes {
  background: rgba(255, 250, 240, 0.95);
  border-color: rgba(120, 53, 15, 0.18);
  color: #1a1410;
  color-scheme: light;
}
.ta-notes:focus { border-color: rgba(245, 158, 11, 0.45); }
.ta-notes::placeholder { color: var(--hr-text-muted); }
.ta-notes-count {
  position: absolute; right: 10px; bottom: 7px;
  font-size: 9.5px; font-weight: 700; color: var(--hr-text-muted);
  letter-spacing: 0.04em;
}

/* ═════ Footer ═════ */
.ta-drawer-foot {
  position: relative; z-index: 2;
  display: flex; gap: 10px; align-items: center; justify-content: flex-end;
  padding: 14px 26px;
  border-top: 1px dashed rgba(245, 158, 11, 0.22);
}
[data-theme="light"] .ta-drawer-foot { border-top-color: rgba(180, 83, 9, 0.22); }

.ta-drawer-cancel {
  padding: 11px 18px;
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--hr-text-muted);
  font: inherit; font-size: 12px; font-weight: 700; letter-spacing: 0.04em;
  cursor: pointer;
  transition: background .25s, color .25s, border-color .25s;
}
.ta-drawer-cancel:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(245, 158, 11, 0.32);
  color: var(--hr-text);
}
[data-theme="light"] .ta-drawer-cancel {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(120, 53, 15, 0.18);
  color: #6b5840;
}

.ta-drawer-submit {
  position: relative;
  display: inline-flex; align-items: center; gap: 7px;
  padding: 11px 18px;
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.10);
  color: var(--hr-text-muted);
  font: inherit; font-size: 12.5px; font-weight: 800; letter-spacing: 0.04em;
  cursor: pointer;
  overflow: hidden;
  isolation: isolate;
  transition: background .25s, border-color .25s, color .25s, box-shadow .25s var(--leave-ease), letter-spacing .25s var(--leave-spring);
}
.ta-drawer-submit:disabled { opacity: 0.5; cursor: not-allowed; }
.ta-drawer-submit.tone-APPROVED {
  background: linear-gradient(135deg, #6ee7b7, #10b981, #047857);
  border-color: rgba(16, 185, 129, 0.65);
  color: #022c22;
  box-shadow: 0 16px 32px -10px rgba(16, 185, 129, 0.65);
}
.ta-drawer-submit.tone-REJECTED {
  background: linear-gradient(135deg, #fda4af, #f43f5e, #be123c);
  border-color: rgba(244, 63, 94, 0.65);
  color: #fff;
  box-shadow: 0 16px 32px -10px rgba(244, 63, 94, 0.65);
}
.ta-drawer-submit.armed:hover {
  letter-spacing: 0.07em;
  box-shadow: 0 20px 44px -10px currentColor;
}
.ta-drawer-submit-flare {
  position: absolute; inset: 0;
  background: linear-gradient(115deg, transparent 30%, rgba(255, 255, 255, 0.3) 50%, transparent 70%);
  transform: translateX(-130%);
  animation: ta-foot-flare 2s linear infinite;
  pointer-events: none;
}
@keyframes ta-foot-flare {
  0%   { transform: translateX(-130%); }
  60%  { transform: translateX(130%); }
  100% { transform: translateX(130%); }
}

.ta-spin {
  width: 12px; height: 12px;
  border: 1.5px solid currentColor; border-top-color: transparent;
  border-radius: 50%;
  animation: ta-spin 0.7s linear infinite;
}
@keyframes ta-spin { to { transform: rotate(360deg); } }

/* Drawer enter/leave */
.ta-drawer-panel-enter-active, .ta-drawer-panel-leave-active {
  transition: transform .5s var(--leave-ease), opacity .35s ease;
}
.ta-drawer-panel-enter-from, .ta-drawer-panel-leave-to {
  transform: translateX(60px); opacity: 0;
}
</style>
