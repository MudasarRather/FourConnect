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
      <div v-if="!sessions.length" class="in-empty">
        <div class="empty-mark"><Users :size="22" /></div>
        <p>No induction sessions yet. Create one to start.</p>
      </div>
    </div>

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
import { RefreshCw, Plus, Users, Clock, MapPin, User } from 'lucide-vue-next'
import OnbModal from '../components/OnbModal.vue'
import OnbField from '../components/OnbField.vue'
import HrDatePicker from '../../../../components/hr/forms/HrDatePicker.vue'
import { fetchSessions, createSession } from '../composables/useOnbMisc'
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

.in-empty { grid-column: 1 / -1; }

.in-sessions { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 14px; }

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
</style>
