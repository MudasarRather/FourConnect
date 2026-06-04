<template>
  <Teleport to="body">
    <transition name="ld">
      <div v-if="open && leave" class="ld-scrim" @click.self="$emit('close')">
        <!-- Decorative orbital rings -->
        <span class="ld-orbit ld-orbit-1" aria-hidden="true" />
        <span class="ld-orbit ld-orbit-2" aria-hidden="true" />
        <span class="ld-orbit ld-orbit-3" aria-hidden="true" />

        <Motion class="ld-card" as="div" role="dialog" aria-modal="true"
          :style="{ '--lc': typeMeta(leave.leave_type).hex }"
          :initial="{ opacity: 0, y: 30, scale: 0.92, rotateX: -10 }"
          :animate="{ opacity: 1, y: 0, scale: 1, rotateX: 0 }"
          :exit="{ opacity: 0, scale: 0.96 }"
          :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }"
        >
          <!-- ═══ Capsule chrome — grain + sweep ═══ -->
          <span class="ld-grain" aria-hidden="true" />
          <span class="ld-aura" aria-hidden="true" />

          <!-- ═══ Hero header ═══ -->
          <header class="ld-hero">
            <Motion as="button" class="ld-close" @click="$emit('close')" aria-label="Close"
              :whileHover="{ rotate: 90, scale: 1.08 }"
              :whileTap="{ scale: 0.92 }"
              :transition="{ duration: 0.28 }"
            >
              <X :size="15" />
            </Motion>

            <Motion class="ld-glyph" as="div"
              :initial="{ scale: 0, rotate: -90 }"
              :animate="{ scale: 1, rotate: 0 }"
              :transition="{ duration: 0.7, delay: 0.16, ease: [0.34, 1.56, 0.64, 1] }"
            >
              <span class="ld-glyph-halo" />
              <span class="ld-glyph-pulse" />
              <span class="ld-glyph-pulse ld-glyph-pulse-2" />
              <LeaveTypeIcon :type="leave.leave_type" :size="34" ambient />
            </Motion>

            <div class="ld-hero-meta">
              <Motion as="span" class="ld-eyebrow leave-mono"
                :initial="{ opacity: 0, y: -6 }"
                :animate="{ opacity: 1, y: 0 }"
                :transition="{ duration: 0.4, delay: 0.22 }"
              >
                <span class="le-dot" /> {{ typeMeta(leave.leave_type).label.toUpperCase() }} LEAVE · DOSSIER
              </Motion>

              <Motion as="h2" class="ld-title"
                :initial="{ opacity: 0, y: 8 }"
                :animate="{ opacity: 1, y: 0 }"
                :transition="{ duration: 0.5, delay: 0.28 }"
              >
                {{ leave.reference_no }}
                <span class="ld-title-suf">· {{ leave.total_days }} {{ Number(leave.total_days) === 1 ? 'day' : 'days' }}</span>
              </Motion>

              <Motion as="div" class="ld-sub"
                :initial="{ opacity: 0 }"
                :animate="{ opacity: 1 }"
                :transition="{ duration: 0.4, delay: 0.36 }"
              >
                <span class="ld-range leave-mono">{{ fmtRange(leave.from_date, leave.to_date) }}</span>
                <span v-if="leave.is_half_day" class="ld-half">· half day · {{ (leave.which_session || 'first').toLowerCase() }}</span>
              </Motion>
            </div>

            <Motion as="div" class="ld-status-slot"
              :initial="{ opacity: 0, scale: 0.8 }"
              :animate="{ opacity: 1, scale: 1 }"
              :transition="{ duration: 0.5, delay: 0.34, ease: [0.34, 1.56, 0.64, 1] }"
            >
              <LeaveStatusChip :status="leave.status" :pulse="isPulsing" />
            </Motion>
          </header>

          <!-- ═══ Body ═══ -->
          <div class="ld-body">
            <!-- ─── Quick facts row ─── -->
            <Motion as="section" class="ld-facts"
              :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.45, delay: 0.42 }"
            >
              <div class="lf-row" v-for="(f, i) in facts" :key="f.key">
                <component :is="f.icon" :size="13" class="lf-ic" />
                <span class="lf-eye leave-mono">{{ f.eye }}</span>
                <span class="lf-val">{{ f.value }}</span>
              </div>
            </Motion>

            <!-- ─── Day-by-day strip ─── -->
            <Motion as="section" class="ld-section"
              :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.5, delay: 0.5 }"
            >
              <header class="ld-sec-head">
                <span class="ld-sec-num leave-mono">01</span>
                <span class="ld-sec-rule" />
                <h4>Day by day</h4>
                <span class="ld-sec-meta leave-mono">{{ leave.total_days }}d total</span>
              </header>
              <div class="ld-strip">
                <Motion v-for="(d, i) in dayStrip" :key="i" as="div"
                  class="lds-cell" :data-state="d.state"
                  :initial="{ opacity: 0, scaleY: 0.4 }"
                  :animate="{ opacity: 1, scaleY: 1 }"
                  :transition="{ duration: 0.32, delay: 0.56 + i * 0.022 }"
                >
                  <span class="lds-dow leave-mono">{{ d.dow }}</span>
                  <span class="lds-day">{{ d.day }}</span>
                  <span class="lds-mark">
                    <Check v-if="d.state === 'leave' || d.state === 'leave-weekend'" :size="9" />
                  </span>
                </Motion>
              </div>
              <div class="ld-strip-legend leave-mono">
                <span class="lsl-item"><span class="lsl-dot lsl-leave" />Leave day</span>
                <span class="lsl-item"><span class="lsl-dot lsl-weekend" />Weekend</span>
                <span class="lsl-item"><span class="lsl-dot lsl-normal" />Working</span>
              </div>
            </Motion>

            <!-- ─── Approval chain ─── -->
            <Motion as="section" class="ld-section"
              :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.5, delay: 0.6 }"
            >
              <header class="ld-sec-head">
                <span class="ld-sec-num leave-mono">02</span>
                <span class="ld-sec-rule" />
                <h4>Approval chain</h4>
                <span class="ld-sec-meta leave-mono">{{ stages.length }} stage{{ stages.length === 1 ? '' : 's' }}</span>
              </header>

              <ol class="ld-chain">
                <Motion v-for="(s, i) in stages" :key="i" as="li"
                  class="lc-stage" :data-state="s.state" :data-type="s.approver_type"
                  :initial="{ opacity: 0, x: -16 }"
                  :animate="{ opacity: 1, x: 0 }"
                  :transition="{ duration: 0.44, delay: 0.68 + i * 0.08 }"
                >
                  <span class="lc-rail" />
                  <span class="lc-bead">
                    <Check v-if="s.state === 'done'" :size="13" />
                    <X v-else-if="s.state === 'failed'" :size="13" />
                    <SkipForward v-else-if="s.state === 'skipped'" :size="11" />
                    <span v-else class="lc-bead-dot" />
                    <span v-if="s.state === 'active'" class="lc-bead-pulse" />
                  </span>
                  <div class="lc-body">
                    <div class="lc-head">
                      <strong class="lc-label">{{ s.label }}</strong>
                      <span class="lc-type leave-mono">{{ s.approver_type }}</span>
                    </div>
                    <div class="lc-decided" v-if="s.decided_at">
                      <span class="lc-decision" :data-d="s.decision">{{ s.decision }}</span>
                      <span class="lc-by">by {{ s.decided_by_name || '—' }}</span>
                      <span class="lc-when leave-mono">{{ fmtTime(s.decided_at) }}</span>
                    </div>
                    <div class="lc-waiting" v-else-if="s.state === 'active'">
                      <span class="lc-wait-dot" />
                      <span>Awaiting {{ s.label.toLowerCase() }}</span>
                    </div>
                    <p v-if="s.notes" class="lc-notes">
                      <Quote :size="10" />
                      <span>{{ s.notes }}</span>
                    </p>
                  </div>
                </Motion>
              </ol>
            </Motion>

            <!-- ─── Reason ─── -->
            <Motion as="section" v-if="leave.reason" class="ld-section"
              :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.5, delay: 0.72 }"
            >
              <header class="ld-sec-head">
                <span class="ld-sec-num leave-mono">03</span>
                <span class="ld-sec-rule" />
                <h4>Reason</h4>
              </header>
              <blockquote class="ld-reason">
                <Quote :size="14" class="ld-quote" />
                <p>{{ leave.reason }}</p>
              </blockquote>
            </Motion>

            <!-- ─── Contact during leave + emergency contact ─── -->
            <Motion as="section" v-if="leave.contact_during_leave || leave.emergency_contact" class="ld-section"
              :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.5, delay: 0.8 }"
            >
              <header class="ld-sec-head">
                <span class="ld-sec-num leave-mono">04</span>
                <span class="ld-sec-rule" />
                <h4>Reachable during leave</h4>
              </header>
              <div class="ld-contacts">
                <div v-if="leave.contact_during_leave" class="ld-ccard">
                  <PhoneCall :size="14" class="cc-ic" />
                  <div>
                    <span class="cc-eye leave-mono">PRIMARY</span>
                    <span class="cc-val">{{ leave.contact_during_leave }}</span>
                  </div>
                </div>
                <div v-if="leave.emergency_contact" class="ld-ccard">
                  <ShieldAlert :size="14" class="cc-ic" />
                  <div>
                    <span class="cc-eye leave-mono">EMERGENCY</span>
                    <span class="cc-val">{{ leave.emergency_contact }}</span>
                  </div>
                </div>
              </div>
            </Motion>

            <!-- ─── Cancellation block (if cancelled) ─── -->
            <Motion as="section" v-if="leave.status === 'CANCELLED' && leave.cancelled_reason" class="ld-section ld-cancel"
              :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.5, delay: 0.84 }"
            >
              <header class="ld-sec-head">
                <span class="ld-sec-num leave-mono">×</span>
                <span class="ld-sec-rule" />
                <h4>Cancelled</h4>
                <span v-if="leave.cancelled_at" class="ld-sec-meta leave-mono">{{ fmtTime(leave.cancelled_at) }}</span>
              </header>
              <p class="ld-cancel-text">{{ leave.cancelled_reason }}</p>
            </Motion>
          </div>

          <!-- ═══ Footer ═══ -->
          <Motion as="footer" class="ld-foot"
            :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.45, delay: 0.92 }"
          >
            <div class="ld-foot-meta leave-mono">
              <Clock :size="11" /> applied {{ relTime(leave.created_at) }}
            </div>
            <div class="ld-foot-actions">
              <button class="ld-btn ld-btn-ghost" @click="copyRef">
                <Copy :size="12" /> {{ copied ? 'Copied!' : 'Copy ref' }}
              </button>
              <button class="ld-btn ld-btn-primary" @click="$emit('close')">
                <Check :size="12" /> Close
              </button>
            </div>
          </Motion>
        </Motion>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  X, Check, Quote, Clock, Copy, SkipForward, PhoneCall, ShieldAlert,
  CalendarRange, Hash, Tag, CalendarClock,
} from 'lucide-vue-next'
import LeaveTypeIcon from '../components/LeaveTypeIcon.vue'
import LeaveStatusChip from '../components/LeaveStatusChip.vue'
import { typeMeta } from '@/composables/useLeaves'

const props = defineProps({
  open: { type: Boolean, default: false },
  leave: { type: Object, default: null },
})
defineEmits(['close'])

const copied = ref(false)

const isPulsing = computed(() => {
  const s = props.leave?.status
  return s === 'PENDING_MANAGER' || s === 'PENDING_HR'
})

// ─── Quick facts strip ──────────────────────────────────────────────
const facts = computed(() => {
  const l = props.leave || {}
  return [
    { key: 'type',  icon: Tag,            eye: 'TYPE',   value: typeMeta(l.leave_type).label },
    { key: 'days',  icon: CalendarRange,  eye: 'DAYS',   value: `${l.total_days} ${Number(l.total_days) === 1 ? 'day' : 'days'}` },
    { key: 'ref',   icon: Hash,           eye: 'REF',    value: l.reference_no },
    { key: 'span',  icon: CalendarClock,  eye: 'PERIOD', value: fmtRange(l.from_date, l.to_date) },
  ]
})

// ─── Day-by-day strip — full leave span + 1 day padding each side ───
const dayStrip = computed(() => {
  const l = props.leave
  if (!l?.from_date || !l?.to_date) return []
  const from = new Date(l.from_date)
  const to = new Date(l.to_date)
  if (isNaN(from) || isNaN(to)) return []

  // Build the breakdown from leave.day_breakdown if available, else compute
  const bdMap = new Map()
  for (const d of (l.day_breakdown || [])) {
    if (d?.on_date) bdMap.set(String(d.on_date), d)
  }

  const days = Math.max(1, Math.round((to - from) / 86400000) + 1)
  const span = Math.min(20, days + 2)
  const startOffset = Math.min(1, Math.floor((span - days) / 2))
  const startDate = new Date(from)
  startDate.setDate(startDate.getDate() - startOffset)

  const out = []
  for (let i = 0; i < span; i += 1) {
    const d = new Date(startDate)
    d.setDate(startDate.getDate() + i)
    const iso = d.toISOString().slice(0, 10)
    const meta = bdMap.get(iso)
    const dow = d.getDay()
    const isWeekend = dow === 0 || dow === 6
    const isHoliday = meta?.is_holiday
    const inLeave = d >= from && d <= to
    let state
    if (inLeave) {
      if (isHoliday) state = 'leave-holiday'
      else if (isWeekend) state = 'leave-weekend'
      else state = 'leave'
    } else if (isHoliday) state = 'holiday'
    else if (isWeekend) state = 'weekend'
    else state = 'normal'
    out.push({
      day: String(d.getDate()).padStart(2, '0'),
      dow: d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2).toUpperCase(),
      state,
    })
  }
  return out
})

// ─── Approval chain — chain mode if approval_steps present, else legacy ──
const stages = computed(() => {
  const l = props.leave
  if (!l) return []
  const steps = Array.isArray(l.approval_steps) ? l.approval_steps : []
  if (steps.length) {
    const curIdx = Number(l.current_step ?? 0)
    return steps.map((s, i) => {
      const decision = s.decision
      let state = 'idle'
      if (decision === 'APPROVED') state = 'done'
      else if (decision === 'REJECTED') state = 'failed'
      else if (decision === 'SKIPPED') state = 'skipped'
      else if (i === curIdx && !['APPROVED', 'REJECTED', 'CANCELLED', 'WITHDRAWN'].includes(l.status)) state = 'active'
      else if (l.status === 'APPROVED' && i < curIdx) state = 'done'
      return {
        label: s.label || s.approver_type,
        approver_type: s.approver_type,
        decision,
        decided_at: s.decided_at,
        decided_by_name: s.decided_by_name || s.decided_by_id,
        notes: s.notes,
        state,
      }
    })
  }
  // Legacy: synthesize 4 stages
  const cur = legacyCurrentIndex(l.status)
  const failed = ['REJECTED', 'MANAGER_REJECTED', 'CANCELLED', 'WITHDRAWN'].includes(l.status)
  const approved = l.status === 'APPROVED'
  const legacy = [
    { label: 'Submitted', approver_type: 'SELF' },
    { label: 'Manager',   approver_type: 'MANAGER', decided_at: l.manager_decided_at, decided_by_name: l.manager_name, decision: l.manager_decision, notes: l.manager_notes },
    { label: 'HR',        approver_type: 'HR',      decided_at: l.hr_decided_at,      decided_by_name: l.hr_name,      decision: l.hr_decision,      notes: l.hr_notes },
    { label: 'Approved',  approver_type: 'FINAL' },
  ]
  return legacy.map((s, i) => {
    let state = 'idle'
    if (approved && i <= cur) state = 'done'
    else if (failed && i === cur) state = 'failed'
    else if (i < cur) state = 'done'
    else if (i === cur && !failed) state = 'active'
    return { ...s, state }
  })
})

const legacyCurrentIndex = (status) => {
  if (status === 'DRAFT') return 0
  if (status === 'PENDING_MANAGER' || status === 'MANAGER_REJECTED' || status === 'WITHDRAWN') return 1
  if (status === 'PENDING_HR' || status === 'REJECTED') return 2
  if (status === 'APPROVED' || status === 'CANCELLED') return 3
  return 0
}

// ─── Actions ────────────────────────────────────────────────────────
const copyRef = async () => {
  try {
    await navigator.clipboard.writeText(props.leave?.reference_no || '')
    copied.value = true
    setTimeout(() => { copied.value = false }, 1600)
  } catch { /* ignored */ }
}

// ─── Formatters ─────────────────────────────────────────────────────
const fmtDate = (v) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const fmtRange = (a, b) => a === b ? fmtDate(a) : `${fmtDate(a)} → ${fmtDate(b)}`
const fmtTime = (v) => v
  ? new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  : '—'
const relTime = (v) => {
  if (!v) return ''
  const m = (Date.now() - new Date(v).getTime()) / 60000
  if (m < 1)    return 'just now'
  if (m < 60)   return `${Math.floor(m)}m ago`
  if (m < 1440) return `${Math.floor(m / 60)}h ago`
  return `${Math.floor(m / 1440)}d ago`
}

// Reset copied state when leave changes
watch(() => props.leave?.id, () => { copied.value = false })
</script>

<style scoped>
@import '@/styles/leave-theme.css';

/* ════════════════════════════════════════════════════════════════════
   Scrim
   ──────────────────────────────────────────────────────────────────── */
.ld-scrim {
  position: fixed; inset: 0; z-index: 1300;
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
  background:
    radial-gradient(60% 60% at 50% 40%, rgba(251, 191, 36, 0.22), transparent 60%),
    radial-gradient(40% 50% at 25% 70%, rgba(234, 88, 12, 0.16), transparent 60%),
    rgba(6, 4, 2, 0.74);
  backdrop-filter: blur(14px) saturate(140%);
  perspective: 1400px;
  overflow-y: auto;
}
[data-theme="light"] .ld-scrim {
  background:
    radial-gradient(60% 60% at 50% 40%, rgba(251, 191, 36, 0.30), transparent 60%),
    radial-gradient(40% 50% at 25% 70%, rgba(234, 88, 12, 0.18), transparent 60%),
    rgba(60, 24, 6, 0.46);
}

/* Decorative orbital rings */
.ld-orbit {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(251, 191, 36, 0.18);
  pointer-events: none;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
}
.ld-orbit-1 { width: 620px; height: 620px; animation: ld-spin 42s linear infinite; border-color: rgba(234, 88, 12, 0.24); }
.ld-orbit-2 { width: 820px; height: 820px; animation: ld-spin 64s linear infinite reverse; border-color: rgba(251, 191, 36, 0.14); border-style: dashed; }
.ld-orbit-3 { width: 1040px; height: 1040px; animation: ld-spin 88s linear infinite; border-color: rgba(180, 83, 9, 0.10); }
@keyframes ld-spin { to { transform: translate(-50%, -50%) rotate(360deg); } }

/* ════════════════════════════════════════════════════════════════════
   Card — "Leave Capsule"
   ──────────────────────────────────────────────────────────────────── */
.ld-card {
  position: relative;
  width: 640px; max-width: calc(100vw - 32px);
  max-height: calc(100vh - 48px);
  border-radius: 28px;
  background:
    radial-gradient(120% 70% at 0% 0%, rgba(251, 191, 36, 0.16), transparent 55%),
    radial-gradient(80% 60% at 100% 100%, rgba(234, 88, 12, 0.14), transparent 60%),
    linear-gradient(180deg, rgba(20, 12, 6, 0.96), rgba(12, 7, 4, 0.96));
  border: 1px solid rgba(251, 191, 36, 0.30);
  box-shadow:
    0 60px 140px -30px rgba(0, 0, 0, 0.90),
    0 0 0 1px rgba(251, 191, 36, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  overflow: hidden;
  display: flex; flex-direction: column;
  transform-style: preserve-3d;
}
[data-theme="light"] .ld-card {
  background:
    radial-gradient(120% 70% at 0% 0%, rgba(251, 191, 36, 0.20), transparent 55%),
    radial-gradient(80% 60% at 100% 100%, rgba(234, 88, 12, 0.16), transparent 60%),
    linear-gradient(180deg, rgba(255, 250, 240, 0.98), rgba(255, 244, 220, 0.98));
  border-color: rgba(194, 65, 12, 0.28);
  box-shadow:
    0 50px 120px -30px rgba(127, 29, 29, 0.36),
    0 0 0 1px rgba(217, 119, 6, 0.10);
}

/* Capsule chrome — grain + halo */
.ld-grain {
  position: absolute; inset: 0; opacity: 0.05;
  background-image: radial-gradient(rgba(251, 191, 36, 0.7) 1px, transparent 1px);
  background-size: 7px 7px;
  pointer-events: none;
  z-index: 0;
}
.ld-aura {
  position: absolute; top: -40%; right: -20%;
  width: 70%; height: 100%;
  background: radial-gradient(50% 50% at 50% 50%, rgba(251, 191, 36, 0.20), transparent 65%);
  filter: blur(36px);
  pointer-events: none;
  z-index: 0;
}

/* ════════════════════════════════════════════════════════════════════
   Hero
   ──────────────────────────────────────────────────────────────────── */
.ld-hero {
  position: relative;
  display: grid;
  grid-template-columns: 76px 1fr auto;
  gap: 16px;
  /* Right padding reserves space for the absolutely-positioned close button
     (34px wide at right:14px) so the status chip can't slide under it. */
  padding: 26px 64px 22px 28px;
  border-bottom: 1px solid rgba(251, 191, 36, 0.18);
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--lc) 12%, transparent), transparent 70%);
  z-index: 1;
}
[data-theme="light"] .ld-hero { border-color: rgba(180, 83, 9, 0.18); }

.ld-close {
  position: absolute; top: 14px; right: 14px;
  display: grid; place-items: center;
  width: 34px; height: 34px;
  border-radius: 11px;
  border: 1px solid rgba(251, 191, 36, 0.32);
  background: rgba(20, 12, 6, 0.50);
  color: var(--leave-text-muted);
  cursor: pointer; z-index: 2;
  transition: color .22s, border-color .22s, background .22s;
}
[data-theme="light"] .ld-close { background: rgba(255, 250, 235, 0.6); }
.ld-close:hover {
  color: var(--leave-rejected);
  border-color: var(--leave-rejected);
  background: var(--leave-rejected-soft);
}

.ld-glyph {
  position: relative;
  width: 76px; height: 76px;
  display: grid; place-items: center;
  border-radius: 22px;
  background:
    radial-gradient(60% 60% at 30% 30%, rgba(255, 255, 255, 0.18), transparent 70%),
    linear-gradient(135deg,
      color-mix(in srgb, var(--lc) 32%, transparent),
      color-mix(in srgb, var(--lc) 14%, transparent)
    );
  border: 1px solid color-mix(in srgb, var(--lc) 42%, transparent);
  color: var(--lc);
  box-shadow:
    0 12px 36px -10px color-mix(in srgb, var(--lc) 50%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.10);
}
.ld-glyph-halo {
  position: absolute; inset: -10px;
  border-radius: 50%;
  background: radial-gradient(50% 50% at 50% 50%, color-mix(in srgb, var(--lc) 38%, transparent), transparent 65%);
  filter: blur(14px);
  z-index: -1;
}
.ld-glyph-pulse {
  position: absolute; inset: -3px;
  border-radius: 24px;
  border: 1.5px solid color-mix(in srgb, var(--lc) 50%, transparent);
  opacity: 0.7;
  animation: ld-glyph-ping 2.8s ease-out infinite;
}
.ld-glyph-pulse-2 { animation-delay: 1.4s; }
@keyframes ld-glyph-ping {
  0%   { transform: scale(0.95); opacity: 0.6; }
  100% { transform: scale(1.30); opacity: 0; }
}

.ld-hero-meta { min-width: 0; display: flex; flex-direction: column; gap: 4px; padding-top: 4px; }
.ld-eyebrow {
  font-size: 9.5px; font-weight: 800;
  letter-spacing: 0.18em;
  color: var(--w-gold-200);
  display: inline-flex; align-items: center; gap: 6px;
  width: max-content; max-width: 100%;
}
[data-theme="light"] .ld-eyebrow { color: var(--w-gold-700); }
.le-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--lc);
  box-shadow: 0 0 6px var(--lc);
  animation: leave-eyebrow-pulse 1.8s ease-in-out infinite;
}

.ld-title {
  margin: 0;
  font-size: 24px; font-weight: 800;
  color: var(--leave-text);
  letter-spacing: -0.020em;
  font-variant-numeric: tabular-nums;
}
.ld-title-suf {
  font-size: 13px; font-weight: 700;
  color: var(--leave-text-muted);
  margin-left: 4px;
  letter-spacing: 0;
}
.ld-sub {
  display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap;
  font-size: 12px;
  color: var(--leave-text-muted);
}
.ld-range { font-weight: 700; color: var(--leave-text-secondary); }
.ld-half { color: var(--lc); font-weight: 700; }

.ld-status-slot { align-self: flex-start; margin-top: 4px; }

/* ════════════════════════════════════════════════════════════════════
   Body — scrollable
   ──────────────────────────────────────────────────────────────────── */
.ld-body {
  padding: 18px 28px 8px;
  overflow-y: auto;
  display: flex; flex-direction: column; gap: 18px;
  z-index: 1; position: relative;
}

/* Quick facts */
.ld-facts {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
.lf-row {
  display: grid;
  grid-template-columns: 16px 56px 1fr;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(251, 191, 36, 0.04);
  border: 1px solid var(--leave-border-soft);
}
[data-theme="light"] .lf-row { background: rgba(255, 244, 210, 0.55); border-color: rgba(180, 83, 9, 0.10); }
.lf-ic { color: var(--lc); }
.lf-eye {
  font-size: 8.5px; font-weight: 800;
  letter-spacing: 0.14em;
  color: var(--leave-text-muted);
}
.lf-val {
  font-size: 12px; font-weight: 700;
  color: var(--leave-text);
  letter-spacing: -0.004em;
  font-variant-numeric: tabular-nums;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Section header */
.ld-section { display: flex; flex-direction: column; gap: 10px; }
.ld-sec-head { display: flex; align-items: center; gap: 10px; }
.ld-sec-num {
  font-size: 9.5px; font-weight: 800;
  color: var(--leave-brand);
  padding: 2px 7px; border-radius: 5px;
  background: rgba(251, 191, 36, 0.14);
  border: 1px solid rgba(251, 191, 36, 0.32);
  letter-spacing: 0.06em;
  min-width: 22px; text-align: center;
}
.ld-sec-rule {
  flex: 0 0 18px; height: 1px;
  background: linear-gradient(90deg, var(--leave-brand), transparent);
}
.ld-sec-head h4 {
  margin: 0;
  font-size: 14px; font-weight: 800;
  color: var(--leave-text);
  letter-spacing: -0.008em;
}
.ld-sec-meta {
  margin-left: auto;
  font-size: 9px; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--leave-text-muted);
}

/* ─── Day strip ─── */
.ld-strip {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr);
  gap: 5px;
  padding: 10px 6px;
  border-radius: 12px;
  background: rgba(251, 191, 36, 0.04);
  border: 1px solid var(--leave-border-soft);
}
[data-theme="light"] .ld-strip { background: rgba(255, 244, 210, 0.45); border-color: rgba(180, 83, 9, 0.10); }
.lds-cell {
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding: 7px 0 8px;
  border-radius: 9px;
  background: rgba(251, 191, 36, 0.06);
  border: 1px solid transparent;
  transform-origin: bottom;
  transition: transform .25s var(--leave-spring), background .22s;
}
[data-theme="light"] .lds-cell { background: rgba(180, 83, 9, 0.06); }
.lds-cell:hover { transform: scaleY(1.06); }
.lds-cell[data-state="leave"] {
  background: linear-gradient(180deg, color-mix(in srgb, var(--lc) 60%, #fde047), var(--lc));
  border-color: color-mix(in srgb, var(--lc) 60%, transparent);
  color: #2a1100;
  box-shadow: 0 6px 14px -6px color-mix(in srgb, var(--lc) 60%, transparent);
}
.lds-cell[data-state="leave-weekend"] {
  background: linear-gradient(180deg, color-mix(in srgb, var(--lc) 40%, transparent), color-mix(in srgb, var(--lc) 25%, transparent));
  border-color: color-mix(in srgb, var(--lc) 40%, transparent);
  color: var(--leave-text);
  opacity: 0.78;
}
.lds-cell[data-state="leave-holiday"] {
  background: linear-gradient(180deg, color-mix(in srgb, var(--lc) 50%, transparent), color-mix(in srgb, var(--lc) 30%, transparent));
  border: 1px dashed color-mix(in srgb, var(--lc) 60%, transparent);
  color: var(--leave-text);
}
.lds-cell[data-state="weekend"]  { background: rgba(251, 191, 36, 0.04); opacity: 0.55; }
.lds-cell[data-state="holiday"]  { background: rgba(234, 88, 12, 0.10); border: 1px dashed rgba(234, 88, 12, 0.34); }
.lds-cell[data-state="normal"]   { background: rgba(251, 191, 36, 0.06); }
[data-theme="light"] .lds-cell[data-state="weekend"]  { background: rgba(180, 83, 9, 0.04); }
[data-theme="light"] .lds-cell[data-state="normal"]   { background: rgba(180, 83, 9, 0.06); }
[data-theme="light"] .lds-cell[data-state="holiday"]  { background: rgba(234, 88, 12, 0.12); border-color: rgba(194, 65, 12, 0.36); }

.lds-dow {
  font-size: 8.5px; font-weight: 800;
  letter-spacing: 0.08em;
  color: var(--leave-text-muted);
  opacity: 0.85;
}
.lds-cell[data-state^="leave"] .lds-dow { color: inherit; opacity: 0.7; }

.lds-day {
  font-size: 13px; font-weight: 800;
  letter-spacing: -0.014em;
  font-variant-numeric: tabular-nums;
}
.lds-mark { height: 12px; display: grid; place-items: center; }
.lds-cell[data-state^="leave"] .lds-mark { color: inherit; }
.lds-cell:not([data-state^="leave"]) .lds-mark svg { display: none; }

.ld-strip-legend {
  display: flex; flex-wrap: wrap; gap: 14px;
  font-size: 9px; font-weight: 700;
  letter-spacing: 0.10em; text-transform: uppercase;
  color: var(--leave-text-muted);
}
.lsl-item { display: inline-flex; align-items: center; gap: 6px; }
.lsl-dot { width: 9px; height: 9px; border-radius: 3px; }
.lsl-dot.lsl-leave   { background: linear-gradient(135deg, var(--lc), color-mix(in srgb, var(--lc) 60%, #ea580c)); }
.lsl-dot.lsl-weekend { background: rgba(251, 191, 36, 0.16); border: 1px solid rgba(251, 191, 36, 0.30); }
.lsl-dot.lsl-normal  { background: rgba(251, 191, 36, 0.08); border: 1px solid rgba(251, 191, 36, 0.20); }
[data-theme="light"] .lsl-dot.lsl-weekend { background: rgba(180, 83, 9, 0.10); border-color: rgba(180, 83, 9, 0.22); }
[data-theme="light"] .lsl-dot.lsl-normal  { background: rgba(180, 83, 9, 0.06); border-color: rgba(180, 83, 9, 0.14); }

/* ─── Approval chain ─── */
.ld-chain {
  list-style: none; margin: 0; padding: 0;
  display: flex; flex-direction: column;
}
.lc-stage {
  position: relative;
  display: grid;
  grid-template-columns: 28px 1fr;
  gap: 14px;
  padding: 10px 0 16px;
}
.lc-rail {
  position: absolute;
  left: 13px; top: 32px; bottom: -6px;
  width: 2px;
  background: linear-gradient(180deg, var(--leave-border-strong), transparent);
}
.lc-stage:last-child .lc-rail { display: none; }
.lc-stage[data-state="done"]    .lc-rail { background: linear-gradient(180deg, var(--leave-approved),    transparent); }
.lc-stage[data-state="failed"]  .lc-rail { background: linear-gradient(180deg, var(--leave-rejected),    transparent); }
.lc-stage[data-state="active"]  .lc-rail { background: linear-gradient(180deg, var(--leave-pending-mgr), transparent); }
.lc-stage[data-state="skipped"] .lc-rail { background: linear-gradient(180deg, var(--leave-cancelled),   transparent); }

.lc-bead {
  position: relative;
  width: 28px; height: 28px; border-radius: 50%;
  display: grid; place-items: center;
  background: rgba(255, 255, 255, 0.06);
  border: 1.5px solid rgba(255, 255, 255, 0.18);
  color: var(--leave-text-muted);
}
[data-theme="light"] .lc-bead { background: rgba(180, 83, 9, 0.08); border-color: rgba(180, 83, 9, 0.20); }
.lc-stage[data-state="done"]    .lc-bead { background: var(--leave-approved); border-color: var(--leave-approved); color: #2a1100; }
.lc-stage[data-state="failed"]  .lc-bead { background: var(--leave-rejected); border-color: var(--leave-rejected); color: #fff; }
.lc-stage[data-state="active"]  .lc-bead { background: var(--leave-pending-mgr); border-color: var(--leave-pending-mgr); color: #2a1100; }
.lc-stage[data-state="skipped"] .lc-bead { background: var(--leave-cancelled-soft); border-color: var(--leave-cancelled); color: var(--leave-cancelled); }
.lc-bead-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: currentColor; opacity: 0.6;
}
.lc-bead-pulse {
  position: absolute; inset: -5px;
  border-radius: 50%;
  border: 1.5px solid currentColor;
  opacity: 0;
  animation: lc-bead-ping 1.8s ease-out infinite;
}
@keyframes lc-bead-ping {
  0%   { transform: scale(0.9); opacity: 0.7; }
  100% { transform: scale(1.6); opacity: 0; }
}

.lc-body { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.lc-head { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; }
.lc-label {
  font-size: 13px; font-weight: 800;
  color: var(--leave-text);
  letter-spacing: -0.006em;
}
.lc-type {
  font-size: 8.5px; font-weight: 800;
  letter-spacing: 0.12em;
  padding: 1px 6px; border-radius: 4px;
  color: var(--leave-text-muted);
  background: rgba(251, 191, 36, 0.10);
  border: 1px solid rgba(251, 191, 36, 0.22);
}
[data-theme="light"] .lc-type { background: rgba(180, 83, 9, 0.10); border-color: rgba(180, 83, 9, 0.22); }

.lc-decided {
  display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap;
  font-size: 11px;
  color: var(--leave-text-muted);
}
.lc-decision {
  font-size: 9.5px; font-weight: 800;
  letter-spacing: 0.10em;
  padding: 2px 7px; border-radius: 999px;
}
.lc-decision[data-d="APPROVED"] { color: var(--leave-approved); background: var(--leave-approved-soft); }
.lc-decision[data-d="REJECTED"] { color: var(--leave-rejected); background: var(--leave-rejected-soft); }
.lc-decision[data-d="SKIPPED"]  { color: var(--leave-cancelled); background: var(--leave-cancelled-soft); }
.lc-by { color: var(--leave-text-secondary); font-weight: 600; }
.lc-when { color: var(--leave-text-muted); }

.lc-waiting {
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 11px; font-weight: 700;
  color: var(--leave-pending-mgr);
  letter-spacing: 0.02em;
}
.lc-wait-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--leave-pending-mgr);
  box-shadow: 0 0 6px var(--leave-pending-mgr);
  animation: leave-eyebrow-pulse 1.6s ease-in-out infinite;
}

.lc-notes {
  display: flex; gap: 6px; align-items: flex-start;
  margin: 4px 0 0;
  padding: 7px 10px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border-left: 2px solid color-mix(in srgb, var(--lc) 50%, transparent);
  font-size: 11.5px; line-height: 1.55;
  color: var(--leave-text-secondary);
}
[data-theme="light"] .lc-notes { background: rgba(255, 244, 210, 0.6); }
.lc-notes svg { flex-shrink: 0; margin-top: 3px; color: var(--leave-text-muted); }

/* ─── Reason ─── */
.ld-reason {
  position: relative;
  padding: 14px 16px 14px 38px;
  border-radius: 14px;
  background:
    radial-gradient(70% 80% at 0% 0%, rgba(251, 191, 36, 0.06), transparent 60%),
    rgba(20, 12, 6, 0.45);
  border: 1px solid var(--leave-border);
  font-size: 13px; line-height: 1.6;
  color: var(--leave-text-secondary);
  margin: 0;
}
[data-theme="light"] .ld-reason {
  background:
    radial-gradient(70% 80% at 0% 0%, rgba(251, 191, 36, 0.12), transparent 60%),
    rgba(255, 248, 230, 0.78);
  border-color: rgba(180, 83, 9, 0.16);
}
.ld-quote {
  position: absolute; top: 14px; left: 14px;
  color: var(--lc);
  opacity: 0.7;
}
.ld-reason p { margin: 0; }

/* ─── Contacts ─── */
.ld-contacts {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px;
}
.ld-ccard {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 10px;
  background: rgba(251, 191, 36, 0.06);
  border: 1px solid var(--leave-border-soft);
}
[data-theme="light"] .ld-ccard { background: rgba(255, 244, 210, 0.55); border-color: rgba(180, 83, 9, 0.10); }
.cc-ic { color: var(--lc); flex-shrink: 0; }
.ld-ccard > div { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.cc-eye {
  font-size: 8.5px; font-weight: 800;
  letter-spacing: 0.16em;
  color: var(--leave-text-muted);
}
.cc-val {
  font-size: 13px; font-weight: 700;
  color: var(--leave-text);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}

/* ─── Cancelled block ─── */
.ld-cancel { padding: 12px; border-radius: 12px; background: var(--leave-cancelled-soft); border: 1px solid color-mix(in srgb, var(--leave-cancelled) 30%, transparent); }
.ld-cancel-text {
  margin: 0; font-size: 12.5px; line-height: 1.55;
  color: var(--leave-text-secondary);
}

/* ════════════════════════════════════════════════════════════════════
   Footer
   ──────────────────────────────────────────────────────────────────── */
.ld-foot {
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 14px 28px 20px;
  border-top: 1px solid rgba(251, 191, 36, 0.18);
  background: linear-gradient(180deg, transparent, rgba(251, 191, 36, 0.04));
  position: relative; z-index: 1;
}
[data-theme="light"] .ld-foot { border-color: rgba(180, 83, 9, 0.16); background: linear-gradient(180deg, transparent, rgba(251, 191, 36, 0.08)); }
.ld-foot-meta {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.10em; text-transform: uppercase;
  color: var(--leave-text-muted);
}
.ld-foot-actions { display: flex; gap: 8px; }
.ld-btn {
  display: inline-flex; align-items: center; gap: 6px;
  height: 34px; padding: 0 14px;
  border-radius: 10px;
  font-size: 12px; font-weight: 700;
  cursor: pointer;
  border: 1px solid transparent;
  transition: border-color .22s, color .22s, background .22s, transform .22s;
}
.ld-btn:hover { transform: translateY(-1px); }
.ld-btn-ghost {
  background: transparent;
  color: var(--leave-text-secondary);
  border-color: var(--leave-border-strong);
}
.ld-btn-ghost:hover { border-color: var(--leave-brand); color: var(--leave-text); background: rgba(251, 191, 36, 0.06); }
.ld-btn-primary {
  background: var(--leave-grad-cta);
  background-size: 240% 100%;
  background-position: 0% 50%;
  color: #2a1100;
  border-color: rgba(251, 146, 60, 0.45);
  box-shadow: 0 10px 24px -8px rgba(234, 88, 12, 0.50);
}
.ld-btn-primary:hover { background-position: 100% 50%; box-shadow: 0 16px 36px -10px rgba(234, 88, 12, 0.65); }

/* ════════════════════════════════════════════════════════════════════
   Scrim transition
   ──────────────────────────────────────────────────────────────────── */
.ld-enter-active, .ld-leave-active { transition: opacity .32s var(--leave-ease); }
.ld-enter-from, .ld-leave-to { opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .ld-orbit, .ld-glyph-pulse, .lc-bead-pulse, .le-dot, .lc-wait-dot { animation: none !important; }
}

@media (max-width: 640px) {
  .ld-card { width: calc(100vw - 24px); border-radius: 20px; max-height: calc(100vh - 32px); }
  /* On mobile we drop to two columns and stack the status chip onto a new
     line, so the close button (still right: 14px) sits in its own corner. */
  .ld-hero { grid-template-columns: 60px 1fr; padding: 22px 56px 18px 18px; }
  .ld-status-slot { grid-column: 1 / -1; }
  .ld-glyph { width: 60px; height: 60px; border-radius: 18px; }
  .ld-title { font-size: 19px; }
  .ld-body { padding: 14px 18px 6px; }
  .ld-foot { padding: 12px 18px 16px; }
  .ld-facts { grid-template-columns: 1fr; }
}
</style>
