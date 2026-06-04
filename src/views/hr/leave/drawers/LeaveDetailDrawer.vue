<template>
  <Teleport to="body">
    <transition name="lv-drawer">
      <div v-if="open" class="dr-scrim" @click.self="$emit('close')">
        <aside class="dr" :data-status="d?.status || 'PENDING_HR'">
          <!-- ═══ Ambient backdrop ═══ -->
          <div class="dr-atm" aria-hidden="true">
            <span class="orb a1" />
            <span class="orb a2" />
            <span class="orb a3" />
            <span class="grain" />
            <span class="grid" />
          </div>

          <!-- ═══ Hero — editorial header ═══ -->
          <header class="dr-hero">
            <Motion as="button" class="dr-close" @click="$emit('close')" aria-label="Close"
              :whileHover="{ rotate: 90, scale: 1.05 }" :whileTap="{ scale: 0.9 }"
              :transition="{ duration: 0.25 }"
            >
              <X :size="15" />
            </Motion>

            <!-- Loading hero skeleton -->
            <div v-if="loading" class="dr-hero-skel">
              <div class="leave-skel sk-line w" />
              <div class="leave-skel sk-line m" />
              <div class="leave-skel sk-line s" />
            </div>

            <!-- Rendered hero -->
            <template v-else-if="d">
              <Motion as="span" class="dr-eyebrow leave-mono"
                :initial="{ opacity: 0, y: -6 }" :animate="{ opacity: 1, y: 0 }"
                :transition="{ duration: 0.32 }"
              >
                <span class="eb-dot" />
                {{ typeMeta(d.leave_type).label }} · {{ d.reference_no }}
              </Motion>

              <Motion as="h2" class="dr-title"
                :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
                :transition="{ duration: 0.5, delay: 0.06, ease: [0.16, 1, 0.3, 1] }"
              >
                <span class="dr-emp-avatar" :style="avatarTint">
                  {{ initials(d.employee_name) }}
                </span>
                <span class="dr-emp-name">
                  {{ d.employee_name }}
                  <em>requested</em><br />
                  <span class="dr-emp-type">{{ typeMeta(d.leave_type).label }}</span>
                </span>
              </Motion>

              <Motion as="div" class="dr-sub leave-mono"
                :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
                :transition="{ duration: 0.4, delay: 0.18 }"
              >
                <span v-if="d.employee_code">{{ d.employee_code }}</span>
                <span v-if="d.department_name"> · {{ d.department_name }}</span>
                <span v-if="d.designation_name"> · {{ d.designation_name }}</span>
              </Motion>

              <!-- KPI ribbon -->
              <div class="dr-kpis">
                <Motion as="div" class="kpi"
                  :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
                  :transition="{ duration: 0.4, delay: 0.20 }"
                >
                  <div class="kpi-v">{{ d.total_days }}<span>d</span></div>
                  <div class="kpi-l leave-mono">total</div>
                </Motion>
                <Motion as="div" class="kpi"
                  :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
                  :transition="{ duration: 0.4, delay: 0.26 }"
                >
                  <div class="kpi-v">{{ fmtShort(d.from_date) }}</div>
                  <div class="kpi-l leave-mono">{{ fmtShort(d.from_date) === fmtShort(d.to_date) ? 'on' : 'from' }}</div>
                </Motion>
                <Motion as="div" class="kpi" v-if="fmtShort(d.from_date) !== fmtShort(d.to_date)"
                  :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
                  :transition="{ duration: 0.4, delay: 0.32 }"
                >
                  <div class="kpi-v">{{ fmtShort(d.to_date) }}</div>
                  <div class="kpi-l leave-mono">to</div>
                </Motion>
                <Motion as="div" class="kpi kpi-status"
                  :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
                  :transition="{ duration: 0.4, delay: 0.38 }"
                >
                  <LeaveStatusChip :status="d.status" :pulse="d.status === 'PENDING_MANAGER' || d.status === 'PENDING_HR'" />
                </Motion>
              </div>
            </template>
          </header>

          <!-- ═══ Body ═══ -->
          <div v-if="loading" class="dr-body">
            <div class="leave-skel sk-card" />
            <div class="leave-skel sk-card" />
            <div class="leave-skel sk-card" />
          </div>

          <div v-else-if="d" class="dr-body">
            <!-- Section · Pipeline -->
            <Motion as="section" class="dr-sec"
              :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.45, delay: 0.18, ease: [0.16, 1, 0.3, 1] }"
            >
              <div class="dr-sec-head">
                <span class="sec-num leave-mono">01</span>
                <ListChecks :size="13" />
                <span class="sec-title">Approval pipeline</span>
                <span v-if="hasChainSnapshot" class="sec-meta">
                  {{ d.approval_steps.length }}-stage chain
                </span>
              </div>
              <div class="dr-pipe-wrap">
                <LeaveStatusPipeline
                  :status="d.status"
                  :steps="d.approval_steps || null"
                  :current-step="d.current_step || 0"
                />
              </div>
            </Motion>

            <!-- Section · Reason -->
            <Motion as="section" class="dr-sec"
              :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.45, delay: 0.26, ease: [0.16, 1, 0.3, 1] }"
            >
              <div class="dr-sec-head">
                <span class="sec-num leave-mono">02</span>
                <MessageSquare :size="13" />
                <span class="sec-title">Reason</span>
              </div>
              <blockquote class="dr-quote">
                <span class="quote-mark" aria-hidden="true">“</span>
                {{ d.reason }}
              </blockquote>
              <div v-if="d.contact_during_leave || d.emergency_contact" class="dr-contact">
                <span v-if="d.contact_during_leave" class="contact-chip">
                  <Phone :size="11" /> {{ d.contact_during_leave }}
                </span>
                <span v-if="d.emergency_contact" class="contact-chip emergency">
                  <AlertOctagon :size="11" /> {{ d.emergency_contact }}
                </span>
              </div>
            </Motion>

            <!-- Section · Decisions / Chain -->
            <Motion as="section" class="dr-sec"
              :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.45, delay: 0.34, ease: [0.16, 1, 0.3, 1] }"
            >
              <div class="dr-sec-head">
                <span class="sec-num leave-mono">03</span>
                <History :size="13" />
                <span class="sec-title">Decisions</span>
              </div>

              <ol v-if="hasChainSnapshot" class="dr-tl">
                <Motion v-for="(step, i) in d.approval_steps" :key="i" as="li"
                  class="tl-item" :data-type="step.approver_type" :data-state="step.decision || 'PENDING'"
                  :initial="{ opacity: 0, x: -16 }"
                  :animate="{ opacity: 1, x: 0 }"
                  :transition="{ duration: 0.42, delay: 0.42 + i * 0.06, ease: [0.16, 1, 0.3, 1] }"
                >
                  <span class="tl-rail" />
                  <span class="tl-dot" :data-type="step.approver_type" :data-state="step.decision || 'PENDING'">
                    <span class="dot-inner" />
                  </span>
                  <div class="tl-body">
                    <div class="tl-row">
                      <span class="tl-num leave-mono">{{ i + 1 }}</span>
                      <span class="tl-label">{{ step.label || step.approver_type }}</span>
                      <span class="tl-type" :data-type="step.approver_type">{{ step.approver_type }}</span>
                      <span class="tl-state" :data-state="step.decision || (i === d.current_step ? 'ACTIVE' : 'PENDING')">
                        {{ step.decision ? step.decision.toLowerCase() : (i === d.current_step ? 'awaiting' : 'queued') }}
                      </span>
                    </div>
                    <div class="tl-meta leave-mono">
                      <span v-if="step.decided_by_name">{{ step.decided_by_name }}</span>
                      <span v-else-if="step.approver_name">{{ step.approver_name }} (assigned)</span>
                      <span v-else-if="step.approver_type === 'HR'">Any superuser</span>
                      <span v-else-if="step.approver_type === 'MANAGER' && !step.approver_user_id">No manager configured</span>
                      <span v-if="step.decided_at" class="tl-when"> · {{ fmtTime(step.decided_at) }}</span>
                    </div>
                    <div v-if="step.notes" class="tl-note">{{ step.notes }}</div>
                  </div>
                </Motion>
              </ol>

              <ol v-else class="dr-tl">
                <li class="tl-item" :data-state="d.manager_decision || 'PENDING'" data-type="MANAGER">
                  <span class="tl-rail" />
                  <span class="tl-dot" data-type="MANAGER" :data-state="d.manager_decision || 'PENDING'"><span class="dot-inner" /></span>
                  <div class="tl-body">
                    <div class="tl-row">
                      <span class="tl-num leave-mono">1</span>
                      <span class="tl-label">Manager</span>
                      <span class="tl-state" :data-state="d.manager_decision || 'PENDING'">
                        {{ (d.manager_decision || 'pending').toLowerCase() }}
                      </span>
                    </div>
                    <div class="tl-meta leave-mono">
                      <span v-if="d.manager_name">{{ d.manager_name }}</span>
                      <span v-if="d.manager_decided_at"> · {{ fmtTime(d.manager_decided_at) }}</span>
                    </div>
                    <div v-if="d.manager_notes" class="tl-note">{{ d.manager_notes }}</div>
                  </div>
                </li>
                <li class="tl-item" :data-state="d.hr_decision || 'PENDING'" data-type="HR">
                  <span class="tl-rail" />
                  <span class="tl-dot" data-type="HR" :data-state="d.hr_decision || 'PENDING'"><span class="dot-inner" /></span>
                  <div class="tl-body">
                    <div class="tl-row">
                      <span class="tl-num leave-mono">2</span>
                      <span class="tl-label">HR</span>
                      <span class="tl-state" :data-state="d.hr_decision || 'PENDING'">
                        {{ (d.hr_decision || 'pending').toLowerCase() }}
                      </span>
                    </div>
                    <div class="tl-meta leave-mono">
                      <span v-if="d.hr_name">{{ d.hr_name }}</span>
                      <span v-if="d.hr_decided_at"> · {{ fmtTime(d.hr_decided_at) }}</span>
                    </div>
                    <div v-if="d.hr_notes" class="tl-note">{{ d.hr_notes }}</div>
                  </div>
                </li>
              </ol>
            </Motion>

            <!-- Section · Day breakdown -->
            <Motion v-if="d.day_breakdown?.length" as="section" class="dr-sec"
              :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.45, delay: 0.5, ease: [0.16, 1, 0.3, 1] }"
            >
              <div class="dr-sec-head">
                <span class="sec-num leave-mono">04</span>
                <Calendar :size="13" />
                <span class="sec-title">Day breakdown</span>
                <span class="sec-meta">
                  {{ paidDays }} paid · {{ unpaidDays }} unpaid
                </span>
              </div>
              <div class="dr-days">
                <Motion v-for="(day, i) in d.day_breakdown" :key="day.on_date" as="div"
                  class="day"
                  :data-paid="day.is_paid"
                  :data-hol="day.is_holiday"
                  :data-wo="day.is_week_off"
                  :initial="{ opacity: 0, scale: 0.85 }"
                  :animate="{ opacity: 1, scale: 1 }"
                  :transition="{ duration: 0.36, delay: 0.55 + i * 0.025, ease: [0.16, 1, 0.3, 1] }"
                  :whileHover="{ y: -3, scale: 1.04 }"
                  :title="day.holiday_name || ''"
                >
                  <span class="d-dow leave-mono">{{ dow(day.on_date) }}</span>
                  <span class="d-num">{{ fmtDayNum(day.on_date) }}</span>
                  <span class="d-mon leave-mono">{{ fmtMon(day.on_date) }}</span>
                  <span class="d-tag">
                    {{ day.is_holiday ? 'HOL' : day.is_week_off ? 'OFF' : day.is_paid ? 'PAID' : 'UNPAID' }}
                  </span>
                </Motion>
              </div>
            </Motion>
          </div>

          <!-- ═══ Footer ═══ -->
          <footer v-if="d && !loading" class="dr-foot">
            <Motion as="button" class="leave-btn leave-btn-sm leave-btn-danger"
              @click="onDelete" :disabled="busy"
              :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }"
              :transition="{ duration: 0.18 }"
            >
              <Trash2 :size="13" /> Delete
            </Motion>
            <div style="flex: 1" />
            <template v-if="d.status === 'PENDING_HR' || d.status === 'PENDING_MANAGER'">
              <Motion as="button" class="leave-btn leave-btn-sm"
                @click="reject" :disabled="busy"
                :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }"
                :transition="{ duration: 0.18 }"
              >
                <X :size="13" /> Reject
              </Motion>
              <Motion as="button" class="leave-btn leave-btn-sm leave-btn-primary"
                @click="approve" :disabled="busy"
                :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }"
                :transition="{ duration: 0.18 }"
              >
                <Check :size="13" /> Approve
              </Motion>
            </template>
          </footer>

          <LeaveRejectModal :open="rejectModal" :leave="d" stage="HR"
            @cancel="rejectModal = false" @confirm="confirmReject" />
        </aside>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  X, Check, Trash2, ListChecks, MessageSquare, Phone, AlertOctagon,
  History, Calendar,
} from 'lucide-vue-next'
import LeaveStatusChip from '../components/LeaveStatusChip.vue'
import LeaveStatusPipeline from '../components/LeaveStatusPipeline.vue'
import LeaveRejectModal from '../modals/LeaveRejectModal.vue'
import { fetchLeaveOne, decideAsHr, adminDeleteLeave, typeMeta } from '@/composables/useLeaves'
import { useToast } from 'vue-toastification'

const props = defineProps({
  open: { type: Boolean, default: false },
  leaveId: { type: String, default: null },
})
const emit = defineEmits(['close', 'changed'])
const toast = useToast()

const d = ref(null)
const loading = ref(false)
const busy = ref(false)
const rejectModal = ref(false)

const hasChainSnapshot = computed(() => Array.isArray(d.value?.approval_steps) && d.value.approval_steps.length > 0)

const paidDays = computed(() => (d.value?.day_breakdown || []).filter(x => x.is_paid).length)
const unpaidDays = computed(() => (d.value?.day_breakdown || []).filter(x => !x.is_paid).length)

const TYPE_HEX = {
  CASUAL: '#fde047', SICK: '#e34a0a', EARNED: '#f59e0b', MATERNITY: '#fdba74',
  PATERNITY: '#b45309', BEREAVEMENT: '#854d0e', COMP_OFF: '#f97316', LWP: '#ea580c',
  STUDY: '#ca8a04', SPECIAL: '#fb923c',
}
const avatarTint = computed(() => ({ '--tint': TYPE_HEX[d.value?.leave_type] || '#fbbf24' }))

const initials = (name) => {
  if (!name) return '?'
  const parts = String(name).trim().split(/\s+/).slice(0, 2)
  return parts.map(p => p[0]?.toUpperCase()).join('') || '?'
}

const load = async () => {
  if (!props.leaveId) return
  loading.value = true; d.value = null
  try { d.value = await fetchLeaveOne(props.leaveId) }
  catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load') }
  finally { loading.value = false }
}
watch(() => [props.open, props.leaveId], () => { if (props.open && props.leaveId) load() })

const approve = async () => {
  busy.value = true
  try {
    await decideAsHr(props.leaveId, { decision: 'APPROVED', notes: null })
    toast.success('Approved')
    emit('changed'); emit('close')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed') }
  finally { busy.value = false }
}
const reject = () => { rejectModal.value = true }
const confirmReject = async (notes) => {
  rejectModal.value = false
  busy.value = true
  try {
    await decideAsHr(props.leaveId, { decision: 'REJECTED', notes })
    toast.success('Rejected')
    emit('changed'); emit('close')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed') }
  finally { busy.value = false }
}
const onDelete = async () => {
  if (!confirm('Delete this leave request? This will reverse any balance debit and re-run attendance rollup.')) return
  busy.value = true
  try {
    await adminDeleteLeave(props.leaveId)
    toast.success('Deleted')
    emit('changed'); emit('close')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed') }
  finally { busy.value = false }
}

const fmtShort = (v) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'
const fmtTime = (v) => v ? new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''
const fmtMon = (v) => new Date(v).toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()
const fmtDayNum = (v) => new Date(v).getDate()
const dow = (v) => new Date(v).toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase()
</script>

<style scoped>
@import '@/styles/leave-theme.css';

/* ════════════════════════════════════════════════════════════════════════
   Scrim + drawer shell
   ──────────────────────────────────────────────────────────────────────── */
.dr-scrim {
  position: fixed; inset: 0; z-index: 1090;
  display: flex; justify-content: flex-end;
  background:
    radial-gradient(60% 80% at 100% 50%, rgba(251, 191, 36, 0.32), transparent 70%),
    rgba(8, 4, 2, 0.62);
  backdrop-filter: blur(12px) saturate(140%);
}
[data-theme="light"] .dr-scrim {
  background:
    radial-gradient(60% 80% at 100% 50%, rgba(251, 191, 36, 0.20), transparent 70%),
    rgba(40, 20, 6, 0.30);
}

.dr {
  position: relative;
  width: 580px; max-width: 96vw; height: 100%;
  display: flex; flex-direction: column;
  background:
    radial-gradient(120% 50% at 100% 0%, rgba(251, 191, 36, 0.18), transparent 55%),
    radial-gradient(90% 40% at 0% 100%, rgba(234, 88, 12, 0.14), transparent 60%),
    linear-gradient(180deg, rgba(14, 8, 4, 0.97), rgba(20, 12, 6, 0.97));
  border-left: 1px solid var(--leave-border-strong);
  overflow: hidden; isolation: isolate;
  box-shadow: -40px 0 80px -20px rgba(0, 0, 0, 0.6);
}
[data-theme="light"] .dr {
  background:
    radial-gradient(120% 50% at 100% 0%, rgba(251, 191, 36, 0.16), transparent 55%),
    radial-gradient(90% 40% at 0% 100%, rgba(234, 88, 12, 0.10), transparent 60%),
    linear-gradient(180deg, #fffdf5, #fff4e0);
  border-left-color: var(--leave-border);
  box-shadow: -40px 0 80px -20px rgba(124, 45, 18, 0.20);
}
.dr[data-status="APPROVED"]         { border-left-color: var(--leave-approved); }
.dr[data-status="REJECTED"],
.dr[data-status="MANAGER_REJECTED"] { border-left-color: var(--leave-rejected); }

/* ── Ambient backdrop ── */
.dr-atm { position: absolute; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
.orb {
  position: absolute; border-radius: 50%;
  filter: blur(70px); opacity: 0.45;
  will-change: transform;
}
.orb.a1 {
  width: 380px; height: 380px; top: -140px; right: -100px;
  background: radial-gradient(circle, #fbbf24, transparent 70%);
  animation: leave-glow-breathe 7s ease-in-out infinite;
}
.orb.a2 {
  width: 320px; height: 320px; bottom: -100px; left: -80px;
  background: radial-gradient(circle, #ea580c, transparent 70%);
  animation: leave-glow-breathe 9s ease-in-out infinite reverse;
}
.orb.a3 {
  width: 220px; height: 220px; top: 38%; left: 28%;
  background: radial-gradient(circle, #fde047, transparent 70%);
  opacity: 0.20;
  animation: leave-glow-breathe 11s ease-in-out infinite;
}
.grain {
  position: absolute; inset: 0; opacity: 0.04;
  mix-blend-mode: overlay;
  background-image:
    radial-gradient(rgba(251, 191, 36, 0.5) 1px, transparent 1px),
    radial-gradient(rgba(234, 88, 12, 0.4) 1px, transparent 1px);
  background-size: 5px 5px, 8px 8px;
  background-position: 0 0, 2px 3px;
}
.grid {
  position: absolute; inset: 0;
  background-image: radial-gradient(var(--leave-grid-line) 1px, transparent 1px);
  background-size: 24px 24px;
  mask-image: linear-gradient(180deg, rgba(0, 0, 0, 0.55), transparent);
  opacity: 0.6;
}

/* ════════════════════════════════════════════════════════════════════════
   Hero
   ──────────────────────────────────────────────────────────────────────── */
.dr-hero {
  position: relative; z-index: 2;
  padding: 28px 28px 22px;
  border-bottom: 1px solid var(--leave-border);
}
.dr-close {
  position: absolute; top: 16px; right: 16px;
  display: grid; place-items: center;
  width: 32px; height: 32px; border-radius: 10px;
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid var(--leave-border-strong);
  color: var(--leave-text-secondary); cursor: pointer;
}
[data-theme="light"] .dr-close { background: rgba(255, 250, 235, 0.92); }
.dr-close:hover { color: var(--leave-brand); border-color: var(--leave-brand); }

.dr-hero-skel { display: flex; flex-direction: column; gap: 8px; padding-right: 56px; }
.sk-line { height: 12px; border-radius: 6px; }
.sk-line.w { width: 60%; height: 20px; }
.sk-line.m { width: 40%; height: 16px; }
.sk-line.s { width: 30%; }

.dr-eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 10.5px; font-weight: 800;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--w-gold-200);
  padding: 5px 11px; border-radius: 999px;
  background: rgba(251, 191, 36, 0.10);
  border: 1px solid rgba(251, 191, 36, 0.32);
  margin-right: 56px;
}
[data-theme="light"] .dr-eyebrow {
  color: var(--w-gold-700);
  background: rgba(251, 191, 36, 0.18);
  border-color: rgba(217, 119, 6, 0.36);
}
.eb-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 10px currentColor;
  animation: leave-eyebrow-pulse 1.6s ease-in-out infinite;
}

.dr-title {
  display: flex; align-items: flex-start; gap: 14px;
  margin: 14px 0 8px;
  font-size: 24px; font-weight: 800;
  letter-spacing: -0.022em;
  line-height: 1.16;
  color: #fff8dc;
  text-wrap: balance;
}
[data-theme="light"] .dr-title { color: #2a1100; }
.dr-emp-avatar {
  --tint: #fbbf24;
  flex-shrink: 0;
  width: 48px; height: 48px; border-radius: 14px;
  display: grid; place-items: center;
  font-size: 17px; font-weight: 800; letter-spacing: -0.02em;
  color: #1a0a00;
  background: linear-gradient(135deg, var(--tint), color-mix(in srgb, var(--tint) 70%, #ea580c));
  box-shadow:
    0 12px 28px -10px color-mix(in srgb, var(--tint) 60%, transparent),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
  margin-top: 2px;
}
.dr-emp-name { flex: 1; min-width: 0; }
.dr-emp-name em {
  font-style: italic;
  font-weight: 800;
  background: linear-gradient(135deg, #fde047, #f59e0b 50%, #ea580c);
  background-clip: text; -webkit-background-clip: text;
  color: transparent;
}
.dr-emp-type {
  font-size: 15px; font-weight: 600;
  color: var(--leave-text-secondary);
  letter-spacing: -0.01em;
}
[data-theme="light"] .dr-emp-type { color: #6b3d12; }

.dr-sub {
  font-size: 11.5px;
  color: var(--leave-text-muted);
  padding-right: 56px;
}

/* KPI ribbon */
.dr-kpis {
  display: flex; gap: 8px; flex-wrap: wrap;
  margin-top: 16px;
}
.kpi {
  position: relative;
  padding: 8px 12px; border-radius: 12px;
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid var(--leave-border);
  min-width: 70px;
  transition: border-color .22s;
}
[data-theme="light"] .kpi { background: rgba(255, 250, 235, 0.85); }
.kpi:hover { border-color: var(--leave-brand); }
.kpi-v {
  font-size: 18px; font-weight: 800;
  color: var(--leave-text);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  line-height: 1;
}
.kpi-v span { font-size: 11px; opacity: 0.6; margin-left: 2px; }
.kpi-l {
  margin-top: 4px;
  font-size: 9.5px; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--leave-text-muted);
}
.kpi.kpi-status {
  background: transparent;
  border: 0;
  padding: 4px 0 0;
  display: flex; align-items: center;
}

/* ════════════════════════════════════════════════════════════════════════
   Body
   ──────────────────────────────────────────────────────────────────────── */
.dr-body {
  position: relative; z-index: 2;
  padding: 20px 28px 24px;
  display: flex; flex-direction: column; gap: 22px;
  overflow-y: auto; flex: 1;
}
.dr-body::-webkit-scrollbar { width: 7px; }
.dr-body::-webkit-scrollbar-track { background: transparent; }
.dr-body::-webkit-scrollbar-thumb { background: rgba(251, 191, 36, 0.24); border-radius: 999px; }
.dr-body::-webkit-scrollbar-thumb:hover { background: rgba(251, 191, 36, 0.42); }

.sk-card { height: 88px; border-radius: 14px; }

/* Sections */
.dr-sec {
  display: flex; flex-direction: column; gap: 10px;
  padding: 16px 18px;
  border-radius: 16px;
  background: rgba(28, 18, 10, 0.40);
  border: 1px solid var(--leave-border);
  backdrop-filter: blur(12px);
}
[data-theme="light"] .dr-sec {
  background: rgba(255, 250, 235, 0.65);
  border-color: var(--leave-border);
}
.dr-sec-head {
  display: flex; align-items: center; gap: 9px;
  font-size: 10.5px; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--leave-text-muted);
}
.dr-sec-head > svg { color: var(--leave-brand); }
.sec-num {
  font-size: 10px; font-weight: 800;
  color: var(--leave-brand);
  padding: 2px 7px; border-radius: 5px;
  background: rgba(251, 191, 36, 0.14);
  border: 1px solid rgba(251, 191, 36, 0.30);
  letter-spacing: 0.06em;
}
.sec-title { color: var(--leave-text-secondary); }
.sec-meta {
  margin-left: auto;
  font-size: 9.5px; font-weight: 800;
  letter-spacing: 0.10em;
  color: var(--leave-text-muted);
  padding: 2px 8px; border-radius: 999px;
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid var(--leave-border);
}

.dr-pipe-wrap { padding: 4px 4px 2px; }

/* Reason — magazine quote style */
.dr-quote {
  position: relative;
  margin: 0;
  padding: 14px 16px 14px 38px;
  border-radius: 12px;
  background:
    linear-gradient(135deg, rgba(251, 191, 36, 0.06), rgba(234, 88, 12, 0.04));
  border: 1px solid var(--leave-border);
  border-left: 3px solid var(--leave-brand);
  font-size: 13.5px; line-height: 1.6;
  color: var(--leave-text);
  font-style: italic;
}
[data-theme="light"] .dr-quote {
  background:
    linear-gradient(135deg, rgba(251, 191, 36, 0.10), rgba(234, 88, 12, 0.04));
}
.dr-quote .quote-mark {
  position: absolute;
  left: 8px; top: -2px;
  font-family: Georgia, serif;
  font-size: 48px; line-height: 1; font-style: normal;
  background: linear-gradient(135deg, #fbbf24, #ea580c);
  background-clip: text; -webkit-background-clip: text; color: transparent;
  opacity: 0.7;
}

.dr-contact { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.contact-chip {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11px; font-weight: 600;
  padding: 5px 10px; border-radius: 999px;
  background: rgba(251, 191, 36, 0.10);
  border: 1px solid var(--leave-border);
  color: var(--leave-text-secondary);
}
[data-theme="light"] .contact-chip { background: rgba(251, 191, 36, 0.14); }
.contact-chip.emergency {
  background: var(--leave-rejected-soft);
  border-color: var(--leave-border-ember);
  color: var(--leave-rejected);
}

/* Decisions timeline */
.dr-tl {
  list-style: none; margin: 0; padding: 0;
  display: flex; flex-direction: column; gap: 4px;
}
.tl-item {
  position: relative;
  display: grid; grid-template-columns: 32px 1fr; gap: 12px;
  padding: 12px 12px 12px 4px;
  border-radius: 10px;
  transition: background .22s;
}
.tl-item:hover { background: rgba(251, 191, 36, 0.04); }
.tl-rail {
  position: absolute;
  left: 19px; top: 28px; bottom: -4px;
  width: 2px;
  background: linear-gradient(180deg, var(--leave-border-strong), transparent);
}
.tl-item:last-child .tl-rail { display: none; }
.tl-item[data-state="APPROVED"] .tl-rail { background: linear-gradient(180deg, var(--leave-approved), transparent); }
.tl-item[data-state="REJECTED"] .tl-rail { background: linear-gradient(180deg, var(--leave-rejected), transparent); }
.tl-item[data-state="SKIPPED"]  .tl-rail { background: linear-gradient(180deg, var(--leave-cancelled), transparent); }

.tl-dot {
  position: relative;
  width: 26px; height: 26px; border-radius: 50%;
  display: grid; place-items: center;
  background: rgba(251, 191, 36, 0.10);
  border: 1.5px solid var(--leave-border-strong);
  transition: background .22s, border-color .22s, box-shadow .22s;
}
.tl-dot .dot-inner {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--leave-text-muted);
  transition: background .22s;
}
.tl-dot[data-state="APPROVED"] {
  background: rgba(251, 191, 36, 0.20);
  border-color: var(--leave-approved);
  box-shadow: 0 0 14px color-mix(in srgb, var(--leave-approved) 60%, transparent);
}
.tl-dot[data-state="APPROVED"] .dot-inner { background: var(--leave-approved); }
.tl-dot[data-state="REJECTED"] {
  background: rgba(234, 88, 12, 0.18);
  border-color: var(--leave-rejected);
  box-shadow: 0 0 14px color-mix(in srgb, var(--leave-rejected) 60%, transparent);
}
.tl-dot[data-state="REJECTED"] .dot-inner { background: var(--leave-rejected); }
.tl-dot[data-state="SKIPPED"] {
  background: rgba(133, 77, 14, 0.18);
  border-color: var(--leave-cancelled);
}
.tl-dot[data-state="SKIPPED"] .dot-inner { background: var(--leave-cancelled); }
.tl-dot[data-state="PENDING"] {
  animation: leave-pulse 1.8s ease-in-out infinite;
  border-color: var(--leave-brand);
}
.tl-dot[data-state="PENDING"] .dot-inner { background: var(--leave-brand); }

.tl-body { min-width: 0; }
.tl-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.tl-num {
  font-size: 10px; font-weight: 800;
  color: var(--leave-text-muted);
  padding: 1px 6px; border-radius: 4px;
  background: rgba(251, 191, 36, 0.10);
  border: 1px solid var(--leave-border);
}
.tl-label { font-size: 13px; font-weight: 700; color: var(--leave-text); }
.tl-type {
  font-size: 8.5px; font-weight: 800; letter-spacing: 0.12em;
  padding: 2px 6px; border-radius: 4px;
  background: rgba(251, 191, 36, 0.08);
  color: var(--leave-text-muted);
  border: 1px solid var(--leave-border);
}
.tl-type[data-type="MANAGER"] { color: var(--w-gold-300); background: rgba(251, 191, 36, 0.14); border-color: rgba(251, 191, 36, 0.36); }
.tl-type[data-type="HR"]      { color: var(--w-gold-200); background: rgba(252, 211, 77, 0.14); border-color: rgba(252, 211, 77, 0.36); }
.tl-type[data-type="USER"]    { color: var(--w-orange-200); background: rgba(253, 186, 116, 0.14); border-color: rgba(253, 186, 116, 0.36); }

.tl-state {
  font-size: 10.5px; font-weight: 700;
  letter-spacing: 0.06em;
  color: var(--leave-text-muted);
  margin-left: auto;
}
.tl-state[data-state="APPROVED"] { color: var(--leave-approved); }
.tl-state[data-state="REJECTED"] { color: var(--leave-rejected); }
.tl-state[data-state="SKIPPED"]  { color: var(--leave-cancelled); }
.tl-state[data-state="ACTIVE"]   { color: var(--leave-brand); }

.tl-meta { margin-top: 4px; font-size: 10.5px; color: var(--leave-text-muted); }
.tl-meta .tl-when { color: var(--leave-text-placeholder); }
.tl-note {
  margin-top: 7px;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(251, 191, 36, 0.06);
  border-left: 2px solid var(--leave-brand);
  font-size: 11.5px; line-height: 1.5;
  color: var(--leave-text-secondary);
}
[data-theme="light"] .tl-note { background: rgba(251, 191, 36, 0.10); color: #6b3d12; }

/* Day breakdown grid */
.dr-days {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(64px, 1fr));
  gap: 8px;
}
.day {
  position: relative;
  display: flex; flex-direction: column; align-items: center; gap: 1px;
  padding: 10px 4px 8px;
  border-radius: 12px;
  background: rgba(251, 191, 36, 0.12);
  border: 1px solid color-mix(in srgb, var(--leave-brand) 32%, transparent);
  cursor: default;
  transition: border-color .22s, box-shadow .22s, transform .22s;
  will-change: transform;
}
.day:hover { box-shadow: 0 8px 20px -10px rgba(251, 191, 36, 0.5); border-color: var(--leave-brand); }
.day[data-paid="false"] {
  background: rgba(234, 88, 12, 0.10);
  border-color: color-mix(in srgb, var(--leave-rejected) 30%, transparent);
}
.day[data-hol="true"] {
  background: rgba(251, 146, 60, 0.14);
  border-color: color-mix(in srgb, var(--leave-special) 36%, transparent);
}
.day[data-wo="true"] {
  background: rgba(133, 77, 14, 0.14);
  border-color: color-mix(in srgb, var(--leave-cancelled) 38%, transparent);
}
.d-dow {
  font-size: 8.5px; font-weight: 800;
  letter-spacing: 0.10em; text-transform: uppercase;
  color: var(--leave-text-muted);
}
.d-num {
  font-size: 22px; font-weight: 800;
  color: var(--leave-text);
  letter-spacing: -0.02em;
  line-height: 1;
}
.d-mon {
  font-size: 8.5px; font-weight: 800;
  letter-spacing: 0.10em;
  color: var(--leave-text-muted);
}
.d-tag {
  margin-top: 4px;
  font-size: 7.5px; font-weight: 800;
  letter-spacing: 0.12em;
  padding: 2px 6px; border-radius: 4px;
  background: rgba(251, 191, 36, 0.20);
  color: var(--leave-approved);
  border: 1px solid color-mix(in srgb, var(--leave-approved) 30%, transparent);
}
.day[data-paid="false"] .d-tag { background: rgba(234, 88, 12, 0.20); color: var(--leave-rejected); border-color: color-mix(in srgb, var(--leave-rejected) 30%, transparent); }
.day[data-hol="true"]   .d-tag { background: rgba(251, 146, 60, 0.20); color: var(--leave-special); border-color: color-mix(in srgb, var(--leave-special) 32%, transparent); }
.day[data-wo="true"]    .d-tag { background: rgba(133, 77, 14, 0.20); color: var(--leave-cancelled); border-color: color-mix(in srgb, var(--leave-cancelled) 32%, transparent); }

/* ════════════════════════════════════════════════════════════════════════
   Footer
   ──────────────────────────────────────────────────────────────────────── */
.dr-foot {
  position: relative; z-index: 2;
  display: flex; align-items: center; gap: 10px;
  padding: 14px 24px;
  border-top: 1px solid var(--leave-border);
  background: linear-gradient(180deg, rgba(20, 12, 6, 0.55), rgba(28, 18, 10, 0.92));
}
[data-theme="light"] .dr-foot {
  background: linear-gradient(180deg, rgba(255, 250, 235, 0.55), rgba(255, 244, 210, 0.94));
  border-top-color: var(--leave-border);
}

/* Drawer enter / leave choreography */
.lv-drawer-enter-active, .lv-drawer-leave-active { transition: opacity .32s var(--leave-ease); }
.lv-drawer-enter-from, .lv-drawer-leave-to { opacity: 0; }
.lv-drawer-enter-active .dr { transition: transform .48s cubic-bezier(0.16, 1, 0.3, 1), opacity .42s; }
.lv-drawer-leave-active .dr { transition: transform .36s cubic-bezier(0.4, 0, 0.6, 1); }
.lv-drawer-enter-from .dr, .lv-drawer-leave-to .dr { transform: translateX(100%); }

/* Reduced-motion: silence orbs */
@media (prefers-reduced-motion: reduce) {
  .orb { animation: none !important; opacity: 0.18; }
}
</style>
