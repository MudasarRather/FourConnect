<template>
  <div class="rec-section rec-fade-up">
    <div class="rec-toolbar-surface is-row">
      <div class="toolbar-left">
        <div v-for="f in statusFilters" :key="f.key"
          :class="['rec-filter-pill', filters.status === f.value && 'is-active']"
          @click="setStatus(f.value)">
          <component :is="f.icon" :size="13" />
          <span>{{ f.label }}</span>
        </div>
      </div>
      <div class="toolbar-right">
        <button class="rec-btn-primary" @click="openCreate">
          <Plus :size="15" /> New Offer
        </button>
      </div>
    </div>

    <div v-if="loading" class="offer-grid">
      <div v-for="i in 4" :key="i" class="rec-skel" style="height: 200px; border-radius: 16px" />
    </div>
    <RecEmptyState
      v-else-if="!items.length"
      :icon="Mail"
      title="No offers yet"
      body="Generate offers for selected candidates from the pipeline."
      cta-label="Create Offer"
      :cta-icon="Plus"
      @cta="openCreate"
    />
    <div v-else class="offer-grid">
      <article
        v-for="(o, i) in items"
        :key="o.id"
        v-tilt
        class="offer-card rec-card rec-card-glow"
        v-motion
        :initial="{ opacity: 0, y: 12 }"
        :visible="{ opacity: 1, y: 0, transition: { duration: 320, delay: i * 50 } }"
      >
        <div class="offer-head">
          <div>
            <div class="offer-code rec-mono">{{ o.offer_code }}</div>
            <h3>{{ o.candidate_name }}</h3>
            <div class="dim">{{ o.position_title || o.designation }}</div>
          </div>
          <span :class="['offer-status', `offer-status-${o.status.toLowerCase()}`]">
            <span class="dot" /> {{ humanStatus(o.status) }}
          </span>
        </div>

        <div class="offer-stats">
          <div class="stat">
            <span class="label">Salary</span>
            <span class="value rec-mono">{{ formatMoney(o.offered_salary, o.currency) }}</span>
          </div>
          <div class="stat" v-if="o.joining_date">
            <span class="label">Joining</span>
            <span class="value">{{ formatDate(o.joining_date) }}</span>
          </div>
          <div class="stat" v-if="o.offer_valid_till">
            <span class="label">Valid Till</span>
            <span class="value">{{ formatDate(o.offer_valid_till) }}</span>
          </div>
        </div>

        <div class="offer-actions">
          <button v-if="o.status === 'DRAFT' || o.status === 'PENDING_APPROVAL'"
                  class="rec-btn-primary" @click="approveOne(o)">
            <Check :size="13" /> Approve
          </button>
          <button v-if="o.status === 'APPROVED'"
                  class="rec-btn-primary" @click="releaseOne(o)">
            <Send :size="13" /> Release
          </button>
          <button v-if="o.status === 'RELEASED'"
                  class="rec-btn-ghost" @click="respondOne(o, true)">
            <ThumbsUp :size="13" /> Accepted
          </button>
          <button v-if="o.status === 'RELEASED'"
                  class="rec-btn-danger" @click="respondOne(o, false)">
            <ThumbsDown :size="13" /> Rejected
          </button>
        </div>
      </article>
    </div>

    <!-- Create Offer Modal -->
    <RecModal :open="modal.open" title="Create Offer" :icon="Mail" :width="620"
              subtitle="Generate an offer for a selected candidate"
              @close="closeModal">
      <div class="form-grid">
        <div class="field-block full">
          <HrFieldLabel label="Selected Candidate" required :error="!!modal.errors.application_id" />
          <HrSelect v-model="modal.form.application_id"
                    :options="applicationOptions"
                    placeholder="Pick a candidate selected after interview…" searchable />
          <div v-if="modal.errors.application_id" class="field-error">{{ modal.errors.application_id }}</div>
          <p v-if="!applicationOptions.length" class="hint-muted">
            <Info :size="12" />
            No candidates ready yet. Submit interview feedback with a <strong>Hire</strong> or <strong>Strong Hire</strong>
            recommendation — the candidate will move to <strong>Selected</strong> and appear here.
          </p>
        </div>

        <!-- Context card for the chosen application -->
        <div v-if="pickedApplication" class="picked-card full">
          <div class="picked-avatar">{{ initials(pickedApplication.candidate_name) }}</div>
          <div class="picked-body">
            <div class="picked-name">{{ pickedApplication.candidate_name }}</div>
            <div class="picked-meta">
              <span><Briefcase :size="11" /> {{ pickedApplication.position_title || '—' }}</span>
              <span v-if="pickedApplication.position_code">· {{ pickedApplication.position_code }}</span>
              <span v-if="pickedApplication.department_name">· {{ pickedApplication.department_name }}</span>
            </div>
            <div class="picked-meta">
              <span class="rec-mono">{{ pickedApplication.application_code }}</span>
              <span class="picked-stage">· {{ humanStageLabel(pickedApplication.current_stage) }}</span>
            </div>
          </div>
        </div>

        <div class="field-block">
          <HrFieldLabel label="Designation" />
          <HrInput v-model="modal.form.designation"
                   :placeholder="pickedApplication?.position_title || 'e.g. Senior Engineer'" />
        </div>
        <div class="field-block">
          <HrFieldLabel label="Offered Salary" required :error="!!modal.errors.offered_salary" />
          <HrNumberInput v-model="modal.form.offered_salary" :step-by="10000" :min="1"
                         :error="!!modal.errors.offered_salary" :error-text="modal.errors.offered_salary" />
        </div>
        <div class="field-block">
          <HrFieldLabel label="Bonus" :error="!!modal.errors.bonus" />
          <HrNumberInput v-model="modal.form.bonus" :step-by="5000" :min="0"
                         :error="!!modal.errors.bonus" :error-text="modal.errors.bonus" />
        </div>
        <div class="field-block">
          <HrFieldLabel label="Currency" />
          <HrInput v-model="modal.form.currency" mono placeholder="INR" :maxlength="3" />
        </div>
        <div class="field-block">
          <HrFieldLabel label="Joining Date" />
          <HrDatePicker v-model="modal.form.joining_date" />
        </div>
        <div class="field-block">
          <HrFieldLabel label="Offer Valid Till" :error="!!modal.errors.offer_valid_till" />
          <HrDatePicker v-model="modal.form.offer_valid_till" />
          <div v-if="modal.errors.offer_valid_till" class="field-error">{{ modal.errors.offer_valid_till }}</div>
        </div>
        <div class="field-block full">
          <HrFieldLabel label="Notes" />
          <HrTextarea v-model="modal.form.notes" :rows="2" placeholder="Internal notes (optional)…" />
        </div>
      </div>
      <template #footer>
        <button class="ghost" @click="closeModal">Cancel</button>
        <div class="grow" />
        <button class="primary" :disabled="modal.submitting" @click="onSubmit">
          <Plus :size="14" /> Create
        </button>
      </template>
    </RecModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  Plus, Mail, Check, Send, ThumbsUp, ThumbsDown, Edit, CheckCircle,
  Hourglass, Layers, Info, Briefcase,
} from 'lucide-vue-next'

import RecModal from '../components/RecModal.vue'
import RecEmptyState from '../components/RecEmptyState.vue'
import HrFieldLabel from '../../../../components/hr/forms/HrFieldLabel.vue'
import HrInput from '../../../../components/hr/forms/HrInput.vue'
import HrSelect from '../../../../components/hr/forms/HrSelect.vue'
import HrTextarea from '../../../../components/hr/forms/HrTextarea.vue'
import HrDatePicker from '../../../../components/hr/forms/HrDatePicker.vue'
import HrNumberInput from '../../../../components/hr/forms/HrNumberInput.vue'

import { useOffers, useApplications } from '../../../../composables/useRecruitment'
import { useToast } from '../../../../composables/useToast'

const emit = defineEmits(['refresh-counts'])
const { success, error } = useToast()

const {
  items, total, loading, filters, setFilters, fetchList, create, approve, release, respond,
} = useOffers()
const applications = useApplications()

const applicationOptions = computed(() =>
  (applications.items.value || []).map(a => ({
    value: a.id,
    label: `${a.candidate_name} · ${a.position_title} (${a.application_code})`,
  }))
)

// Surface the picked application's metadata in a context card
const pickedApplication = computed(() => {
  const id = modal.value.form.application_id
  if (!id) return null
  return (applications.items.value || []).find(a => a.id === id) || null
})

const initials = (name) => {
  const p = (name || '').trim().split(/\s+/).filter(Boolean)
  if (!p.length) return '?'
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase()
  return (p[0][0] + p[p.length - 1][0]).toUpperCase()
}

const humanStageLabel = (s) => ({
  APPLIED: 'Applied', SCREENING: 'Screening', SHORTLISTED: 'Shortlisted',
  INTERVIEW: 'Interview', SELECTED: 'Selected', OFFER: 'Offer',
  JOINED: 'Joined', REJECTED: 'Rejected', WITHDRAWN: 'Withdrawn',
}[s] || s)

const statusFilters = [
  { key: 'all',      label: 'All',       value: null,               icon: Layers },
  { key: 'draft',    label: 'Draft',     value: 'DRAFT',            icon: Edit },
  { key: 'pending',  label: 'Pending',   value: 'PENDING_APPROVAL', icon: Hourglass },
  { key: 'approved', label: 'Approved',  value: 'APPROVED',         icon: CheckCircle },
  { key: 'released', label: 'Released',  value: 'RELEASED',         icon: Send },
  { key: 'accepted', label: 'Accepted',  value: 'ACCEPTED',         icon: ThumbsUp },
  { key: 'rejected', label: 'Rejected',  value: 'REJECTED',         icon: ThumbsDown },
]
const setStatus = async (v) => { setFilters({ status: v }); await fetchList() }

const modal = ref({ open: false, submitting: false, form: {}, errors: {} })
const openCreate = async () => {
  applications.setFilters({ stage: 'SELECTED', limit: 100 })
  await applications.fetchList()
  modal.value = {
    open: true,
    submitting: false,
    form: {
      application_id: null, designation: '', offered_salary: null, bonus: 0,
      currency: 'INR', joining_date: null, offer_valid_till: null, notes: '',
    },
    errors: {},
  }
}
const closeModal = () => { modal.value = { open: false, submitting: false, form: {}, errors: {} } }

const validateOffer = () => {
  const errs = {}
  const f = modal.value.form
  if (!f.application_id) errs.application_id = 'Application is required'
  if (f.offered_salary == null || Number(f.offered_salary) <= 0) {
    errs.offered_salary = 'Salary must be greater than 0'
  }
  if (f.bonus != null && Number(f.bonus) < 0) {
    errs.bonus = 'Bonus cannot be negative'
  }
  if (f.joining_date && f.offer_valid_till) {
    if (new Date(f.offer_valid_till) < new Date(f.joining_date)) {
      errs.offer_valid_till = 'Validity must be on/after joining date'
    }
  }
  modal.value.errors = errs
  return Object.keys(errs).length === 0
}

const onSubmit = async () => {
  if (!validateOffer()) {
    error('Some fields need attention')
    return
  }
  modal.value.submitting = true
  try {
    const payload = { ...modal.value.form }
    for (const [k, v] of Object.entries(payload)) {
      if (v === '' || v === null || v === undefined) delete payload[k]
    }
    await create(payload)
    success('Offer created (Draft)')
    closeModal()
    await fetchList(); emit('refresh-counts')
  } catch (e) {
    error(e?.response?.data?.detail || 'Create failed')
  } finally {
    modal.value.submitting = false
  }
}

const approveOne = async (o) => {
  try { await approve(o.id); success('Offer approved'); await fetchList() }
  catch (e) { error(e?.response?.data?.detail || 'Approve failed') }
}
const releaseOne = async (o) => {
  try { await release(o.id); success('Offer released to candidate'); await fetchList(); emit('refresh-counts') }
  catch (e) { error(e?.response?.data?.detail || 'Release failed') }
}
const respondOne = async (o, accept) => {
  const note = prompt(accept ? 'Acceptance note (optional):' : 'Rejection reason (optional):') || null
  try {
    await respond(o.id, accept, note)
    success(accept ? 'Offer marked accepted' : 'Offer marked rejected')
    await fetchList(); emit('refresh-counts')
  } catch (e) { error(e?.response?.data?.detail || 'Response failed') }
}

const humanStatus = (s) => ({
  DRAFT: 'Draft', PENDING_APPROVAL: 'Pending', APPROVED: 'Approved',
  RELEASED: 'Released', ACCEPTED: 'Accepted', REJECTED: 'Rejected',
  EXPIRED: 'Expired', WITHDRAWN: 'Withdrawn',
}[s] || s)
const formatMoney = (v, c) => v == null ? '—' : `${c || 'INR'} ${Number(v).toLocaleString()}`
const formatDate = (d) => d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'

onMounted(fetchList)
</script>

<style scoped>
.rec-section { display: flex; flex-direction: column; gap: 14px; }

.offer-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 14px;
}
.offer-card {
  padding: 18px;
  display: flex; flex-direction: column; gap: 14px;
  transition: transform 220ms var(--hr-spring);
}
.offer-card:hover { transform: translateY(-3px); }

.offer-head {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 12px;
}
.offer-code { font-size: 11px; color: var(--hr-accent-gold); letter-spacing: 0.04em; }
.offer-head h3 { margin: 4px 0 2px; font-size: 16px; font-weight: 700; color: var(--hr-text); }
.dim { font-size: 12px; color: var(--hr-text-muted); }

.offer-status {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.05em; text-transform: uppercase;
  border: 1px solid currentColor;
}
.offer-status .dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 5px currentColor;
}
.offer-status-draft           { color: #9ca3af; }
.offer-status-pending_approval{ color: #fbbf24; }
.offer-status-approved        { color: var(--hr-accent-gold); }
.offer-status-released        { color: var(--hr-orange); }
.offer-status-accepted        { color: #34d399; }
.offer-status-rejected        { color: #f87171; }
.offer-status-expired         { color: #6b7280; }
.offer-status-withdrawn       { color: #6b7280; }

.offer-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 8px;
  padding: 10px 0;
  border-top: 1px solid rgba(255,255,255,0.04);
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.stat { display: flex; flex-direction: column; gap: 2px; }
.stat .label {
  font-size: 10px; font-weight: 600;
  letter-spacing: 0.06em; text-transform: uppercase;
  color: var(--hr-text-muted);
}
.stat .value { font-size: 14px; font-weight: 700; color: var(--hr-text); }

.offer-actions { display: flex; gap: 6px; flex-wrap: wrap; }
.offer-actions button { font-size: 12px; padding: 6px 12px; }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field-block { display: flex; flex-direction: column; gap: 4px; }
.field-block.full { grid-column: span 2; }
.field-error {
  font-size: 11px;
  color: var(--hr-input-error, #f87171);
  margin-top: 2px;
  font-weight: 500;
}

.hint-muted {
  display: flex; align-items: center; gap: 6px;
  margin: 6px 0 0;
  padding: 8px 10px;
  background: rgba(251, 191, 36, 0.05);
  border: 1px solid var(--hr-accent-gold-border);
  border-radius: 8px;
  font-size: 11px;
  color: var(--hr-text-secondary);
  line-height: 1.5;
}
.hint-muted svg { color: var(--hr-accent-gold); flex-shrink: 0; }

.picked-card {
  grid-column: span 2;
  display: flex; align-items: center; gap: 12px;
  padding: 12px 14px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.06), rgba(251, 146, 60, 0.03));
  border: 1px solid var(--hr-accent-gold-border);
  border-radius: 12px;
}
.picked-avatar {
  display: grid; place-items: center;
  width: 40px; height: 40px;
  border-radius: 10px;
  background: linear-gradient(135deg, #fbbf24, #fb923c);
  color: #1a1a1c;
  font-weight: 800;
  font-size: 13px;
  box-shadow: 0 4px 12px -4px rgba(251, 146, 60, 0.4);
}
.picked-body { display: flex; flex-direction: column; gap: 3px; min-width: 0; flex: 1; }
.picked-name {
  font-size: 14px;
  font-weight: 700;
  color: var(--hr-text);
  letter-spacing: -0.01em;
}
.picked-meta {
  display: flex; flex-wrap: wrap; gap: 6px;
  font-size: 11.5px;
  color: var(--hr-text-muted);
  align-items: center;
}
.picked-meta span { display: inline-flex; align-items: center; gap: 4px; }
.picked-stage {
  color: var(--hr-accent-gold);
  font-weight: 600;
}

.ghost, .primary {
  display: inline-flex; align-items: center; gap: 6px;
  height: 36px; padding: 0 16px;
  border-radius: 10px;
  font-size: 12.5px; font-weight: 700;
  cursor: pointer;
  border: 1px solid var(--hr-border-strong);
  transition: all 0.22s var(--hr-spring);
}
.ghost { background: transparent; color: var(--hr-text-secondary); }
.ghost:hover { background: rgba(255,255,255,0.04); color: var(--hr-text); }
.primary {
  background: var(--hr-gradient-rail-active);
  border-color: var(--hr-accent-gold);
  color: #1a1a1c;
  box-shadow: 0 6px 18px -6px rgba(251, 146, 60, 0.5);
}
.primary:hover:not(:disabled) {
  box-shadow: 0 10px 24px -6px rgba(251, 146, 60, 0.7), 0 0 30px rgba(251, 191, 36, 0.35);
}
.primary:disabled { opacity: 0.5; cursor: not-allowed; }
.grow { flex: 1; }
</style>
