<template>
  <TrnModal :open="open" wide
    :title="cert ? 'Edit certification' : 'Award certification'"
    subtitle="A credential held by an employee — tracked for expiry &amp; renewal." :icon="Award" @close="$emit('close')">

    <div class="cf-layout">
      <!-- ── form ── -->
      <div class="cf-form">
        <!-- holder & credential -->
        <Motion as="section" class="cf-group"
          :initial="reduced ? false : { opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.45, delay: 0.04, ease: [0.16, 1, 0.3, 1] }">
          <h4 class="cf-gtitle"><UserSquare :size="13" /> Holder &amp; credential</h4>

          <div class="cf-fields">
            <!-- employee: locked chip on edit, searchable picker on award -->
            <div v-if="cert" class="cf-chip">
              <span class="cf-chip-av">{{ empInitials }}</span>
              <span class="cf-chip-body">
                <span class="cf-chip-name">{{ cert.employee_name || '—' }}</span>
                <span class="cf-chip-meta">{{ cert.employee_code || 'Employee' }} · holder is locked after award</span>
              </span>
              <Lock :size="14" class="cf-chip-lock" />
            </div>
            <TrnSelect v-else v-model="form.employee_id" label="Employee" required searchable
              search-placeholder="Search employees…" :options="employeeOptions"
              :placeholder="employeesLoading ? 'Loading employees…' : (employeeOptions.length ? 'Select an employee…' : 'No employees found')" />

            <TrnSelect v-model="form.certification_id" label="From catalog" searchable
              search-placeholder="Search catalog…" :options="catalogOptions"
              placeholder="— pick a known credential (optional) —" />

            <div class="cf-row2">
              <TrnField v-model="form.name" label="Certification name" required placeholder="e.g. AWS Solutions Architect" />
              <TrnField v-model="form.issuing_authority" label="Issuing authority" placeholder="e.g. Amazon Web Services" />
            </div>
            <TrnField v-model="form.certificate_number" label="Certificate number" placeholder="optional — e.g. AWS-SAA-2026-00481" />
          </div>
        </Motion>

        <!-- validity -->
        <Motion as="section" class="cf-group"
          :initial="reduced ? false : { opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.45, delay: 0.11, ease: [0.16, 1, 0.3, 1] }">
          <h4 class="cf-gtitle"><CalendarClock :size="13" /> Validity window</h4>
          <div class="cf-row2">
            <label class="cf-date">
              <span class="cf-date-lab">Issue date</span>
              <HrDatePicker v-model="form.issue_date" :max="todayIso" placeholder="dd / mm / yyyy" />
            </label>
            <label class="cf-date">
              <span class="cf-date-lab">Expiry date</span>
              <HrDatePicker v-model="form.expiry_date" :min="form.issue_date || ''" :error="dateError"
                placeholder="dd / mm / yyyy" />
            </label>
          </div>
          <Presence>
            <Motion v-if="dateError" as="p" class="cf-warn"
              :initial="{ opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0 }"
              :transition="{ duration: 0.25 }">
              <AlertTriangle :size="13" /> Expiry can’t be before the issue date.
            </Motion>
            <Motion v-else-if="autoFilledHint" as="p" class="cf-hint-auto"
              :initial="{ opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0 }"
              :transition="{ duration: 0.25 }">
              <Sparkles :size="12" /> Expiry auto-set from the catalog’s {{ validityMonths }}-month validity — adjust if needed.
            </Motion>
          </Presence>
          <p v-if="!form.expiry_date && !dateError" class="cf-hint">Leave expiry blank for a credential that never expires.</p>
        </Motion>

        <!-- renewal & evidence -->
        <Motion as="section" class="cf-group"
          :initial="reduced ? false : { opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.45, delay: 0.18, ease: [0.16, 1, 0.3, 1] }">
          <h4 class="cf-gtitle"><RefreshCw :size="13" /> Renewal &amp; evidence</h4>
          <TrnSelect v-model="form.renewal_training_program_id" label="Renewal training program" searchable
            search-placeholder="Search programs…" :options="programOptions" placeholder="— none —" />
          <p class="cf-hint">On renewal, the holder is auto-enrolled into this program (visible in Employee Trainings).</p>
          <TrnField v-model="form.certificate_url" label="Certificate URL" placeholder="https://…" />
          <TrnField v-model="form.notes" label="Notes" type="textarea" :rows="2" placeholder="Context, verification reference…" />
        </Motion>
      </div>

      <!-- ── live preview ── -->
      <aside class="cf-aside">
        <span class="cf-aside-eyebrow"><Sparkles :size="12" /> Credential preview</span>
        <CertCredentialCard :cert="previewCert" preview />
        <p class="cf-foot-hint"><ShieldCheck :size="11" /> Status &amp; expiry countdown update live as you fill the form.</p>
      </aside>
    </div>

    <template #footer>
      <button class="trn-btn trn-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" v-magnetic class="trn-btn trn-btn-primary" :disabled="!canSave || saving"
        :whileHover="!canSave || saving ? {} : { y: -2 }" :whileTap="{ scale: 0.97 }" @click="save">
        <Loader v-if="saving" :size="14" class="spin" /><Award v-else :size="15" />
        {{ cert ? 'Save changes' : 'Award certification' }}
      </Motion>
    </template>
  </TrnModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import axios from 'axios'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import { Award, Loader, UserSquare, CalendarClock, RefreshCw, Lock, AlertTriangle, Sparkles, ShieldCheck } from 'lucide-vue-next'
import { API, authHeader } from '@/utils/api'
import TrnModal from '../components/TrnModal.vue'
import TrnField from '../components/TrnField.vue'
import TrnSelect from '../components/TrnSelect.vue'
import CertCredentialCard from '../components/CertCredentialCard.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import {
  createEmployeeCertification, patchEmployeeCertification,
  fetchCertifications, fetchTrainingPrograms,
} from '@/composables/useTraining'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  open: { type: Boolean, default: false },
  cert: { type: Object, default: null },
})
const emit = defineEmits(['close', 'saved'])
const toast = useToast()
const reduced = prefersReduced()
const saving = ref(false)

const todayIso = new Date().toISOString().slice(0, 10)

// ── reference data ──
const employees = ref([])
const employeesLoading = ref(false)
const catalog = ref([])
const programs = ref([])

const employeeOptions = computed(() => (employees.value || []).map(e => ({
  value: e.id, label: e.full_name || e.name || e.employee_id || 'Unnamed',
  hint: e.employee_id || e.employee_code || '',
})))
const catalogOptions = computed(() => [
  { value: '', label: '— none / custom credential —' },
  ...(catalog.value || []).map(c => ({
    value: c.id, label: c.name, hint: c.validity_months ? `${c.validity_months} mo validity` : (c.issuing_authority || ''),
  })),
])
const programOptions = computed(() => [
  { value: '', label: '— none —' },
  ...(programs.value || []).map(p => ({ value: p.id, label: p.name })),
])

const blank = () => ({
  employee_id: '', certification_id: '', name: '', issuing_authority: '',
  certificate_number: '', issue_date: '', expiry_date: '',
  renewal_training_program_id: '', certificate_url: '', notes: '',
})
const form = ref(blank())
const expiryAuto = ref('')        // last value we auto-filled, so manual edits win

const empInitials = computed(() => {
  const n = props.cert?.employee_name || ''
  return (n.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('') || '?').toUpperCase()
})

const selectedCatalog = computed(() => (catalog.value || []).find(c => String(c.id) === String(form.value.certification_id)) || null)
const validityMonths = computed(() => selectedCatalog.value?.validity_months || 0)
const autoFilledHint = computed(() => !!validityMonths.value && !!form.value.expiry_date && form.value.expiry_date === expiryAuto.value)

const dateError = computed(() =>
  !!form.value.issue_date && !!form.value.expiry_date && form.value.expiry_date < form.value.issue_date)

const canSave = computed(() =>
  !!form.value.name && (props.cert || !!form.value.employee_id) && !dateError.value)

// ── live preview cert ──
const selectedEmp = computed(() => (employees.value || []).find(e => String(e.id) === String(form.value.employee_id)) || null)
const previewDays = computed(() => {
  if (!form.value.expiry_date) return null
  return Math.round((new Date(form.value.expiry_date) - new Date(todayIso)) / 86400000)
})
const previewStatus = computed(() => {
  if (props.cert?.status && props.cert.status !== 'ACTIVE') return props.cert.status
  const d = previewDays.value
  if (d === null) return 'ACTIVE'
  if (d < 0) return 'EXPIRED'
  if (d <= 30) return 'EXPIRING_SOON'
  return 'ACTIVE'
})
const previewCert = computed(() => ({
  employee_name: props.cert ? props.cert.employee_name : (selectedEmp.value?.full_name || selectedEmp.value?.name || ''),
  employee_code: props.cert ? props.cert.employee_code : (selectedEmp.value?.employee_id || selectedEmp.value?.employee_code || ''),
  name: form.value.name,
  issuing_authority: form.value.issuing_authority,
  certificate_number: form.value.certificate_number,
  status: previewStatus.value,
  issue_date: form.value.issue_date,
  expiry_date: form.value.expiry_date,
  days_to_expiry: previewDays.value,
}))

// ── catalog prefill: name + authority + auto-expiry from validity ──
const addMonths = (iso, months) => {
  const [y, m, d] = iso.split('-').map(Number)
  const base = new Date(y, (m - 1) + months, d)
  const yy = base.getFullYear()
  const mm = String(base.getMonth() + 1).padStart(2, '0')
  const dd = String(base.getDate()).padStart(2, '0')
  return `${yy}-${mm}-${dd}`
}
const recomputeAutoExpiry = () => {
  if (!validityMonths.value || !form.value.issue_date) return
  // only auto-fill when expiry is empty or still holding the previous auto value
  if (form.value.expiry_date && form.value.expiry_date !== expiryAuto.value) return
  const next = addMonths(form.value.issue_date, validityMonths.value)
  form.value.expiry_date = next
  expiryAuto.value = next
}
watch(() => form.value.certification_id, (id) => {
  const hit = selectedCatalog.value
  if (hit) {
    if (!form.value.name) form.value.name = hit.name || ''
    if (!form.value.issuing_authority) form.value.issuing_authority = hit.issuing_authority || ''
  }
  recomputeAutoExpiry()
})
watch(() => form.value.issue_date, () => recomputeAutoExpiry())

// ── loaders ──
// Page employees at limit=100 — the API caps `limit` at 100 (le=100); the old
// limit=200 request 422'd and left the picker empty.
const loadEmployees = async () => {
  if (employees.value.length) return
  employeesLoading.value = true
  try {
    const all = []
    let page = 1, total = Infinity
    while (all.length < total && page <= 60) {
      const { data } = await axios.get(`${API}/hr/employees/`, {
        headers: authHeader(), params: { page, limit: 100, sort_by: 'created_at', sort_dir: 'desc' },
      })
      const items = data.items || []
      all.push(...items)
      total = data.total ?? all.length
      if (!items.length) break
      page++
    }
    employees.value = all
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load employees')
  } finally {
    employeesLoading.value = false
  }
}

const loadRefs = async () => {
  try {
    const tasks = [
      fetchCertifications().catch(() => []),
      fetchTrainingPrograms().catch(() => []),
    ]
    if (!props.cert) tasks.push(loadEmployees())
    const [cats, progs] = await Promise.all(tasks)
    catalog.value = Array.isArray(cats) ? cats : []
    programs.value = Array.isArray(progs) ? progs : []
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load form data')
  }
}

watch(() => props.open, (o) => {
  if (!o) return
  expiryAuto.value = ''
  form.value = props.cert
    ? {
        employee_id: props.cert.employee_id || '',
        certification_id: props.cert.certification_id || '',
        name: props.cert.name || '',
        issuing_authority: props.cert.issuing_authority || '',
        certificate_number: props.cert.certificate_number || '',
        issue_date: (props.cert.issue_date || '').slice(0, 10),
        expiry_date: (props.cert.expiry_date || '').slice(0, 10),
        renewal_training_program_id: props.cert.renewal_training_program_id || '',
        certificate_url: props.cert.certificate_url || '',
        notes: props.cert.notes || '',
      }
    : blank()
  loadRefs()
})

const save = async () => {
  if (!canSave.value || saving.value) return
  saving.value = true
  try {
    const payload = { ...form.value }
    for (const k of ['certification_id', 'issuing_authority', 'certificate_number',
      'issue_date', 'expiry_date', 'renewal_training_program_id', 'certificate_url', 'notes']) {
      if (!payload[k]) delete payload[k]
    }
    if (props.cert) {
      delete payload.employee_id            // immutable on patch
      await patchEmployeeCertification(props.cert.id, payload)
    } else {
      await createEmployeeCertification(payload)
    }
    toast.success(props.cert ? 'Certification updated' : 'Certification awarded')
    emit('saved')
    emit('close')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not save certification')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.cf-layout { display: grid; grid-template-columns: 1.4fr 1fr; gap: 24px; }
.cf-form { display: flex; flex-direction: column; gap: 20px; min-width: 0; }
.cf-group { display: flex; flex-direction: column; gap: 12px; }
.cf-gtitle { display: flex; align-items: center; gap: 7px; margin: 0; font-size: 11px; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase; color: var(--trn-amber-strong); }
.cf-fields { display: flex; flex-direction: column; gap: 13px; }
.cf-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
.spin { animation: trn-orbit-spin 0.9s linear infinite; }

/* locked employee chip */
.cf-chip { display: flex; align-items: center; gap: 11px; padding: 10px 12px; border-radius: 13px;
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.cf-chip-av { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0;
  font-family: var(--trn-mono); font-size: 13px; font-weight: 700; color: #1a1206; background: var(--trn-grad-rail);
  box-shadow: 0 3px 10px -4px rgba(251,146,60,0.5); }
.cf-chip-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.cf-chip-name { font-size: 13.5px; font-weight: 700; color: var(--trn-text); }
.cf-chip-meta { font-size: 10.5px; color: var(--trn-text-muted); }
.cf-chip-lock { color: var(--trn-text-dim); flex-shrink: 0; }

/* date pickers */
.cf-date { display: flex; flex-direction: column; gap: 6px; }
.cf-date-lab { font-size: 12px; font-weight: 600; color: var(--trn-text-secondary); }

.cf-hint { margin: 0; font-size: 11px; color: var(--trn-text-dim); line-height: 1.5; }
.cf-warn { display: flex; align-items: center; gap: 7px; margin: 0; font-size: 11.5px; font-weight: 600; color: var(--trn-st-failed); }
.cf-warn :deep(svg) { flex-shrink: 0; }
.cf-hint-auto { display: flex; align-items: center; gap: 7px; margin: 0; font-size: 11.5px; color: var(--trn-amber-strong); }
.cf-hint-auto :deep(svg) { flex-shrink: 0; }

/* preview aside */
.cf-aside { display: flex; flex-direction: column; gap: 11px; align-self: start; position: sticky; top: 0; }
.cf-aside-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--trn-mono); font-size: 10px;
  letter-spacing: 0.12em; text-transform: uppercase; color: var(--trn-text-dim); }
.cf-foot-hint { display: flex; align-items: center; gap: 6px; margin: 0; font-size: 11px; line-height: 1.4; color: var(--trn-text-dim); }
.cf-foot-hint :deep(svg) { flex-shrink: 0; }

@media (max-width: 720px) {
  .cf-layout { grid-template-columns: 1fr; }
  .cf-aside { position: static; order: -1; }
  .cf-row2 { grid-template-columns: 1fr; }
}
</style>
