<template>
  <SdModalShell :open="open" :eyebrow="editing ? 'EDIT PLATE' : 'CUT A NEW PLATE'"
    :title="editing ? form.name || 'Edit template' : 'New template'" width="940px" @close="$emit('close')">
    <div class="tw">
      <!-- ── step rail ── -->
      <div class="tw-steps" role="tablist" aria-label="Wizard steps">
        <button v-for="(s, i) in STEPS" :key="s.key" class="tw-step" :class="{ on: step === i + 1, done: step > i + 1 }"
          role="tab" :aria-selected="step === i + 1" @click="goto(i + 1)">
          <span class="tw-step-n sd-mono">{{ step > i + 1 ? '✓' : i + 1 }}</span>
          <span class="tw-step-lb">{{ s.label }}</span>
        </button>
        <span class="tw-step-track" aria-hidden="true"><i :style="{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }" /></span>
      </div>

      <div class="tw-body">
        <!-- ── stage (left) ── -->
        <div class="tw-stage sd-scroll">
          <Presence mode="wait">
            <!-- 1 · IDENTITY -->
            <Motion v-if="step === 1" key="s1" as="div" class="tw-pane" v-bind="paneMotion">
              <label class="tw-f"><span>Template name <b class="req">*</b></span>
                <input v-model="form.name" class="tw-inp" maxlength="120" placeholder="e.g. VPN access outage" />
              </label>
              <label class="tw-f"><span>Description <em>— when should an agent reach for this plate?</em></span>
                <input v-model="form.description" class="tw-inp" placeholder="Use for site-wide VPN failures reported by any office" />
              </label>
              <div class="tw-f"><span>Seal</span>
                <div class="tw-seals">
                  <button v-for="(comp, key) in ICONS" :key="key" class="tw-seal" :class="{ on: form.icon === key }"
                    :title="key" @click="form.icon = key"><component :is="comp" :size="15" /></button>
                  <input v-model="emojiInput" class="tw-inp tw-emoji" maxlength="4" placeholder="or emoji…"
                    @input="onEmoji" />
                </div>
              </div>
              <div class="tw-f"><span>Plate accent</span>
                <div class="tw-swatches">
                  <button v-for="c in ACCENTS" :key="c" class="tw-swatch" :class="{ on: form.accent === c }"
                    :style="{ '--c': c }" :title="c" @click="form.accent = c" />
                </div>
              </div>
              <label class="tw-check">
                <input v-model="form.pinned" type="checkbox" />
                <span><Pin :size="12" /> Pin to the top of the case</span>
              </label>
            </Motion>

            <!-- 2 · CONTENT -->
            <Motion v-else-if="step === 2" key="s2" as="div" class="tw-pane" v-bind="paneMotion">
              <label class="tw-f"><span>Subject template</span>
                <input ref="subjectEl" v-model="form.subject" class="tw-inp" maxlength="300"
                  placeholder="VPN down for {{requester.name}}" @focus="focusField = 'subject'" />
              </label>
              <label class="tw-f"><span>Body template</span>
                <textarea ref="bodyEl" v-model="form.body" rows="7" class="tw-inp tw-area"
                  placeholder="Reported by {{requester.email}} ({{requester.department}})&#10;&#10;Symptoms:&#10;- " @focus="focusField = 'body'" />
              </label>
              <div class="tw-f"><span>Variables <em>— click to insert at the caret; they resolve when the plate is struck</em></span>
                <div class="tw-vars">
                  <button v-for="v in TEMPLATE_VARIABLES" :key="v.token" class="tw-var sd-mono" :title="v.hint"
                    @mousedown.prevent @click="insertVar(v.token)">{{ v.token }}</button>
                </div>
              </div>
              <p v-if="unknownTokens.length" class="tw-warn">
                <TriangleAlert :size="13" /> Unknown token{{ unknownTokens.length > 1 ? 's' : '' }}:
                {{ unknownTokens.join(', ') }} — these will stay as-is on the ticket.
              </p>
              <div class="tw-f"><span>Tags <em>— {{ form.tags.length }}/12</em></span>
                <div class="tw-tagbox" @click="$refs.tagEl?.focus()">
                  <span v-for="tag in form.tags" :key="tag" class="tw-tagchip">#{{ tag }}
                    <button class="tw-tagx" @click.stop="form.tags = form.tags.filter(x => x !== tag)"><X :size="10" /></button>
                  </span>
                  <input ref="tagEl" v-model="tagInput" class="tw-taginp" :placeholder="form.tags.length ? '' : 'vpn, network, outage…'"
                    @keydown.enter.prevent="addTag" @keydown="onTagKey" @blur="addTag" />
                </div>
              </div>
            </Motion>

            <!-- 3 · DEFAULTS -->
            <Motion v-else-if="step === 3" key="s3" as="div" class="tw-pane" v-bind="paneMotion">
              <div class="tw-grid2">
                <div class="tw-f"><span>Priority</span><SdSelect v-model="form.priority" :options="priOpts" /></div>
                <div class="tw-f"><span>Request type</span><SdSelect v-model="form.ticket_type" :options="typeOpts" /></div>
                <div class="tw-f"><span>Category</span><SdSelect v-model="form.category_id" :options="catOpts" placeholder="No category" /></div>
                <div class="tw-f"><span>Route to team</span><SdSelect v-model="form.team_id" :options="teamOpts" placeholder="Auto-routing decides" /></div>
                <div class="tw-f"><span>SLA package</span><SdSelect v-model="form.default_sla_package_id" :options="slaOpts" placeholder="Resolve from org / team" /></div>
                <div class="tw-f"><span>Default assignee</span><SdSelect v-model="form.default_assignee_id" :options="agentOpts" placeholder="Auto-assign decides" /></div>
              </div>
              <p class="tw-hint"><Info :size="13" /> Defaults prefill the intake — the agent can still change anything before submitting.</p>
            </Motion>

            <!-- 4 · CHECKLIST -->
            <Motion v-else-if="step === 4" key="s4" as="div" class="tw-pane" v-bind="paneMotion">
              <div class="tw-f"><span>Working checklist <em>— lands in the ticket description as task boxes</em></span></div>
              <div v-for="(item, i) in form.checklist" :key="i" class="tw-chk-row">
                <span class="tw-chk-grip sd-mono">{{ i + 1 }}</span>
                <input v-model="item.text" class="tw-inp" placeholder="Step…" @keydown.enter.prevent="addChk(i)" />
                <button class="tw-chk-btn" :disabled="i === 0" title="Move up" @click="moveChk(i, -1)"><ChevronUp :size="13" /></button>
                <button class="tw-chk-btn" :disabled="i === form.checklist.length - 1" title="Move down" @click="moveChk(i, 1)"><ChevronDown :size="13" /></button>
                <button class="tw-chk-btn danger" title="Remove" @click="form.checklist.splice(i, 1)"><X :size="13" /></button>
              </div>
              <button class="tw-add" @click="addChk()"><Plus :size="13" /> Add step</button>
            </Motion>

            <!-- 5 · REVIEW -->
            <Motion v-else key="s5" as="div" class="tw-pane" v-bind="paneMotion">
              <p v-if="!form.name.trim()" class="tw-warn hard"><TriangleAlert :size="13" /> The plate needs a name before it can be cut.</p>
              <p v-if="unknownTokens.length" class="tw-warn"><TriangleAlert :size="13" /> Unknown tokens: {{ unknownTokens.join(', ') }}</p>
              <dl class="tw-review sd-mono">
                <div><dt>PLATE</dt><dd>{{ form.name || '—' }}</dd></div>
                <div><dt>DEFAULTS</dt><dd>{{ reviewDefaults }}</dd></div>
                <div><dt>CONTENT</dt><dd>{{ form.subject ? 'subject' : '' }}{{ form.subject && form.body ? ' + ' : '' }}{{ form.body ? 'body' : '' }}{{ !form.subject && !form.body ? 'empty' : '' }} · {{ form.tags.length }} tag{{ form.tags.length === 1 ? '' : 's' }} · {{ cleanChecklist.length }} step{{ cleanChecklist.length === 1 ? '' : 's' }}</dd></div>
                <div v-if="editing"><dt>VERSION</dt><dd>v{{ template?.version || 1 }}{{ contentChanged ? ` → v${(template?.version || 1) + 1} (content edit creates a revision)` : ' · no content change' }}</dd></div>
              </dl>
              <div v-if="editing && (template?.revisions || []).length" class="tw-revs">
                <p class="tw-revs-title sd-mono">REVISION HISTORY</p>
                <div v-for="r in template.revisions" :key="r.version" class="tw-rev sd-mono">
                  <b>v{{ r.version }}</b>
                  <span class="tw-rev-sub">{{ r.subject || '(no subject)' }}</span>
                  <span class="tw-rev-when">{{ fmtWhen(r.edited_at) }}</span>
                </div>
              </div>
            </Motion>
          </Presence>
        </div>

        <!-- ── live proof preview (right) ── -->
        <aside class="tw-proof">
          <p class="tw-proof-label sd-mono"><Eye :size="11" /> LIVE PROOF · SAMPLE DATA</p>
          <div class="tw-proof-card" :style="{ '--acc': form.accent || 'var(--sd-tpl-core)' }">
            <header class="tw-proof-head">
              <span class="tw-proof-seal">
                <template v-if="isEmoji">{{ form.icon }}</template>
                <component :is="ICONS[form.icon] || Stamp" v-else :size="14" />
              </span>
              <div>
                <p class="tw-proof-name">{{ form.name || 'Unnamed plate' }}</p>
                <p class="tw-proof-desc">{{ form.description || '—' }}</p>
              </div>
              <Pin v-if="form.pinned" :size="12" class="tw-proof-pin" />
            </header>
            <div class="tw-proof-line" />
            <p class="tw-proof-subject">{{ previewSubject || 'Subject preview…' }}</p>
            <p class="tw-proof-body">{{ previewBody || 'Body preview…' }}</p>
            <ul v-if="cleanChecklist.length" class="tw-proof-chk">
              <li v-for="(c, i) in cleanChecklist.slice(0, 5)" :key="i"><Square :size="10" /> {{ c.text }}</li>
              <li v-if="cleanChecklist.length > 5" class="more">+{{ cleanChecklist.length - 5 }} more…</li>
            </ul>
            <div class="tw-proof-meta">
              <SdPill v-if="form.priority" kind="priority" :value="form.priority" />
              <span v-if="form.ticket_type" class="tw-proof-tag">{{ typeLabel(form.ticket_type) }}</span>
              <span v-if="catLabel" class="tw-proof-tag">{{ catLabel }}</span>
              <span v-if="teamLabel" class="tw-proof-tag">{{ teamLabel }}</span>
              <span v-if="slaLabel" class="tw-proof-tag">{{ slaLabel }}</span>
              <span v-if="agentLabel" class="tw-proof-tag">{{ agentLabel }}</span>
            </div>
            <div v-if="form.tags.length" class="tw-proof-tags">
              <span v-for="tag in form.tags" :key="tag">#{{ tag }}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>

    <template #footer>
      <button class="tw-btn ghost" @click="$emit('close')">Cancel</button>
      <button v-if="step > 1" class="tw-btn" @click="step--"><ChevronLeft :size="14" /> Back</button>
      <span class="tw-foot-gap" />
      <button v-if="step < STEPS.length" class="tw-btn primary" :disabled="step === 1 && !form.name.trim()" @click="step++">
        Next <ChevronRight :size="14" />
      </button>
      <template v-else>
        <button v-if="!editing || template?.status === 'draft'" class="tw-btn" :disabled="busy || !form.name.trim()"
          @click="emitSave('draft')"><NotebookPen :size="14" /> Save as draft</button>
        <button class="tw-btn primary" :disabled="busy || !form.name.trim()" @click="emitSave(activateTarget)">
          <Stamp :size="14" /> {{ editing ? (template?.status === 'draft' ? 'Save & activate' : 'Save changes') : 'Save & activate' }}
        </button>
      </template>
    </template>
  </SdModalShell>
</template>

<script setup>
/* SdTemplateWizard — the Copperplate cutting bench. Five steps (Identity ·
   Content · Defaults · Checklist · Review) beside an always-live PROOF pane
   that renders the plate with sample variable data. Variables insert at the
   caret of the last-focused content field. The parent owns the API calls —
   this emits save(payload, statusTarget) where statusTarget is 'draft' |
   'active' | null (keep current status, edit mode). */
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  Pin, X, Plus, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, TriangleAlert,
  Info, Eye, Square, NotebookPen, Stamp,
  KeyRound, Wifi, Monitor, Printer, Mail, Shield, Bug, CreditCard, UserPlus, HardDrive, Wrench,
} from 'lucide-vue-next'
import SdModalShell from '../components/SdModalShell.vue'
import SdSelect from '../components/SdSelect.vue'
import SdPill from '../components/SdPill.vue'
import { PRIORITIES, TICKET_TYPES, typeLabel } from '@/composables/useSupportDesk'
import { TEMPLATE_VARIABLES, SAMPLE_CONTEXT, substituteTemplate, detectUnknownTokens } from '../templateVariables'

const ICONS = { Stamp, KeyRound, Wifi, Monitor, Printer, Mail, Shield, Bug, CreditCard, UserPlus, HardDrive, Wrench }
const ACCENTS = ['#cf7f45', '#eaa36c', '#d9a441', '#e8b04b', '#f0b429', '#9a948c', '#34d399', '#7d7268']
const STEPS = [
  { key: 'identity', label: 'Identity' },
  { key: 'content', label: 'Content' },
  { key: 'defaults', label: 'Defaults' },
  { key: 'checklist', label: 'Checklist' },
  { key: 'review', label: 'Review' },
]

const props = defineProps({
  open: { type: Boolean, default: false },
  template: { type: Object, default: null },   /* detail shape (with revisions) in edit mode */
  pickers: { type: Object, default: () => ({ categories: [], slaPackages: [] }) },
  teams: { type: Array, default: () => [] },
  agents: { type: Array, default: () => [] },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'save'])

const step = ref(1)
const focusField = ref('body')
const subjectEl = ref(null)
const bodyEl = ref(null)
const tagInput = ref('')
const emojiInput = ref('')

const blank = () => ({
  name: '', description: '', icon: 'Stamp', accent: '#cf7f45', pinned: false,
  subject: '', body: '', tags: [], checklist: [{ text: '', done: false }],
  priority: '', ticket_type: '', category_id: '', team_id: '',
  default_sla_package_id: '', default_assignee_id: '',
})
const form = reactive(blank())

const editing = computed(() => !!props.template?.id)
const isEmoji = computed(() => !!form.icon && !/^[A-Za-z]/.test(form.icon))

watch(() => props.open, (o) => {
  if (!o) return
  step.value = 1
  tagInput.value = ''
  const t = props.template
  Object.assign(form, blank(), t ? {
    name: t.name || '', description: t.description || '',
    icon: t.icon || 'Stamp', accent: t.accent || '#cf7f45', pinned: !!t.pinned,
    subject: t.subject || '', body: t.body || '',
    tags: [...(t.tags || [])],
    checklist: (t.checklist || []).length ? t.checklist.map((c) => ({ text: c.text || '', done: false })) : [{ text: '', done: false }],
    priority: t.priority || '', ticket_type: t.ticket_type || '',
    category_id: t.category_id ? String(t.category_id) : '',
    team_id: t.team_id ? String(t.team_id) : '',
    default_sla_package_id: t.default_sla_package_id ? String(t.default_sla_package_id) : '',
    default_assignee_id: t.default_assignee_id ? String(t.default_assignee_id) : '',
  } : {})
  emojiInput.value = isEmoji.value ? form.icon : ''
})

const goto = (n) => { if (n < step.value || form.name.trim()) step.value = n }

const paneMotion = {
  initial: { opacity: 0, x: 26 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -18 },
  transition: { duration: 0.32, ease: [0.16, 1, 0.3, 1] },
}

/* pickers */
const priOpts = computed(() => [{ value: '', label: 'No default' }, ...PRIORITIES])
const typeOpts = computed(() => [{ value: '', label: 'No default' }, ...TICKET_TYPES])
const catOpts = computed(() => [{ value: '', label: 'No category' }, ...(props.pickers.categories || []).map((c) => ({ value: String(c.id), label: c.name }))])
const teamOpts = computed(() => [{ value: '', label: 'Auto-routing decides' }, ...(props.teams || []).map((t) => ({ value: String(t.id), label: t.name }))])
const slaOpts = computed(() => [{ value: '', label: 'Resolve from org / team' }, ...(props.pickers.slaPackages || []).map((s) => ({ value: String(s.id), label: s.name }))])
const agentOpts = computed(() => [{ value: '', label: 'Auto-assign decides' }, ...(props.agents || []).map((a) => ({ value: String(a.id), label: a.full_name || a.email }))])

const labelOf = (opts, v) => (opts.find((o) => o.value === v && v) || {}).label || ''
const catLabel = computed(() => labelOf(catOpts.value, form.category_id))
const teamLabel = computed(() => labelOf(teamOpts.value, form.team_id))
const slaLabel = computed(() => labelOf(slaOpts.value, form.default_sla_package_id))
const agentLabel = computed(() => labelOf(agentOpts.value, form.default_assignee_id))

/* content helpers */
const onEmoji = () => { if (emojiInput.value.trim()) form.icon = emojiInput.value.trim() }
const insertVar = (token) => {
  const isSub = focusField.value === 'subject'
  const el = isSub ? subjectEl.value : bodyEl.value
  const key = isSub ? 'subject' : 'body'
  const cur = form[key] || ''
  const at = el?.selectionStart ?? cur.length
  const end = el?.selectionEnd ?? at
  form[key] = cur.slice(0, at) + token + cur.slice(end)
  nextTick(() => { if (el) { el.focus(); el.selectionStart = el.selectionEnd = at + token.length } })
}
const addTag = () => {
  const v = tagInput.value.replace(/,/g, '').trim().toLowerCase()
  if (v && !form.tags.includes(v) && form.tags.length < 12) form.tags.push(v)
  tagInput.value = ''
}
const onTagKey = (e) => { if (e.key === ',') { e.preventDefault(); addTag() } }
const addChk = (after) => {
  const at = after != null ? after + 1 : form.checklist.length
  form.checklist.splice(at, 0, { text: '', done: false })
}
const moveChk = (i, d) => {
  const j = i + d
  if (j < 0 || j >= form.checklist.length) return
  const [row] = form.checklist.splice(i, 1)
  form.checklist.splice(j, 0, row)
}

const unknownTokens = computed(() => [...new Set([...detectUnknownTokens(form.subject), ...detectUnknownTokens(form.body)])])
const cleanChecklist = computed(() => form.checklist.filter((c) => c.text.trim()))
const previewSubject = computed(() => substituteTemplate(form.subject, SAMPLE_CONTEXT))
const previewBody = computed(() => substituteTemplate(form.body, SAMPLE_CONTEXT))

const contentChanged = computed(() => {
  const t = props.template
  if (!t) return true
  const same = (a, b) => (a || '') === (b || '')
  return !same(form.subject, t.subject) || !same(form.body, t.body)
    || JSON.stringify(cleanChecklist.value) !== JSON.stringify((t.checklist || []).map((c) => ({ text: c.text || '', done: false })))
})
const reviewDefaults = computed(() => {
  const bits = [form.priority, form.ticket_type && typeLabel(form.ticket_type), catLabel.value, teamLabel.value, slaLabel.value, agentLabel.value].filter(Boolean)
  return bits.length ? bits.join(' · ') : 'none — agent decides everything'
})
const activateTarget = computed(() => {
  if (!editing.value) return 'active'
  return props.template?.status === 'draft' ? 'active' : null
})
const fmtWhen = (iso) => {
  try { return new Date(iso).toLocaleString([], { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}

const emitSave = (statusTarget) => {
  const norm = (v) => (v ? v : null)
  emit('save', {
    name: form.name.trim(),
    description: form.description.trim() || null,
    icon: form.icon || null,
    accent: form.accent || null,
    pinned: !!form.pinned,
    subject: form.subject.trim() || null,
    body: form.body || null,
    tags: form.tags,
    checklist: cleanChecklist.value,
    priority: norm(form.priority),
    ticket_type: norm(form.ticket_type),
    category_id: norm(form.category_id),
    team_id: norm(form.team_id),
    default_sla_package_id: norm(form.default_sla_package_id),
    default_assignee_id: norm(form.default_assignee_id),
  }, statusTarget)
}
</script>

<style scoped>
.tw { display: flex; flex-direction: column; gap: 14px; }

/* step rail */
.tw-steps { position: relative; display: flex; gap: 4px; padding-bottom: 10px; }
.tw-step {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 7px;
  padding: 8px 6px; border: none; background: transparent; cursor: pointer;
  color: var(--sd-text-muted); font-size: 11.5px; font-weight: 700; font-family: inherit;
  border-radius: 10px; transition: color 0.2s, background 0.2s;
}
.tw-step.on { color: var(--sd-text); background: var(--sd-tpl-soft); }
.tw-step.done { color: var(--sd-tpl-core); }
.tw-step-n {
  width: 19px; height: 19px; display: grid; place-items: center; border-radius: 50%;
  font-size: 9.5px; border: 1px solid currentColor;
}
.tw-step.on .tw-step-n { background: var(--sd-tpl-grad); border: none; color: #180d05; }
[data-theme="light"] .tw-step.on .tw-step-n { color: #fff6ea; }
.tw-step-track { position: absolute; left: 4px; right: 4px; bottom: 0; height: 2.5px; border-radius: 99px; background: var(--sd-border); overflow: hidden; }
.tw-step-track i { display: block; height: 100%; background: var(--sd-tpl-grad); border-radius: 99px; transition: width 0.45s var(--sd-spring); }

/* two-pane body */
.tw-body { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 18px; }
.tw-stage { min-height: 342px; max-height: 52vh; overflow-y: auto; padding-right: 4px; }
.tw-pane { display: flex; flex-direction: column; gap: 13px; }

.tw-f { display: flex; flex-direction: column; gap: 6px; }
.tw-f > span { font-size: 12px; font-weight: 700; color: var(--sd-text-secondary); }
.tw-f > span em { font-style: normal; font-weight: 500; color: var(--sd-text-muted); }
.req { color: var(--sd-tpl-risk); }
.tw-inp {
  width: 100%; padding: 10px 12px; border-radius: 10px; font-size: 13.5px; font-family: inherit;
  background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.tw-inp:focus { outline: none; border-color: var(--sd-tpl-brd); box-shadow: 0 0 0 3px var(--sd-tpl-soft); }
.tw-area { resize: vertical; min-height: 120px; line-height: 1.5; }

.tw-seals { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.tw-seal {
  width: 34px; height: 34px; display: grid; place-items: center; border-radius: 10px; cursor: pointer;
  background: var(--sd-surface-glass); border: 1px solid var(--sd-border); color: var(--sd-text-secondary);
  transition: border-color 0.15s, color 0.15s, transform 0.15s var(--sd-spring);
}
.tw-seal:hover { transform: translateY(-2px); }
.tw-seal.on { border-color: var(--sd-tpl-core); color: var(--sd-tpl-hi); background: var(--sd-tpl-soft); }
[data-theme="light"] .tw-seal.on { color: var(--sd-tpl-deep); }
.tw-emoji { width: 108px; padding: 7px 10px; }

.tw-swatches { display: flex; gap: 7px; }
.tw-swatch {
  width: 26px; height: 26px; border-radius: 50%; cursor: pointer;
  background: var(--c); border: 2px solid transparent;
  transition: transform 0.15s var(--sd-spring), border-color 0.15s;
}
.tw-swatch:hover { transform: scale(1.15); }
.tw-swatch.on { border-color: var(--sd-text); transform: scale(1.12); }

.tw-check { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--sd-text-secondary); cursor: pointer; }
.tw-check input { accent-color: var(--sd-tpl-core); }
.tw-check span { display: inline-flex; align-items: center; gap: 5px; }

.tw-vars { display: flex; flex-wrap: wrap; gap: 6px; }
.tw-var {
  padding: 4.5px 9px; border-radius: 8px; cursor: pointer; font-size: 10.5px;
  background: var(--sd-tpl-soft); border: 1px solid var(--sd-tpl-brd); color: var(--sd-tpl-hi);
  transition: transform 0.15s var(--sd-spring), background 0.15s;
}
[data-theme="light"] .tw-var { color: var(--sd-tpl-deep); }
.tw-var:hover { transform: translateY(-2px); background: color-mix(in srgb, var(--sd-tpl-core) 22%, transparent); }

.tw-warn {
  display: flex; align-items: center; gap: 7px; margin: 0; padding: 8px 11px; border-radius: 10px;
  font-size: 12px; color: var(--sd-warning, #f0b429);
  background: color-mix(in srgb, var(--sd-warning, #f0b429) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--sd-warning, #f0b429) 30%, transparent);
}
.tw-warn.hard { color: var(--sd-tpl-risk); background: var(--sd-tpl-risk-soft); border-color: color-mix(in srgb, var(--sd-tpl-risk) 35%, transparent); }
.tw-hint { display: flex; align-items: center; gap: 7px; margin: 0; font-size: 12px; color: var(--sd-text-muted); }

.tw-tagbox {
  display: flex; flex-wrap: wrap; gap: 6px; align-items: center; min-height: 42px;
  padding: 7px 10px; border-radius: 10px; cursor: text;
  background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong);
}
.tw-tagchip {
  display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 7px;
  font-size: 11.5px; font-weight: 600; color: var(--sd-tpl-hi);
  background: var(--sd-tpl-soft); border: 1px solid var(--sd-tpl-brd);
}
[data-theme="light"] .tw-tagchip { color: var(--sd-tpl-deep); }
.tw-tagx { display: grid; place-items: center; border: none; background: transparent; cursor: pointer; color: inherit; padding: 0; }
.tw-taginp { flex: 1; min-width: 90px; border: none; outline: none; background: transparent; font-size: 12.5px; font-family: inherit; color: var(--sd-text); }

.tw-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

.tw-chk-row { display: flex; align-items: center; gap: 7px; }
.tw-chk-grip { width: 20px; text-align: center; font-size: 10px; color: var(--sd-text-muted); }
.tw-chk-btn {
  width: 28px; height: 28px; flex: 0 0 auto; display: grid; place-items: center; border-radius: 8px; cursor: pointer;
  background: var(--sd-surface-glass); border: 1px solid var(--sd-border); color: var(--sd-text-muted);
}
.tw-chk-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.tw-chk-btn.danger:hover { color: var(--sd-tpl-risk); border-color: color-mix(in srgb, var(--sd-tpl-risk) 40%, transparent); }
.tw-add {
  align-self: flex-start; display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 12px; border-radius: 9px; cursor: pointer; font-size: 12px; font-weight: 700;
  background: transparent; border: 1px dashed var(--sd-tpl-brd); color: var(--sd-tpl-hi);
}
[data-theme="light"] .tw-add { color: var(--sd-tpl-deep); }

.tw-review { display: flex; flex-direction: column; gap: 9px; margin: 0; }
.tw-review div { display: grid; grid-template-columns: 92px 1fr; gap: 10px; align-items: baseline; }
.tw-review dt { font-size: 9px; letter-spacing: 0.18em; color: var(--sd-text-muted); }
.tw-review dd { margin: 0; font-size: 12.5px; color: var(--sd-text); font-family: var(--sd-font, inherit); }

.tw-revs { border-top: 1px dashed var(--sd-border); padding-top: 11px; }
.tw-revs-title { font-size: 9px; letter-spacing: 0.18em; color: var(--sd-text-muted); margin: 0 0 8px; }
.tw-rev { display: flex; align-items: center; gap: 10px; padding: 5px 0; font-size: 11px; color: var(--sd-text-secondary); }
.tw-rev b { color: var(--sd-tpl-hi); }
[data-theme="light"] .tw-rev b { color: var(--sd-tpl-deep); }
.tw-rev-sub { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tw-rev-when { color: var(--sd-text-muted); }

/* ── live proof pane ── */
.tw-proof { display: flex; flex-direction: column; gap: 8px; }
.tw-proof-label { display: inline-flex; align-items: center; gap: 6px; font-size: 9px; letter-spacing: 0.18em; color: var(--sd-text-muted); margin: 0; }
.tw-proof-card {
  flex: 1; display: flex; flex-direction: column; gap: 9px; padding: 15px 15px 13px;
  border-radius: 14px; position: sticky; top: 0;
  background:
    radial-gradient(90% 60% at 50% 0%, color-mix(in srgb, var(--acc) 10%, transparent), transparent 70%),
    var(--sd-surface);
  border: 1px solid color-mix(in srgb, var(--acc) 35%, var(--sd-border));
}
.tw-proof-head { display: flex; gap: 9px; align-items: flex-start; }
.tw-proof-seal {
  flex: 0 0 auto; width: 30px; height: 30px; display: grid; place-items: center; border-radius: 9px; font-size: 15px;
  background: color-mix(in srgb, var(--acc) 16%, transparent); border: 1px solid color-mix(in srgb, var(--acc) 40%, transparent);
  color: var(--acc);
}
.tw-proof-name { margin: 0; font-size: 13px; font-weight: 800; color: var(--sd-text); }
.tw-proof-desc { margin: 1px 0 0; font-size: 10.5px; color: var(--sd-text-muted); }
.tw-proof-pin { margin-left: auto; color: var(--acc); }
.tw-proof-line { height: 1px; background: linear-gradient(90deg, color-mix(in srgb, var(--acc) 50%, transparent), transparent); }
.tw-proof-subject { margin: 0; font-size: 12.5px; font-weight: 700; color: var(--sd-text); }
.tw-proof-body { margin: 0; font-size: 11.5px; line-height: 1.5; color: var(--sd-text-secondary); white-space: pre-wrap; max-height: 130px; overflow: hidden; }
.tw-proof-chk { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 4px; }
.tw-proof-chk li { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--sd-text-secondary); }
.tw-proof-chk li.more { color: var(--sd-text-muted); }
.tw-proof-meta { display: flex; flex-wrap: wrap; gap: 5px; margin-top: auto; }
.tw-proof-tag {
  font-size: 9.5px; font-weight: 700; padding: 2px 7px; border-radius: 6px;
  color: var(--sd-text-secondary); background: var(--sd-surface-glass); border: 1px solid var(--sd-border);
}
.tw-proof-tags { display: flex; flex-wrap: wrap; gap: 5px; font-size: 10.5px; color: color-mix(in srgb, var(--acc) 80%, var(--sd-text)); }

/* footer */
.tw-btn {
  display: inline-flex; align-items: center; gap: 7px; padding: 9px 15px; border-radius: 11px;
  font-size: 12.5px; font-weight: 700; cursor: pointer;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text);
}
.tw-btn.ghost { background: transparent; color: var(--sd-text-secondary); }
.tw-btn.primary { border: none; background: var(--sd-tpl-grad); color: #180d05; box-shadow: var(--sd-tpl-glow); }
[data-theme="light"] .tw-btn.primary { color: #fff6ea; }
.tw-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.tw-foot-gap { flex: 1; }

@media (max-width: 780px) {
  .tw-body { grid-template-columns: 1fr; }
  .tw-proof { display: none; }
  .tw-grid2 { grid-template-columns: 1fr; }
}
</style>
