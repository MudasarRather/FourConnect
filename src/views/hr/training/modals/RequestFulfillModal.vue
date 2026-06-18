<template>
  <TrnModal :open="open" title="Fulfil request"
    subtitle="Turn this approved request into a live enrolment." :icon="CheckCheck" @close="$emit('close')">
    <div class="rf-root">
    <span class="rf-aura" aria-hidden="true" />

    <div v-if="request" class="rf-stack">
      <!-- request summary -->
      <Motion as="div" class="rf-summary"
        :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.34, delay: 0.04 }">
        <div class="rf-sum-top">
          <span class="rf-num trn-mono">{{ request.request_number || '—' }}</span>
          <TrnStatusStamp :status="request.status" kind="request" />
        </div>
        <h3 class="rf-title">{{ request.title || 'Untitled request' }}</h3>
        <p class="rf-emp"><User :size="13" /> {{ request.employee_name || '—' }}
          <template v-if="request.employee_code"> · <span class="trn-mono">{{ request.employee_code }}</span></template>
        </p>
      </Motion>

      <!-- program: linked or pick -->
      <Motion as="div" class="rf-field"
        :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.34, delay: 0.1 }">
        <div v-if="!needsProgram" class="rf-linked">
          <span class="rf-linked-ic"><BookOpen :size="15" /></span>
          <div class="rf-linked-txt">
            <span class="rf-linked-lab">Linked program</span>
            <span class="rf-linked-name">{{ request.program_name || '—' }}</span>
          </div>
          <BadgeCheck :size="16" class="rf-linked-ok" />
        </div>
        <template v-else>
          <div class="rf-ext-note">
            <Building2 :size="13" />
            <span>Raised against external provider <b>{{ request.external_provider || '—' }}</b>. Attach a program so the employee lands in a tracked enrolment.</span>
          </div>
          <TrnSelect v-model="form.program_id" label="Program to enrol into" required searchable
            search-placeholder="Search programs…" :options="programOptions"
            :placeholder="loadingPrograms ? 'Loading programs…' : (programOptions.length ? 'Select a program…' : 'No programs available')" />
        </template>
      </Motion>

      <!-- schedule + notes -->
      <Motion as="div" class="rf-field"
        :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.34, delay: 0.16 }">
        <label class="rf-date">
          <span class="rf-date-lab">Due date</span>
          <HrDatePicker v-model="form.due_date" :min="todayIso" placeholder="Pick a due date" />
        </label>
        <TrnField v-model="form.notes" label="Notes" type="textarea" :rows="2"
          placeholder="Optional context attached to the enrolment…" />
      </Motion>

      <!-- enrolment preview -->
      <Motion as="div" class="rf-preview"
        :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.34, delay: 0.22 }">
        <span class="rf-preview-eyebrow"><Sparkles :size="12" /> Enrolment preview</span>
        <div class="rf-preview-flow">
          <span class="rf-pv-av" aria-hidden="true">{{ initials(request.employee_name) }}</span>
          <span class="rf-pv-arrow"><ArrowRight :size="16" /><span class="rf-pv-spark" /></span>
          <span class="rf-pv-prog"><GraduationCap :size="16" /></span>
        </div>
        <div class="rf-preview-lines">
          <span class="rf-pv-emp">{{ request.employee_name || 'Employee' }}</span>
          <span class="rf-pv-into">enrols into <b>{{ chosenProgramName || 'a program' }}</b></span>
        </div>
        <div class="rf-preview-meta">
          <span class="rf-pv-chip"><span class="rf-pv-dot" /> Not started</span>
          <span class="rf-pv-chip"><CalendarClock :size="11" /> {{ form.due_date ? `Due ${fmtDate(form.due_date)}` : 'No due date' }}</span>
        </div>
      </Motion>
    </div>
    </div>

    <template #footer>
      <button class="trn-btn trn-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" type="button" class="trn-btn rf-go"
        :whileHover="canSave && !saving ? { y: -2 } : {}" :whileTap="canSave && !saving ? { scale: 0.97 } : {}"
        :disabled="!canSave || saving" @click="save">
        <Loader v-if="saving" :size="15" class="spin" /><CheckCheck v-else :size="15" />
        Fulfil &amp; enrol
      </Motion>
    </template>
  </TrnModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  CheckCheck, User, BookOpen, Building2, BadgeCheck, Sparkles, ArrowRight,
  GraduationCap, CalendarClock, Loader,
} from 'lucide-vue-next'
import TrnModal from '../components/TrnModal.vue'
import TrnField from '../components/TrnField.vue'
import TrnSelect from '../components/TrnSelect.vue'
import TrnStatusStamp from '../components/TrnStatusStamp.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import { fulfillRequest, fetchTrainingPrograms, typeMeta } from '@/composables/useTraining'

const props = defineProps({
  open: { type: Boolean, default: false },
  request: { type: Object, default: null },
})
const emit = defineEmits(['close', 'saved'])
const toast = useToast()
const saving = ref(false)

const todayIso = new Date().toISOString().slice(0, 10)
const plus30 = () => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString().slice(0, 10) }

const blank = () => ({ program_id: '', due_date: plus30(), notes: '' })
const form = ref(blank())

const needsProgram = computed(() => !!props.request && !props.request.program_id)

const programs = ref([])
const loadingPrograms = ref(false)
const loadPrograms = async () => {
  loadingPrograms.value = true
  try { programs.value = await fetchTrainingPrograms({ limit: 200 }) || [] }
  catch { programs.value = [] }
  finally { loadingPrograms.value = false }
}
const programOptions = computed(() => (programs.value || []).map(p => ({
  value: p.id, label: p.name, dot: `var(${typeMeta(p.training_type).cssVar})`, hint: p.code || '',
})))
const chosenProgramName = computed(() => {
  if (!needsProgram.value) return props.request?.program_name
  return programOptions.value.find(o => o.value === form.value.program_id)?.label || null
})

const canSave = computed(() => !needsProgram.value || !!form.value.program_id)

watch(() => props.open, (o) => {
  if (o) {
    form.value = blank()
    if (needsProgram.value && !programs.value.length) loadPrograms()
  }
})

const initials = (name) => name ? name.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase() : '—'
const fmtDate = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const save = async () => {
  if (!props.request || !canSave.value) return
  saving.value = true
  try {
    const payload = { due_date: form.value.due_date || null, notes: form.value.notes || null }
    if (needsProgram.value && form.value.program_id) payload.program_id = form.value.program_id
    await fulfillRequest(props.request.id, payload)
    toast.success('Request fulfilled — employee enrolled')
    emit('saved')
    emit('close')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not fulfil request')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.rf-root { position: relative; }
.rf-aura { position: absolute; top: -10px; left: 0; right: 0; height: 170px; z-index: 0; pointer-events: none; filter: blur(40px); opacity: 0.5;
  background: radial-gradient(50% 100% at 50% 0%, color-mix(in srgb, var(--trn-st-completed) 38%, transparent), transparent 70%); }
.rf-stack { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 16px; }

.rf-summary { padding: 13px 15px; border-radius: 15px; background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.rf-sum-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.rf-num { font-size: 12px; font-weight: 700; color: var(--trn-amber-strong); }
.rf-title { margin: 9px 0 0; font-size: 15.5px; font-weight: 750; color: var(--trn-text); line-height: 1.3; }
.rf-emp { margin: 8px 0 0; display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; color: var(--trn-text-secondary); }

.rf-field { display: flex; flex-direction: column; gap: 12px; }
.rf-linked { display: flex; align-items: center; gap: 11px; padding: 12px 14px; border-radius: 13px;
  background: var(--trn-st-completed-soft); border: 1px solid color-mix(in srgb, var(--trn-st-completed) 30%, transparent); }
.rf-linked-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
  color: var(--trn-st-completed); background: color-mix(in srgb, var(--trn-st-completed) 14%, transparent); }
.rf-linked-txt { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
.rf-linked-lab { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--trn-text-muted); }
.rf-linked-name { font-size: 14px; font-weight: 700; color: var(--trn-text); }
.rf-linked-ok { color: var(--trn-st-completed); flex-shrink: 0; }

.rf-ext-note { display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; border-radius: 11px; font-size: 12px; line-height: 1.5;
  color: var(--trn-text-secondary); background: var(--trn-st-waived-soft); border: 1px solid color-mix(in srgb, var(--trn-st-waived) 28%, transparent); }
.rf-ext-note :deep(svg) { color: var(--trn-st-waived); flex-shrink: 0; margin-top: 1px; }
.rf-ext-note b { color: var(--trn-text); }

.rf-date { display: flex; flex-direction: column; gap: 6px; }
.rf-date-lab { font-size: 12px; font-weight: 600; color: var(--trn-text-secondary); }

.rf-preview { position: relative; padding: 15px; border-radius: 15px; overflow: hidden;
  background: var(--trn-grad-hero), var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.rf-preview-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--trn-mono); font-size: 10px; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--trn-amber-strong); }
.rf-preview-eyebrow :deep(svg) { color: var(--trn-amber); }
.rf-preview-flow { display: flex; align-items: center; justify-content: center; gap: 14px; margin: 14px 0 12px; }
.rf-pv-av { display: inline-flex; align-items: center; justify-content: center; width: 42px; height: 42px; border-radius: 12px;
  font-family: var(--trn-mono); font-size: 14px; font-weight: 700; color: var(--trn-amber);
  background: color-mix(in srgb, var(--trn-amber) 14%, transparent); border: 1px solid color-mix(in srgb, var(--trn-amber) 26%, transparent); }
.rf-pv-arrow { position: relative; display: grid; place-items: center; color: var(--trn-text-dim); }
.rf-pv-spark { position: absolute; left: -4px; width: 5px; height: 5px; border-radius: 50%; background: var(--trn-st-completed);
  box-shadow: 0 0 8px 1px var(--trn-st-completed); animation: rf-travel 2.2s var(--trn-ease) infinite; }
.rf-pv-prog { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; color: var(--trn-st-completed);
  background: color-mix(in srgb, var(--trn-st-completed) 14%, transparent); border: 1px solid color-mix(in srgb, var(--trn-st-completed) 28%, transparent); }
.rf-preview-lines { text-align: center; display: flex; flex-direction: column; gap: 2px; }
.rf-pv-emp { font-size: 14px; font-weight: 750; color: var(--trn-text); }
.rf-pv-into { font-size: 12.5px; color: var(--trn-text-muted); }
.rf-pv-into b { color: var(--trn-text-secondary); }
.rf-preview-meta { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 12px; }
.rf-pv-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 600; padding: 4px 10px; border-radius: 999px;
  color: var(--trn-text-secondary); background: var(--trn-surface-elevated); border: 1px solid var(--trn-border-soft); }
.rf-pv-chip :deep(svg) { color: var(--trn-text-dim); }
.rf-pv-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--trn-st-not-started); }

.rf-go { background: linear-gradient(120deg, var(--trn-st-completed), color-mix(in srgb, var(--trn-st-completed) 70%, #000)); color: #04261a; border: none;
  box-shadow: 0 8px 22px -10px color-mix(in srgb, var(--trn-st-completed) 70%, transparent); }
[data-theme="light"] .rf-go { color: #fff; }
.rf-go:disabled { opacity: 0.5; cursor: not-allowed; }

.spin { animation: trn-orbit-spin 0.9s linear infinite; }
@keyframes rf-travel { 0% { left: -4px; opacity: 0; } 20% { opacity: 1; } 80% { opacity: 1; } 100% { left: calc(100% + 4px); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .spin, .rf-pv-spark { animation: none; } }
</style>
