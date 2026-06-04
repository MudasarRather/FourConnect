<template>
  <div class="tap-page">
    <!-- ═════════════════════════════════════════════════════════════════
         Profile-not-linked banner (employee row missing entirely)
         ════════════════════════════════════════════════════════════════ -->
    <Motion v-if="unlinked" as="div" class="tap-unlinked"
      :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }"
    >
      <span class="tap-unlinked-ico"><UserRoundX :size="20" /></span>
      <div class="tap-unlinked-text">
        <strong>You aren't linked to an HR employee profile.</strong>
        <span>Without a profile, the system can't map direct-reports to you. Ask HR to link your account.</span>
      </div>
    </Motion>

    <!-- ═════════════════════════════════════════════════════════════════
         HERO
         ════════════════════════════════════════════════════════════════ -->
    <section class="tap-hero">
      <!-- Ambient -->
      <div class="tap-hero-atm" aria-hidden="true">
        <span class="hero-orb a1" />
        <span class="hero-orb a2" />
        <span class="hero-orb a3" />
        <span class="hero-grid" />
      </div>

      <div class="tap-hero-body">
        <Motion as="span" class="tap-hero-eye leave-mono"
          :initial="{ y: -8, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
          :transition="{ duration: 0.45 }"
        >
          <span class="hero-eye-dot" />
          Manager · two-tier approval flow
        </Motion>

        <Motion as="h1" class="tap-hero-title"
          :initial="{ y: 8, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
          :transition="{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }"
        >
          {{ heroGreeting }},
          <span class="tap-hero-grad">{{ heroVerb }}</span>
        </Motion>

        <Motion as="p" class="tap-hero-sub"
          :initial="{ y: 8, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
          :transition="{ duration: 0.55, delay: 0.14 }"
        >
          Requests appear here as soon as a direct report applies for leave. Approved requests go to HR for the final stage — rejected requests stop here with your written reason.
        </Motion>

        <!-- Stat tiles -->
        <div class="tap-stats">
          <Motion as="article" class="stat pending"
            :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.45, delay: 0.22 }"
          >
            <span class="stat-eye leave-mono">Pending decisions</span>
            <span class="stat-num">{{ pendingCount }}</span>
            <span class="stat-sub leave-mono">awaiting your call</span>
            <span class="stat-pulse" />
          </Motion>

          <Motion as="article" class="stat oldest"
            :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.45, delay: 0.28 }"
          >
            <span class="stat-eye leave-mono">Oldest open</span>
            <span class="stat-num">{{ oldestAge.value }}<small class="stat-unit">{{ oldestAge.unit }}</small></span>
            <span class="stat-sub leave-mono">{{ oldestAge.note }}</span>
          </Motion>

          <Motion as="article" class="stat decided"
            :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.45, delay: 0.34 }"
          >
            <span class="stat-eye leave-mono">Decided this session</span>
            <span class="stat-num">
              <span class="decided-approved">{{ session.approved }}</span>
              <span class="stat-sep">/</span>
              <span class="decided-rejected">{{ session.rejected }}</span>
            </span>
            <span class="stat-sub leave-mono">approved · rejected</span>
          </Motion>
        </div>
      </div>
    </section>

    <!-- ═════════════════════════════════════════════════════════════════
         FILTERS + QUEUE
         ════════════════════════════════════════════════════════════════ -->
    <section class="tap-queue-section">
      <header class="tap-section-head">
        <div class="tap-section-meta">
          <div class="tap-section-eye leave-mono">
            <span class="hero-eye-dot" /> Live queue
          </div>
          <h2 class="tap-section-title">Pending leave approvals</h2>
        </div>

        <div class="tap-actions">
          <div class="tap-filters">
            <button v-for="f in filterChips" :key="f.key"
              class="filter-chip"
              :class="{ active: activeFilter === f.key }"
              @click="activeFilter = f.key"
            >
              <component :is="f.icon" :size="11" />
              <span>{{ f.label }}</span>
              <span v-if="f.count(filteredAllScopes) > 0" class="chip-count">{{ f.count(filteredAllScopes) }}</span>
            </button>
          </div>
          <button class="tap-refresh leave-btn leave-btn-sm" :disabled="loading" @click="reload">
            <RefreshCw :size="13" :class="{ spin: loading }" />
            Refresh
          </button>
        </div>
      </header>

      <!-- ───── Loading skeleton ───── -->
      <div v-if="loading && !queue.length" class="tap-grid">
        <div v-for="i in 3" :key="`sk-${i}`" class="tap-skel-card">
          <div class="leave-skel skel-line" style="width:55%; height:14px;" />
          <div class="leave-skel skel-line" style="width:80%; height:11px; margin-top:8px" />
          <div class="leave-skel skel-block" style="height:60px; margin-top:14px" />
          <div class="leave-skel skel-line" style="width:90%; margin-top:12px" />
        </div>
      </div>

      <!-- ───── Empty state ───── -->
      <Motion v-else-if="!visibleQueue.length" as="div" class="tap-empty"
        :initial="{ opacity: 0, scale: 0.92 }" :animate="{ opacity: 1, scale: 1 }"
        :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }"
      >
        <div class="empty-art">
          <span class="empty-aura" />
          <span class="empty-ring r1" />
          <span class="empty-ring r2" />
          <span class="empty-ring r3" />
          <CircleCheck :size="46" class="empty-icon" />
        </div>
        <div class="empty-title">
          {{ queue.length === 0 ? 'Inbox zero — your team is sorted' : 'No requests match this filter' }}
        </div>
        <div class="empty-sub">
          {{ queue.length === 0
            ? 'New leave applications will land here the moment a direct report submits one.'
            : 'Try a different filter to see other pending requests.' }}
        </div>
      </Motion>

      <!-- ───── Queue grid ───── -->
      <div v-else class="tap-grid">
        <TeamApprovalCard
          v-for="l in visibleQueue" :key="l.id"
          :leave="l"
          :busy="busyById[l.id] === 'busy'"
          :decided="decidedById[l.id] || null"
          @open="openReview"
          @quick-decide="onQuickDecide"
        />
      </div>
    </section>

    <!-- ═════════════════════════════════════════════════════════════════
         ENCASHMENT ENDORSEMENTS (payroll · stage 1)
         ════════════════════════════════════════════════════════════════ -->
    <section v-if="encashQueue.length" class="tap-encash-section">
      <header class="tap-section-head">
        <div class="tap-section-meta">
          <div class="tap-section-eye leave-mono"><span class="hero-eye-dot ember" /> Payroll</div>
          <h2 class="tap-section-title">Encashment endorsements</h2>
        </div>
        <span class="tap-encash-hint leave-mono">{{ encashQueue.length }} awaiting · endorse forwards to HR &amp; Finance</span>
      </header>

      <div class="tap-encash-grid">
        <Motion v-for="e in encashQueue" :key="e.id" as="article" class="enc-endorse"
          :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
          <header class="ee-head">
            <span class="ee-ava">{{ initials(e.employee_name) }}</span>
            <div class="ee-who">
              <span class="ee-name">{{ e.employee_name }}</span>
              <span class="ee-meta leave-mono">{{ e.reference_no }} · {{ e.leave_type }}</span>
            </div>
            <div class="ee-amount">
              <span class="ee-amt leave-mono"><i>₹</i>{{ inr(e.amount) }}</span>
              <span class="ee-days leave-mono">{{ e.days_requested }} day{{ Number(e.days_requested) === 1 ? '' : 's' }}</span>
            </div>
          </header>
          <div class="ee-calc leave-mono">{{ e.days_requested }}d × ₹{{ inr(e.basic_salary_snapshot) }} / mo</div>
          <p v-if="e.request_notes" class="ee-note">“{{ e.request_notes }}”</p>

          <transition name="ee-rsn">
            <textarea v-if="decliningId === e.id" v-model="declineNote" rows="2" maxlength="1000"
              class="ee-reason" placeholder="Reason for declining (shared with employee + HR)…" />
          </transition>

          <footer class="ee-foot">
            <template v-if="decliningId === e.id">
              <button class="leave-btn leave-btn-sm" :disabled="eeBusy === e.id" @click="cancelDecline">Back</button>
              <button class="leave-btn leave-btn-sm leave-btn-danger" :disabled="eeBusy === e.id || declineNote.trim().length < 3" @click="confirmDecline(e)">
                <X :size="12" /> Confirm decline
              </button>
            </template>
            <template v-else>
              <button class="leave-btn leave-btn-sm leave-btn-danger" :disabled="eeBusy === e.id" @click="startDecline(e)"><X :size="12" /> Decline</button>
              <button class="leave-btn leave-btn-sm leave-btn-primary" :disabled="eeBusy === e.id" @click="endorse(e)"><Check :size="12" /> Endorse → HR</button>
            </template>
          </footer>
        </Motion>
      </div>
    </section>

    <!-- ═════════════════════════════════════════════════════════════════
         REVIEW DRAWER
         ════════════════════════════════════════════════════════════════ -->
    <TeamApprovalReviewDrawer
      :open="reviewOpen"
      :leave="reviewLeave"
      :submitting="reviewSubmitting"
      @close="closeReview"
      @submit="onDrawerSubmit"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, reactive } from 'vue'
import { Motion } from 'motion-v'
import {
  RefreshCw, UserRoundX, CircleCheck, Layers, Clock, Hourglass, AlertTriangle, Check, X,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'

import {
  fetchManagerQueue, decideAsManager,
  fetchManagerEncashmentQueue, managerDecideEncashment,
} from '@/composables/useLeaves'
import TeamApprovalCard from './team-approvals/components/TeamApprovalCard.vue'
import TeamApprovalReviewDrawer from './team-approvals/drawers/TeamApprovalReviewDrawer.vue'

import '@/styles/leave-theme.css'

const toast = useToast()

const queue = ref([])
const loading = ref(false)
const unlinked = ref(false)
// id → 'busy' | undefined
const busyById = reactive({})
// id → 'APPROVED' | 'REJECTED' (set during exit animation only)
const decidedById = reactive({})
// session-local decision counters
const session = reactive({ approved: 0, rejected: 0 })

// ─── Encashment endorsements (payroll stage 1) ───────────────────────
const encashQueue = ref([])
const eeBusy = ref(null)
const decliningId = ref(null)
const declineNote = ref('')
const initials = (name) => {
  if (!name) return '?'
  const p = String(name).trim().split(/\s+/).filter(Boolean)
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase()
}
const inr = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })
const loadEncashEndorsements = async () => {
  try { encashQueue.value = (await fetchManagerEncashmentQueue())?.items || [] }
  catch { encashQueue.value = [] }
}
const startDecline = (e) => { decliningId.value = e.id; declineNote.value = '' }
const cancelDecline = () => { decliningId.value = null; declineNote.value = '' }
const endorse = async (e) => {
  eeBusy.value = e.id
  try {
    await managerDecideEncashment(e.id, { decision: 'APPROVED' })
    toast.success(`Endorsed · ${e.reference_no} → HR`)
    encashQueue.value = encashQueue.value.filter((x) => x.id !== e.id)
  } catch (err) { toast.error(err?.response?.data?.detail || 'Endorse failed') }
  finally { eeBusy.value = null }
}
const confirmDecline = async (e) => {
  eeBusy.value = e.id
  try {
    await managerDecideEncashment(e.id, { decision: 'REJECTED', notes: declineNote.value.trim() })
    toast.success(`Declined · ${e.reference_no}`)
    encashQueue.value = encashQueue.value.filter((x) => x.id !== e.id)
    decliningId.value = null; declineNote.value = ''
  } catch (err) { toast.error(err?.response?.data?.detail || 'Decline failed') }
  finally { eeBusy.value = null }
}

// Filters
const activeFilter = ref('all')
const filterChips = [
  { key: 'all',    label: 'All',         icon: Layers,         count: (q) => q.length },
  { key: 'today',  label: 'Today',       icon: Clock,          count: (q) => q.filter((l) => isAppliedToday(l)).length },
  { key: '24h',    label: '< 24h',       icon: Hourglass,      count: (q) => q.filter((l) => hoursOld(l) < 24).length },
  { key: 'aging',  label: '> 48h aging', icon: AlertTriangle,  count: (q) => q.filter((l) => hoursOld(l) >= 48).length },
]

const firstName = computed(() => {
  try {
    const u = JSON.parse(localStorage.getItem('user') || 'null')
    return (u?.full_name || u?.email || '').split(' ')[0] || 'manager'
  } catch { return 'manager' }
})

const heroGreeting = computed(() => {
  const h = new Date().getHours()
  if (h < 5)  return `Late night, ${firstName.value}`
  if (h < 12) return `Good morning, ${firstName.value}`
  if (h < 17) return `Good afternoon, ${firstName.value}`
  return `Good evening, ${firstName.value}`
})

const heroVerb = computed(() => {
  if (pendingCount.value === 0) return 'your team is good to go'
  if (pendingCount.value === 1) return '1 request needs your eyes'
  return `${pendingCount.value} requests need your eyes`
})

const pendingCount = computed(() => queue.value.length)

const oldestAge = computed(() => {
  if (!queue.value.length) return { value: '0', unit: 'h', note: 'all clear' }
  const oldest = queue.value.reduce((acc, l) => {
    const t = new Date(l.created_at).getTime()
    return (acc === null || t < acc) ? t : acc
  }, null)
  const h = (Date.now() - oldest) / 3600000
  if (h < 1) return { value: Math.max(1, Math.floor(h * 60)), unit: 'm', note: 'just now' }
  if (h < 48) return { value: Math.floor(h), unit: 'h', note: h >= 24 ? 'over a day' : 'today' }
  return { value: Math.floor(h / 24), unit: 'd', note: 'overdue' }
})

const isAppliedToday = (l) => {
  if (!l.created_at) return false
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return new Date(l.created_at) >= today
}
const hoursOld = (l) => (Date.now() - new Date(l.created_at).getTime()) / 3600000

const filteredAllScopes = computed(() => queue.value)
const visibleQueue = computed(() => {
  switch (activeFilter.value) {
    case 'today':  return queue.value.filter(isAppliedToday)
    case '24h':    return queue.value.filter((l) => hoursOld(l) < 24)
    case 'aging':  return queue.value.filter((l) => hoursOld(l) >= 48)
    default:       return queue.value
  }
})

// ─── Data fetch ──────────────────────────────────────────────────────
const reload = async () => {
  loading.value = true
  unlinked.value = false
  try {
    const data = await fetchManagerQueue()
    queue.value = data?.items || []
    if (data?.unlinked) unlinked.value = true
    loadEncashEndorsements()
  } catch (e) {
    const status = e?.response?.status
    const detail = e?.response?.data?.detail || ''
    if (status === 404 && /No employee profile linked/i.test(detail)) {
      unlinked.value = true
      queue.value = []
    } else {
      toast.error(detail || 'Failed to load approvals queue')
    }
  } finally {
    loading.value = false
  }
}

onMounted(reload)

// ─── Quick decisions (one-tap inline) ────────────────────────────────
const onQuickDecide = async (leave, kind) => {
  if (kind === 'REJECTED') {
    // Reject always needs a written reason — push to drawer.
    openReview(leave, 'REJECTED')
    return
  }
  // Approve inline (no notes required).
  await sendDecision(leave, { decision: 'APPROVED', notes: null })
}

// ─── Drawer flow ─────────────────────────────────────────────────────
const reviewOpen = ref(false)
const reviewLeave = ref(null)
const reviewSubmitting = ref(false)
const reviewIntent = ref(null) // when opened via Reject quick action

const openReview = (leave, intent = null) => {
  reviewLeave.value = leave
  reviewIntent.value = intent
  reviewOpen.value = true
}
const closeReview = () => {
  if (reviewSubmitting.value) return
  reviewOpen.value = false
  setTimeout(() => { reviewLeave.value = null; reviewIntent.value = null }, 300)
}

const onDrawerSubmit = async ({ decision, notes }) => {
  if (!reviewLeave.value) return
  reviewSubmitting.value = true
  const leave = reviewLeave.value
  try {
    await sendDecision(leave, { decision, notes }, /*viaDrawer*/ true)
    reviewSubmitting.value = false
    reviewOpen.value = false
    setTimeout(() => { reviewLeave.value = null; reviewIntent.value = null }, 350)
  } catch {
    reviewSubmitting.value = false
  }
}

// ─── Shared decision helper with optimistic + exit animation ────────
const sendDecision = async (leave, payload, viaDrawer = false) => {
  busyById[leave.id] = 'busy'
  try {
    await decideAsManager(leave.id, payload)

    // Update session counters
    if (payload.decision === 'APPROVED') session.approved += 1
    else                                   session.rejected += 1

    // Trigger exit animation on the card
    decidedById[leave.id] = payload.decision

    // After the wash animation, remove from the queue
    setTimeout(() => {
      queue.value = queue.value.filter((x) => x.id !== leave.id)
      delete decidedById[leave.id]
      delete busyById[leave.id]
    }, 950)

    toast.success(payload.decision === 'APPROVED'
      ? `Approved — ${leave.employee_name}'s leave passed to HR.`
      : `Rejected — ${leave.employee_name} will be notified.`)
  } catch (e) {
    delete busyById[leave.id]
    toast.error(e?.response?.data?.detail || 'Failed to record decision')
    throw e
  }
}
</script>

<style scoped>
@import '@/styles/leave-theme.css';

/* ═══════════════════════════════════════════════════════════════════════
   PAGE WRAPPER
   ═══════════════════════════════════════════════════════════════════════ */
.tap-page {
  display: flex; flex-direction: column; gap: 22px;
  padding: 24px 28px 60px;
  max-width: 1320px;
  margin: 0 auto;
  color: var(--hr-text);
}

/* ═══════════════════════════════════════════════════════════════════════
   UNLINKED BANNER
   ═══════════════════════════════════════════════════════════════════════ */
.tap-unlinked {
  display: flex; gap: 14px; align-items: flex-start;
  padding: 14px 18px;
  border-radius: 14px;
  background:
    radial-gradient(120% 80% at 0% 0%, rgba(245, 158, 11, 0.18), transparent 55%),
    linear-gradient(180deg, rgba(40, 28, 14, 0.72), rgba(28, 20, 10, 0.78));
  border: 1px solid rgba(245, 158, 11, 0.32);
  box-shadow: inset 4px 0 0 -1px rgba(245, 158, 11, 0.75);
}
[data-theme="light"] .tap-unlinked {
  background:
    radial-gradient(120% 80% at 0% 0%, rgba(245, 158, 11, 0.22), transparent 55%),
    rgba(255, 248, 232, 0.95);
  border-color: rgba(180, 83, 9, 0.30);
}
.tap-unlinked-ico {
  display: grid; place-items: center;
  width: 38px; height: 38px;
  border-radius: 11px;
  background: linear-gradient(135deg, rgba(251, 146, 60, 0.25), rgba(251, 191, 36, 0.15));
  border: 1px solid rgba(251, 191, 36, 0.35);
  color: #fbbf24;
  flex-shrink: 0;
}
[data-theme="light"] .tap-unlinked-ico { color: #b45309; }
.tap-unlinked-text { display: flex; flex-direction: column; gap: 3px; }
.tap-unlinked-text strong { font-size: 13.5px; font-weight: 800; color: var(--hr-text); }
.tap-unlinked-text span { font-size: 11.5px; color: var(--hr-text-muted); line-height: 1.5; }

/* ═══════════════════════════════════════════════════════════════════════
   HERO
   ═══════════════════════════════════════════════════════════════════════ */
.tap-hero {
  position: relative;
  padding: 32px 34px;
  border-radius: 22px;
  background: var(--leave-grad-hero);
  border: 1px solid rgba(245, 158, 11, 0.22);
  overflow: hidden;
  isolation: isolate;
}
[data-theme="light"] .tap-hero { border-color: rgba(180, 83, 9, 0.20); }

.tap-hero-atm { position: absolute; inset: 0; z-index: 0; overflow: hidden; pointer-events: none; }
.hero-orb {
  position: absolute; border-radius: 50%;
  filter: blur(70px); opacity: 0.55;
}
.hero-orb.a1 {
  width: 360px; height: 360px; top: -140px; right: -120px;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.42), transparent 70%);
  animation: tap-orb-a 20s ease-in-out infinite;
}
.hero-orb.a2 {
  width: 260px; height: 260px; bottom: -100px; left: -80px;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.36), transparent 70%);
  animation: tap-orb-b 24s ease-in-out infinite;
}
.hero-orb.a3 {
  width: 200px; height: 200px; top: 50%; left: 40%;
  background: radial-gradient(circle, rgba(244, 63, 94, 0.20), transparent 70%);
  animation: tap-orb-c 28s ease-in-out infinite;
}
@keyframes tap-orb-a { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-26px,30px) scale(1.08); } }
@keyframes tap-orb-b { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(32px,-22px) scale(1.10); } }
@keyframes tap-orb-c { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-18px,18px) scale(0.95); } }
.hero-grid {
  position: absolute; inset: 0;
  background-image: radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 24px 24px;
  mask-image: linear-gradient(180deg, rgba(0,0,0,0.45), transparent 70%);
  opacity: 0.6;
}
[data-theme="light"] .hero-grid {
  background-image: radial-gradient(rgba(120, 53, 15, 0.08) 1px, transparent 1px);
}

.tap-hero-body { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 8px; }

.tap-hero-eye {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;
  color: #fbbf24;
}
[data-theme="light"] .tap-hero-eye { color: #b45309; }
.hero-eye-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #fbbf24; box-shadow: 0 0 8px rgba(251, 191, 36, 0.85);
  animation: tap-eye-pulse 1.6s ease-in-out infinite;
}
@keyframes tap-eye-pulse {
  0%,100% { opacity: 0.7; transform: scale(1); }
  50%     { opacity: 1; transform: scale(1.45); }
}

.tap-hero-title {
  margin: 6px 0 0;
  font-size: 32px; font-weight: 900; letter-spacing: -0.022em;
  line-height: 1.15;
  color: var(--hr-text);
}
.tap-hero-grad {
  background: linear-gradient(135deg, #fbbf24 0%, #fb923c 50%, #f43f5e 100%);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}

.tap-hero-sub {
  margin: 8px 0 0;
  font-size: 13.5px; line-height: 1.6;
  max-width: 720px;
  color: var(--hr-text-muted);
}
[data-theme="light"] .tap-hero-sub { color: #6b5840; }

/* ═════ Stats row ═════ */
.tap-stats {
  margin-top: 24px;
  display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px;
}
@media (max-width: 760px) { .tap-stats { grid-template-columns: 1fr; } }

.stat {
  position: relative;
  display: flex; flex-direction: column; gap: 4px;
  padding: 16px 18px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
  isolation: isolate;
}
[data-theme="light"] .stat {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(120, 53, 15, 0.16);
}
.stat-eye {
  font-size: 9px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--hr-text-muted);
}
[data-theme="light"] .stat-eye { color: #8a7556; }
.stat-num {
  font-size: 32px; font-weight: 900; letter-spacing: -0.025em;
  color: var(--hr-text);
  display: flex; align-items: baseline; gap: 4px;
  line-height: 1;
}
.stat-unit { font-size: 13.5px; font-weight: 700; color: var(--hr-text-muted); margin-left: 2px; }
.stat-sub {
  margin-top: 3px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.08em;
  color: var(--hr-text-muted);
}

.stat.pending {
  background:
    linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(245, 158, 11, 0.05)),
    rgba(40, 28, 14, 0.45);
  border-color: rgba(245, 158, 11, 0.32);
}
[data-theme="light"] .stat.pending {
  background:
    linear-gradient(135deg, rgba(245, 158, 11, 0.20), rgba(255, 250, 240, 0.85));
  border-color: rgba(180, 83, 9, 0.28);
}
.stat.pending .stat-num {
  background: linear-gradient(135deg, #fbbf24, #fb923c);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
.stat-pulse {
  position: absolute; right: -40px; top: -40px;
  width: 120px; height: 120px; border-radius: 50%;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.30), transparent 70%);
  animation: tap-stat-pulse 3.4s ease-in-out infinite;
  pointer-events: none;
}
@keyframes tap-stat-pulse {
  0%,100% { transform: scale(0.85); opacity: 0.4; }
  50%     { transform: scale(1.15); opacity: 1; }
}

.stat.oldest .stat-num {
  background: linear-gradient(135deg, #fda4af, #f43f5e);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
.stat.decided .stat-num {
  font-size: 28px;
  display: inline-flex; gap: 8px; align-items: baseline;
}
.decided-approved {
  background: linear-gradient(135deg, #34d399, #10b981);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
.decided-rejected {
  background: linear-gradient(135deg, #fda4af, #f43f5e);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
.stat-sep {
  color: var(--hr-text-muted);
  font-size: 24px;
  font-weight: 600;
  opacity: 0.5;
}

/* ═══════════════════════════════════════════════════════════════════════
   QUEUE SECTION
   ═══════════════════════════════════════════════════════════════════════ */
.tap-queue-section { display: flex; flex-direction: column; gap: 14px; }

.tap-section-head {
  display: flex; align-items: flex-end; justify-content: space-between; gap: 18px;
  flex-wrap: wrap;
}
.tap-section-meta { display: flex; flex-direction: column; gap: 4px; }
.tap-section-eye {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 800; letter-spacing: 1.4px; text-transform: uppercase;
  color: #fbbf24;
}
[data-theme="light"] .tap-section-eye { color: #b45309; }
.tap-section-title {
  margin: 0;
  font-size: 22px; font-weight: 800; letter-spacing: -0.018em;
  color: var(--hr-text);
}

.tap-actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }

.tap-filters {
  display: flex; gap: 6px;
  padding: 4px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}
[data-theme="light"] .tap-filters {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(120, 53, 15, 0.14);
}
.filter-chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 7px 11px; border-radius: 9px;
  background: transparent;
  border: 1px solid transparent;
  color: var(--hr-text-muted);
  font: inherit; font-size: 11px; font-weight: 700; letter-spacing: 0.05em;
  cursor: pointer;
  transition: background .22s, color .22s, border-color .22s, transform .22s;
}
.filter-chip:hover {
  background: rgba(255, 255, 255, 0.04);
  color: var(--hr-text);
}
.filter-chip.active {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.22), rgba(217, 119, 6, 0.10));
  border-color: rgba(245, 158, 11, 0.55);
  color: #fbbf24;
}
[data-theme="light"] .filter-chip.active {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.30), rgba(255, 248, 232, 0.6));
  color: #b45309;
  border-color: rgba(180, 83, 9, 0.36);
}
.chip-count {
  display: inline-grid; place-items: center;
  min-width: 17px; height: 17px;
  padding: 0 5px; border-radius: 999px;
  font-size: 9px; font-weight: 800; letter-spacing: 0.04em;
  background: rgba(0, 0, 0, 0.45);
  color: #fef3c7;
  margin-left: 2px;
}
[data-theme="light"] .chip-count { background: rgba(180, 83, 9, 0.22); color: #7c2d12; }

.tap-refresh {
  display: inline-flex; align-items: center; gap: 6px;
}
.spin { animation: tap-spin 1s linear infinite; }
@keyframes tap-spin { to { transform: rotate(360deg); } }

/* ═════ Grid + skeleton ═════ */
.tap-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 16px;
}
.tap-skel-card {
  padding: 16px 18px;
  border-radius: 18px;
  background: var(--leave-surface);
  border: 1px solid rgba(255, 255, 255, 0.06);
  min-height: 240px;
}
[data-theme="light"] .tap-skel-card { border-color: rgba(120, 53, 15, 0.14); }

.skel-line, .skel-block {
  background: linear-gradient(90deg,
    rgba(255, 255, 255, 0.04) 0%,
    rgba(255, 255, 255, 0.10) 50%,
    rgba(255, 255, 255, 0.04) 100%);
  background-size: 200% 100%;
  animation: leave-shimmer 1.6s linear infinite;
  border-radius: 6px;
}
.skel-block { border-radius: 10px; }

/* ═════ Empty state ═════ */
.tap-empty {
  position: relative;
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 60px 24px;
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed rgba(16, 185, 129, 0.32);
  text-align: center;
  overflow: hidden;
}
[data-theme="light"] .tap-empty {
  background: rgba(255, 250, 240, 0.6);
  border-color: rgba(16, 185, 129, 0.36);
}
.empty-art {
  position: relative;
  width: 110px; height: 110px;
  display: grid; place-items: center;
  margin-bottom: 6px;
  isolation: isolate;
}
.empty-aura {
  position: absolute; inset: -20px; border-radius: 50%;
  background: radial-gradient(circle, rgba(16, 185, 129, 0.30), transparent 70%);
  filter: blur(20px);
  animation: tap-aura 4s ease-in-out infinite;
}
@keyframes tap-aura {
  0%,100% { opacity: 0.55; transform: scale(0.95); }
  50%     { opacity: 1;    transform: scale(1.1); }
}
.empty-ring {
  position: absolute; inset: 0;
  border-radius: 50%;
  border: 1.5px solid rgba(16, 185, 129, 0.45);
  animation: tap-ring 3s ease-out infinite;
}
.empty-ring.r2 { animation-delay: 1s; }
.empty-ring.r3 { animation-delay: 2s; }
@keyframes tap-ring {
  0%   { transform: scale(0.4); opacity: 0.9; }
  100% { transform: scale(1.6); opacity: 0; }
}
.empty-icon {
  color: var(--leave-approved);
  filter: drop-shadow(0 8px 16px rgba(16, 185, 129, 0.55));
  z-index: 2;
}
.empty-title {
  font-size: 16px; font-weight: 800; letter-spacing: -0.005em;
  color: var(--hr-text);
}
.empty-sub {
  font-size: 12.5px; line-height: 1.55; color: var(--hr-text-muted);
  max-width: 380px;
}
[data-theme="light"] .empty-sub { color: #6b5840; }

/* ─── Encashment endorsements (payroll stage 1) ─────────────────────── */
.tap-encash-section { display: flex; flex-direction: column; gap: 14px; margin-top: 22px; }
.tap-encash-hint { font-size: 10px; color: var(--hr-text-muted); }
.hero-eye-dot.ember { background: var(--w-ember-400); box-shadow: 0 0 8px var(--w-ember-400); }
.tap-encash-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
.enc-endorse {
  display: flex; flex-direction: column; gap: 10px; padding: 14px 16px; border-radius: 16px;
  background: var(--leave-surface); border: 1px solid var(--leave-border); backdrop-filter: blur(14px);
  border-left: 3px solid var(--w-ember-400);
}
[data-theme="light"] .enc-endorse { background: rgba(255, 250, 240, 0.92); border-color: rgba(180, 83, 9, 0.18); border-left-color: var(--w-ember-500); }
.ee-head { display: flex; align-items: center; gap: 10px; }
.ee-ava { display: inline-grid; place-items: center; width: 34px; height: 34px; border-radius: 11px; flex-shrink: 0; background: linear-gradient(135deg, var(--w-orange-300), var(--w-gold-500)); color: #2a1100; font-weight: 800; font-size: 11px; }
.ee-who { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.ee-name { font-size: 13.5px; font-weight: 800; color: var(--hr-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ee-meta { font-size: 9.5px; color: var(--hr-text-muted); }
.ee-amount { display: flex; flex-direction: column; align-items: flex-end; flex-shrink: 0; }
.ee-amt { font-size: 19px; font-weight: 900; letter-spacing: -0.02em; color: var(--leave-approved); font-variant-numeric: tabular-nums; }
.ee-amt i { font-style: normal; font-size: 13px; margin-right: 1px; }
.ee-days { font-size: 9.5px; color: var(--hr-text-muted); }
.ee-calc { font-size: 10.5px; color: var(--hr-text-muted); padding: 6px 9px; border-radius: 8px; background: rgba(255,255,255,0.03); align-self: flex-start; }
[data-theme="light"] .ee-calc { background: rgba(120,53,15,0.06); }
.ee-note { margin: 0; padding: 8px 11px; border-radius: 9px; background: rgba(251,191,36,0.06); border-left: 2px solid color-mix(in srgb, var(--leave-approved) 35%, transparent); font-size: 11.5px; line-height: 1.45; font-style: italic; color: var(--hr-text-secondary); }
.ee-reason { padding: 8px 11px; border-radius: 9px; background: rgba(255,255,255,0.04); border: 1px solid var(--hr-border); color: var(--hr-text); font: inherit; font-size: 12px; outline: none; resize: vertical; transition: border-color .2s, box-shadow .2s; }
[data-theme="light"] .ee-reason { background: rgba(255,250,240,0.88); border-color: rgba(180,83,9,0.2); }
.ee-reason:focus { border-color: var(--leave-rejected); box-shadow: 0 0 0 3px rgba(234,88,12,0.12); }
.ee-foot { display: flex; justify-content: flex-end; gap: 8px; margin-top: 2px; }
.ee-rsn-enter-active, .ee-rsn-leave-active { transition: opacity .25s, transform .25s; }
.ee-rsn-enter-from, .ee-rsn-leave-to { opacity: 0; transform: translateY(-4px); }
</style>
