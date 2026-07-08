<template>
  <SdModalShell :open="open" :eyebrow="editing ? 'EDIT TAPE · PERSONAL' : 'NEW TAPE · PERSONAL'"
    :title="editing ? (form.name || 'My template') : 'Record a personal template'" width="940px" @close="$emit('close')">
    <div class="uw">
      <!-- ── left: steps ── -->
      <div class="uw-main">
        <!-- personal banner -->
        <div class="uw-personal sd-mono">
          <Lock :size="11" /> PERSONAL — only you see and play this tape. Desk-wide tapes are published by admins.
        </div>

        <!-- stepper -->
        <div class="uw-steps" role="tablist">
          <button v-for="(s, i) in STEPS" :key="s.key" class="uw-step sd-mono" :class="{ on: step === i, done: i < step }"
            role="tab" :aria-selected="step === i" @click="goto(i)">
            <span class="uw-step-n">{{ i < step ? '✓' : i + 1 }}</span>{{ s.label }}
          </button>
        </div>

        <!-- panes -->
        <Presence mode="wait">
          <Motion :key="step" class="uw-pane" :initial="{ opacity: 0, x: 18 }" :animate="{ opacity: 1, x: 0 }"
            :exit="{ opacity: 0, x: -12 }" :transition="{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }">

            <!-- 1 · IDENTITY -->
            <div v-if="step === 0" class="uw-fields">
              <label class="uw-f">
                <span class="uw-lb sd-mono">TAPE NAME <b>*</b></span>
                <input v-model.trim="form.name" maxlength="120" type="text" placeholder="e.g. VPN outage — standard response" />
              </label>
              <label class="uw-f">
                <span class="uw-lb sd-mono">DESCRIPTION</span>
                <input v-model.trim="form.description" type="text" placeholder="When should you reach for this tape?" />
              </label>
              <div class="uw-f">
                <span class="uw-lb sd-mono">SEAL</span>
                <div class="uw-chiprow">
                  <button v-for="ic in ICON_KEYS" :key="ic" class="uw-chip icon" :class="{ on: form.icon === ic }"
                    :title="ic" @click="form.icon = ic"><component :is="ICONS[ic]" :size="14" /></button>
                  <input v-model.trim="emojiIn" class="uw-emoji" type="text" maxlength="4" placeholder="or emoji"
                    @input="onEmoji" />
                </div>
              </div>
              <div class="uw-f">
                <span class="uw-lb sd-mono">SHELL TINT</span>
                <div class="uw-chiprow">
                  <button v-for="c in ACCENTS" :key="c" class="uw-chip swatch" :class="{ on: form.accent === c }"
                    :style="{ '--sw': c }" :title="c" @click="form.accent = c" />
                </div>
              </div>
            </div>

            <!-- 2 · CONTENT -->
            <div v-else-if="step === 1" class="uw-fields">
              <label class="uw-f">
                <span class="uw-lb sd-mono">SUBJECT TEMPLATE</span>
                <input ref="subjectEl" v-model="form.subject" maxlength="300" type="text"
                  placeholder="e.g. VPN access issue — {{requester.name}}" @focus="lastFocus = 'subject'" />
              </label>
              <label class="uw-f">
                <span class="uw-lb sd-mono">BODY TEMPLATE</span>
                <textarea ref="bodyEl" v-model="form.body" rows="7"
                  placeholder="The description this tape plays into the ticket…" @focus="lastFocus = 'body'" />
              </label>
              <div class="uw-f">
                <span class="uw-lb sd-mono">INSERT VARIABLE <em class="uw-dim">— click to punch it in at the caret</em></span>
                <div class="uw-chiprow">
                  <button v-for="v in TEMPLATE_VARIABLES" :key="v.token" class="uw-chip var sd-mono" :title="v.hint"
                    @click="insertToken(v.token)">{{ v.token }}</button>
                </div>
                <p v-if="unknownTokens.length" class="uw-warn sd-mono">
                  ⚠ Unknown token{{ unknownTokens.length > 1 ? 's' : '' }} {{ unknownTokens.join(' ') }} — they'll stay visible in the output.
                </p>
              </div>
              <div class="uw-f">
                <span class="uw-lb sd-mono">TAGS <em class="uw-dim">— Enter to add · {{ form.tags.length }}/12</em></span>
                <div class="uw-tagbox" @click="$refs.tagEl?.focus()">
                  <span v-for="tag in form.tags" :key="tag" class="uw-tag sd-mono">#{{ tag }}
                    <button title="Remove" @click.stop="form.tags = form.tags.filter((x) => x !== tag)"><X :size="10" /></button>
                  </span>
                  <input ref="tagEl" v-model.trim="tagIn" type="text" :placeholder="form.tags.length ? '' : 'vpn, network…'"
                    @keydown="onTagKey" @blur="addTag" />
                </div>
              </div>
            </div>

            <!-- 3 · PREFILLS -->
            <div v-else-if="step === 2" class="uw-fields">
              <div class="uw-f">
                <span class="uw-lb sd-mono">PRIORITY PREFILL</span>
                <div class="uw-chiprow">
                  <button v-for="p in PRIORITIES" :key="p.value" class="uw-chip seg" :class="{ on: form.priority === p.value }"
                    @click="form.priority = form.priority === p.value ? '' : p.value">{{ p.label }}</button>
                </div>
              </div>
              <label class="uw-f">
                <span class="uw-lb sd-mono">REQUEST TYPE</span>
                <SdSelect v-model="form.ticket_type" :options="typeOptions" placeholder="(no type prefill)" />
              </label>
              <label class="uw-f">
                <span class="uw-lb sd-mono">CATEGORY</span>
                <SdSelect v-model="form.category_id" :options="catOptions" placeholder="(no category prefill)" />
              </label>
              <p class="uw-note">Routing, SLA and assignee prefills are curated by desk admins on published tapes —
                your personal tape prefills the fields above plus subject, body, tags and checklist.</p>
            </div>

            <!-- 4 · CHECKLIST -->
            <div v-else-if="step === 3" class="uw-fields">
              <div class="uw-f">
                <span class="uw-lb sd-mono">CHECKLIST STEPS <em class="uw-dim">— appended to the ticket description</em></span>
                <div class="uw-checkrows">
                  <div v-for="(c, i) in form.checklist" :key="i" class="uw-checkrow">
                    <SquareCheck :size="13" class="uw-check-ic" />
                    <input v-model.trim="c.text" type="text" placeholder="Step…" />
                    <button class="uw-mini" title="Move up" :disabled="i === 0" @click="move(i, -1)"><ChevronUp :size="12" /></button>
                    <button class="uw-mini" title="Move down" :disabled="i === form.checklist.length - 1" @click="move(i, 1)"><ChevronDown :size="12" /></button>
                    <button class="uw-mini danger" title="Remove" @click="form.checklist.splice(i, 1)"><X :size="12" /></button>
                  </div>
                </div>
                <button class="uw-add sd-mono" @click="form.checklist.push({ text: '', done: false })"><Plus :size="12" /> ADD STEP</button>
              </div>
            </div>

            <!-- 5 · REVIEW -->
            <div v-else class="uw-fields">
              <div class="uw-review sd-mono">
                <div><i>NAME</i><b>{{ form.name || '—' }}</b></div>
                <div><i>SCOPE</i><b class="pers">PERSONAL · only you</b></div>
                <div><i>SUBJECT</i><b>{{ form.subject || '—' }}</b></div>
                <div><i>PREFILLS</i><b>{{ reviewPrefills }}</b></div>
                <div><i>CHECKLIST</i><b>{{ form.checklist.filter((c) => c.text).length }} step(s)</b></div>
                <div><i>VARIABLES</i><b>{{ usedTokenCount }} live token(s){{ unknownTokens.length ? ` · ⚠ ${unknownTokens.length} unknown` : '' }}</b></div>
                <div v-if="editing"><i>VERSION</i><b>v{{ template?.version || 1 }} → content edits cut a new version</b></div>
              </div>
              <p class="uw-note">Save as <b>draft</b> to keep it unlabeled (only you can test-drive it), or
                <b>activate</b> to slot it straight into your rack.</p>
            </div>
          </Motion>
        </Presence>
      </div>

      <!-- ── right: live projection preview ── -->
      <aside class="uw-proof" :style="{ '--acc': form.accent || 'var(--sd-utpl-core)' }">
        <div class="uw-proof-head sd-mono"><span class="uw-proof-dot" /> LIVE PLAYBACK</div>
        <div class="uw-screen">
          <div class="uw-scan" />
          <div class="uw-p-seal">
            <template v-if="isEmoji">{{ form.icon }}</template>
            <component :is="ICONS[form.icon] || Film" v-else :size="15" />
          </div>
          <div class="uw-p-name">{{ form.name || 'Untitled tape' }}</div>
          <div class="uw-p-subject">{{ previewSubject || 'Subject preview appears here' }}</div>
          <div class="uw-p-body">{{ previewBody || 'Body preview — variables resolve with sample context.' }}</div>
          <div class="uw-p-meta sd-mono">
            <span v-if="form.priority" class="uw-p-chip">{{ form.priority.toUpperCase() }}</span>
            <span v-for="tag in form.tags.slice(0, 4)" :key="tag" class="uw-p-chip dim">#{{ tag }}</span>
          </div>
          <div v-if="form.checklist.filter((c) => c.text).length" class="uw-p-check sd-mono">
            + {{ form.checklist.filter((c) => c.text).length }} checklist step(s)
          </div>
        </div>
        <div class="uw-proof-foot sd-mono">{{ ready ? 'READY TO RECORD' : 'NAME REQUIRED' }}</div>
      </aside>
    </div>

    <template #footer>
      <div class="uw-foot">
        <button v-if="step > 0" class="uw-nav" @click="step--"><ChevronLeft :size="14" /> Back</button>
        <span class="uw-foot-gap" />
        <button v-if="step < STEPS.length - 1" class="uw-nav next" @click="next">Next <ChevronRight :size="14" /></button>
        <template v-else>
          <button class="uw-save ghost" :disabled="!ready || busy" @click="save('draft')">
            <NotebookPen :size="14" /> Save as draft
          </button>
          <button class="uw-save primary" :disabled="!ready || busy" @click="save('active')">
            <LoaderCircle v-if="busy" :size="14" class="uw-spin" /><Film v-else :size="14" />
            {{ editing ? 'Save & keep live' : 'Save & activate' }}
          </button>
        </template>
      </div>
    </template>
  </SdModalShell>
</template>

<script setup>
/* SdUtplWizard — the agent's recording booth for PERSONAL tapes (Cassette
   Exchange). Five steps beside a live playback preview: Identity → Content
   (variable chips punch tokens in at the caret; unknown-token warning) →
   Prefills (priority / type / category only — routing, SLA and assignee stay
   admin-curated) → Checklist → Review. Emits save(payload, statusTarget) — the
   section owns the API call; the backend forces visibility='personal'
   server-side regardless. */
import { ref, computed, watch, nextTick } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  Lock, X, Plus, ChevronLeft, ChevronRight, ChevronUp, ChevronDown,
  NotebookPen, LoaderCircle, SquareCheck, Film,
  Stamp, KeyRound, Wifi, Monitor, Printer, Mail, Shield, Bug, CreditCard, UserPlus, HardDrive, Wrench,
} from 'lucide-vue-next'
import SdModalShell from '../components/SdModalShell.vue'
import SdSelect from '../components/SdSelect.vue'
import { PRIORITIES, TICKET_TYPES, typeLabel, usePickers } from '@/composables/useSupportDesk'
import { TEMPLATE_VARIABLES, SAMPLE_CONTEXT, substituteTemplate, detectUnknownTokens } from '../templateVariables'

const ICONS = { Film, Stamp, KeyRound, Wifi, Monitor, Printer, Mail, Shield, Bug, CreditCard, UserPlus, HardDrive, Wrench }
const ICON_KEYS = Object.keys(ICONS)
const ACCENTS = ['#f0a83c', '#ffd9a0', '#fb923c', '#d97706', '#34d399', '#e8b4b8', '#98938a', '#f0564a']

const props = defineProps({
  open: { type: Boolean, default: false },
  template: { type: Object, default: null },   // edit mode when set
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'save'])

const pickers = usePickers()
const STEPS = [
  { key: 'identity', label: 'IDENTITY' },
  { key: 'content', label: 'CONTENT' },
  { key: 'prefills', label: 'PREFILLS' },
  { key: 'checklist', label: 'CHECKLIST' },
  { key: 'review', label: 'REVIEW' },
]

const step = ref(0)
const emojiIn = ref('')
const tagIn = ref('')
const lastFocus = ref('body')
const subjectEl = ref(null)
const bodyEl = ref(null)

const blank = () => ({
  name: '', description: '', icon: 'Film', accent: '#f0a83c',
  subject: '', body: '', tags: [], checklist: [],
  priority: '', ticket_type: '', category_id: '',
})
const form = ref(blank())
const editing = computed(() => !!props.template?.id)

watch(() => props.open, (o) => {
  if (!o) return
  step.value = 0
  emojiIn.value = ''
  tagIn.value = ''
  const t = props.template
  form.value = t ? {
    name: t.name || '', description: t.description || '',
    icon: t.icon || 'Film', accent: t.accent || '#f0a83c',
    subject: t.subject || '', body: t.body || '',
    tags: [...(t.tags || [])],
    checklist: (t.checklist || []).map((c) => ({ text: c.text || String(c), done: !!c.done })),
    priority: t.priority || '', ticket_type: t.ticket_type || '', category_id: t.category_id ? String(t.category_id) : '',
  } : blank()
  if (t?.icon && !/^[A-Za-z]/.test(t.icon)) emojiIn.value = t.icon
})

const isEmoji = computed(() => !!form.value.icon && !/^[A-Za-z]/.test(form.value.icon))
// PRIORITIES / TICKET_TYPES are {value,label} objects — map .value out, or SdSelect
// gets whole objects as option values and the prefill can never match/select.
const typeOptions = computed(() => [{ value: '', label: '(no type prefill)' },
  ...TICKET_TYPES.map((t) => ({ value: t.value, label: t.label }))])
const catOptions = computed(() => [{ value: '', label: '(no category prefill)' },
  ...(pickers.categories || []).map((c) => ({ value: String(c.id), label: c.name }))])

const unknownTokens = computed(() => detectUnknownTokens(`${form.value.subject}\n${form.value.body}`))
const usedTokenCount = computed(() => {
  const text = `${form.value.subject}\n${form.value.body}`
  return TEMPLATE_VARIABLES.filter((v) => text.includes(v.token)).length
})
const previewSubject = computed(() => substituteTemplate(form.value.subject, SAMPLE_CONTEXT))
const previewBody = computed(() => substituteTemplate(form.value.body, SAMPLE_CONTEXT))
const reviewPrefills = computed(() => {
  const bits = []
  if (form.value.priority) bits.push(form.value.priority)
  if (form.value.ticket_type) bits.push(typeLabel(form.value.ticket_type))
  const cat = (pickers.categories || []).find((c) => String(c.id) === form.value.category_id)
  if (cat) bits.push(cat.name)
  if (form.value.tags.length) bits.push(`${form.value.tags.length} tag(s)`)
  return bits.join(' · ') || 'none'
})
const ready = computed(() => !!form.value.name.trim())

const goto = (i) => { if (i <= step.value || ready.value) step.value = i }
const next = () => { step.value = Math.min(step.value + 1, STEPS.length - 1) }

const onEmoji = () => { if (emojiIn.value) form.value.icon = emojiIn.value }
const addTag = () => {
  const v = tagIn.value.replace(/[#,\s]+$/g, '').replace(/^[#\s]+/, '').trim().toLowerCase()
  if (v && !form.value.tags.includes(v) && form.value.tags.length < 12) form.value.tags.push(v)
  tagIn.value = ''
}
const onTagKey = (e) => {
  if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addTag() }
}
const move = (i, d) => {
  const arr = form.value.checklist
  const j = i + d
  if (j < 0 || j >= arr.length) return
  ;[arr[i], arr[j]] = [arr[j], arr[i]]
}
const insertToken = async (token) => {
  const isSubject = lastFocus.value === 'subject'
  const el = isSubject ? subjectEl.value : bodyEl.value
  const key = isSubject ? 'subject' : 'body'
  const cur = form.value[key] || ''
  const pos = el && typeof el.selectionStart === 'number' ? el.selectionStart : cur.length
  form.value[key] = cur.slice(0, pos) + token + cur.slice(pos)
  await nextTick()
  if (el) { el.focus(); el.selectionStart = el.selectionEnd = pos + token.length }
}

const save = (statusTarget) => {
  if (!ready.value) return
  const f = form.value
  emit('save', {
    name: f.name, description: f.description || null,
    icon: f.icon || null, accent: f.accent || null,
    subject: f.subject || null, body: f.body || null,
    tags: f.tags,
    checklist: f.checklist.filter((c) => c.text).map((c) => ({ text: c.text, done: false })),
    priority: f.priority || null, ticket_type: f.ticket_type || null,
    category_id: f.category_id || null,
  }, statusTarget)
}
</script>

<style scoped>
.uw { display: grid; grid-template-columns: 1fr 280px; gap: 18px; }
@media (max-width: 780px) { .uw { grid-template-columns: 1fr; } .uw-proof { display: none; } }
.uw-main { min-width: 0; display: flex; flex-direction: column; gap: 12px; }

.uw-personal {
  display: flex; align-items: center; gap: 7px;
  font-size: 9px; letter-spacing: 0.12em; padding: 8px 12px; border-radius: 10px;
  color: var(--sd-utpl-fav); background: var(--sd-utpl-fav-soft);
  border: 1px solid color-mix(in srgb, var(--sd-utpl-fav) 32%, transparent);
}

.uw-steps { display: flex; gap: 5px; flex-wrap: wrap; }
.uw-step {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9px; font-weight: 800; letter-spacing: 0.14em; cursor: pointer;
  padding: 6px 10px; border-radius: 9px;
  background: transparent; border: 1px solid var(--sd-border); color: var(--sd-text-muted);
  transition: border-color 0.2s, color 0.2s;
}
.uw-step.on { color: var(--sd-utpl-hi); border-color: var(--sd-utpl-brd); background: var(--sd-utpl-soft); }
[data-theme="light"] .uw-step.on { color: var(--sd-utpl-deep); }
.uw-step.done { color: var(--sd-utpl-use); }
.uw-step-n {
  width: 15px; height: 15px; display: grid; place-items: center; border-radius: 50%;
  font-size: 8px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border);
}
.uw-step.on .uw-step-n { background: var(--sd-utpl-soft); border-color: var(--sd-utpl-brd); }

.uw-pane { min-height: 280px; }
.uw-fields { display: flex; flex-direction: column; gap: 13px; }
.uw-f { display: flex; flex-direction: column; gap: 6px; }
.uw-lb { font-size: 8.5px; letter-spacing: 0.2em; color: var(--sd-text-muted); }
.uw-lb b { color: var(--sd-utpl-risk); }
.uw-dim { font-style: normal; text-transform: none; letter-spacing: 0.02em; opacity: 0.8; }
.uw-f input[type="text"], .uw-f textarea {
  width: 100%; padding: 10px 12px; border-radius: 10px; font-size: 13px;
  background: var(--sd-surface); border: 1px solid var(--sd-border); color: var(--sd-text);
  outline: none; transition: border-color 0.2s, box-shadow 0.2s; resize: vertical;
}
.uw-f input:focus, .uw-f textarea:focus { border-color: var(--sd-utpl-brd); box-shadow: 0 0 14px color-mix(in srgb, var(--sd-utpl-core) 12%, transparent); }

.uw-chiprow { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.uw-chip {
  display: inline-flex; align-items: center; gap: 5px; cursor: pointer;
  padding: 7px 10px; border-radius: 9px; font-size: 11px; font-weight: 700;
  background: var(--sd-surface); border: 1px solid var(--sd-border); color: var(--sd-text-secondary);
  transition: border-color 0.2s, color 0.2s, transform 0.15s var(--sd-spring);
}
.uw-chip:hover { transform: translateY(-1px); }
.uw-chip.on { border-color: var(--sd-utpl-brd); color: var(--sd-utpl-hi); background: var(--sd-utpl-soft); }
[data-theme="light"] .uw-chip.on { color: var(--sd-utpl-deep); }
.uw-chip.icon { padding: 7px 9px; }
.uw-chip.swatch { width: 26px; height: 26px; padding: 0; border-radius: 8px; background: var(--sw); border: 2px solid transparent; }
.uw-chip.swatch.on { border-color: var(--sd-text); box-shadow: 0 0 12px var(--sw); }
.uw-chip.seg { text-transform: capitalize; }
.uw-chip.var { font-size: 10px; color: var(--sd-utpl-hi); border-color: color-mix(in srgb, var(--sd-utpl-core) 30%, transparent); }
[data-theme="light"] .uw-chip.var { color: var(--sd-utpl-deep); }
.uw-emoji { width: 84px; padding: 7px 10px; border-radius: 9px; font-size: 12px; background: var(--sd-surface); border: 1px dashed var(--sd-border); color: var(--sd-text); outline: none; }
.uw-warn { margin: 2px 0 0; font-size: 10px; color: var(--sd-utpl-risk); }
.uw-note { margin: 0; font-size: 11.5px; line-height: 1.55; color: var(--sd-text-muted); }

.uw-tagbox {
  display: flex; flex-wrap: wrap; gap: 6px; align-items: center; cursor: text;
  padding: 8px 10px; border-radius: 10px; min-height: 40px;
  background: var(--sd-surface); border: 1px solid var(--sd-border);
}
.uw-tagbox:focus-within { border-color: var(--sd-utpl-brd); }
.uw-tag {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10px; padding: 3px 8px; border-radius: 6px;
  background: var(--sd-utpl-soft); color: var(--sd-utpl-hi);
  border: 1px solid color-mix(in srgb, var(--sd-utpl-core) 30%, transparent);
}
[data-theme="light"] .uw-tag { color: var(--sd-utpl-deep); }
.uw-tag button { display: grid; place-items: center; background: transparent; border: none; color: inherit; cursor: pointer; padding: 0; }
.uw-tagbox input { flex: 1; min-width: 90px; background: transparent; border: none; outline: none; font-size: 12px; color: var(--sd-text); }

.uw-checkrows { display: flex; flex-direction: column; gap: 7px; }
.uw-checkrow { display: flex; align-items: center; gap: 7px; }
.uw-check-ic { color: var(--sd-utpl-use); flex: 0 0 auto; }
.uw-checkrow input { flex: 1; }
.uw-mini {
  width: 26px; height: 26px; display: grid; place-items: center; border-radius: 7px; cursor: pointer;
  background: transparent; border: 1px solid var(--sd-border); color: var(--sd-text-muted);
}
.uw-mini:hover { color: var(--sd-text); border-color: var(--sd-utpl-brd); }
.uw-mini.danger:hover { color: var(--sd-utpl-risk); border-color: color-mix(in srgb, var(--sd-utpl-risk) 40%, transparent); }
.uw-mini:disabled { opacity: 0.35; cursor: not-allowed; }
.uw-add {
  align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; cursor: pointer;
  font-size: 9px; letter-spacing: 0.16em; font-weight: 800;
  padding: 7px 12px; border-radius: 9px; margin-top: 4px;
  background: transparent; border: 1px dashed var(--sd-utpl-brd); color: var(--sd-utpl-hi);
}
[data-theme="light"] .uw-add { color: var(--sd-utpl-deep); }

.uw-review { display: flex; flex-direction: column; gap: 9px; }
.uw-review > div { display: grid; grid-template-columns: 92px 1fr; gap: 10px; align-items: baseline; }
.uw-review i { font-style: normal; font-size: 8.5px; letter-spacing: 0.2em; color: var(--sd-text-muted); }
.uw-review b { font-size: 12.5px; font-weight: 700; color: var(--sd-text); word-break: break-word; }
.uw-review b.pers { color: var(--sd-utpl-fav); }

/* ── live projection pane ── */
.uw-proof { display: flex; flex-direction: column; gap: 8px; }
.uw-proof-head {
  display: flex; align-items: center; gap: 7px;
  font-size: 8.5px; letter-spacing: 0.22em; color: var(--sd-utpl-core);
}
.uw-proof-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--sd-utpl-core); box-shadow: 0 0 10px var(--sd-utpl-core); animation: uw-pulse 2.4s infinite; }
@keyframes uw-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
.uw-screen {
  position: relative; flex: 1; overflow: hidden;
  padding: 16px 14px; border-radius: 14px;
  background: var(--sd-utpl-stage);
  border: 1px solid color-mix(in srgb, var(--acc) 45%, var(--sd-utpl-brd));
  box-shadow: inset 0 0 34px color-mix(in srgb, var(--acc) 8%, transparent), 0 0 24px color-mix(in srgb, var(--acc) 10%, transparent);
}
.uw-scan {
  position: absolute; inset: 0; pointer-events: none; opacity: 0.6;
  background: repeating-linear-gradient(0deg, var(--sd-utpl-scan) 0 1px, transparent 1px 4px);
  animation: uw-scan 3.6s linear infinite;
}
@keyframes uw-scan { to { transform: translateY(4px); } }
.uw-p-seal {
  width: 34px; height: 34px; display: grid; place-items: center; border-radius: 10px; font-size: 16px;
  background: color-mix(in srgb, var(--acc) 18%, transparent);
  border: 1px solid color-mix(in srgb, var(--acc) 42%, transparent);
  color: var(--acc); margin-bottom: 10px;
}
.uw-p-name { font-size: 14.5px; font-weight: 800; color: var(--sd-text); margin-bottom: 6px; line-height: 1.25; }
.uw-p-subject { font-size: 11.5px; font-weight: 650; color: color-mix(in srgb, var(--acc) 70%, var(--sd-text)); margin-bottom: 8px; line-height: 1.4; }
.uw-p-body {
  font-size: 11px; line-height: 1.55; color: var(--sd-text-secondary);
  white-space: pre-wrap; max-height: 150px; overflow: hidden; margin-bottom: 10px;
}
.uw-p-meta { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 8px; }
.uw-p-chip {
  font-size: 8px; letter-spacing: 0.14em; padding: 2.5px 7px; border-radius: 5px;
  border: 1px solid color-mix(in srgb, var(--acc) 40%, transparent);
  color: color-mix(in srgb, var(--acc) 90%, var(--sd-text));
}
.uw-p-chip.dim { opacity: 0.75; }
.uw-p-check { font-size: 9px; letter-spacing: 0.1em; color: var(--sd-utpl-use); }
.uw-proof-foot { font-size: 8.5px; letter-spacing: 0.22em; color: var(--sd-text-muted); text-align: center; }

/* ── footer ── */
.uw-foot { display: flex; align-items: center; gap: 9px; width: 100%; }
.uw-foot-gap { flex: 1; }
.uw-nav {
  display: inline-flex; align-items: center; gap: 6px; cursor: pointer;
  padding: 10px 15px; border-radius: 11px; font-size: 12.5px; font-weight: 700;
  background: var(--sd-surface); border: 1px solid var(--sd-border); color: var(--sd-text-secondary);
}
.uw-nav.next { color: var(--sd-utpl-hi); border-color: var(--sd-utpl-brd); }
[data-theme="light"] .uw-nav.next { color: var(--sd-utpl-deep); }
.uw-save {
  display: inline-flex; align-items: center; gap: 7px; cursor: pointer;
  padding: 10px 16px; border-radius: 11px; font-size: 12.5px; font-weight: 800;
  border: 1px solid var(--sd-utpl-brd); background: var(--sd-surface); color: var(--sd-text);
}
.uw-save.ghost { color: var(--sd-utpl-ink); }
.uw-save.primary { border: none; background: var(--sd-utpl-grad); color: #1b0f04; box-shadow: var(--sd-utpl-glow); }
[data-theme="light"] .uw-save.primary { color: #fff7e9; }
.uw-save:disabled { opacity: 0.5; cursor: not-allowed; }
.uw-spin { animation: sd-spin-slow 1s linear infinite; }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .uw-proof-dot,
  html:not([data-cinematic="on"]) .uw-scan { animation: none; }
}
</style>
