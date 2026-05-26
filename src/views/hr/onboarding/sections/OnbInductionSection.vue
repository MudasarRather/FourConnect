<template>
  <section class="onb-ind">
    <Motion as="header" class="onb-section-banner in-banner"
      :initial="{ opacity: 0, y: -10 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }"
    >
      <span class="onb-section-banner-glow" />
      <div class="onb-section-banner-text">
        <span class="onb-eyebrow"><span class="onb-eyebrow-dot" /> Welcome · orientation · policy · safety</span>
        <h2 class="onb-banner-title">
          <span class="id-title-word">Employee</span>
          <span class="banner-divider">·</span>
          <span class="id-title-word" style="animation-delay: 80ms">Induction</span>
        </h2>
        <p class="onb-banner-sub">Schedule welcome, orientation, policy, and safety sessions; invite new joiners and track attendance.</p>
      </div>
      <div class="onb-banner-aside">
        <div class="onb-banner-stat">
          <span class="onb-banner-stat-value">{{ sessions.filter(s => !isPast(s.scheduled_at)).length }}</span>
          <span class="onb-banner-stat-label">Upcoming</span>
        </div>
        <div class="onb-banner-stat">
          <span class="onb-banner-stat-value">{{ sessions.length }}</span>
          <span class="onb-banner-stat-label">Total</span>
        </div>
        <div class="in-banner-actions">
          <button class="onb-btn-ghost" @click="reload"><RefreshCw :size="13" />Refresh</button>
          <button class="onb-btn-primary" @click="openNew"><Plus :size="13" />New session</button>
        </div>
      </div>
    </Motion>

    <div class="in-sessions">
      <Motion v-for="(s, i) in sessions" :key="s.id" as="article" class="ses-card" :class="{ 'is-past': isPast(s.scheduled_at) }"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.42, delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] }"
        :whileHover="{ y: -3, transition: { duration: 0.2 } }"
      >
        <!-- delete sits bottom-right so it never overlaps the attendee count -->
        <button
          class="ses-del"
          type="button"
          title="Delete session"
          @click.stop="openRemoveSession(s)"
        >
          <Trash2 :size="13" />
        </button>
        <!-- date strip -->
        <aside class="ses-date">
          <div class="d-day">{{ formatDay(s.scheduled_at) }}</div>
          <div class="d-month">{{ formatMonth(s.scheduled_at) }}</div>
          <div class="d-time onb-mono">{{ formatTime(s.scheduled_at) }}</div>
        </aside>
        <!-- main -->
        <div class="ses-main">
          <div class="ses-top">
            <span class="ses-type" :data-type="s.session_type">{{ s.session_type.replace('_', ' ') }}</span>
            <span class="ses-meta-row"><Users :size="11" /> {{ s.confirmed_count || 0 }}/{{ s.attendee_count || 0 }}</span>
          </div>
          <div class="ses-name">{{ s.name }}</div>
          <div class="ses-meta">
            <Clock :size="10" /> {{ s.duration_minutes || 60 }}min
            <span v-if="s.location">· <MapPin :size="10" /> {{ s.location }}</span>
            <span v-if="s.host_name">· <User :size="10" /> {{ s.host_name }}</span>
          </div>
        </div>
      </Motion>
      <Motion v-if="!sessions.length" class="in-empty"
        :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }"
      >
        <div class="in-empty-iconwrap">
          <span class="in-ring in-ring-1" aria-hidden="true" />
          <span class="in-ring in-ring-2" aria-hidden="true" />
          <div class="in-empty-mark"><CalendarClock :size="26" /></div>
        </div>
        <h3 class="in-empty-title">No induction sessions yet</h3>
        <p class="in-empty-sub">Schedule a welcome, orientation, policy, or safety session, invite your new joiners, and attendance tracks itself.</p>
        <Motion as="button" type="button" class="onb-btn-primary in-empty-cta"
          :whileHover="{ y: -2, scale: 1.03 }" :whileTap="{ scale: 0.97 }"
          :transition="{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }"
          @click="openNew"
        >
          <Plus :size="14" /> Create first session
        </Motion>
      </Motion>
    </div>

    <!-- Delete session modal -->
    <OnbDeleteModal
      :open="!!pendingDelete"
      title="Delete induction session?"
      :subtitle="pendingDelete ? `Remove ${pendingDelete.name} from the induction schedule.` : ''"
      :target-label="pendingDelete?.name"
      :target-meta="pendingDelete ? `${pendingDelete.session_type.replace('_', ' ')} · ${pendingDelete.duration_minutes || 60} min` : ''"
      :target-tag="pendingDelete ? (isPast(pendingDelete.scheduled_at) ? 'PAST' : 'UPCOMING') : ''"
      :target-icon="Calendar"
      :presets="SESSION_PRESETS"
      warning="Cancelling will remove the session and clear any invitations sent to attendees."
      confirm-label="Delete session"
      submitting-label="Deleting…"
      :submitting="removingSession"
      @close="pendingDelete = null"
      @confirm="confirmRemoveSession"
    />

    <OnbModal :open="showNew" title="New induction session" subtitle="Schedule a welcome, orientation, or compliance session" :icon="Users" :width="640" @close="showNew = false">
      <div class="form-stack">
        <OnbField v-model="form.name" label="Name" placeholder="Welcome to Fourconnect" required full />
        <div class="form-grid-2">
          <OnbField v-model="form.session_type" type="select" label="Type" required
            :options="TYPES.map(t => ({ value: t, label: t.replace('_', ' ') }))" />

          <!-- Premium calendar (matches Add Employee) + dedicated time field -->
          <div class="in-field">
            <span class="in-field-label">Date <span class="in-field-req">*</span></span>
            <HrDatePicker v-model="form.scheduled_date" placeholder="dd / mm / yyyy" :min="todayIso" />
          </div>
          <div class="in-field">
            <span class="in-field-label">Start time <span class="in-field-req">*</span></span>
            <div class="in-time-wrap" :class="{ 'is-filled': !!form.scheduled_time }">
              <Clock :size="13" class="in-time-icon" />
              <input v-model="form.scheduled_time" type="time" class="in-time-input" required />
            </div>
          </div>

          <OnbField v-model.number="form.duration_minutes" type="number" label="Duration (min)" required />
          <OnbField v-model.number="form.capacity" type="number" label="Capacity" required />
        </div>
        <div class="form-grid-2">
          <OnbField v-model="form.location" label="Location" placeholder="HQ Atrium · Floor 2" required />
          <OnbField v-model="form.meeting_url" label="Meeting URL" placeholder="https://meet.google.com/..." required />
        </div>
        <OnbField v-model="form.materials_url" label="Materials URL" placeholder="https://docs.company.com/..." full required />
        <OnbField v-model="form.agenda" type="textarea" label="Agenda" placeholder="Detailed agenda for attendees..." full required />
      </div>
      <template #footer>
        <button class="onb-btn-ghost" @click="showNew = false">Cancel</button>
        <button class="onb-btn-primary" :disabled="!isSessionValid" @click="create"><Plus :size="13" />Create session</button>
      </template>
    </OnbModal>
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { RefreshCw, Plus, Users, Clock, MapPin, User, Trash2, Calendar, CalendarClock } from 'lucide-vue-next'
import OnbModal from '../components/OnbModal.vue'
import OnbDeleteModal from '../components/OnbDeleteModal.vue'
import OnbField from '../components/OnbField.vue'
import HrDatePicker from '../../../../components/hr/forms/HrDatePicker.vue'
import { fetchSessions, createSession, deleteSession } from '../composables/useOnbMisc'
import { useToast } from 'vue-toastification'

defineEmits(['refresh-stats'])

const toast = useToast()
const TYPES = ['WELCOME','DEPT_ORIENTATION','POLICY','COMPLIANCE','TEAM_INTRO','SAFETY','OTHER']

const sessions = ref([])
const showNew = ref(false)
const form = reactive({
  name: '', session_type: 'WELCOME',
  scheduled_date: '', scheduled_time: '',
  duration_minutes: 60, capacity: 50, location: '', meeting_url: '',
  materials_url: '', agenda: '',
})

const todayIso = new Date().toISOString().slice(0, 10)

const isSessionValid = computed(() => {
  const f = form
  return Boolean(
    f.name && f.session_type
    && f.scheduled_date && f.scheduled_time
    && f.duration_minutes != null && f.duration_minutes !== ''
    && f.capacity != null && f.capacity !== ''
    && f.location && f.meeting_url && f.materials_url && f.agenda
  )
})

const reload = async () => {
  try { sessions.value = await fetchSessions(false) }
  catch (e) { toast.error('Could not load sessions') }
}
onMounted(reload)

const openNew = () => {
  Object.assign(form, {
    name: '', session_type: 'WELCOME',
    scheduled_date: '', scheduled_time: '',
    duration_minutes: 60, capacity: 50,
    location: '', meeting_url: '', materials_url: '', agenda: '',
  })
  showNew.value = true
}

const create = async () => {
  try {
    const localDt = new Date(`${form.scheduled_date}T${form.scheduled_time}`)
    const payload = {
      name: form.name,
      session_type: form.session_type,
      scheduled_at: localDt.toISOString(),
      duration_minutes: form.duration_minutes,
      capacity: form.capacity,
      location: form.location,
      meeting_url: form.meeting_url,
      materials_url: form.materials_url,
      agenda: form.agenda,
    }
    await createSession(payload)
    showNew.value = false
    await reload()
    toast.success('Session created')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Create failed') }
}

// Delete-session modal flow
const SESSION_PRESETS = [
  'Session cancelled by host',
  'Rescheduled to a different date',
  'Duplicate session entry',
  'Low attendance — folding into another session',
]
const pendingDelete = ref(null)
const removingSession = ref(false)
const openRemoveSession = (s) => { pendingDelete.value = s }
const confirmRemoveSession = async (reason) => {
  if (!pendingDelete.value) return
  removingSession.value = true
  try {
    await deleteSession(pendingDelete.value.id)
    sessions.value = sessions.value.filter(x => x.id !== pendingDelete.value.id)
    pendingDelete.value = null
    toast.success(reason ? `Session deleted — ${reason.split('\n')[0]}` : 'Session deleted')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not delete session')
  } finally {
    removingSession.value = false
  }
}

const isPast = (iso) => new Date(iso) < new Date()
const formatDay = (iso) => String(new Date(iso).getDate()).padStart(2, '0')
const formatMonth = (iso) => new Date(iso).toLocaleString('en-IN', { month: 'short' }).toUpperCase()
const formatTime = (iso) => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
</script>

<style scoped>
@import '../../../../styles/onboarding-theme.css';

.onb-ind { display: flex; flex-direction: column; gap: 16px; }

.in-banner .banner-divider {
  display: inline-block; margin: 0 6px;
  color: var(--hr-text-dim); font-weight: 400;
  -webkit-text-fill-color: var(--hr-text-dim);
}
.in-banner-actions { display: flex; gap: 8px; align-self: flex-end; }

.in-sessions { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 14px; }

/* ── Ultra-modern empty state ── */
.in-empty {
  grid-column: 1 / -1;
  position: relative; overflow: hidden;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 12px; text-align: center;
  padding: 60px 28px 54px;
  border-radius: 24px;
  background:
    radial-gradient(120% 100% at 50% 0%, rgba(251, 191, 36, 0.10), transparent 62%),
    var(--onb-glass);
  border: 1px dashed rgba(251, 191, 36, 0.30);
  backdrop-filter: var(--onb-glass-blur);
  -webkit-backdrop-filter: var(--onb-glass-blur);
  box-shadow: var(--onb-glass-shadow);
}
/* slow diagonal sheen */
.in-empty::after {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(115deg, transparent 30%, rgba(251, 191, 36, 0.07) 50%, transparent 70%);
  background-size: 250% 100%;
  animation: in-sheen 7s ease-in-out infinite;
}
@keyframes in-sheen {
  0% { background-position: 160% 0; }
  55%, 100% { background-position: -160% 0; }
}

.in-empty-iconwrap {
  position: relative;
  width: 64px; height: 64px;
  display: inline-flex; align-items: center; justify-content: center;
  margin-bottom: 4px;
}
.in-empty-mark {
  position: relative; z-index: 2;
  width: 64px; height: 64px; border-radius: 20px;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--hr-accent-gold-soft); color: var(--hr-accent-gold);
  border: 1px solid var(--hr-border-warm);
  box-shadow: 0 18px 40px -22px rgba(251, 146, 60, 0.55);
  animation: in-mark-breathe 3.6s ease-in-out infinite;
}
@keyframes in-mark-breathe {
  0%, 100% { transform: translateY(0); box-shadow: 0 18px 40px -24px rgba(251, 146, 60, 0.5); }
  50% { transform: translateY(-5px); box-shadow: 0 28px 52px -20px rgba(251, 146, 60, 0.72); }
}
.in-ring {
  position: absolute; top: 50%; left: 50%;
  width: 64px; height: 64px; border-radius: 22px;
  border: 1.5px solid rgba(251, 191, 36, 0.5);
  transform: translate(-50%, -50%);
  animation: in-ring-pulse 3s ease-out infinite;
  pointer-events: none;
}
.in-ring-2 { animation-delay: 1.5s; }
@keyframes in-ring-pulse {
  0%   { opacity: 0.65; transform: translate(-50%, -50%) scale(1); }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(2); }
}

.in-empty-title {
  position: relative; z-index: 1;
  margin: 0; font-size: 17px; font-weight: 800; letter-spacing: -0.01em;
  color: var(--hr-text);
}
.in-empty-sub {
  position: relative; z-index: 1;
  margin: 0; max-width: 430px;
  font-size: 12.5px; line-height: 1.6; color: var(--hr-text-muted);
}
.in-empty-cta {
  position: relative; z-index: 1;
  margin-top: 10px; display: inline-flex; align-items: center; gap: 6px;
}

/* Light theme */
[data-theme="light"] .in-empty {
  background:
    radial-gradient(120% 100% at 50% 0%, rgba(217, 119, 6, 0.10), transparent 62%),
    rgba(255, 250, 240, 0.6);
  border-color: rgba(217, 119, 6, 0.32);
}
[data-theme="light"] .in-empty::after {
  background: linear-gradient(115deg, transparent 30%, rgba(217, 119, 6, 0.08) 50%, transparent 70%);
  background-size: 250% 100%;
}
[data-theme="light"] .in-ring { border-color: rgba(217, 119, 6, 0.42); }

@media (prefers-reduced-motion: reduce) {
  .in-empty::after, .in-empty-mark, .in-ring { animation: none; }
}

.ses-card {
  position: relative;
  display: grid; grid-template-columns: 80px 1fr; gap: 16px;
  background: var(--onb-glass);
  border: var(--onb-glass-stroke);
  border-radius: 20px;
  padding: 16px 18px;
  backdrop-filter: var(--onb-glass-blur);
  -webkit-backdrop-filter: var(--onb-glass-blur);
  box-shadow: var(--onb-glass-shadow);
  isolation: isolate;
  transition: border-color .25s var(--hr-spring), box-shadow .25s var(--hr-spring), transform .25s var(--hr-spring);
  overflow: hidden;
}
.ses-card::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(160deg, rgba(255,255,255,0.05), transparent 35%);
  pointer-events: none; z-index: -1;
}
.ses-card:hover { transform: translateY(-3px); border-color: var(--hr-accent-gold-border); box-shadow: var(--onb-glass-shadow-hi); }
.ses-card.is-past { opacity: 0.55; }

/* Custom date + time field row inside modal */
.in-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.in-field-label {
  font-size: 10px; font-weight: 700; letter-spacing: 0.6px;
  text-transform: uppercase; color: var(--hr-text-muted);
}
.in-field-req { color: var(--hr-accent-gold); }
.in-time-wrap {
  position: relative;
  display: flex; align-items: center; gap: 0;
  background: var(--hr-input-bg);
  border: 1px solid var(--hr-input-border);
  border-radius: 12px;
  padding: 0 14px;
  transition: border-color 200ms var(--hr-spring), background 200ms var(--hr-spring);
  overflow: hidden;
}
.in-time-wrap:focus-within {
  border-color: var(--hr-accent-gold-border);
  background: var(--hr-input-bg-focus);
  box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.06), 0 0 24px -8px rgba(251, 191, 36, 0.35);
}
.in-time-icon { color: var(--hr-text-muted); flex-shrink: 0; }
.in-time-wrap.is-filled .in-time-icon,
.in-time-wrap:focus-within .in-time-icon { color: var(--hr-accent-gold); }
.in-time-input {
  flex: 1; min-width: 0;
  background: transparent; border: 0; outline: none;
  color: var(--hr-text); font: inherit; font-size: 13px;
  padding: 11px 0 11px 12px;
  font-family: var(--hr-mono);
  color-scheme: dark;
}
.in-time-input::-webkit-calendar-picker-indicator {
  filter: invert(0.75) sepia(0.6) saturate(2) hue-rotate(355deg);
  opacity: 0.6; cursor: pointer;
}

.ses-date {
  background: var(--hr-gradient-hero);
  color: #1f1408;
  border-radius: 14px;
  padding: 10px 8px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  box-shadow: 0 10px 22px -10px rgba(251, 146, 60, 0.5), inset 0 1px 0 rgba(255,255,255,0.3);
}
.d-day { font-size: 22px; font-weight: 800; line-height: 1; }
.d-month { font-size: 9.5px; font-weight: 800; letter-spacing: 1.4px; margin-top: 4px; }
.d-time { font-size: 10.5px; font-weight: 700; opacity: 0.85; margin-top: 6px; }
.onb-mono { font-family: var(--hr-mono); }

.ses-main { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.ses-top { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.ses-type {
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.6px;
  padding: 3px 8px; border-radius: 6px;
  background: var(--hr-accent-gold-soft); color: var(--hr-accent-gold); border: 1px solid var(--hr-border-warm);
}
.ses-type[data-type="SAFETY"], .ses-type[data-type="COMPLIANCE"] { background: rgba(248, 113, 113, 0.16); color: #f87171; border-color: rgba(248, 113, 113, 0.32); }
.ses-type[data-type="POLICY"] { background: rgba(192, 132, 252, 0.16); color: #c084fc; border-color: rgba(192, 132, 252, 0.32); }
/* Light theme — deepen badge text + soften fills so they read on cream */
[data-theme="light"] .ses-type[data-type="SAFETY"],
[data-theme="light"] .ses-type[data-type="COMPLIANCE"] {
  background: rgba(220, 38, 38, 0.12);
  color: #b91c1c;
  border-color: rgba(220, 38, 38, 0.32);
}
[data-theme="light"] .ses-type[data-type="POLICY"] {
  background: rgba(147, 51, 234, 0.10);
  color: #6b21a8;
  border-color: rgba(147, 51, 234, 0.32);
}
/* Native time input — drop the dark-mode color-scheme + invert filter on cream */
[data-theme="light"] .in-time-input { color-scheme: light; }
[data-theme="light"] .in-time-input::-webkit-calendar-picker-indicator {
  filter: sepia(0.85) saturate(2) hue-rotate(355deg) brightness(0.85);
  opacity: 0.75;
}
.ses-meta-row { font-size: 10.5px; color: var(--hr-text-secondary); display: inline-flex; align-items: center; gap: 4px; }
.ses-name { font-size: 14.5px; font-weight: 700; color: var(--hr-text); }
.ses-meta { font-size: 11px; color: var(--hr-text-muted); display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.ses-meta > span { display: inline-flex; align-items: center; gap: 3px; }

.form-stack { display: flex; flex-direction: column; gap: 14px; }
.form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

/* Session delete affordance — bottom-right of the card so it never overlaps
   the attendee count badge sitting top-right of .ses-main. */
.ses-del {
  position: absolute;
  bottom: 10px; right: 10px;
  width: 28px; height: 28px;
  display: inline-flex; align-items: center; justify-content: center;
  background: rgba(248, 113, 113, 0.10);
  border: 1px solid rgba(248, 113, 113, 0.28);
  border-radius: 8px;
  color: #fca5a5;
  cursor: pointer;
  opacity: 0;
  z-index: 3;
  transition: opacity .18s var(--hr-spring),
              background .18s var(--hr-spring),
              border-color .18s var(--hr-spring),
              color .18s var(--hr-spring),
              transform .15s var(--hr-spring);
}
.ses-card:hover .ses-del { opacity: 0.95; }
.ses-del:hover {
  opacity: 1;
  background: rgba(248, 113, 113, 0.22);
  border-color: rgba(248, 113, 113, 0.60);
  color: #f87171;
  transform: rotate(-8deg) scale(1.08);
}
.ses-del:active { transform: scale(0.92); }

[data-theme="light"] .ses-del {
  background: rgba(220, 38, 38, 0.10);
  border-color: rgba(220, 38, 38, 0.30);
  color: #b91c1c;
}
[data-theme="light"] .ses-del:hover {
  background: rgba(220, 38, 38, 0.22);
  border-color: rgba(220, 38, 38, 0.55);
  color: #7f1d1d;
}
</style>
