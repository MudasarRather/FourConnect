<template>
  <TrnModal :open="open" wide :title="program ? 'Edit program' : 'New training program'"
    :subtitle="program ? 'Reshape this course definition — changes ripple to Onboarding.' : 'Define a reusable course — shared live with the Onboarding module.'"
    :icon="BookOpen" @close="$emit('close')">
    <div class="pf-layout">
      <!-- ── fields ── -->
      <div class="pf-form">
        <Motion v-for="(grp, gi) in 3" :key="gi" as="section" class="pf-group"
          :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.45, delay: 0.05 + gi * 0.08, ease: [0.16, 1, 0.3, 1] }">

          <template v-if="gi === 0">
            <h4 class="pf-gtitle"><Fingerprint :size="13" /> Identity</h4>
            <div class="pf-grid">
              <TrnField v-model="form.name" label="Program name" required placeholder="e.g. Cyber Security Awareness" class="span2" />
              <TrnField v-model="form.code" label="Code" placeholder="optional · SEC-101" />
              <TrnSelect v-model="form.training_type" label="Type" required :options="typeOptions" />
            </div>
          </template>

          <template v-else-if="gi === 1">
            <h4 class="pf-gtitle"><Settings2 :size="13" /> Delivery &amp; content</h4>
            <div class="pf-grid">
              <TrnSelect v-model="form.delivery_mode" label="Delivery mode" :options="deliveryOptions" />
              <TrnField v-model="form.duration_hours" label="Duration (hours)" type="number" step="0.5" placeholder="e.g. 4" />
              <TrnField v-model="form.materials_url" label="Materials URL" placeholder="https://…" class="span2" />
              <TrnField v-model="form.description" label="Description" type="textarea" :rows="3" class="span2"
                placeholder="What does this program cover, and who is it for?" />
            </div>
          </template>

          <template v-else>
            <h4 class="pf-gtitle"><Sparkles :size="13" /> Attributes</h4>
            <div class="pf-switches">
              <TrnSwitch v-model="form.certification_required" accent="emerald" :icon="Award"
                label="Awards a certification" description="Completion issues a tracked certificate" />
              <TrnSwitch v-model="form.is_mandatory_for_new_joiners" accent="amber" :icon="UserPlus"
                label="Mandatory for new joiners" description="Auto-assigned during onboarding" />
              <TrnSwitch v-model="form.is_compliance" accent="ember" :icon="ShieldCheck"
                label="Compliance training" description="Flags this as a regulatory requirement" />
            </div>
          </template>
        </Motion>
      </div>

      <!-- ── live preview ── -->
      <aside class="pf-aside">
        <span class="pf-aside-eyebrow"><Eye :size="12" /> Live preview</span>
        <div class="pf-preview-wrap">
          <TrnProgramCapsule :program="form" preview :show-enrollment="false" :key="form.training_type" />
        </div>
        <p class="pf-hint">This is exactly how the program appears in the catalog and onboarding picker.</p>
      </aside>
    </div>

    <template #footer>
      <button class="trn-btn trn-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" class="trn-btn trn-btn-primary" :disabled="!form.name || saving"
        :whileHover="!form.name || saving ? {} : { y: -2 }" :whileTap="{ scale: 0.97 }" @click="save">
        <Loader v-if="saving" :size="14" class="spin" />
        <component v-else :is="program ? Check : Plus" :size="15" />
        {{ program ? 'Save changes' : 'Create program' }}
      </Motion>
    </template>
  </TrnModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  BookOpen, Loader, Fingerprint, Settings2, Sparkles, Award, UserPlus,
  ShieldCheck, Eye, Check, Plus,
} from 'lucide-vue-next'
import TrnModal from '../components/TrnModal.vue'
import TrnField from '../components/TrnField.vue'
import TrnSelect from '../components/TrnSelect.vue'
import TrnSwitch from '../components/TrnSwitch.vue'
import TrnProgramCapsule from '../components/TrnProgramCapsule.vue'
import {
  TRAINING_TYPES, DELIVERY_MODES, typeMeta, createTrainingProgram, patchTrainingProgram,
} from '@/composables/useTraining'

const props = defineProps({
  open: { type: Boolean, default: false },
  program: { type: Object, default: null },
})
const emit = defineEmits(['close', 'saved'])
const toast = useToast()
const saving = ref(false)

const typeOptions = computed(() =>
  TRAINING_TYPES.map(t => ({ value: t, label: typeMeta(t).label, dot: `var(${typeMeta(t).cssVar})` })))
const deliveryOptions = [
  { value: '', label: 'Not specified' },
  ...DELIVERY_MODES.map(m => ({ value: m, label: m.replace(/_/g, ' ').toLowerCase() })),
]

const blank = () => ({
  name: '', code: '', training_type: 'SOFTWARE', delivery_mode: '', duration_hours: null,
  materials_url: '', description: '', certification_required: false,
  is_mandatory_for_new_joiners: false, is_compliance: false,
})
const form = ref(blank())

watch(() => props.open, (o) => {
  if (!o) return
  form.value = props.program
    ? {
        name: props.program.name || '', code: props.program.code || '',
        training_type: props.program.training_type || 'SOFTWARE',
        delivery_mode: props.program.delivery_mode || '',
        duration_hours: props.program.duration_hours ?? null,
        materials_url: props.program.materials_url || '',
        description: props.program.description || '',
        certification_required: !!props.program.certification_required,
        is_mandatory_for_new_joiners: !!props.program.is_mandatory_for_new_joiners,
        is_compliance: !!props.program.is_compliance,
      }
    : blank()
})

const save = async () => {
  if (!form.value.name) return
  saving.value = true
  try {
    const payload = { ...form.value }
    if (!payload.code) delete payload.code
    if (!payload.delivery_mode) payload.delivery_mode = null
    if (props.program) await patchTrainingProgram(props.program.id, payload)
    else await createTrainingProgram(payload)
    toast.success(props.program ? 'Program updated' : 'Program created')
    emit('saved')
    emit('close')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not save program')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.pf-layout { display: grid; grid-template-columns: 1.45fr 1fr; gap: 22px; }
.pf-form { display: flex; flex-direction: column; gap: 20px; min-width: 0; }
.pf-group { display: flex; flex-direction: column; gap: 12px; }
.pf-gtitle { display: flex; align-items: center; gap: 7px; margin: 0; font-size: 11px; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase; color: var(--trn-amber-strong); }
.pf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
.span2 { grid-column: span 2; }
.pf-switches { display: flex; flex-direction: column; gap: 9px; }

/* live preview aside */
.pf-aside { display: flex; flex-direction: column; gap: 10px; align-self: start; position: sticky; top: 0; }
.pf-aside-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--trn-mono); font-size: 10px;
  letter-spacing: 0.12em; text-transform: uppercase; color: var(--trn-text-dim); }
.pf-preview-wrap { border-radius: 20px; padding: 14px; background: var(--trn-surface);
  border: 1px solid var(--trn-border-soft); }
.pf-hint { margin: 0; font-size: 11px; line-height: 1.45; color: var(--trn-text-dim); }

.spin { animation: trn-orbit-spin 0.9s linear infinite; }

@media (max-width: 720px) {
  .pf-layout { grid-template-columns: 1fr; }
  .pf-aside { position: static; order: -1; }
  .pf-grid { grid-template-columns: 1fr; } .span2 { grid-column: span 1; }
}
</style>
