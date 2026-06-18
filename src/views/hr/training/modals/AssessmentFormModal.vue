<template>
  <TrnModal :open="open" wide :title="assessment ? 'Edit assessment' : 'New assessment'"
    subtitle="A graded checkpoint — a passing score auto-completes the linked enrolment and mints its certificate." :icon="ClipboardCheck"
    @close="$emit('close')">
    <div class="af-layout">
      <!-- form -->
      <div class="af-form">
        <Motion as="section" class="af-group"
          :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.42, delay: 0.05, ease: [0.16, 1, 0.3, 1] }">
          <h4 class="af-gt"><BookOpen :size="13" /> What it grades</h4>
          <div v-if="assessment" class="af-locked">
            <span class="af-locked-lab">Program</span>
            <div class="af-locked-val"><BookOpen :size="14" /> {{ lockedProgramName }}</div>
          </div>
          <TrnSelect v-else v-model="form.program_id" label="Program" required searchable
            search-placeholder="Search programs…" :options="programOptions" placeholder="Select a program…" />
          <TrnField v-model="form.title" label="Title" required placeholder="e.g. Final knowledge check" />
        </Motion>

        <Motion as="section" class="af-group"
          :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.42, delay: 0.12, ease: [0.16, 1, 0.3, 1] }">
          <h4 class="af-gt"><Shapes :size="13" /> Format</h4>
          <div class="af-types">
            <button v-for="t in TYPES" :key="t.value" type="button" class="af-type" :class="[`t-${t.key}`, { on: form.assessment_type === t.value }]"
              @click="form.assessment_type = t.value">
              <component :is="t.icon" :size="16" />
              <span>{{ t.label }}</span>
            </button>
          </div>
        </Motion>

        <Motion as="section" class="af-group"
          :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.42, delay: 0.19, ease: [0.16, 1, 0.3, 1] }">
          <h4 class="af-gt"><Gauge :size="13" /> Scoring</h4>
          <!-- live score band -->
          <div class="af-band">
            <div class="af-band-head">
              <span>Fail zone</span>
              <span class="af-band-pass trn-mono">pass at {{ form.pass_score ?? 0 }}</span>
              <span>Pass zone</span>
            </div>
            <div class="af-band-track">
              <span class="af-band-fail" :style="{ width: passPct + '%' }" />
              <span class="af-band-mark" :style="{ left: passPct + '%' }"><i /></span>
            </div>
            <div class="af-band-scale"><span>0</span><span class="trn-mono">{{ form.max_score ?? 0 }}</span></div>
          </div>
          <Presence>
            <Motion v-if="scoreError" as="p" class="af-err"
              :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :exit="{ opacity: 0, height: 0 }">
              <AlertTriangle :size="13" /> {{ scoreError }}
            </Motion>
          </Presence>
          <div class="af-row2">
            <TrnField v-model="form.pass_score" label="Pass score" type="number" placeholder="e.g. 40" />
            <TrnField v-model="form.max_score" label="Max score" type="number" placeholder="e.g. 100" />
          </div>
          <div class="af-row2">
            <TrnField v-model="form.max_attempts" label="Max attempts" type="number" placeholder="∞ unlimited" hint="Blank = unlimited" />
            <TrnField v-model="form.duration_minutes" label="Duration (min)" type="number" placeholder="optional" />
          </div>
        </Motion>
      </div>

      <!-- live preview -->
      <aside class="af-aside">
        <span class="af-aside-eyebrow"><Sparkles :size="12" /> Live preview</span>
        <Motion as="div" class="af-preview" :class="`t-${activeType.key}`" :animate="{ scale: ready ? 1 : 0.98 }">
          <span class="af-pv-glow" aria-hidden="true" />
          <div class="af-pv-head">
            <span class="af-pv-type"><component :is="activeType.icon" :size="12" /> {{ activeType.label }}</span>
            <span class="af-pv-active"><span /> Active</span>
          </div>
          <h3 class="af-pv-title">{{ form.title || 'Untitled assessment' }}</h3>
          <span class="af-pv-prog"><BookOpen :size="12" /> {{ previewProgram }}</span>
          <div class="af-pv-body">
            <div class="af-pv-ring">
              <svg viewBox="0 0 70 70" aria-hidden="true">
                <circle cx="35" cy="35" r="30" fill="none" stroke-width="6" class="af-pv-ring-t" />
                <circle cx="35" cy="35" r="30" fill="none" stroke-width="6" stroke-linecap="round" class="af-pv-ring-f"
                  :stroke-dasharray="PVCIRC" :stroke-dashoffset="PVCIRC" transform="rotate(-90 35 35)" />
              </svg>
              <span class="af-pv-ring-c">0%<small>pass</small></span>
            </div>
            <div class="af-pv-scale">
              <div class="af-pv-scale-track">
                <span class="af-pv-scale-fail" :style="{ width: passPct + '%' }" />
                <span class="af-pv-scale-mark" :style="{ left: passPct + '%' }" />
              </div>
              <div class="af-pv-meta">
                <span class="trn-mono">pass {{ form.pass_score ?? 0 }}/{{ form.max_score ?? 0 }}</span>
                <span>{{ form.max_attempts ?? '∞' }} attempts{{ form.duration_minutes ? ` · ${form.duration_minutes}m` : '' }}</span>
              </div>
            </div>
          </div>
        </Motion>
        <p class="af-hint"><Info :size="12" /> A passing result drives the linked enrolment to <b>completed</b> through the same path that mints certificates.</p>
      </aside>
    </div>

    <template #footer>
      <button class="trn-btn trn-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" type="button" class="trn-btn trn-btn-primary" :disabled="!canSave || saving"
        :whileHover="canSave && !saving ? { y: -2 } : {}" :whileTap="canSave && !saving ? { scale: 0.97 } : {}" @click="save">
        <Loader v-if="saving" :size="14" class="spin" /><component v-else :is="assessment ? Save : Plus" :size="15" />
        {{ assessment ? 'Save changes' : 'Create assessment' }}
      </Motion>
    </template>
  </TrnModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  ClipboardCheck, Loader, BookOpen, Shapes, Gauge, Sparkles, Info, AlertTriangle, Plus, Save,
  ListChecks, ScrollText, Wrench, MessagesSquare,
} from 'lucide-vue-next'
import TrnModal from '../components/TrnModal.vue'
import TrnField from '../components/TrnField.vue'
import TrnSelect from '../components/TrnSelect.vue'
import { createAssessment, patchAssessment } from '@/composables/useTraining'

const props = defineProps({
  open: { type: Boolean, default: false },
  assessment: { type: Object, default: null },
  programs: { type: Array, default: () => [] },
})
const emit = defineEmits(['close', 'saved'])
const toast = useToast()
const saving = ref(false)
const ready = ref(false)

const TYPES = [
  { value: 'QUIZ', label: 'Quiz', icon: ListChecks, key: 'quiz' },
  { value: 'EXAM', label: 'Exam', icon: ScrollText, key: 'exam' },
  { value: 'PRACTICAL', label: 'Practical', icon: Wrench, key: 'practical' },
  { value: 'SURVEY', label: 'Survey', icon: MessagesSquare, key: 'survey' },
]

const programOptions = computed(() => (props.programs || []).map(p => ({ value: p.id, label: p.name, hint: p.code || '' })))
const lockedProgramName = computed(() => {
  if (!props.assessment) return ''
  if (props.assessment.program_name) return props.assessment.program_name
  return (props.programs || []).find(p => p.id === props.assessment.program_id)?.name || '—'
})

const blank = () => ({ program_id: '', title: '', assessment_type: 'QUIZ', pass_score: 40, max_score: 100, max_attempts: null, duration_minutes: null })
const form = ref(blank())

const activeType = computed(() => TYPES.find(t => t.value === form.value.assessment_type) || TYPES[0])
const previewProgram = computed(() => {
  if (props.assessment) return lockedProgramName.value
  return programOptions.value.find(o => o.value === form.value.program_id)?.label || 'Select a program'
})

const passPct = computed(() => {
  const max = Number(form.value.max_score) || 0
  const pass = Number(form.value.pass_score) || 0
  if (!max) return 0
  return Math.max(0, Math.min(100, (pass / max) * 100))
})
const scoreError = computed(() => {
  const pass = Number(form.value.pass_score), max = Number(form.value.max_score)
  if (Number.isFinite(max) && max <= 0) return 'Max score must be greater than 0.'
  if (Number.isFinite(pass) && Number.isFinite(max) && pass > max) return 'Pass score can’t exceed the max score.'
  if (Number.isFinite(pass) && pass < 0) return 'Pass score can’t be negative.'
  return ''
})
const canSave = computed(() => {
  if (!form.value.title) return false
  if (!props.assessment && !form.value.program_id) return false
  if (scoreError.value) return false
  return true
})

const PVCIRC = 2 * Math.PI * 30

watch(() => props.open, (o) => {
  if (!o) return
  ready.value = false
  if (props.assessment) {
    const a = props.assessment
    form.value = {
      program_id: a.program_id || '', title: a.title || '', assessment_type: a.assessment_type || 'QUIZ',
      pass_score: a.pass_score != null ? Number(a.pass_score) : 40,
      max_score: a.max_score != null ? Number(a.max_score) : 100,
      max_attempts: a.max_attempts ?? null, duration_minutes: a.duration_minutes ?? null,
    }
  } else {
    form.value = blank()
  }
  requestAnimationFrame(() => { ready.value = true })
})

const save = async () => {
  if (!canSave.value) return
  saving.value = true
  try {
    const payload = {
      title: form.value.title, assessment_type: form.value.assessment_type,
      pass_score: form.value.pass_score, max_score: form.value.max_score,
      max_attempts: form.value.max_attempts, duration_minutes: form.value.duration_minutes,
    }
    if (props.assessment) await patchAssessment(props.assessment.id, payload)
    else { payload.program_id = form.value.program_id; await createAssessment(payload) }
    toast.success(props.assessment ? 'Assessment updated' : 'Assessment created')
    emit('saved'); emit('close')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not save assessment')
  } finally { saving.value = false }
}
</script>

<style scoped>
.af-layout { display: grid; grid-template-columns: 1.25fr 0.95fr; gap: 22px; }
.af-form { display: flex; flex-direction: column; gap: 18px; }
.af-group { display: flex; flex-direction: column; gap: 12px; }
.af-gt { display: flex; align-items: center; gap: 7px; margin: 0; font-size: 11px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase; color: var(--trn-text-muted); }
.af-gt :deep(svg) { color: var(--trn-amber-strong); }

.af-locked { display: flex; flex-direction: column; gap: 6px; }
.af-locked-lab { font-size: 12px; font-weight: 600; color: var(--trn-text-secondary); }
.af-locked-val { display: flex; align-items: center; gap: 8px; font-size: 13.5px; font-weight: 600; color: var(--trn-text);
  padding: 9px 12px; border-radius: 11px; background: var(--trn-surface); border: 1px dashed var(--trn-border-strong); }
.af-locked-val :deep(svg) { color: var(--trn-amber); flex-shrink: 0; }

.af-types { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.af-type { --c: var(--trn-amber); display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px 6px; border-radius: 13px; cursor: pointer;
  font: inherit; font-size: 11.5px; font-weight: 600; color: var(--trn-text-muted); background: var(--trn-surface); border: 1px solid var(--trn-border-soft);
  transition: color 0.22s, border-color 0.22s, background 0.22s, transform 0.22s var(--trn-spring); }
.af-type.t-quiz { --c: var(--trn-amber); } .af-type.t-exam { --c: var(--trn-ember); }
.af-type.t-practical { --c: var(--trn-amber-strong); } .af-type.t-survey { --c: var(--trn-star-dim); }
.af-type:hover { color: var(--trn-text-secondary); transform: translateY(-2px); }
.af-type.on { color: var(--c); border-color: color-mix(in srgb, var(--c) 50%, transparent); background: color-mix(in srgb, var(--c) 13%, transparent);
  box-shadow: 0 6px 18px -10px color-mix(in srgb, var(--c) 70%, transparent); }

.af-band { display: flex; flex-direction: column; gap: 6px; padding: 12px 14px; border-radius: 13px; background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.af-band-head { display: flex; align-items: center; justify-content: space-between; font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--trn-text-dim); }
.af-band-pass { font-size: 11px; font-weight: 700; color: var(--trn-amber-strong); text-transform: none; letter-spacing: 0; }
.af-band-track { position: relative; height: 10px; border-radius: 999px; background: var(--trn-st-completed-soft); overflow: visible; border: 1px solid var(--trn-border-soft); }
.af-band-fail { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 999px 0 0 999px; background: var(--trn-st-failed-soft);
  border-right: 1px solid color-mix(in srgb, var(--trn-st-failed) 32%, transparent); transition: width 0.4s var(--trn-spring); }
.af-band-mark { position: absolute; top: 50%; transform: translate(-50%, -50%); transition: left 0.4s var(--trn-spring); }
.af-band-mark i { display: block; width: 3px; height: 18px; border-radius: 2px; background: var(--trn-amber-strong); box-shadow: 0 0 8px color-mix(in srgb, var(--trn-amber) 60%, transparent); }
.af-band-scale { display: flex; align-items: center; justify-content: space-between; font-size: 10px; color: var(--trn-text-dim); }

.af-err { display: flex; align-items: center; gap: 6px; margin: 0; overflow: hidden; font-size: 11.5px; color: var(--trn-st-failed); }
.af-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

/* preview */
.af-aside { display: flex; flex-direction: column; gap: 12px; }
.af-aside-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--trn-mono); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--trn-amber-strong); }
.af-aside-eyebrow :deep(svg) { color: var(--trn-amber); }
.af-preview { --c: var(--trn-amber); position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 9px; padding: 16px; border-radius: 18px;
  background: var(--trn-surf-card); border: 1px solid var(--trn-border-soft); box-shadow: var(--trn-card-shadow); }
.af-preview.t-quiz { --c: var(--trn-amber); } .af-preview.t-exam { --c: var(--trn-ember); }
.af-preview.t-practical { --c: var(--trn-amber-strong); } .af-preview.t-survey { --c: var(--trn-star-dim); }
.af-pv-glow { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(120% 80% at 50% 0%, color-mix(in srgb, var(--c) 12%, transparent), transparent 60%); }
.af-pv-head { display: flex; align-items: center; justify-content: space-between; }
.af-pv-type { display: inline-flex; align-items: center; gap: 5px; font-family: var(--trn-mono); font-size: 9.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
  padding: 3px 9px; border-radius: 999px; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 26%, transparent); }
.af-pv-active { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 700; color: var(--trn-st-completed); }
.af-pv-active span { width: 6px; height: 6px; border-radius: 50%; background: var(--trn-st-completed); box-shadow: 0 0 7px var(--trn-st-completed); }
.af-pv-title { margin: 2px 0 0; font-size: 15px; font-weight: 750; color: var(--trn-text); line-height: 1.3; }
.af-pv-prog { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--trn-text-muted); }
.af-pv-prog :deep(svg) { color: var(--c); }
.af-pv-body { display: flex; align-items: center; gap: 14px; margin-top: 4px; }
.af-pv-ring { position: relative; width: 70px; height: 70px; flex-shrink: 0; }
.af-pv-ring svg { width: 100%; height: 100%; }
.af-pv-ring-t { stroke: var(--trn-border-strong); opacity: 0.4; }
.af-pv-ring-f { stroke: var(--trn-st-completed); }
.af-pv-ring-c { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: var(--trn-mono); font-size: 16px; font-weight: 850; color: var(--trn-text); }
.af-pv-ring-c small { font-family: inherit; font-size: 8px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--trn-text-dim); font-weight: 600; }
.af-pv-scale { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
.af-pv-scale-track { position: relative; height: 8px; border-radius: 999px; background: var(--trn-st-completed-soft); border: 1px solid var(--trn-border-soft); }
.af-pv-scale-fail { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 999px 0 0 999px; background: var(--trn-st-failed-soft); transition: width 0.4s var(--trn-spring); }
.af-pv-scale-mark { position: absolute; top: -3px; bottom: -3px; width: 2.5px; border-radius: 2px; background: var(--trn-amber-strong); transition: left 0.4s var(--trn-spring); }
.af-pv-meta { display: flex; flex-direction: column; gap: 2px; font-size: 11px; color: var(--trn-text-muted); }
.af-pv-meta .trn-mono { font-weight: 700; color: var(--trn-text-secondary); }
.af-hint { display: flex; align-items: flex-start; gap: 6px; margin: 0; font-size: 11px; line-height: 1.5; color: var(--trn-text-dim); }
.af-hint :deep(svg) { color: var(--trn-amber); flex-shrink: 0; margin-top: 1px; }
.af-hint b { color: var(--trn-text-secondary); }

.spin { animation: trn-orbit-spin 0.9s linear infinite; }
@media (max-width: 720px) {
  .af-layout { grid-template-columns: 1fr; }
  .af-aside { order: -1; }
}
@media (prefers-reduced-motion: reduce) { .spin { animation: none; } .af-band-fail, .af-band-mark, .af-pv-scale-fail, .af-pv-scale-mark { transition: none; } }
</style>
