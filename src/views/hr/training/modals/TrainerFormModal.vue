<template>
  <TrnModal :open="open" wide :title="trainer ? 'Edit trainer' : 'New trainer'"
    :subtitle="trainer ? 'Update this faculty member’s profile and roster status.' : 'Add a faculty member — internal mentor, external facilitator or vendor.'"
    :icon="Presentation" @close="$emit('close')">
    <div class="tf-layout">
      <!-- ── fields ── -->
      <div class="tf-form">
        <Motion v-for="gi in 3" :key="gi" as="section" class="tf-group"
          :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.45, delay: 0.05 + (gi - 1) * 0.08, ease: [0.16, 1, 0.3, 1] }">

          <template v-if="gi === 1">
            <h4 class="tf-gtitle"><Fingerprint :size="13" /> Identity</h4>
            <div class="tf-grid">
              <TrnField v-model="form.name" label="Trainer name" required placeholder="e.g. Aarti Mehta" class="span2" />
              <TrnSelect v-model="form.trainer_type" label="Type" required :options="typeOptions" />
              <TrnField v-model="form.specialization" label="Specialization" placeholder="e.g. Cloud Security" />
              <TrnField v-model="form.organization" label="Organization" placeholder="for external / vendor" class="span2" />
            </div>
          </template>

          <template v-else-if="gi === 2">
            <h4 class="tf-gtitle"><Contact :size="13" /> Contact &amp; rate</h4>
            <div class="tf-grid">
              <TrnField v-model="form.email" label="Email" type="email" placeholder="name@example.com" class="span2" />
              <TrnField v-model="form.phone" label="Phone" placeholder="+91 …" />
              <TrnSelect v-model="form.currency" label="Currency" :options="currencyOptions" />
              <TrnField v-model="form.hourly_rate" label="Hourly rate" type="number" step="0.01" placeholder="e.g. 2500" class="span2" />
            </div>
          </template>

          <template v-else>
            <h4 class="tf-gtitle"><Sparkles :size="13" /> Roster status</h4>
            <TrnSwitch v-model="form.is_active" accent="emerald" :icon="UserCheck"
              label="On the active roster" description="Inactive trainers stay on file but can't be assigned to new programs" />
          </template>
        </Motion>
      </div>

      <!-- ── live preview ── -->
      <aside class="tf-aside">
        <span class="tf-aside-eyebrow"><Eye :size="12" /> Live preview</span>
        <div class="tf-preview-wrap">
          <TrnTrainerCard :trainer="previewTrainer" preview :key="form.trainer_type" />
        </div>
        <p class="tf-hint">This is how the trainer appears on the faculty roster.</p>
      </aside>
    </div>

    <template #footer>
      <button class="trn-btn trn-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" class="trn-btn trn-btn-primary" :disabled="!form.name || saving"
        :whileHover="!form.name || saving ? {} : { y: -2 }" :whileTap="{ scale: 0.97 }" @click="save">
        <Loader v-if="saving" :size="14" class="spin" />
        <component v-else :is="trainer ? Check : Plus" :size="15" />
        {{ trainer ? 'Save changes' : 'Create trainer' }}
      </Motion>
    </template>
  </TrnModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import { Presentation, Loader, Fingerprint, Contact, Sparkles, UserCheck, Eye, Check, Plus } from 'lucide-vue-next'
import TrnModal from '../components/TrnModal.vue'
import TrnField from '../components/TrnField.vue'
import TrnSelect from '../components/TrnSelect.vue'
import TrnSwitch from '../components/TrnSwitch.vue'
import TrnTrainerCard from '../components/TrnTrainerCard.vue'
import { TRAINER_TYPES, createTrainer, patchTrainer } from '@/composables/useTraining'

const props = defineProps({
  open: { type: Boolean, default: false },
  trainer: { type: Object, default: null },
})
const emit = defineEmits(['close', 'saved'])
const toast = useToast()
const saving = ref(false)

const TYPE_COLORS = { INTERNAL: 'var(--trn-amber)', EXTERNAL: 'var(--trn-ember)', VENDOR: 'var(--trn-amber-strong)' }
const cap = (t) => t.charAt(0) + t.slice(1).toLowerCase()
const typeOptions = computed(() => TRAINER_TYPES.map(t => ({ value: t, label: cap(t), dot: TYPE_COLORS[t] })))
const currencyOptions = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'].map(c => ({ value: c, label: c }))

const blank = () => ({
  name: '', trainer_type: 'INTERNAL', email: '', phone: '', organization: '',
  specialization: '', hourly_rate: null, currency: 'INR', is_active: true,
})
const form = ref(blank())

// preview merges live form + existing rating/program counts (so editing keeps them visible)
const previewTrainer = computed(() => ({
  ...form.value,
  rating_avg: props.trainer?.rating_avg ?? 0,
  rating_count: props.trainer?.rating_count ?? 0,
  program_count: props.trainer?.program_count ?? 0,
}))

watch(() => props.open, (o) => {
  if (!o) return
  form.value = props.trainer
    ? {
        name: props.trainer.name || '',
        trainer_type: props.trainer.trainer_type || 'INTERNAL',
        email: props.trainer.email || '',
        phone: props.trainer.phone || '',
        organization: props.trainer.organization || '',
        specialization: props.trainer.specialization || '',
        hourly_rate: props.trainer.hourly_rate ?? null,
        currency: props.trainer.currency || 'INR',
        is_active: props.trainer.is_active !== false,
      }
    : blank()
})

const save = async () => {
  if (!form.value.name) return
  saving.value = true
  try {
    const payload = { ...form.value }
    if (!payload.currency) payload.currency = 'INR'
    if (!payload.email) delete payload.email
    if (!payload.phone) delete payload.phone
    if (!payload.organization) delete payload.organization
    if (!payload.specialization) delete payload.specialization
    if (props.trainer) await patchTrainer(props.trainer.id, payload)
    else await createTrainer(payload)
    toast.success(props.trainer ? 'Trainer updated' : 'Trainer created')
    emit('saved')
    emit('close')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not save trainer')
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.tf-layout { display: grid; grid-template-columns: 1.45fr 1fr; gap: 22px; }
.tf-form { display: flex; flex-direction: column; gap: 20px; min-width: 0; }
.tf-group { display: flex; flex-direction: column; gap: 12px; }
.tf-gtitle { display: flex; align-items: center; gap: 7px; margin: 0; font-size: 11px; font-weight: 700;
  letter-spacing: 0.1em; text-transform: uppercase; color: var(--trn-amber-strong); }
.tf-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
.span2 { grid-column: span 2; }

.tf-aside { display: flex; flex-direction: column; gap: 10px; align-self: start; position: sticky; top: 0; }
.tf-aside-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--trn-mono); font-size: 10px;
  letter-spacing: 0.12em; text-transform: uppercase; color: var(--trn-text-dim); }
.tf-preview-wrap { border-radius: 20px; padding: 14px; background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.tf-hint { margin: 0; font-size: 11px; line-height: 1.45; color: var(--trn-text-dim); }
.spin { animation: trn-orbit-spin 0.9s linear infinite; }

@media (max-width: 720px) {
  .tf-layout { grid-template-columns: 1fr; }
  .tf-aside { position: static; order: -1; }
  .tf-grid { grid-template-columns: 1fr; } .span2 { grid-column: span 1; }
}
</style>
