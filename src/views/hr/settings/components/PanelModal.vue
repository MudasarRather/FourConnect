<template>
  <SetModal :open="open" :title="isEdit ? 'Edit interview panel' : 'New interview panel'"
    :subtitle="isEdit ? form.name || 'Reusable interviewer group' : 'Reusable interviewer group for scheduling'"
    :icon="UsersRound" accent-color="var(--set-ember)" :width="760"
    :mode="isEdit ? 'edit' : 'create'" aside-placement="side" @close="$emit('close')">

    <!-- FORM -->
    <div class="pm-form">
      <Motion as="div" class="pm-block" v-bind="fT(0)">
        <label class="pm-lab">Panel name <i>*</i></label>
        <HrInput v-model="form.name" placeholder="e.g. Backend Engineering Panel"
          :error="!!err.name" :error-text="err.name" />
      </Motion>

      <div class="pm-row">
        <Motion as="div" class="pm-block" v-bind="fT(1)">
          <label class="pm-lab">Department</label>
          <SetSelect v-model="form.department_id" :options="deptOptions"
            placeholder="All departments" accent-color="var(--set-ember)" />
        </Motion>
        <Motion as="div" class="pm-block" v-bind="fT(2)">
          <label class="pm-lab">Status</label>
          <div class="pm-seg">
            <button type="button" :class="{ on: form.is_active }" @click="form.is_active = true">
              <CircleDot :size="13" /> Active
            </button>
            <button type="button" :class="{ on: !form.is_active }" @click="form.is_active = false">
              <Pause :size="13" /> Inactive
            </button>
          </div>
        </Motion>
      </div>

      <Motion as="div" class="pm-block" v-bind="fT(3)">
        <label class="pm-lab">Expertise <span class="pm-hint">— press Enter or comma to add</span></label>
        <HrInput v-model="expertiseDraft" placeholder="Python, System Design, Distributed Systems…"
          @keydown="onExpertiseKey" />
        <div v-if="form.expertise.length" class="pm-tagrow">
          <span v-for="(e, i) in form.expertise" :key="i" class="pm-tag">
            {{ e }}<button type="button" @click="form.expertise.splice(i, 1)"><X :size="11" /></button>
          </span>
        </div>
      </Motion>

      <Motion as="div" class="pm-block" v-bind="fT(4)">
        <label class="pm-lab">Description</label>
        <HrTextarea v-model="form.description" :rows="2" placeholder="When should recruiters reach for this panel?" />
      </Motion>

      <Motion as="div" class="pm-block" v-bind="fT(5)">
        <div class="pm-mhead">
          <label class="pm-lab">Panelists</label>
          <span class="pm-mcount">{{ validMemberCount }} added</span>
        </div>
        <div class="pm-members">
          <div v-for="(m, i) in form.members" :key="i" class="pm-mrow">
            <HrInput v-model="m.name" placeholder="Full name" />
            <HrInput v-model="m.role" placeholder="Role" />
            <HrInput v-model="m.email" type="email" placeholder="Email (optional)" />
            <button class="pm-mrm" type="button" @click="rmMember(i)" aria-label="Remove panelist"><X :size="14" /></button>
          </div>
          <button class="pm-add" type="button" @click="addMember"><Plus :size="14" /> Add panelist</button>
        </div>
      </Motion>
    </div>

    <!-- LIVE PREVIEW -->
    <template #aside>
      <div class="pm-prev">
        <span class="pm-prev-eyebrow"><Sparkles :size="11" /> Live preview</span>
        <div class="pm-card" :class="{ off: !form.is_active }">
          <span class="pm-card-spine" aria-hidden="true" />
          <div class="pm-card-top">
            <span class="pm-card-led" :class="form.is_active ? 'on' : 'idle'" />
            <b>{{ form.name || 'Untitled panel' }}</b>
          </div>
          <span class="pm-card-dept"><Building2 :size="11" />{{ deptName || 'All departments' }}</span>
          <div v-if="form.expertise.length" class="pm-card-tags">
            <span v-for="(e, i) in form.expertise.slice(0, 6)" :key="i">{{ e }}</span>
          </div>
          <div class="pm-card-avs">
            <span v-for="(m, i) in validMembers.slice(0, 6)" :key="i" class="pm-card-av" :style="{ '--n': i }" :title="m.name">{{ initials(m.name) }}</span>
            <span v-if="!validMembers.length" class="pm-card-av empty"><UserRound :size="12" /></span>
          </div>
          <span class="pm-card-stamp" :class="form.is_active ? 'ok' : 'idle'">{{ form.is_active ? 'ACTIVE' : 'INACTIVE' }}</span>
        </div>
        <p class="pm-note">
          <Info :size="12" />
          Panels can be attached when scheduling an interview, so the interviewers and expertise
          carry over automatically.
        </p>
      </div>
    </template>

    <template #footer>
      <button class="set-btn set-btn-ghost" type="button" @click="$emit('close')">Cancel</button>
      <button class="set-btn set-btn-primary" type="button" :disabled="saving" @click="submit">
        <Loader2 v-if="saving" :size="14" class="set-spin" />
        <component v-else :is="isEdit ? Check : Plus" :size="14" />
        {{ isEdit ? 'Save changes' : 'Create panel' }}
      </button>
    </template>
  </SetModal>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  UsersRound, CircleDot, Pause, X, Plus, Check, Loader2, Sparkles, Building2, UserRound, Info,
} from 'lucide-vue-next'
import SetModal from './SetModal.vue'
import SetSelect from './SetSelect.vue'
import HrInput from '@/components/hr/forms/HrInput.vue'
import HrTextarea from '@/components/hr/forms/HrTextarea.vue'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  open: { type: Boolean, default: false },
  initial: { type: Object, default: null },
  departments: { type: Array, default: () => [] },
  saving: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'save'])

const isEdit = computed(() => !!props.initial)
const reduced = prefersReduced()
const fT = (i) => reduced ? {} : ({
  initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay: 0.05 + i * 0.06, ease: [0.16, 1, 0.3, 1] },
})

const blank = () => ({ name: '', department_id: null, is_active: true, description: '', expertise: [], members: [{ name: '', role: '', email: '' }] })
const form = reactive(blank())
const expertiseDraft = ref('')
const err = reactive({ name: '' })

const deptOptions = computed(() => [
  { value: null, label: 'All departments', icon: Building2 },
  ...props.departments.map(d => ({ value: d.id, label: d.name })),
])
const deptName = computed(() => props.departments.find(d => String(d.id) === String(form.department_id))?.name || '')

const validMembers = computed(() => form.members.filter(m => m.name?.trim()))
const validMemberCount = computed(() => validMembers.value.length)
const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'

const reset = () => {
  const b = blank()
  if (props.initial) {
    form.name = props.initial.name || ''
    form.department_id = props.initial.department_id ?? null
    form.is_active = props.initial.is_active !== false
    form.description = props.initial.description || ''
    form.expertise = Array.isArray(props.initial.expertise) ? [...props.initial.expertise] : []
    form.members = (props.initial.members?.length
      ? props.initial.members.map(m => ({ name: m.name || '', role: m.role || '', email: m.email || '' }))
      : [{ name: '', role: '', email: '' }])
  } else {
    Object.assign(form, b)
  }
  expertiseDraft.value = ''
  err.name = ''
}
watch(() => props.open, (v) => { if (v) reset() })

const commitExpertise = () => {
  const parts = expertiseDraft.value.split(',').map(s => s.trim()).filter(Boolean)
  for (const p of parts) if (!form.expertise.includes(p)) form.expertise.push(p)
  expertiseDraft.value = ''
}
const onExpertiseKey = (e) => {
  if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commitExpertise() }
  else if (e.key === 'Backspace' && !expertiseDraft.value && form.expertise.length) form.expertise.pop()
}

const addMember = () => form.members.push({ name: '', role: '', email: '' })
const rmMember = (i) => {
  if (form.members.length === 1) form.members[0] = { name: '', role: '', email: '' }
  else form.members.splice(i, 1)
}

const submit = () => {
  commitExpertise()
  err.name = form.name.trim() ? '' : 'Panel name is required'
  if (err.name) return
  const members = form.members
    .map(m => ({ name: m.name?.trim() || '', role: m.role?.trim() || '', email: m.email?.trim() || '' }))
    .filter(m => m.name)
  emit('save', {
    name: form.name.trim(),
    department_id: form.department_id || null,
    is_active: form.is_active,
    description: form.description?.trim() || '',
    expertise: [...form.expertise],
    members,
  })
}
</script>

<style scoped>
.pm-form { display: flex; flex-direction: column; gap: 15px; }
.pm-row { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
.pm-block { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.pm-lab { font-size: 11.5px; font-weight: 700; color: var(--set-text-secondary); }
.pm-lab i { color: var(--set-conflict); font-style: normal; }
.pm-hint { font-weight: 500; color: var(--set-text-dim); }

.pm-seg { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
.pm-seg button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; height: 42px; border-radius: 11px; cursor: pointer;
  font: inherit; font-size: 12.5px; font-weight: 700; color: var(--set-text-muted);
  background: var(--set-surface); border: 1px solid var(--set-border); transition: all 0.2s var(--set-spring); }
.pm-seg button.on { color: var(--set-ember); background: color-mix(in srgb, var(--set-ember) 14%, transparent); border-color: color-mix(in srgb, var(--set-ember) 38%, transparent); }

.pm-tagrow { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 2px; }
.pm-tag { display: inline-flex; align-items: center; gap: 5px; padding: 4px 6px 4px 10px; border-radius: 8px; font-size: 11.5px; font-weight: 650;
  color: var(--set-ember); background: color-mix(in srgb, var(--set-ember) 11%, transparent); border: 1px solid color-mix(in srgb, var(--set-ember) 26%, transparent); }
.pm-tag button { display: grid; place-items: center; width: 16px; height: 16px; border-radius: 5px; border: none; cursor: pointer;
  color: inherit; background: color-mix(in srgb, var(--set-ember) 16%, transparent); transition: all 0.18s; }
.pm-tag button:hover { background: var(--set-conflict-soft); color: var(--set-conflict); }

.pm-mhead { display: flex; align-items: center; justify-content: space-between; }
.pm-mcount { font-size: 10.5px; font-weight: 700; color: var(--set-text-dim); }
.pm-members { display: flex; flex-direction: column; gap: 8px; }
.pm-mrow { display: grid; grid-template-columns: 1.1fr 1fr 1.2fr 34px; gap: 7px; align-items: center; }
.pm-mrm { display: grid; place-items: center; width: 34px; height: 42px; border-radius: 9px; cursor: pointer;
  color: var(--set-text-muted); background: var(--set-conflict-soft); border: 1px solid color-mix(in srgb, var(--set-conflict) 22%, transparent); transition: all 0.18s; }
.pm-mrm:hover { color: var(--set-conflict); }
.pm-add { display: inline-flex; align-items: center; gap: 6px; width: max-content; padding: 8px 13px; border-radius: 10px; cursor: pointer;
  font: inherit; font-size: 12px; font-weight: 700; color: var(--set-ember);
  background: color-mix(in srgb, var(--set-ember) 11%, transparent); border: 1px solid color-mix(in srgb, var(--set-ember) 26%, transparent); transition: all 0.2s var(--set-spring); }
.pm-add:hover { background: color-mix(in srgb, var(--set-ember) 18%, transparent); }

/* live preview */
.pm-prev { display: flex; flex-direction: column; gap: 13px; }
.pm-prev-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--set-text-muted); }
.pm-prev-eyebrow :deep(svg) { color: var(--set-ember); }
.pm-card { position: relative; overflow: hidden; padding: 14px 15px; border-radius: 15px;
  background: var(--set-surface); border: 1px solid var(--set-border-strong);
  display: flex; flex-direction: column; gap: 9px; --acc: var(--set-ok); }
.pm-card.off { --acc: var(--set-unset); }
.pm-card-spine { position: absolute; left: 0; top: 12px; bottom: 12px; width: 3px; border-radius: 0 3px 3px 0; background: var(--acc); box-shadow: 0 0 12px color-mix(in srgb, var(--acc) 50%, transparent); }
.pm-card-top { display: flex; align-items: center; gap: 8px; }
.pm-card-led { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; background: var(--acc); }
.pm-card-led.on { box-shadow: 0 0 10px var(--set-ok); }
.pm-card-top b { font-size: 13.5px; font-weight: 800; color: var(--set-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pm-card-dept { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--set-text-muted); }
.pm-card-dept :deep(svg) { color: var(--set-gold); }
.pm-card-tags { display: flex; flex-wrap: wrap; gap: 5px; }
.pm-card-tags span { padding: 2px 8px; border-radius: 6px; font-size: 10px; font-weight: 650; color: var(--set-ember);
  background: color-mix(in srgb, var(--set-ember) 10%, transparent); border: 1px solid color-mix(in srgb, var(--set-ember) 22%, transparent); }
.pm-card-avs { display: flex; }
.pm-card-av { width: 24px; height: 24px; border-radius: 50%; display: grid; place-items: center; font-size: 9px; font-weight: 800; color: #1a1206;
  margin-left: calc(var(--n) * -6px); background: var(--set-grad-hero); border: 2px solid var(--set-surface); }
.pm-card-av.empty { background: var(--set-surface-elevated); color: var(--set-text-dim); margin-left: 0; }
.pm-card-stamp { align-self: flex-start; padding: 3px 9px; border-radius: 999px; font-size: 9px; font-weight: 850; letter-spacing: 0.1em; }
.pm-card-stamp.ok { color: var(--set-ok); background: var(--set-ok-soft); }
.pm-card-stamp.idle { color: var(--set-text-muted); background: var(--set-unset-soft); }
.pm-note { display: flex; gap: 7px; margin: 0; font-size: 11px; line-height: 1.5; color: var(--set-text-muted); }
.pm-note :deep(svg) { color: var(--set-ember); flex-shrink: 0; margin-top: 1px; }

@media (max-width: 720px) { .pm-row { grid-template-columns: 1fr; } .pm-mrow { grid-template-columns: 1fr; } }
</style>
