<template>
  <RecFormDrawer
    :open="open"
    :title="initial ? 'Edit Panel' : 'New Interview Panel'"
    :subtitle="initial ? `Updating ${initial.name}` : 'Reusable interviewer group'"
    :icon="UsersRound"
    :confetti-tick="confettiTick"
    @close="onClose"
  >
    <div class="grid">
      <div class="field-block full">
        <HrFieldLabel label="Panel Name" required :error="!!errors.name" />
        <HrInput v-model="form.name" placeholder="e.g. Backend Engineering Panel"
                 :error="!!errors.name" :error-text="errors.name" />
      </div>
      <div class="field-block">
        <HrFieldLabel label="Department" />
        <HrSelect v-model="form.department_id" :options="deptOptions" placeholder="Select" searchable />
      </div>
      <div class="field-block">
        <HrFieldLabel label="Status" />
        <HrSelect v-model="form.is_active" :options="activeOptions" />
      </div>

      <div class="field-block full">
        <HrFieldLabel label="Expertise" helper="Comma-separated" />
        <HrInput v-model="expertiseText" placeholder="Python, System Design, Distributed Systems" />
        <div class="tag-row">
          <span v-for="(e, i) in parsedExpertise" :key="i" class="tag-pill">{{ e }}</span>
        </div>
      </div>

      <div class="field-block full">
        <HrFieldLabel label="Description" />
        <HrTextarea v-model="form.description" :rows="2" placeholder="When to use this panel…" />
      </div>

      <h4 class="subheader full">Members</h4>
      <div class="field-block full members-block">
        <div v-for="(m, idx) in members" :key="idx" class="member-row">
          <HrInput v-model="m.name" placeholder="Full name" />
          <HrInput v-model="m.role" placeholder="Role (Senior Engineer, Architect…)" />
          <HrInput v-model="m.email" type="email" placeholder="email (optional)" />
          <button class="row-rm" type="button" @click="rmMember(idx)" aria-label="Remove">
            <X :size="14" />
          </button>
        </div>
        <button class="add-row" type="button" @click="addMember">
          <Plus :size="14" /> Add member
        </button>
      </div>

      <div class="note full">
        <Sparkles :size="14" />
        <span>
          Panels can be assigned to interviews during scheduling so interviewers
          and expertise carry over automatically.
        </span>
      </div>
    </div>

    <template #footer>
      <button class="ghost" @click="onClose">Cancel</button>
      <div class="grow" />
      <button ref="submitBtnRef" class="primary" :disabled="submitting" @click="submit">
        <Loader2 v-if="submitting" :size="14" class="spin" />
        <Save v-else :size="14" />
        {{ initial ? 'Save Changes' : 'Create Panel' }}
      </button>
    </template>
  </RecFormDrawer>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { UsersRound, Save, Loader2, Plus, X, Sparkles } from 'lucide-vue-next'

import RecFormDrawer from '../components/RecFormDrawer.vue'
import HrFieldLabel from '../../../../components/hr/forms/HrFieldLabel.vue'
import HrInput from '../../../../components/hr/forms/HrInput.vue'
import HrSelect from '../../../../components/hr/forms/HrSelect.vue'
import HrTextarea from '../../../../components/hr/forms/HrTextarea.vue'

import { useMagnetic } from '../../../../composables/useMagnetic'
import { useToast } from '../../../../composables/useToast'

const props = defineProps({
  open: { type: Boolean, default: false },
  reference: { type: Object, required: true },
  initial: { type: Object, default: null },
})
const emit = defineEmits(['close', 'submit'])

const { error } = useToast()
const submitBtnRef = ref(null)
useMagnetic(submitBtnRef, { strength: 0.2 })

const confettiTick = ref(0)
const submitting = ref(false)
const errors = reactive({})

const activeOptions = [
  { value: true,  label: 'Active' },
  { value: false, label: 'Inactive' },
]

const deptOptions = computed(() =>
  (props.reference?.departments || []).map(d => ({ value: d.id, label: d.name }))
)

const blank = () => ({
  name: '',
  department_id: null,
  is_active: true,
  description: '',
})
const form = ref(blank())
const expertiseText = ref('')
const members = ref([])

const blankMember = () => ({ name: '', role: '', email: '' })

const initFrom = (data) => {
  Object.keys(errors).forEach(k => delete errors[k])
  if (!data) {
    form.value = blank()
    expertiseText.value = ''
    members.value = [blankMember()]
    return
  }
  form.value = {
    name: data.name,
    department_id: data.department_id,
    is_active: data.is_active,
    description: data.description || '',
  }
  expertiseText.value = (data.expertise || []).join(', ')
  members.value = (data.members && data.members.length)
    ? data.members.map(m => ({ name: m.name || '', role: m.role || '', email: m.email || '' }))
    : [blankMember()]
}
watch(() => props.open, (v) => { if (v) initFrom(props.initial) })

const parsedExpertise = computed(() =>
  expertiseText.value.split(',').map(s => s.trim()).filter(Boolean)
)

const addMember = () => members.value.push(blankMember())
const rmMember = (i) => {
  if (members.value.length === 1) members.value[0] = blankMember()
  else members.value.splice(i, 1)
}

const validate = () => {
  Object.keys(errors).forEach(k => delete errors[k])
  if (!form.value.name?.trim()) errors.name = 'Panel name is required'
  // Validate any members that were partially filled
  const memberErrors = []
  members.value.forEach((m, i) => {
    const hasAny = m.name?.trim() || m.role?.trim() || m.email?.trim()
    if (hasAny && !m.name?.trim()) {
      memberErrors.push(`Member ${i + 1}: name is required`)
    }
    if (m.email?.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m.email.trim())) {
      memberErrors.push(`Member ${i + 1}: invalid email`)
    }
  })
  if (memberErrors.length) errors.members = memberErrors.join('; ')
  // Need at least one member with a name
  const validMembers = members.value.filter(m => m.name?.trim())
  if (validMembers.length === 0) errors.members_count = 'Add at least one panel member'
  return Object.keys(errors).length === 0
}

const submit = async () => {
  if (!validate()) {
    error(errors.members_count || errors.members || 'Some fields need attention')
    return
  }
  const cleanedMembers = members.value
    .map(m => ({ name: m.name?.trim(), role: m.role?.trim(), email: m.email?.trim() }))
    .filter(m => m.name)
  const payload = {
    ...form.value,
    expertise: parsedExpertise.value,
    members: cleanedMembers,
  }
  submitting.value = true
  try {
    await emit('submit', payload)
    confettiTick.value++
  } finally {
    submitting.value = false
  }
}

const onClose = () => emit('close')
</script>

<style scoped>
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.field-block { display: flex; flex-direction: column; gap: 2px; }
.field-block.full { grid-column: span 2; }

.subheader {
  grid-column: span 2;
  margin: 10px 0 -4px;
  font-size: 10.5px;
  font-weight: 800;
  color: var(--hr-orange);
  text-transform: uppercase;
  letter-spacing: 0.7px;
  display: inline-flex; align-items: center; gap: 8px;
}
.subheader::before {
  content: '';
  width: 14px; height: 2px;
  background: var(--hr-accent-gold);
  border-radius: 999px;
  box-shadow: 0 0 8px rgba(251, 191, 36, 0.5);
}

.members-block { gap: 8px; }
.member-row {
  display: grid;
  grid-template-columns: 1.1fr 1.1fr 1.2fr 32px;
  gap: 8px;
  align-items: center;
}
.row-rm {
  display: grid; place-items: center;
  width: 32px; height: 32px;
  background: rgba(248, 113, 113, 0.08);
  border: 1px solid rgba(248, 113, 113, 0.2);
  border-radius: 8px;
  color: #fca5a5;
  cursor: pointer;
  transition: all 200ms var(--hr-spring);
}
.row-rm:hover { background: rgba(248, 113, 113, 0.16); }
.add-row {
  margin-top: 4px;
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 12px;
  background: var(--hr-accent-gold-soft);
  border: 1px solid var(--hr-accent-gold-border);
  border-radius: 10px;
  color: var(--hr-accent-gold);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  width: max-content;
  transition: background 180ms var(--hr-spring);
}
.add-row:hover { background: rgba(251, 191, 36, 0.18); }

.tag-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.tag-pill {
  display: inline-flex; align-items: center;
  padding: 3px 9px;
  background: var(--hr-accent-gold-soft);
  border: 1px solid var(--hr-accent-gold-border);
  border-radius: 999px;
  font-size: 11px; font-weight: 600;
  color: var(--hr-accent-gold);
}

.note {
  grid-column: span 2;
  background: rgba(251, 191, 36, 0.06);
  border: 1px solid var(--hr-accent-gold-border);
  border-radius: 10px;
  padding: 10px 14px;
  font-size: 12px;
  color: var(--hr-text-secondary);
  display: flex; align-items: center; gap: 8px;
}

.ghost, .primary {
  display: inline-flex; align-items: center; gap: 6px;
  height: 38px;
  padding: 0 16px;
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

.spin { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }

@media (max-width: 700px) {
  .grid { grid-template-columns: 1fr; }
  .field-block.full, .subheader, .note { grid-column: span 1; }
  .member-row { grid-template-columns: 1fr; }
}
</style>
