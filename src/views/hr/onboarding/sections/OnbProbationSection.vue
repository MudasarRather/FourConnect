<template>
  <section class="onb-prob">
    <Motion as="header" class="onb-section-banner pr-banner"
      :initial="{ opacity: 0, y: -10 }"
      :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }"
    >
      <span class="onb-section-banner-glow" />
      <div class="onb-section-banner-text">
        <span class="onb-eyebrow"><span class="onb-eyebrow-dot" /> Confirmation windows · review gates</span>
        <h2 class="onb-banner-title">
          <span class="id-title-word">Probation</span>
          <span class="banner-divider">·</span>
          <span class="id-title-word" style="animation-delay: 80ms">Setup</span>
        </h2>
        <p class="onb-banner-sub">Track every joiner's probation window. Gauges turn amber at 30 days remaining and red at 7 — promote, extend, or release before they cross the gate.</p>
      </div>
      <div class="onb-banner-aside">
        <div class="onb-banner-stat">
          <span class="onb-banner-stat-value">{{ items.length }}</span>
          <span class="onb-banner-stat-label">On probation</span>
        </div>
        <div class="onb-banner-stat">
          <span class="onb-banner-stat-value">{{ items.filter(e => state(e) === 'REVIEW_DUE').length }}</span>
          <span class="onb-banner-stat-label">Due ≤ 7d</span>
        </div>
        <div class="pr-banner-actions">
          <button class="onb-btn-ghost" @click="reload"><RefreshCw :size="13" />Refresh</button>
          <button class="onb-btn-primary" @click="openPlace"><Gauge :size="13" />Place on Probation</button>
        </div>
      </div>
    </Motion>

    <div v-if="!items.length" class="onb-empty-card">
      <div class="onb-empty-mark"><Gauge :size="22" /></div>
      <p>No probationary employees right now. Click <strong>Place on Probation</strong> above to start a probation window for any ACTIVE employee.</p>
    </div>

    <div v-else class="pr-grid">
      <Motion v-for="(e, i) in items" :key="e.id" as="article" class="pr-card"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.45, delay: 0.05 * i, ease: [0.22, 1, 0.36, 1] }"
        :whileHover="{ y: -3, transition: { duration: 0.2 } }"
      >
        <div class="pr-card-top">
          <div class="pr-id">
            <span class="pr-avatar">{{ initials(e.name) }}</span>
            <div>
              <div class="pr-name">{{ e.name }}</div>
              <div class="pr-code onb-mono">{{ e.employee_id }}</div>
            </div>
          </div>
          <span class="pr-pill" :data-state="state(e)">{{ state(e).replace('_', ' ') }}</span>
        </div>

        <div class="pr-body">
          <OnbProgressRing
            :value="elapsedPct(e)" :total="100"
            :label="`${daysRemaining(e)}d`"
            :sub-label="'remaining'"
            :color="ringColor(e)" :size="110" :stroke="8"
          />
          <ul class="pr-info">
            <li><span class="pr-info-label">Joining</span><span class="pr-info-value onb-mono">{{ formatDate(e.joining_date) || '—' }}</span></li>
            <li><span class="pr-info-label">Confirmation</span><span class="pr-info-value onb-mono">{{ formatDate(e.confirmation_date) || '—' }}</span></li>
            <li>
              <span class="pr-info-label">Status</span>
              <span class="pr-info-value">
                {{ daysRemaining(e) > 0 ? `Ends in ${daysRemaining(e)} days` : 'Review due' }}
              </span>
            </li>
          </ul>
        </div>

        <footer class="pr-foot">
          <span class="pr-elapsed">{{ elapsedPct(e) }}% complete</span>
        </footer>
      </Motion>
    </div>

    <!-- Place-on-Probation modal -->
    <OnbModal :open="placeOpen" title="Place on Probation"
      subtitle="Move an ACTIVE employee onto a probation window"
      :icon="Gauge" :width="520" @close="placeOpen = false">
      <div class="form-stack">
        <OnbField
          v-model="placeForm.employee_id"
          label="Employee"
          type="select"
          :options="activeEmployees.map(e => ({ value: e.id, label: `${e.full_name} · ${e.employee_id}` }))"
          full required
        />
        <div class="form-grid-2">
          <OnbField
            v-model.number="placeForm.probation_months"
            type="number" :min="1" :max="24"
            label="Probation length (months)" required
          />
          <div class="onb-field">
            <span class="onb-field-label">Start date</span>
            <HrDatePicker v-model="placeForm.effective_date" placeholder="Defaults to today" />
          </div>
        </div>
        <div class="onb-field is-full">
          <span class="onb-field-label">Review / Confirmation date <span class="onb-field-hint-inline">(optional — auto-calculated)</span></span>
          <HrDatePicker v-model="placeForm.confirmation_date" placeholder="dd / mm / yyyy" />
        </div>
        <OnbField v-model="placeForm.reason" type="textarea" label="Reason / Notes" placeholder="e.g. Performance review window, role transition…" full />
      </div>
      <template #footer>
        <button class="onb-btn-ghost" @click="placeOpen = false">Cancel</button>
        <button class="onb-btn-primary" :disabled="!placeForm.employee_id || submitting" @click="submitPlace">
          <Gauge :size="13" /> {{ submitting ? 'Placing…' : 'Place on Probation' }}
        </button>
      </template>
    </OnbModal>
  </section>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Motion } from 'motion-v'
import axios from 'axios'
import { API } from '@/utils/api'
import { RefreshCw, Gauge } from 'lucide-vue-next'
import OnbProgressRing from '../components/OnbProgressRing.vue'
import OnbModal from '../components/OnbModal.vue'
import OnbField from '../components/OnbField.vue'
import HrDatePicker from '../../../../components/hr/forms/HrDatePicker.vue'
import { fetchReport } from '../composables/useOnbMisc'
import { useToast } from 'vue-toastification'

defineEmits(['refresh-stats'])

const toast = useToast()

// Place-on-Probation modal state
const placeOpen = ref(false)
const submitting = ref(false)
const activeEmployees = ref([])
const placeForm = reactive({
  employee_id: '',
  probation_months: 6,
  effective_date: '',
  confirmation_date: '',
  reason: '',
})

const authHeader = () => {
  const t = localStorage.getItem('admin_token') || localStorage.getItem('user_token')
  return t ? { Authorization: `Bearer ${t}` } : {}
}

const loadActiveEmployees = async () => {
  try {
    const { data } = await axios.get(`${API}/hr/employees/`, {
      params: { lifecycle_state: 'ACTIVE', limit: 100 },
      headers: authHeader(),
    })
    activeEmployees.value = data.items || data || []
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not load employees') }
}

const openPlace = async () => {
  Object.assign(placeForm, { employee_id: '', probation_months: 6, effective_date: '', confirmation_date: '', reason: '' })
  placeOpen.value = true
  await loadActiveEmployees()
}

const submitPlace = async () => {
  if (!placeForm.employee_id) return
  submitting.value = true
  try {
    const body = {
      probation_months: placeForm.probation_months || 6,
    }
    if (placeForm.effective_date) body.effective_date = placeForm.effective_date
    if (placeForm.confirmation_date) body.confirmation_date = placeForm.confirmation_date
    if (placeForm.reason) body.reason = placeForm.reason
    await axios.post(
      `${API}/hr/employees/${placeForm.employee_id}/lifecycle/put-on-probation`,
      body,
      { headers: authHeader() }
    )
    toast.success('Placed on probation')
    placeOpen.value = false
    await reload()
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to place on probation')
  } finally {
    submitting.value = false
  }
}
const items = ref([])

const reload = async () => {
  try {
    const r = await fetchReport('probation')
    items.value = r.items || []
  } catch (e) { toast.error('Could not load probation list') }
}
onMounted(reload)

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : ''
const initials = (name) => (name || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'

const daysRemaining = (e) => {
  if (!e.confirmation_date) return 0
  const today = new Date()
  const conf = new Date(e.confirmation_date)
  return Math.max(0, Math.round((conf - today) / (24 * 3600 * 1000)))
}
const totalDays = (e) => {
  if (!e.joining_date || !e.confirmation_date) return 180
  const a = new Date(e.joining_date)
  const b = new Date(e.confirmation_date)
  return Math.max(1, Math.round((b - a) / (24 * 3600 * 1000)))
}
const elapsedPct = (e) => {
  const total = totalDays(e)
  const remaining = daysRemaining(e)
  return Math.max(0, Math.min(100, Math.round(((total - remaining) / total) * 100)))
}
const state = (e) => {
  const r = daysRemaining(e)
  if (r <= 7) return 'REVIEW_DUE'
  if (r <= 30) return 'NEAR_REVIEW'
  return 'ACTIVE'
}
const ringColor = (e) => {
  const r = daysRemaining(e)
  if (r <= 7) return '#f87171'
  if (r <= 30) return '#fb923c'
  return '#fbbf24'
}
</script>

<style scoped>
@import '../../../../styles/onboarding-theme.css';

.onb-prob { display: flex; flex-direction: column; gap: 16px; }

.pr-banner .banner-divider {
  display: inline-block; margin: 0 6px;
  color: var(--hr-text-dim); font-weight: 400;
  -webkit-text-fill-color: var(--hr-text-dim);
}
.pr-banner-actions { display: flex; gap: 8px; align-self: flex-end; }

.form-stack { display: flex; flex-direction: column; gap: 14px; }
.form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.onb-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.onb-field.is-full { grid-column: 1 / -1; }
.onb-field-label {
  font-size: 10px; font-weight: 700; letter-spacing: 0.6px;
  text-transform: uppercase; color: var(--hr-text-muted);
}
.onb-field-hint-inline {
  font-size: 9.5px; font-weight: 500;
  color: var(--hr-text-dim); letter-spacing: 0.2px;
  text-transform: none; margin-left: 6px;
}

.pr-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 14px; }
.pr-card {
  position: relative;
  background: var(--onb-glass);
  border: var(--onb-glass-stroke);
  border-radius: 20px;
  padding: 18px;
  display: flex; flex-direction: column; gap: 16px;
  backdrop-filter: var(--onb-glass-blur);
  -webkit-backdrop-filter: var(--onb-glass-blur);
  box-shadow: var(--onb-glass-shadow);
  isolation: isolate;
  transition: border-color .25s var(--hr-spring), box-shadow .25s var(--hr-spring), transform .25s var(--hr-spring);
}
.pr-card::before {
  content: ''; position: absolute; inset: 0;
  background: linear-gradient(160deg, rgba(255,255,255,0.05), transparent 35%);
  pointer-events: none; z-index: -1;
}
.pr-card:hover { transform: translateY(-3px); border-color: var(--hr-accent-gold-border); box-shadow: var(--onb-glass-shadow-hi); }

.pr-card-top { display: flex; align-items: center; justify-content: space-between; }
.pr-id { display: flex; align-items: center; gap: 12px; }
.pr-avatar { width: 36px; height: 36px; border-radius: 11px; background: var(--hr-gradient-hero); color: #1f1408; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; font-size: 13px; }
.pr-name { font-size: 14px; font-weight: 700; color: var(--hr-text); }
.pr-code { font-size: 10.5px; color: var(--hr-text-muted); margin-top: 2px; }
.onb-mono { font-family: var(--hr-mono); }
.pr-pill {
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.5px;
  padding: 3px 8px; border-radius: 999px;
  background: var(--hr-accent-gold-soft); color: var(--hr-accent-gold); border: 1px solid var(--hr-border-warm);
}
.pr-pill[data-state="REVIEW_DUE"]  { background: rgba(248, 113, 113, 0.18); color: #f87171; border-color: rgba(248, 113, 113, 0.32); }
.pr-pill[data-state="NEAR_REVIEW"] { background: rgba(251, 146, 60, 0.18); color: #fb923c; border-color: rgba(251, 146, 60, 0.32); }

.pr-body { display: flex; align-items: center; gap: 16px; }
.pr-info { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; flex: 1; }
.pr-info li { display: flex; flex-direction: column; gap: 1px; }
.pr-info-label { font-size: 9.5px; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; color: var(--hr-text-muted); }
.pr-info-value { font-size: 12.5px; color: var(--hr-text); }

.pr-foot { padding-top: 12px; border-top: 1px solid rgba(255, 255, 255, 0.06); }
.pr-elapsed { font-size: 11px; color: var(--hr-text-muted); }
</style>
