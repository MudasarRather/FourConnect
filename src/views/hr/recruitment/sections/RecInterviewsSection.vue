<template>
  <div class="rec-section rec-fade-up">
    <div class="rec-toolbar-surface is-row">
      <div class="toolbar-left">
        <div v-for="f in statusFilters" :key="f.key"
          :class="['rec-filter-pill', activeFilter === f.key && 'is-active']"
          @click="applyFilter(f)">
          <component :is="f.icon" :size="13" />
          <span>{{ f.label }}</span>
        </div>
      </div>
      <div class="toolbar-right">
        <button class="rec-btn-primary" @click="openSchedule">
          <CalendarPlus :size="15" /> Schedule Interview
        </button>
      </div>
    </div>

    <div v-if="loading" class="iv-grid rec-stagger">
      <div v-for="i in 4" :key="i" class="rec-skel" style="height: 180px; border-radius: 16px" />
    </div>
    <RecEmptyState
      v-else-if="!items.length"
      :icon="CalendarClock"
      title="No interviews scheduled"
      body="Schedule interviews for candidates currently in the pipeline."
      cta-label="Schedule Interview"
      :cta-icon="CalendarPlus"
      @cta="openSchedule"
    />
    <div v-else class="iv-grid">
      <article
        v-for="(iv, i) in items"
        :key="iv.id"
        v-tilt
        class="iv-card rec-card rec-card-glow"
        v-motion
        :initial="{ opacity: 0, y: 12 }"
        :visible="{ opacity: 1, y: 0, transition: { duration: 360, delay: i * 50 } }"
      >
        <div class="iv-head">
          <div class="iv-time">
            <div class="iv-time-icon"><Clock :size="14" /></div>
            <div>
              <div class="time-main">{{ formatTime(iv.scheduled_at) }}</div>
              <div class="time-sub">{{ formatDate(iv.scheduled_at) }} · {{ iv.duration_minutes }}min</div>
            </div>
          </div>
          <span :class="['iv-status', `iv-status-${iv.status.toLowerCase()}`]">
            <span class="dot" /> {{ humanStatus(iv.status) }}
          </span>
        </div>
        <div class="iv-body">
          <div class="iv-cand">{{ iv.candidate_name }}</div>
          <div class="iv-pos">{{ iv.position_title || '—' }}</div>
        </div>
        <div class="iv-meta">
          <span class="iv-pill">{{ humanType(iv.interview_type) }}</span>
          <span class="iv-pill">{{ humanMode(iv.mode) }}</span>
          <span class="iv-pill">Round {{ iv.round.replace('R','') }}</span>
        </div>
        <!-- Join meeting only shown for upcoming/scheduled interviews -->
        <div v-if="iv.meeting_link && iv.status === 'SCHEDULED'" class="iv-link">
          <Link2 :size="13" />
          <a :href="iv.meeting_link" target="_blank" rel="noopener">Join meeting</a>
        </div>
        <div class="iv-actions">
          <button v-if="iv.status === 'SCHEDULED'" class="rec-btn-ghost" @click="openFeedback(iv)">
            <MessageSquare :size="13" /> Submit Feedback
          </button>
          <button v-else-if="iv.status === 'COMPLETED'" class="rec-btn-ghost" @click="openFeedback(iv)">
            <MessageSquare :size="13" /> View / Edit Feedback
          </button>
          <button class="rec-btn-danger" @click="cancelOne(iv)" v-if="iv.status === 'SCHEDULED'">
            <Ban :size="13" /> Cancel
          </button>
        </div>
      </article>
    </div>

    <ScheduleInterviewModal
      :open="scheduleModal.open"
      :applications="appList"
      :panels="panelList"
      :submitting="scheduleModal.submitting"
      @close="scheduleModal.open = false"
      @submit="onSchedule"
    />

    <InterviewFeedbackModal
      :open="feedbackModal.open"
      :interview="feedbackModal.interview"
      :initial="feedbackModal.initial"
      :submitting="feedbackModal.submitting"
      @close="feedbackModal.open = false"
      @submit="onFeedback"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import {
  CalendarPlus, CalendarClock, Clock, Link2, MessageSquare, Ban,
  Calendar, Check, Layers,
} from 'lucide-vue-next'

import ScheduleInterviewModal from '../modals/ScheduleInterviewModal.vue'
import InterviewFeedbackModal from '../modals/InterviewFeedbackModal.vue'
import RecEmptyState from '../components/RecEmptyState.vue'
import { useInterviews, useApplications, usePanels } from '../../../../composables/useRecruitment'
import { useToast } from '../../../../composables/useToast'

const emit = defineEmits(['refresh-counts'])
const { success, error } = useToast()

const { items, loading, setFilters, fetchList, create, cancel, submitFeedback, listFeedback } = useInterviews()

const applications = useApplications()
const panels = usePanels()
const appList = applications.items
const panelList = panels.items

const activeFilter = ref('upcoming')
const statusFilters = [
  { key: 'upcoming',  label: 'Upcoming',  icon: Calendar, apply: () => setFilters({ upcoming_only: true,  status: null }) },
  { key: 'scheduled', label: 'Scheduled', icon: Clock,    apply: () => setFilters({ upcoming_only: false, status: 'SCHEDULED' }) },
  { key: 'completed', label: 'Completed', icon: Check,    apply: () => setFilters({ upcoming_only: false, status: 'COMPLETED' }) },
  { key: 'all',       label: 'All',       icon: Layers,   apply: () => setFilters({ upcoming_only: false, status: null }) },
]
const applyFilter = async (f) => {
  activeFilter.value = f.key
  f.apply()
  await fetchList()
}

const scheduleModal = ref({ open: false, submitting: false })
const openSchedule = async () => {
  applications.setFilters({ limit: 100 })
  panels.fetchList()
  await applications.fetchList()
  scheduleModal.value = { open: true, submitting: false }
}
const onSchedule = async (payload) => {
  scheduleModal.value.submitting = true
  try {
    await create(payload)
    success('Interview scheduled')
    scheduleModal.value.open = false
    await fetchList()
    emit('refresh-counts')
  } catch (e) {
    error(e?.response?.data?.detail || 'Failed to schedule interview')
  } finally {
    scheduleModal.value.submitting = false
  }
}

const feedbackModal = ref({ open: false, submitting: false, interview: null, initial: null })
const openFeedback = async (iv) => {
  // Open immediately with blank state so the user sees the modal right away
  feedbackModal.value = { open: true, submitting: false, interview: iv, initial: null }
  // For completed (or rescheduled re-edits), pull existing feedback and pre-fill
  if (iv.status === 'COMPLETED' || iv.status === 'IN_PROGRESS') {
    try {
      const entries = await listFeedback(iv.id)
      if (Array.isArray(entries) && entries.length) {
        // Pick this user's entry if present, otherwise the most recent one
        const myEntry = entries[0] // backend dedupes by interviewer; first is typically the latest
        feedbackModal.value = { ...feedbackModal.value, initial: myEntry }
      }
    } catch (e) {
      // Soft-fail — modal still opens, just empty
    }
  }
}
const onFeedback = async (payload) => {
  feedbackModal.value.submitting = true
  try {
    await submitFeedback(feedbackModal.value.interview.id, payload)
    success('Feedback submitted')
    feedbackModal.value.open = false
    await fetchList()
  } catch (e) {
    error(e?.response?.data?.detail || 'Failed to submit feedback')
  } finally {
    feedbackModal.value.submitting = false
  }
}

const cancelOne = async (iv) => {
  if (!confirm('Cancel this interview?')) return
  try {
    await cancel(iv.id)
    success('Interview cancelled')
    await fetchList()
    emit('refresh-counts')
  } catch (e) {
    error(e?.response?.data?.detail || 'Cancel failed')
  }
}

const formatTime = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}
const formatDate = (iso) => {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}
const humanStatus = (s) => ({
  SCHEDULED: 'Scheduled', IN_PROGRESS: 'In progress', COMPLETED: 'Completed',
  CANCELLED: 'Cancelled', NO_SHOW: 'No show', RESCHEDULED: 'Rescheduled',
}[s] || s)
const humanType = (t) => ({
  HR: 'HR', TECHNICAL: 'Technical', MANAGERIAL: 'Managerial',
  CULTURAL: 'Cultural', FINAL: 'Final', CLIENT: 'Client',
}[t] || t)
const humanMode = (m) => ({ ONLINE: 'Online', OFFLINE: 'Offline', PHONE: 'Phone' }[m] || m)

onMounted(async () => {
  applyFilter(statusFilters[0])
})
</script>

<style scoped>
.rec-section { display: flex; flex-direction: column; gap: 14px; }

.iv-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 14px;
}
.iv-card {
  padding: 18px;
  display: flex; flex-direction: column; gap: 12px;
  transition: transform 240ms var(--hr-spring), box-shadow 240ms var(--hr-spring);
}
.iv-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 18px 36px -16px rgba(251, 146, 60, 0.32);
}

.iv-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 12px;
}
.iv-time { display: flex; align-items: flex-start; gap: 10px; color: var(--hr-text-secondary); }
.iv-time-icon {
  width: 32px; height: 32px;
  display: grid; place-items: center;
  border-radius: 10px;
  background: var(--hr-accent-gold-soft);
  border: 1px solid var(--hr-accent-gold-border);
  color: var(--hr-accent-gold);
}
.time-main {
  font-size: 18px;
  font-weight: 700;
  color: var(--hr-text);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.01em;
}
.time-sub {
  margin-top: 2px;
  font-size: 11px;
  color: var(--hr-text-muted);
}

.iv-status {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  border: 1px solid currentColor;
  white-space: nowrap;
}
.iv-status .dot {
  width: 5px; height: 5px;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 6px currentColor;
}
.iv-status-scheduled  { color: var(--hr-accent-gold); }
.iv-status-completed  { color: #34d399; }
.iv-status-cancelled  { color: #f87171; }
.iv-status-no_show    { color: var(--hr-orange); }
.iv-status-rescheduled{ color: var(--hr-amber); }
.iv-status-in_progress{ color: var(--hr-orange); }

.iv-body { padding: 2px 0; }
.iv-cand {
  font-size: 15px;
  font-weight: 700;
  color: var(--hr-text);
}
.iv-pos {
  font-size: 12px;
  color: var(--hr-text-muted);
  margin-top: 2px;
}

.iv-meta { display: flex; flex-wrap: wrap; gap: 6px; }
.iv-pill {
  padding: 2px 8px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  color: var(--hr-text-secondary);
  letter-spacing: 0.04em;
}

.iv-link {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px;
  color: var(--hr-accent-gold);
}
.iv-link a {
  color: var(--hr-accent-gold);
  text-decoration: none;
  transition: color 180ms var(--hr-spring);
}
.iv-link a:hover { color: var(--hr-orange); text-decoration: underline; }

.iv-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.iv-actions button { font-size: 12px; padding: 6px 12px; }

/* ═══════════ LIGHT THEME ═══════════ */
[data-theme="light"] .iv-status-scheduled  {
  color: #b45309;
  background: rgba(217, 119, 6, 0.14);
}
[data-theme="light"] .iv-status-completed  {
  color: #047857;
  background: rgba(16, 185, 129, 0.14);
}
[data-theme="light"] .iv-status-cancelled  {
  color: #b91c1c;
  background: rgba(220, 38, 38, 0.10);
}
[data-theme="light"] .iv-status-no_show    {
  color: #c2410c;
  background: rgba(251, 146, 60, 0.16);
}
[data-theme="light"] .iv-status-rescheduled {
  color: #b45309;
  background: rgba(251, 191, 36, 0.18);
}
[data-theme="light"] .iv-status-in_progress {
  color: #c2410c;
  background: rgba(251, 146, 60, 0.16);
}
[data-theme="light"] .iv-cand { color: #1a1410; }
[data-theme="light"] .iv-pos { color: #6b5840; }
[data-theme="light"] .iv-pill {
  background: rgba(255, 250, 240, 0.62);
  border-color: rgba(40, 25, 10, 0.14);
  color: #44362a;
}
[data-theme="light"] .iv-link,
[data-theme="light"] .iv-link a { color: #b45309; }
[data-theme="light"] .iv-link a:hover { color: #c2410c; }
</style>
