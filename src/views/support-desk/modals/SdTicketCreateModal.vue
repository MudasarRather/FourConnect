<template>
  <SdModalShell :open="open" :eyebrow="eyebrow" :title="title" width="920px" @close="$emit('close')">
    <div class="wiz">
      <!-- Stepper -->
      <div class="wiz-steps" role="tablist">
        <button
          v-for="(s, i) in steps" :key="s.key" type="button"
          class="wstep" :class="{ on: i === step, done: i < step }"
          :disabled="i > maxReached" @click="goStep(i)"
        >
          <span class="wstep-node">
            <Check v-if="i < step" :size="13" />
            <component v-else :is="s.icon" :size="13" />
          </span>
          <span class="wstep-lbl">{{ s.label }}</span>
          <span v-if="i < steps.length - 1" class="wstep-line" :class="{ lit: i < step }" aria-hidden="true" />
        </button>
      </div>

      <div class="wiz-grid">
        <!-- FORM -->
        <div class="wiz-form">
          <Motion
            :key="step" as="div" class="wiz-pane"
            :initial="{ opacity: 0, x: 18 }" :animate="{ opacity: 1, x: 0 }"
            :transition="{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }"
          >
            <!-- STEP: Classify -->
            <template v-if="curKey === 'classify'">
              <p class="wiz-q">What kind of request is this?</p>
              <div class="type-grid">
                <button
                  v-for="ty in TYPE_OPTS" :key="ty.value" type="button"
                  class="type-chip" :class="{ on: form.ticket_type === ty.value }"
                  @click="form.ticket_type = ty.value"
                >
                  <span class="tc-ic"><component :is="ty.icon" :size="16" /></span>
                  <span class="tc-lbl">{{ ty.label }}</span>
                </button>
              </div>

              <p class="wiz-q mt">Category</p>
              <div class="cascade">
                <SdSelect v-model="form.category_id" :options="mainCatOpts" placeholder="Select a category…" />
                <SdSelect v-if="hasSubs" v-model="form.subcategory_id" :options="subCatOpts" placeholder="Select a subcategory…" />
              </div>
              <p v-if="!mainCatOpts.length || mainCatOpts.length === 1" class="cascade-hint"><Info :size="11" /> No categories configured for this request type yet.</p>

              <p class="wiz-q mt">Impact × Urgency <i class="opt">tap a cell — it sets the priority</i></p>
              <div class="matrix">
                <span class="mx-corner" />
                <span v-for="im in IMPACT_AXIS" :key="'h' + im.value" class="mx-head">{{ im.label }}<i>{{ im.hint }}</i></span>
                <template v-for="ur in URGENCY_AXIS" :key="ur.value">
                  <span class="mx-rowhead">{{ ur.label }}<i>{{ ur.hint }}</i></span>
                  <button
                    v-for="im in IMPACT_AXIS" :key="ur.value + im.value" type="button"
                    class="mx-cell" :class="['p-' + cellPriority(im.value, ur.value), { on: form.impact === im.value && form.urgency === ur.value }]"
                    @click="selectCell(im.value, ur.value)"
                  >{{ priorityP(cellPriority(im.value, ur.value)) }}</button>
                </template>
              </div>
              <div class="mx-out">
                <span v-if="matrixChosen" class="mx-derived" :style="{ '--pc': priColor(form.priority) }">
                  <i /> {{ priorityP(form.priority) }} · {{ priLabelOf(form.priority) }}
                  <em>derived from {{ cap(form.impact) }} impact × {{ cap(form.urgency) }} urgency</em>
                </span>
                <span v-else class="mx-derived ph">Pick a cell to set the priority</span>
              </div>
            </template>

            <!-- STEP: Describe -->
            <template v-else-if="curKey === 'describe'">
              <label class="wiz-field">
                <span class="wiz-label">Subject <em>*</em></span>
                <input v-model="form.subject" type="text" class="wiz-input" maxlength="160"
                  placeholder="One line that captures the issue" @keydown.enter.prevent="next" />
                <span class="wiz-counter">{{ form.subject.length }}/160</span>
              </label>
              <label class="wiz-field">
                <span class="wiz-label">Details &amp; reason</span>
                <textarea v-model="form.description" rows="6" class="wiz-input"
                  placeholder="What's happening, what you expected, steps to reproduce, and why it matters…" />
              </label>
              <div class="wiz-field">
                <span class="wiz-label">Tags <i class="opt">optional</i></span>
                <div class="tagbox" :class="{ focused: tagFocus }">
                  <span v-for="(tg, i) in form.tags" :key="tg + i" class="tag">
                    {{ tg }}<button type="button" @click="form.tags.splice(i, 1)"><X :size="11" /></button>
                  </span>
                  <input v-model="tagInput" type="text" class="tag-input" :placeholder="form.tags.length ? '' : 'Add a tag, press Enter'"
                    @keydown.enter.prevent="addTag" @keydown.delete="onTagBackspace" @focus="tagFocus = true" @blur="tagFocus = false" />
                </div>
              </div>
              <div class="wiz-field">
                <span class="wiz-label">Attachments <i class="opt">PDF / image · ≤5MB</i></span>
                <div class="dropzone" :class="{ busy: uploading }" @click="pickFiles">
                  <input ref="fileInput" type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.gif,.webp" class="dz-input" @change="onFiles" />
                  <component :is="uploading ? LoaderCircle : UploadCloud" :size="18" :class="{ spin: uploading }" />
                  <span>{{ uploading ? 'Uploading…' : 'Click to attach screenshots or documents' }}</span>
                </div>
                <div v-if="form.attachments.length" class="att-list">
                  <span v-for="(a, i) in form.attachments" :key="i" class="att">
                    <Paperclip :size="12" /> <i>{{ a.name }}</i>
                    <button type="button" @click.stop="removeFile(i)"><X :size="11" /></button>
                  </span>
                </div>
                <p v-if="fileErr" class="att-err"><AlertCircle :size="12" /> {{ fileErr }}</p>
              </div>
            </template>

            <!-- STEP: Context (admin) -->
            <template v-else-if="curKey === 'context'">
              <div class="wiz-field">
                <span class="wiz-label">Organization</span>
                <SdSelect v-model="form.organization_id" :options="orgOpts" placeholder="None (ad-hoc contact)" />
              </div>
              <div class="wiz-grid2">
                <label class="wiz-field"><span class="wiz-label">Contact name</span>
                  <input v-model="form.contact_name" type="text" class="wiz-input" placeholder="Reporter name" /></label>
                <label class="wiz-field"><span class="wiz-label">Contact email</span>
                  <input v-model="form.contact_email" type="email" class="wiz-input" placeholder="reporter@company.com" /></label>
              </div>
              <div class="wiz-grid2">
                <label class="wiz-field"><span class="wiz-label">Contact phone</span>
                  <input v-model="form.contact_phone" type="text" class="wiz-input" placeholder="+91…" /></label>
                <div class="wiz-field"><span class="wiz-label">Source</span>
                  <SdSelect v-model="form.source" :options="SOURCE_OPTS" /></div>
              </div>
              <div class="wiz-grid2">
                <div class="wiz-field"><span class="wiz-label">SLA package</span>
                  <SdSelect v-model="form.sla_package_id" :options="slaOpts" placeholder="Auto (org / default)" /></div>
                <div class="wiz-field"><span class="wiz-label">Assignment</span>
                  <button type="button" class="assign-toggle" :class="{ on: form.assign_me }" @click="form.assign_me = !form.assign_me">
                    <span class="at-knob"><UserCheck :size="13" /></span>
                    <span class="at-lbl">{{ form.assign_me ? 'Assigned to me' : 'Assign to me' }}</span>
                  </button>
                </div>
              </div>
            </template>

            <!-- STEP: Review -->
            <template v-else-if="curKey === 'review'">
              <p class="wiz-q">Review &amp; submit</p>
              <ul class="review-list">
                <li><span><Tag :size="13" /> Type</span><b>{{ typeLabelOf(form.ticket_type) }}</b></li>
                <li><span><Flag :size="13" /> Priority</span><b :style="{ color: priColor(form.priority) }">{{ priLabelOf(form.priority) }}</b></li>
                <li v-if="categoryName"><span><Layers :size="13" /> Category</span><b>{{ categoryName }}</b></li>
                <li v-if="subcategoryName"><span><Layers :size="13" /> Subcategory</span><b>{{ subcategoryName }}</b></li>
                <li v-if="matrixChosen"><span><Flag :size="13" /> Impact × Urgency</span><b>{{ cap(form.impact) }} × {{ cap(form.urgency) }}</b></li>
                <li v-if="panel === 'admin' && orgName"><span><Building2 :size="13" /> Organization</span><b>{{ orgName }}</b></li>
                <li v-if="panel === 'admin' && form.assign_me"><span><UserCheck :size="13" /> Owner</span><b>You</b></li>
                <li><span><AlignLeft :size="13" /> Details</span><b>{{ form.description ? `${descWords} words` : 'None added' }}</b></li>
              </ul>
              <div class="who-card">
                <span class="who-ava">{{ initials }}</span>
                <div class="who-body">
                  <span class="who-eyebrow">{{ panel === 'admin' ? 'RAISED BY AGENT' : 'REQUESTER' }}</span>
                  <span class="who-name">{{ me.name || 'You' }}</span>
                  <span v-if="me.email" class="who-mail">{{ me.email }}</span>
                </div>
                <span class="who-stamp">VERIFIED</span>
              </div>
              <p class="wiz-fineprint"><Info :size="12" /> {{ panel === 'admin'
                ? 'The desk SLA clock starts the moment this ticket is created.'
                : 'Support will be notified instantly. Track replies under My Tickets.' }}</p>
            </template>
          </Motion>

          <p v-if="error" class="wiz-error"><AlertCircle :size="14" /> {{ error }}</p>
        </div>

        <!-- LIVE PREVIEW — the "Support Pass" -->
        <aside class="wiz-preview">
          <div class="pass" :class="{ ready: isValid }">
            <span class="pass-grain" aria-hidden="true" />
            <div class="pass-head">
              <span class="pass-type"><component :is="curTypeIcon" :size="14" /> {{ typeLabelOf(form.ticket_type) }}</span>
              <span class="pass-stamp" :class="{ ready: isValid }">{{ isValid ? 'READY' : 'DRAFT' }}</span>
            </div>
            <p class="pass-subject" :class="{ ph: !form.subject }">{{ form.subject || 'Your subject appears here…' }}</p>
            <div class="pass-pills">
              <span class="pass-pri" :style="{ '--pc': priColor(form.priority) }"><i /> {{ priLabelOf(form.priority) }}</span>
              <span v-if="categoryName" class="pass-cat">{{ categoryName }}{{ subcategoryName ? ' › ' + subcategoryName : '' }}</span>
            </div>
            <p class="pass-desc">{{ descPreview }}</p>
            <div class="pass-divider" aria-hidden="true"><span v-for="n in 28" :key="n" /></div>
            <div class="pass-foot">
              <span class="pass-no sd-mono">SD-{{ '—'.repeat(6) }}</span>
              <span class="pass-who">{{ panel === 'admin' && orgName ? orgName : (me.name || 'You') }}</span>
            </div>
            <span class="pass-shine" aria-hidden="true" />
          </div>
          <p class="pass-hint"><Sparkles :size="12" /> {{ stepHint }}</p>
        </aside>
      </div>
    </div>

    <template #footer>
      <button v-if="step > 0" class="wiz-btn ghost" type="button" @click="prev"><ChevronLeft :size="15" /> Back</button>
      <button class="wiz-btn ghost" type="button" @click="$emit('close')">Cancel</button>
      <span class="wiz-spacer" />
      <button v-if="step < steps.length - 1" class="wiz-btn primary" type="button" :disabled="!canNext" @click="next">
        Continue <ChevronRight :size="15" />
      </button>
      <button v-else class="wiz-btn primary" type="button" :disabled="saving || !isValid" @click="submit">
        <component :is="saving ? LoaderCircle : Send" :size="15" :class="{ spin: saving }" />
        {{ saving ? 'Submitting…' : 'Submit ticket' }}
      </button>
    </template>
  </SdModalShell>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  Check, ChevronLeft, ChevronRight, Send, LoaderCircle, X, UserCheck, Tag, Flag, Layers,
  Building2, AlignLeft, Info, AlertCircle, Sparkles, Tags, FileText, ClipboardList,
  AlertTriangle, Inbox, Bug, MessageCircleWarning, GitPullRequest, Wrench, GraduationCap, Hammer,
  UploadCloud, Paperclip,
} from 'lucide-vue-next'
import SdModalShell from '../components/SdModalShell.vue'
import SdSelect from '../components/SdSelect.vue'
import {
  createTicket, createMyTicket, getMe, loadPickers, usePickers, uploadSupportFile,
  PRIORITIES, TICKET_TYPES, SOURCES, priorityColor, priorityFromMatrix, priorityP,
} from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  panel: { type: String, default: 'admin' },
})
const emit = defineEmits(['close', 'created'])

const pickers = usePickers()
const saving = ref(false)
const error = ref('')
const me = ref({ id: null, name: '', email: '' })

const eyebrow = computed(() => (props.panel === 'admin' ? 'NEW TICKET · AGENT' : 'NEW TICKET'))
const title = computed(() => (props.panel === 'admin' ? 'Raise a ticket' : 'Raise a support ticket'))

/* ─── form ─── */
const blank = () => ({
  subject: '', description: '', priority: 'medium', ticket_type: 'incident',
  impact: '', urgency: '',
  category_id: '', subcategory_id: '', source: 'internal', organization_id: '',
  contact_name: '', contact_email: '', contact_phone: '', sla_package_id: '',
  assign_me: false, tags: [], attachments: [],
})
const form = ref(blank())
const tagInput = ref('')
const tagFocus = ref(false)

/* ── attachments ── */
const uploading = ref(false)
const fileErr = ref('')
const fileInput = ref(null)
const pickFiles = () => fileInput.value?.click()
const onFiles = async (e) => {
  const files = Array.from(e.target.files || [])
  if (!files.length) return
  uploading.value = true; fileErr.value = ''
  for (const f of files) {
    if (f.size > 5 * 1024 * 1024) { fileErr.value = `${f.name} exceeds 5MB`; continue }
    try { form.value.attachments.push(await uploadSupportFile(f)) }
    catch (err) { fileErr.value = err?.response?.data?.detail || `Could not upload ${f.name}` }
  }
  uploading.value = false
  if (fileInput.value) fileInput.value.value = ''
}
const removeFile = (i) => form.value.attachments.splice(i, 1)
const addTag = () => {
  const v = tagInput.value.trim()
  if (v && !form.value.tags.includes(v) && form.value.tags.length < 8) form.value.tags.push(v)
  tagInput.value = ''
}
const onTagBackspace = () => { if (!tagInput.value && form.value.tags.length) form.value.tags.pop() }

/* ─── type / priority meta ─── */
const TYPE_ICONS = {
  incident: AlertTriangle, service_request: Inbox, bug: Bug, feature_request: Sparkles,
  complaint: MessageCircleWarning, change: GitPullRequest, problem: Wrench,
  training: GraduationCap, implementation: Hammer,
}
const TYPE_OPTS = TICKET_TYPES.map(t => ({ ...t, icon: TYPE_ICONS[t.value] || Inbox }))
const SOURCE_OPTS = SOURCES
const priColor = (v) => priorityColor(v)
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '')
const typeLabelOf = (v) => TICKET_TYPES.find(t => t.value === v)?.label || v
const priLabelOf = (v) => PRIORITIES.find(p => p.value === v)?.label || v
const curTypeIcon = computed(() => TYPE_ICONS[form.value.ticket_type] || Inbox)

/* ─── pickers + request_type → category → subcategory cascade ─── */
const allCats = computed(() => pickers.categories || [])
const mainCatOpts = computed(() => [
  { value: '', label: 'Select a category…' },
  ...allCats.value
    .filter(c => !c.parent_id && (!(c.request_types || []).length || (c.request_types || []).includes(form.value.ticket_type)))
    .map(c => ({ value: c.id, label: c.name })),
])
const subCatOpts = computed(() => allCats.value
  .filter(c => String(c.parent_id) === String(form.value.category_id))
  .map(c => ({ value: c.id, label: c.name })))
const hasSubs = computed(() => !!form.value.category_id && subCatOpts.value.length > 0)
const categoryName = computed(() => allCats.value.find(c => c.id === form.value.category_id)?.name || '')
const subcategoryName = computed(() => allCats.value.find(c => c.id === form.value.subcategory_id)?.name || '')
const orgOpts = computed(() => [{ value: '', label: 'None (ad-hoc contact)' }, ...(pickers.organizations || []).map(o => ({ value: o.id, label: o.name, icon: Building2 }))])
const slaOpts = computed(() => [{ value: '', label: 'Auto (org / default)' }, ...(pickers.slaPackages || []).map(p => ({ value: p.id, label: p.name }))])
const orgName = computed(() => (pickers.organizations || []).find(o => o.id === form.value.organization_id)?.name || '')

// reset the cascade when the request type or main category changes
watch(() => form.value.ticket_type, () => {
  if (!mainCatOpts.value.some(o => o.value && o.value === form.value.category_id)) {
    form.value.category_id = ''; form.value.subcategory_id = ''
  }
})
watch(() => form.value.category_id, () => {
  if (!subCatOpts.value.some(o => o.value === form.value.subcategory_id)) form.value.subcategory_id = ''
})

/* ─── Impact × Urgency → Priority matrix (the ITIL grid) ─── */
const IMPACT_AXIS = [
  { value: 'critical', label: 'Critical', hint: 'Business-wide' },
  { value: 'high', label: 'High', hint: 'Many users' },
  { value: 'medium', label: 'Moderate', hint: 'Some users' },
  { value: 'low', label: 'Low', hint: 'Single user' },
]
const URGENCY_AXIS = [
  { value: 'critical', label: 'Immediate', hint: 'Now' },
  { value: 'high', label: 'High', hint: '1–2 days' },
  { value: 'medium', label: 'Moderate', hint: 'Up to a week' },
  { value: 'low', label: 'Low', hint: 'Flexible' },
]
const cellPriority = (impact, urgency) => priorityFromMatrix(impact, urgency)
const matrixChosen = computed(() => !!form.value.impact && !!form.value.urgency)
const selectCell = (impact, urgency) => {
  form.value.impact = impact; form.value.urgency = urgency
  const p = priorityFromMatrix(impact, urgency); if (p) form.value.priority = p
}

/* ─── steps (panel-aware) ─── */
const steps = computed(() => props.panel === 'admin'
  ? [
      { key: 'classify', label: 'Classify', icon: Tags },
      { key: 'describe', label: 'Describe', icon: FileText },
      { key: 'context', label: 'Context', icon: Building2 },
      { key: 'review', label: 'Review', icon: ClipboardList },
    ]
  : [
      { key: 'classify', label: 'Classify', icon: Tags },
      { key: 'describe', label: 'Describe', icon: FileText },
      { key: 'review', label: 'Review', icon: ClipboardList },
    ])
const step = ref(0)
const maxReached = ref(0)
const curKey = computed(() => steps.value[step.value]?.key)
const subjectOk = computed(() => form.value.subject.trim().length > 2)
const isValid = computed(() => subjectOk.value)
const canNext = computed(() => {
  // Block leaving Describe without a subject; other steps are free to advance.
  if (curKey.value === 'describe') return subjectOk.value
  return true
})
const next = () => { if (step.value < steps.value.length - 1 && canNext.value) { step.value++; maxReached.value = Math.max(maxReached.value, step.value) } }
const prev = () => { if (step.value > 0) step.value-- }
const goStep = (i) => { if (i <= maxReached.value) step.value = i }

const descWords = computed(() => form.value.description.trim() ? form.value.description.trim().split(/\s+/).length : 0)
const descPreview = computed(() => {
  const d = form.value.description.trim()
  if (!d) return 'No details added yet — the more context, the faster the resolution.'
  return d.length > 150 ? d.slice(0, 150) + '…' : d
})
const initials = computed(() => {
  const n = (me.value.name || 'You').trim()
  return n.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'Y'
})
const stepHint = computed(() => ({
  classify: 'Type + priority steer routing and the SLA clock.',
  describe: 'A sharp subject and rich detail resolve faster.',
  context: 'Link the requester so the right team owns it.',
  review: isValid.value ? 'Looks good — submit when ready.' : 'Add a subject to finish.',
}[curKey.value] || ''))

/* ─── lifecycle ─── */
watch(() => props.open, (v) => {
  if (!v) return
  form.value = blank(); error.value = ''; step.value = 0; maxReached.value = 0; tagInput.value = ''
  loadPickers()
  getMe().then(m => {
    me.value = { id: m?.id || null, name: m?.full_name || m?.name || '', email: m?.email || '' }
    if (props.panel === 'admin') {
      if (!form.value.contact_name) form.value.contact_name = me.value.name
      if (!form.value.contact_email) form.value.contact_email = me.value.email
    }
  }).catch(() => {})
})

const submit = async () => {
  if (!isValid.value) { error.value = 'A subject is required.'; step.value = steps.value.findIndex(s => s.key === 'describe'); return }
  saving.value = true; error.value = ''
  try {
    let created
    if (props.panel === 'admin') {
      const payload = {
        subject: form.value.subject.trim(),
        description: form.value.description || undefined,
        priority: form.value.priority, ticket_type: form.value.ticket_type,
        impact: form.value.impact || undefined, urgency: form.value.urgency || undefined,
        source: form.value.source,
        category_id: form.value.category_id || undefined,
        subcategory_id: form.value.subcategory_id || undefined,
        organization_id: form.value.organization_id || undefined,
        contact_name: form.value.contact_name || undefined,
        contact_email: form.value.contact_email || undefined,
        contact_phone: form.value.contact_phone || undefined,
        sla_package_id: form.value.sla_package_id || undefined,
        tags: form.value.tags.length ? form.value.tags : undefined,
        attachments: form.value.attachments.length ? form.value.attachments : undefined,
      }
      if (form.value.assign_me && me.value.id) payload.assigned_agent_id = me.value.id
      created = await createTicket(payload)
    } else {
      created = await createMyTicket({
        subject: form.value.subject.trim(),
        description: form.value.description || undefined,
        priority: form.value.priority, ticket_type: form.value.ticket_type,
        impact: form.value.impact || undefined, urgency: form.value.urgency || undefined,
        category_id: form.value.category_id || undefined,
        subcategory_id: form.value.subcategory_id || undefined,
        tags: form.value.tags.length ? form.value.tags : undefined,
        attachments: form.value.attachments.length ? form.value.attachments : undefined,
      })
    }
    emit('created', created)
  } catch (e) {
    error.value = e?.response?.data?.detail || 'Failed to create ticket.'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.wiz { display: flex; flex-direction: column; gap: 18px; }

/* stepper */
.wiz-steps { display: flex; align-items: center; gap: 0; }
.wstep { position: relative; flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6px; background: none; border: 0; cursor: pointer; padding: 0; font-family: inherit; }
.wstep:disabled { cursor: default; }
.wstep-node { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; color: var(--sd-text-muted); background: var(--sd-surface); border: 1.5px solid var(--sd-border-strong); transition: all 0.28s var(--sd-spring); z-index: 1; }
.wstep.on .wstep-node { color: #1a1206; background: var(--sd-grad-hero); border-color: transparent; box-shadow: 0 0 0 4px var(--sd-amber-soft); }
[data-theme="light"] .wstep.on .wstep-node { color: #fff8ec; }
.wstep.done .wstep-node { color: var(--sd-success); border-color: color-mix(in srgb, var(--sd-success) 45%, transparent); background: var(--sd-success-soft); }
.wstep-lbl { font-size: 11px; font-weight: 700; letter-spacing: 0.02em; color: var(--sd-text-muted); }
.wstep.on .wstep-lbl { color: var(--sd-text); }
.wstep-line { position: absolute; top: 15px; left: calc(50% + 18px); right: calc(-50% + 18px); height: 2px; background: var(--sd-border-strong); }
.wstep-line.lit { background: linear-gradient(90deg, var(--sd-amber), var(--sd-ember)); }

/* grid: form + live preview */
.wiz-grid { display: grid; grid-template-columns: minmax(0, 1fr) 270px; gap: 22px; align-items: start; }
.wiz-form { min-width: 0; min-height: 318px; }
.wiz-pane { display: flex; flex-direction: column; gap: 14px; }

.wiz-q { font-size: 13.5px; font-weight: 700; color: var(--sd-text); margin: 0; }
.wiz-q.mt { margin-top: 4px; }

.type-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; }
.type-chip { display: flex; flex-direction: column; align-items: center; gap: 7px; padding: 13px 8px; border-radius: 13px; cursor: pointer; font-family: inherit; background: var(--sd-surface); border: 1px solid var(--sd-border); transition: all 0.2s var(--sd-spring); }
.type-chip:hover { border-color: var(--sd-amber-border); transform: translateY(-2px); }
.type-chip.on { border-color: transparent; background: var(--sd-amber-soft); box-shadow: 0 0 0 1.5px var(--sd-amber-border) inset; }
.tc-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; color: var(--sd-amber); background: color-mix(in srgb, var(--sd-amber) 12%, transparent); }
.type-chip.on .tc-ic { color: #1a1206; background: var(--sd-grad-hero); }
[data-theme="light"] .type-chip.on .tc-ic { color: #fff8ec; }
.tc-lbl { font-size: 11px; font-weight: 600; color: var(--sd-text-secondary); text-align: center; line-height: 1.2; }
.type-chip.on .tc-lbl { color: var(--sd-text); }

.pri-bar { display: flex; gap: 6px; }
.pri-seg { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 10px 4px; border-radius: 11px; cursor: pointer; font-family: inherit; background: var(--sd-surface); border: 1px solid var(--sd-border); transition: all 0.2s var(--sd-spring); }
.pri-seg:hover { border-color: color-mix(in srgb, var(--pc) 45%, transparent); }
.pri-seg.on { background: color-mix(in srgb, var(--pc) 14%, transparent); border-color: color-mix(in srgb, var(--pc) 55%, transparent); }
.pri-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--pc); box-shadow: 0 0 8px color-mix(in srgb, var(--pc) 55%, transparent); }
.pri-lbl { font-size: 10.5px; font-weight: 700; color: var(--sd-text-muted); }
.pri-seg.on .pri-lbl { color: var(--sd-text); }

.wiz-field { display: flex; flex-direction: column; gap: 7px; position: relative; }
.wiz-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
.wiz-label { font-size: 12px; font-weight: 600; color: var(--sd-text-secondary); }
.wiz-label em { color: var(--sd-danger); font-style: normal; }
.wiz-label .opt { font-style: normal; font-weight: 500; color: var(--sd-text-dim); font-size: 11px; }
.wiz-input { width: 100%; padding: 11px 13px; border-radius: 11px; font-size: 14px; font-family: inherit; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text); transition: border-color 0.2s, box-shadow 0.2s; }
.wiz-input::placeholder { color: var(--sd-text-dim); }
.wiz-input:focus { outline: none; border-color: var(--sd-amber-border); box-shadow: 0 0 0 3px var(--sd-amber-soft); }
textarea.wiz-input { resize: vertical; line-height: 1.5; }
.wiz-counter { position: absolute; right: 12px; top: 0; font-size: 10.5px; font-family: var(--sd-mono); color: var(--sd-text-dim); }

.tagbox { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; padding: 8px 10px; border-radius: 11px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); }
.tagbox.focused { border-color: var(--sd-amber-border); box-shadow: 0 0 0 3px var(--sd-amber-soft); }
.tag { display: inline-flex; align-items: center; gap: 4px; padding: 3px 4px 3px 9px; border-radius: 999px; font-size: 12px; font-weight: 600; color: var(--sd-amber); background: var(--sd-amber-soft); border: 1px solid var(--sd-amber-border); }
.tag button { display: grid; place-items: center; width: 16px; height: 16px; border-radius: 50%; border: none; cursor: pointer; color: var(--sd-amber); background: color-mix(in srgb, var(--sd-amber) 18%, transparent); }
.tag-input { flex: 1; min-width: 90px; background: none; border: none; outline: none; color: var(--sd-text); font-size: 13.5px; font-family: inherit; padding: 4px 2px; }

/* impact × urgency */
.iu-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.iu-col { display: flex; flex-direction: column; gap: 6px; }
.iu-lbl { font-size: 11px; font-weight: 600; color: var(--sd-text-muted); }
.iu-bar { display: flex; gap: 5px; }
.iu-seg { flex: 1; padding: 8px 4px; border-radius: 9px; font-size: 11px; font-weight: 650; cursor: pointer; font-family: inherit; color: var(--sd-text-muted); background: var(--sd-surface); border: 1px solid var(--sd-border); transition: all 0.18s var(--sd-spring); }
.iu-seg:hover { border-color: var(--sd-amber-border); }
.iu-seg.on { color: var(--sd-text); background: var(--sd-amber-soft); border-color: var(--sd-amber-border); }

/* request_type → category → subcategory cascade */
.cascade { display: grid; gap: 9px; }
.cascade-hint { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: var(--sd-text-dim); margin: 4px 0 0; }

/* Impact × Urgency matrix */
.matrix { display: grid; grid-template-columns: 1.05fr repeat(4, 1fr); gap: 5px; align-items: stretch; }
.mx-corner { }
.mx-head { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 1px; text-align: center; font-size: 10px; font-weight: 700; color: var(--sd-text-secondary); padding: 2px; }
.mx-head i, .mx-rowhead i { font-style: normal; font-size: 8.5px; font-weight: 500; color: var(--sd-text-dim); }
.mx-rowhead { display: flex; flex-direction: column; justify-content: center; gap: 1px; font-size: 10.5px; font-weight: 700; color: var(--sd-text-secondary); padding-right: 5px; }
.mx-cell { display: grid; place-items: center; min-height: 38px; border-radius: 9px; font-size: 12px; font-weight: 800; cursor: pointer; font-family: var(--sd-mono); border: 1px solid transparent; color: #fff; transition: transform 0.16s var(--sd-spring), filter 0.16s, box-shadow 0.16s; }
.mx-cell.p-critical { background: color-mix(in srgb, var(--sd-pri-critical) 80%, transparent); }
.mx-cell.p-high { background: color-mix(in srgb, #f97316 78%, transparent); }
.mx-cell.p-medium { background: color-mix(in srgb, #eab308 82%, transparent); color: #3a2a06; }
.mx-cell.p-low { background: color-mix(in srgb, var(--sd-success) 74%, transparent); color: #06281c; }
.mx-cell:hover { transform: translateY(-1px); filter: brightness(1.08); }
.mx-cell.on { box-shadow: 0 0 0 2px var(--sd-surface-elevated), 0 0 0 4px var(--sd-text); transform: translateY(-1px) scale(1.04); }
.mx-out { margin-top: 11px; }
.mx-derived { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; color: var(--pc, var(--sd-text)); padding: 6px 13px; border-radius: 999px; background: color-mix(in srgb, var(--pc, var(--sd-steel)) 13%, transparent); border: 1px solid color-mix(in srgb, var(--pc, var(--sd-steel)) 32%, transparent); }
.mx-derived i { width: 7px; height: 7px; border-radius: 50%; background: var(--pc); }
.mx-derived em { font-style: normal; font-weight: 500; font-size: 11px; color: var(--sd-text-muted); }
.mx-derived.ph { color: var(--sd-text-dim); background: var(--sd-surface); border: 1px dashed var(--sd-border-strong); }

/* attachments dropzone */
.dropzone { position: relative; display: flex; align-items: center; justify-content: center; gap: 9px; padding: 16px; border-radius: 12px; cursor: pointer; font-size: 12.5px; color: var(--sd-text-muted); background: var(--sd-surface-glass); border: 1.5px dashed var(--sd-border-strong); transition: all 0.2s var(--sd-spring); }
.dropzone:hover { border-color: var(--sd-amber-border); color: var(--sd-text-secondary); background: var(--sd-amber-soft); }
.dropzone.busy { pointer-events: none; opacity: 0.7; }
.dz-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.dropzone .spin { animation: sd-spin-slow 1s linear infinite; }
.att-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 9px; }
.att { display: inline-flex; align-items: center; gap: 5px; padding: 5px 6px 5px 10px; border-radius: 9px; font-size: 11.5px; color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border); max-width: 100%; }
.att i { font-style: normal; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 160px; }
.att button { display: grid; place-items: center; width: 16px; height: 16px; border-radius: 50%; border: none; cursor: pointer; color: var(--sd-text-muted); background: var(--sd-border-strong); flex-shrink: 0; }
.att button:hover { color: var(--sd-danger); }
.att-err { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--sd-danger); margin: 6px 0 0; }

.assign-toggle { display: flex; align-items: center; gap: 9px; padding: 8px 11px; border-radius: 11px; cursor: pointer; font-family: inherit; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); transition: all 0.2s var(--sd-spring); }
.assign-toggle .at-knob { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; color: var(--sd-text-muted); background: var(--sd-surface); transition: all 0.24s var(--sd-spring); }
.assign-toggle.on { border-color: var(--sd-amber-border); background: var(--sd-amber-soft); }
.assign-toggle.on .at-knob { color: #1a1206; background: var(--sd-grad-hero); }
[data-theme="light"] .assign-toggle.on .at-knob { color: #fff8ec; }
.at-lbl { font-size: 13px; font-weight: 600; color: var(--sd-text-secondary); }
.assign-toggle.on .at-lbl { color: var(--sd-text); }

.review-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 1px; border-radius: 12px; overflow: hidden; border: 1px solid var(--sd-border); }
.review-list li { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 14px; background: var(--sd-surface); font-size: 13px; }
.review-list li span { display: inline-flex; align-items: center; gap: 7px; color: var(--sd-text-muted); }
.review-list li b { color: var(--sd-text); font-weight: 700; text-align: right; }
.who-card { display: flex; align-items: center; gap: 12px; padding: 13px 15px; border-radius: 13px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); position: relative; }
.who-ava { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 12px; font-weight: 800; font-size: 15px; color: #1a1206; background: var(--sd-grad-hero); flex-shrink: 0; }
[data-theme="light"] .who-ava { color: #fff8ec; }
.who-body { display: flex; flex-direction: column; min-width: 0; }
.who-eyebrow { font-family: var(--sd-mono); font-size: 9px; font-weight: 700; letter-spacing: 0.14em; color: var(--sd-text-muted); }
.who-name { font-size: 14px; font-weight: 700; color: var(--sd-text); }
.who-mail { font-size: 11.5px; color: var(--sd-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.who-stamp { margin-left: auto; font-family: var(--sd-mono); font-size: 9px; font-weight: 800; letter-spacing: 0.1em; color: var(--sd-success); padding: 3px 8px; border-radius: 6px; background: var(--sd-success-soft); border: 1px solid color-mix(in srgb, var(--sd-success) 30%, transparent); }
.wiz-fineprint { display: flex; align-items: center; gap: 7px; font-size: 12px; color: var(--sd-text-muted); margin: 0; }

.wiz-error { display: flex; align-items: center; gap: 7px; color: var(--sd-danger); font-size: 12.5px; margin: 0; padding: 9px 12px; border-radius: 9px; background: var(--sd-danger-soft); }

/* live preview — Support Pass */
.wiz-preview { position: sticky; top: 0; display: flex; flex-direction: column; gap: 10px; }
.pass { position: relative; overflow: hidden; padding: 16px 17px 14px; border-radius: 17px; background: linear-gradient(160deg, var(--sd-surface-elevated), var(--sd-panel)); border: 1px solid var(--sd-border-strong); box-shadow: var(--sd-card-shadow); transition: border-color 0.4s, box-shadow 0.4s; }
.pass.ready { border-color: var(--sd-amber-border); box-shadow: var(--sd-card-shadow), 0 0 28px rgba(251, 146, 60, 0.18); }
.pass-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.4; background-image: radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px); background-size: 3px 3px; }
.pass-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 11px; }
.pass-type { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; color: var(--sd-amber); }
.pass-stamp { font-family: var(--sd-mono); font-size: 9px; font-weight: 800; letter-spacing: 0.12em; padding: 3px 8px; border-radius: 6px; color: var(--sd-text-muted); background: var(--sd-surface); border: 1px dashed var(--sd-border-strong); }
.pass-stamp.ready { color: var(--sd-success); background: var(--sd-success-soft); border-style: solid; border-color: color-mix(in srgb, var(--sd-success) 32%, transparent); }
.pass-subject { font-size: 15px; font-weight: 750; color: var(--sd-text); margin: 0 0 10px; line-height: 1.3; min-height: 2.6em; }
.pass-subject.ph { color: var(--sd-text-dim); font-weight: 500; font-style: italic; }
.pass-pills { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 11px; }
.pass-pri { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; color: var(--pc); padding: 3px 9px; border-radius: 999px; background: color-mix(in srgb, var(--pc) 13%, transparent); border: 1px solid color-mix(in srgb, var(--pc) 30%, transparent); }
.pass-pri i { width: 6px; height: 6px; border-radius: 50%; background: var(--pc); }
.pass-cat { font-size: 11px; font-weight: 600; color: var(--sd-text-secondary); padding: 3px 9px; border-radius: 999px; background: var(--sd-surface); border: 1px solid var(--sd-border); }
.pass-desc { font-size: 11.5px; color: var(--sd-text-muted); line-height: 1.5; margin: 0 0 12px; min-height: 3em; }
.pass-divider { display: flex; gap: 3px; margin-bottom: 11px; opacity: 0.5; }
.pass-divider span { flex: 1; height: 9px; background: var(--sd-text-dim); border-radius: 1px; }
.pass-divider span:nth-child(odd) { height: 13px; opacity: 0.7; }
.pass-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.pass-no { font-size: 11px; color: var(--sd-text-dim); letter-spacing: 0.1em; }
.pass-who { font-size: 11px; font-weight: 600; color: var(--sd-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 50%; }
.pass-shine { position: absolute; top: 0; left: 0; width: 40%; height: 100%; pointer-events: none; background: linear-gradient(105deg, transparent, rgba(255,255,255,0.08), transparent); transform: translateX(-130%) skewX(-18deg); animation: sd-sheen-pass 6s ease-in-out infinite; }
.pass.ready .pass-shine { animation-duration: 3.4s; }
.pass-hint { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--sd-text-dim); margin: 0; line-height: 1.4; }

/* footer buttons */
.wiz-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 18px; border-radius: 11px; font-size: 13.5px; font-weight: 700; cursor: pointer; font-family: inherit; border: 1px solid transparent; transition: all 0.2s var(--sd-spring); }
.wiz-btn.ghost { color: var(--sd-text-secondary); background: var(--sd-surface); border-color: var(--sd-border-strong); }
.wiz-btn.ghost:hover { color: var(--sd-text); border-color: var(--sd-amber-border); }
.wiz-btn.primary { color: #1a1206; background: var(--sd-grad-hero); box-shadow: 0 8px 22px rgba(251, 146, 60, 0.3); }
[data-theme="light"] .wiz-btn.primary { color: #fff8ec; }
.wiz-btn.primary:hover:not(:disabled) { transform: translateY(-1px); }
.wiz-btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
.wiz-btn .spin { animation: sd-spin-slow 1s linear infinite; }
.wiz-spacer { flex: 1; }

@media (max-width: 720px) {
  .wiz-grid { grid-template-columns: 1fr; }
  .wiz-preview { order: -1; }
  .pass-subject, .pass-desc { min-height: 0; }
  .wiz-form { min-height: 0; }
}
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .pass-shine, html:not([data-cinematic="on"]) .wiz-btn .spin { animation: none; }
}
</style>
