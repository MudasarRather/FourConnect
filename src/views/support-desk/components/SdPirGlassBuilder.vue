<template>
  <div class="gb-shell">
    <!-- ── head ── -->
    <div class="gb-head">
      <div>
        <h3>{{ pir?.title || 'No dossier open' }}</h3>
        <div class="gb-meta">
          <span>{{ pir?.report_number }}</span>
          <button v-if="pir?.ticket_number" class="gb-inc-link" @click="$emit('open-incident', pir.ticket_id)">{{ pir.ticket_number }}</button>
          <span v-if="svc">{{ svc }}</span>
          <span class="sev" :class="'s' + (pir?.sev || 4)">SEV{{ pir?.sev || 4 }}</span>
          <span>REV {{ (pir?.revisions || []).length }}</span>
          <span v-if="pir?.created_by_name">AUTHOR · {{ pir.created_by_name }}</span>
        </div>
      </div>
      <div class="gb-head-right">
        <button class="gb-btn ghost" :disabled="!pir" @click="$emit('export-pdf')" title="Dossier PDF (draft exports carry a watermark)">PDF</button>
        <div class="gb-plate" :class="plateClass">{{ plateText }}</div>
      </div>
    </div>

    <div v-if="readOnlyView" class="gb-ro-note">
      <span class="gb-ro-dot" aria-hidden="true" />
      Read-only — you're not on this incident's response. Its assignee, commander, a
      named collaborator, the team lead, or an admin can edit and submit this dossier.
    </div>

    <div v-if="pir" class="gb-cards">
      <!-- frozen metrics -->
      <div class="gb-card c12">
        <div class="c-head">
          <span class="c-gem" :class="{ lit: hasMetrics }" /><span class="c-name">Frozen Metrics — snapshot at review threshold</span>
          <span class="c-state" :class="{ ok: hasMetrics }">{{ hasMetrics ? 'immutable' : 'not frozen yet' }}</span>
        </div>
        <div v-if="hasMetrics" class="gb-slab">
          <div class="gb-slab-head">
            <span><b>FROZEN</b> · {{ shortAt(m.frozen_at) }} · etched into the base pane</span><span>read-only</span>
          </div>
          <div class="gb-slab-grid">
            <div class="sl"><div class="v">{{ mins(m.mttd_minutes) }}</div><div class="k">MTTD</div></div>
            <div class="sl"><div class="v">{{ mins(m.mtta_minutes) }}</div><div class="k">MTTA</div></div>
            <div class="sl"><div class="v">{{ mins(m.mttr_minutes) }}</div><div class="k">MTTR</div></div>
            <div class="sl"><div class="v">{{ mins(m.duration_minutes) }}</div><div class="k">Duration</div></div>
            <div class="sl"><div class="v">{{ numFmt(m.affected_users) }}</div><div class="k">Affected Users</div></div>
            <div class="sl"><div class="v">{{ m.decision_count ?? '—' }}</div><div class="k">Decisions</div></div>
            <div class="sl"><div class="v">{{ m.update_count ?? '—' }}</div><div class="k">Updates Sent</div></div>
            <div class="sl"><div class="v">{{ m.watcher_count ?? '—' }}</div><div class="k">Watchers</div></div>
          </div>
        </div>
        <div v-else class="gb-slab empty">
          <span>The metrics record freezes automatically at submit — or etch it into the draft now.</span>
          <button class="gb-btn ghost sm" :disabled="!editable || busy" @click="$emit('refresh-metrics')">Freeze now</button>
        </div>
      </div>

      <div class="gb-card c6" :class="{ 'fail-flash': flash.summary }">
        <div class="c-head"><span class="c-gem" :class="{ lit: ck.summary }" /><span class="c-name">Executive Summary <span class="req">✱ required</span></span><span class="c-state" :class="{ ok: ck.summary }">{{ ck.summary ? 'etched' : 'empty' }}</span></div>
        <textarea v-model="doc.executive_summary" rows="6" :disabled="!editable" placeholder="What happened, how bad, how it ended — the account a stakeholder reads first…" />
      </div>
      <div class="gb-card c6">
        <div class="c-head"><span class="c-gem" :class="{ lit: ck.impact }" /><span class="c-name">Business &amp; Technical Impact</span><span class="c-state" :class="{ ok: ck.impact }">{{ ck.impact ? 'etched' : 'empty' }}</span></div>
        <textarea v-model="doc.business_impact" rows="2" :disabled="!editable" placeholder="BUSINESS — revenue held, contacts, escalations…" />
        <div style="height:8px" />
        <textarea v-model="doc.technical_impact" rows="2" :disabled="!editable" placeholder="TECHNICAL — latency, backlogs, re-runs…" />
      </div>

      <div class="gb-card c6" :class="{ 'fail-flash': flash.root }">
        <div class="c-head"><span class="c-gem" :class="{ lit: ck.root }" /><span class="c-name">Root Cause + Category <span class="req">✱ required</span></span><span class="c-state" :class="{ ok: ck.root }">{{ ck.root ? 'etched' : 'empty' }}</span></div>
        <textarea v-model="doc.root_cause" rows="4" :disabled="!editable" placeholder="The mechanism, not the blame…" />
        <div style="height:12px" />
        <div class="gb-cats">
          <button v-for="c in ROOT_CATS" :key="c.value" class="gb-cat" :class="{ on: doc.root_cause_category === c.value }"
                  :disabled="!editable" @click="doc.root_cause_category = doc.root_cause_category === c.value ? null : c.value">{{ c.label }}</button>
        </div>
      </div>
      <div class="gb-card c6">
        <div class="c-head"><span class="c-gem" :class="{ lit: ck.whys }" /><span class="c-name">Five Whys</span><span class="c-state" :class="{ ok: ck.whys }">{{ ck.whys ? 'etched' : whyCount + ' / 3 min' }}</span></div>
        <ol class="gb-whys">
          <li v-for="(w, i) in doc.five_whys" :key="i">
            <span class="wn">Y{{ i + 1 }}</span>
            <input v-model="doc.five_whys[i]" type="text" :disabled="!editable" :placeholder="'why ' + (i + 1) + '…'" />
          </li>
        </ol>
      </div>

      <div class="gb-card c4">
        <div class="c-head"><span class="c-gem" :class="{ lit: ck.factors }" /><span class="c-name">Contributing Factors</span><span class="c-state" :class="{ ok: ck.factors }">{{ ck.factors ? 'etched' : 'empty' }}</span></div>
        <div class="gb-tags">
          <span v-for="(f, i) in doc.contributing_factors" :key="f + i" class="gb-ftag">#{{ f }}
            <button v-if="editable" aria-label="remove" @click="doc.contributing_factors.splice(i, 1)">×</button>
          </span>
        </div>
        <div v-if="editable" class="gb-add-line">
          <input v-model="factorIn" type="text" placeholder="add factor + Enter…" @keydown.enter.prevent="addFactor" />
          <button class="gb-add-btn" @click="addFactor">+ Etch</button>
        </div>
      </div>
      <div class="gb-card c4">
        <div class="c-head"><span class="c-gem" :class="{ lit: ck.well }" /><span class="c-name">Went Well</span><span class="c-state" :class="{ ok: ck.well }">{{ ck.well ? 'etched' : 'empty' }}</span></div>
        <ul class="gb-reg well">
          <li v-for="(r, i) in doc.went_well" :key="'ww' + i"><span class="gl">✓</span>{{ r }}
            <button v-if="editable" class="rm" aria-label="remove" @click="doc.went_well.splice(i, 1)">×</button>
          </li>
        </ul>
        <div v-if="editable" class="gb-add-line">
          <input v-model="wellIn" type="text" placeholder="went well…" @keydown.enter.prevent="addReg('went_well')" />
          <button class="gb-add-btn" @click="addReg('went_well')">+</button>
        </div>
      </div>
      <div class="gb-card c4">
        <div class="c-head"><span class="c-gem" :class="{ lit: ck.wrong }" /><span class="c-name">Went Wrong</span><span class="c-state" :class="{ ok: ck.wrong }">{{ ck.wrong ? 'etched' : 'empty' }}</span></div>
        <ul class="gb-reg wrong">
          <li v-for="(r, i) in doc.went_wrong" :key="'wr' + i"><span class="gl">✗</span>{{ r }}
            <button v-if="editable" class="rm" aria-label="remove" @click="doc.went_wrong.splice(i, 1)">×</button>
          </li>
        </ul>
        <div v-if="editable" class="gb-add-line">
          <input v-model="wrongIn" type="text" placeholder="went wrong…" @keydown.enter.prevent="addReg('went_wrong')" />
          <button class="gb-add-btn" @click="addReg('went_wrong')">+</button>
        </div>
      </div>

      <div class="gb-card c6" :class="{ 'fail-flash': flash.corrective }">
        <div class="c-head"><span class="c-gem" :class="{ lit: ck.corrective }" /><span class="c-name">Corrective Actions <span class="req">✱ ≥1 required</span></span><span class="c-state" :class="{ ok: ck.corrective }">{{ doc.corrective_actions.length }} on register</span></div>
        <table class="gb-acts">
          <thead><tr><th>Action</th><th>Owner</th><th>Target</th><th>Status</th></tr></thead>
          <tbody>
            <tr v-for="(a, i) in doc.corrective_actions" :key="a.aid || 'c' + i">
              <td>{{ a.action }}</td>
              <td><span class="owner-chip">{{ a.owner_name || '—' }}</span></td>
              <td class="due" :class="{ over: isOver(a) }">{{ dueLabel(a) }}</td>
              <td><button class="gb-pill" :class="[a.status || 'open', { 'overdue-ring': isOver(a) }]"
                          :disabled="busy || (!editable && !canTrackAction(a))"
                          @click="cycleAction('corrective', i, a)">{{ pillLabel(a.status) }}</button></td>
            </tr>
          </tbody>
        </table>
        <div v-if="editable" class="gb-add-line">
          <input v-model="corrIn" type="text" placeholder="new corrective action…" @keydown.enter.prevent="addAction('corrective')" />
          <button class="gb-add-btn" @click="addAction('corrective')">+ Action</button>
        </div>
      </div>
      <div class="gb-card c6">
        <div class="c-head"><span class="c-gem" :class="{ lit: doc.preventive_actions.length > 0 }" /><span class="c-name">Preventive Actions</span><span class="c-state" :class="{ ok: doc.preventive_actions.length > 0 }">{{ doc.preventive_actions.length }} on register</span></div>
        <table class="gb-acts">
          <thead><tr><th>Action</th><th>Owner</th><th>Target</th><th>Status</th></tr></thead>
          <tbody>
            <tr v-for="(a, i) in doc.preventive_actions" :key="a.aid || 'p' + i">
              <td>{{ a.action }}</td>
              <td><span class="owner-chip">{{ a.owner_name || '—' }}</span></td>
              <td class="due" :class="{ over: isOver(a) }">{{ dueLabel(a) }}</td>
              <td><button class="gb-pill" :class="[a.status || 'open', { 'overdue-ring': isOver(a) }]"
                          :disabled="busy || (!editable && !canTrackAction(a))"
                          @click="cycleAction('preventive', i, a)">{{ pillLabel(a.status) }}</button></td>
            </tr>
          </tbody>
        </table>
        <div v-if="editable" class="gb-add-line">
          <input v-model="prevIn" type="text" placeholder="new preventive action…" @keydown.enter.prevent="addAction('preventive')" />
          <button class="gb-add-btn" @click="addAction('preventive')">+ Action</button>
        </div>
      </div>

      <div class="gb-card c4">
        <div class="c-head"><span class="c-gem" :class="{ lit: doc.participants.length > 0 }" /><span class="c-name">Participants</span><span class="c-state" :class="{ ok: doc.participants.length > 0 }">{{ doc.participants.length }} present</span></div>
        <div class="gb-roster">
          <span v-for="(p, i) in doc.participants" :key="'pp' + i" class="gb-person">
            <span class="av">{{ initials(p.name) }}</span>
            <span><span class="nm">{{ p.name }}</span><br><span class="rl">{{ p.role || 'attendee' }}</span></span>
            <button v-if="editable" class="rm" aria-label="remove" @click="doc.participants.splice(i, 1)">×</button>
          </span>
        </div>
        <div v-if="editable" class="gb-add-line">
          <input v-model="personIn" type="text" placeholder="Name · role  (Enter)" @keydown.enter.prevent="addPerson" />
          <button class="gb-add-btn" @click="addPerson">+</button>
        </div>
      </div>
      <div class="gb-card c4">
        <div class="c-head"><span class="c-gem" :class="{ lit: ck.meeting }" /><span class="c-name">Review Meeting</span><span class="c-state" :class="{ ok: ck.meeting }">{{ ck.meeting ? 'scheduled' : 'unset' }}</span></div>
        <div class="gb-meet-row">
          <SdDatePicker v-model="meetDate" :disabled="!editable" :clearable="true" placeholder="pick the review date" />
          <input v-model="meetTime" type="time" :disabled="!editable || !meetDate" class="gb-time" />
        </div>
        <div style="height:8px" />
        <textarea v-model="doc.review_meeting_notes" rows="3" :disabled="!editable" placeholder="Agenda · bridge · who must be in the room…" />
        <p class="gb-meet-note">Scheduled reviews surface on the Chrono Desk calendar for the whole sealed team.</p>
      </div>
      <div class="gb-card c4">
        <div class="c-head"><span class="c-gem" :class="{ lit: ck.lessons }" /><span class="c-name">Lessons Learned</span><span class="c-state" :class="{ ok: ck.lessons }">{{ ck.lessons ? 'etched' : 'empty' }}</span></div>
        <textarea v-model="doc.lessons_learned" rows="5" :disabled="!editable" placeholder="What the organisation keeps after the incident is forgotten…" />
      </div>

      <div class="gb-card c6">
        <div class="c-head"><span class="c-gem lit" /><span class="c-name">Frozen Incident Timeline</span>
          <span class="c-state ok">immutable</span>
          <button v-if="editable" class="gb-mini" :disabled="busy" @click="$emit('refresh-timeline')" title="Re-snapshot the activity trail">⟲ re-snapshot</button>
        </div>
        <ul class="gb-tl">
          <li v-for="(e, i) in tlRows" :key="'tl' + i" :class="tlTone(e)"><b>{{ tlAt(e) }}</b>{{ tlLabel(e) }}</li>
          <li v-if="!tlRows.length" class="dim">No trail frozen yet.</li>
        </ul>
      </div>
      <div class="gb-card c6">
        <div class="c-head"><span class="c-gem lit" /><span class="c-name">Approvals Trail + Revision History</span><span class="c-state ok">tracked</span></div>
        <ul class="gb-trail">
          <li v-for="(a, i) in approvals" :key="'ap' + i" :class="{ rej: a.decision === 'rejected' }">
            <span class="tmono">{{ shortAt(a.at) }}</span> — <b>{{ a.decision === 'rejected' ? 'Rejected' : 'Approved' }} by {{ a.name }} ({{ a.role }})</b><template v-if="a.note">: “{{ a.note }}”</template>
          </li>
          <li v-if="!approvals.length" class="dim">No sign-off yet — the trail begins at review.</li>
        </ul>
        <div style="height:10px" />
        <ul class="gb-trail">
          <li v-for="(r, i) in revisions" :key="'rv' + i">
            <span class="tmono">REV {{ revisions.length - i }} · {{ shortAt(r.at) }}</span> — {{ r.by_name }} · {{ (r.fields || []).join(', ') }}
          </li>
          <li v-if="!revisions.length" class="dim">First revision lands on save.</li>
        </ul>
      </div>
    </div>

    <div v-else class="gb-empty">
      <p>Open a dossier from the shelf — or open a review on an owed incident above.</p>
    </div>

    <!-- ── foot: gates + verbs ── -->
    <div v-if="pir" class="gb-foot">
      <div class="gb-gates">
        <div class="gb-gate" :class="{ ok: ck.summary }"><span class="lamp" />Exec Summary</div>
        <div class="gb-gate" :class="{ ok: ck.root }"><span class="lamp" />Root Cause</div>
        <div class="gb-gate" :class="{ ok: ck.corrective }"><span class="lamp" />≥1 Corrective Action</div>
      </div>
      <div class="gb-verbs">
        <button class="gb-btn" :disabled="!editable || busy" @click="$emit('save', payload())">Save Draft</button>
        <button class="gb-btn primary" :disabled="!canSubmit || busy" @click="trySubmit">
          {{ pir.status === 'draft' ? 'Fuse & Submit for Review' : 'Already ' + plateText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
/* SdPirGlassBuilder — the GLASS DOSSIER's document builder (artifact A8, 1:1).
   Owns the editable copy of one PIR; every keystroke re-evaluates the section
   checks and emits `panes` so the hero stack etches live. Approved/published
   documents render sealed (inputs frosted) — only action-status pills stay live
   (the backend's status-only carve-out, addressed by stable aid). */
import { reactive, ref, computed, watch } from 'vue'
import SdDatePicker from '../components/SdDatePicker.vue'

const props = defineProps({
  pir: { type: Object, default: null },
  me: { type: Object, default: null },
  busy: { type: Boolean, default: false },
  // Actor-tier gate (assignee/commander/collaborator/lead/admin). When false the
  // dossier renders READ-ONLY even in a draft/in_review status — the backend
  // (_require_ticket_actor) would 403 edits/submit, so we don't offer them. Sealed
  // action-status pills still work for the action's own named owner. Default true
  // preserves the author's normal flow.
  canAct: { type: Boolean, default: true },
})
const emit = defineEmits(['save', 'submit', 'action-status', 'export-pdf',
  'refresh-metrics', 'refresh-timeline', 'open-incident', 'panes', 'blocked'])

const ROOT_CATS = [
  { value: 'hardware', label: 'Hardware' }, { value: 'software', label: 'Software' },
  { value: 'network', label: 'Network' }, { value: 'configuration', label: 'Configuration' },
  { value: 'vendor', label: 'Vendor' }, { value: 'user_error', label: 'User Error' },
  { value: 'other', label: 'Other' },
]
const PILL = { open: 'Open', in_progress: 'In Progress', done: 'Done' }

const doc = reactive({
  executive_summary: '', business_impact: '', technical_impact: '',
  root_cause: '', root_cause_category: null,
  five_whys: ['', '', '', '', ''],
  contributing_factors: [], went_well: [], went_wrong: [],
  corrective_actions: [], preventive_actions: [], participants: [],
  review_meeting_notes: '', lessons_learned: '',
})
const meetDate = ref('')
const meetTime = ref('15:00')
const factorIn = ref(''); const wellIn = ref(''); const wrongIn = ref('')
const corrIn = ref(''); const prevIn = ref(''); const personIn = ref('')
const flash = reactive({ summary: false, root: false, corrective: false })

// editable folds in the actor-tier gate: a non-actor sees the dossier frosted even
// in draft/in_review (the backend 409s/403s the edit anyway).
const statusEditable = computed(() => !!props.pir && ['draft', 'in_review'].includes(props.pir.status))
const editable = computed(() => statusEditable.value && props.canAct)
// viewer is looking at an editable-status dossier they may not touch — show the read-only note
const readOnlyView = computed(() => statusEditable.value && !props.canAct)
// sealed action-status pill may move only for the action's named owner or an actor
const canTrackAction = (a) => ['approved', 'published'].includes(props.pir?.status)
  && (props.canAct || (a && String(a.owner_id || '') === String(props.me?.id || '')))
const svc = computed(() => (props.pir?.metrics_snapshot?.affected_services || [])[0] || '')
const m = computed(() => props.pir?.metrics_snapshot || {})
const hasMetrics = computed(() => !!props.pir?.metrics_snapshot)
const approvals = computed(() => [...(props.pir?.approvals || [])].reverse())
const revisions = computed(() => [...(props.pir?.revisions || [])].reverse())
const tlRows = computed(() => (props.pir?.timeline_snapshot || []).slice(-8))

const hydrate = (p) => {
  doc.executive_summary = p?.executive_summary || ''
  doc.business_impact = p?.business_impact || ''
  doc.technical_impact = p?.technical_impact || ''
  doc.root_cause = p?.root_cause || ''
  doc.root_cause_category = p?.root_cause_category || null
  const whys = (p?.five_whys || []).slice(0, 5)
  doc.five_whys = [...whys, ...Array(Math.max(0, 5 - whys.length)).fill('')]
  doc.contributing_factors = [...(p?.contributing_factors || [])]
  doc.went_well = [...(p?.went_well || [])]
  doc.went_wrong = [...(p?.went_wrong || [])]
  doc.corrective_actions = (p?.corrective_actions || []).map(a => ({ ...a }))
  doc.preventive_actions = (p?.preventive_actions || []).map(a => ({ ...a }))
  doc.participants = (p?.participants || []).map(x => ({ ...x }))
  doc.review_meeting_notes = p?.review_meeting_notes || ''
  doc.lessons_learned = p?.lessons_learned || ''
  const at = p?.review_meeting_at ? String(p.review_meeting_at) : ''
  meetDate.value = at ? at.slice(0, 10) : ''
  meetTime.value = at && at.length > 10 ? at.slice(11, 16) : '15:00'
}
watch(() => props.pir, hydrate, { immediate: true })

/* ── live section checks (the panes) ── */
const whyCount = computed(() => doc.five_whys.filter(w => (w || '').trim()).length)
const ck = computed(() => ({
  summary: doc.executive_summary.trim().length > 0,
  impact: doc.business_impact.trim().length > 0 && doc.technical_impact.trim().length > 0,
  root: doc.root_cause.trim().length > 0 && !!doc.root_cause_category,
  whys: whyCount.value >= 3,
  factors: doc.contributing_factors.length > 0,
  well: doc.went_well.length > 0,
  wrong: doc.went_wrong.length > 0,
  corrective: doc.corrective_actions.length > 0,
  meeting: !!meetDate.value,
  lessons: doc.lessons_learned.trim().length > 0,
}))
watch([ck, hasMetrics], () => {
  const c = ck.value
  // back → front, mirroring the artifact's pane order
  emit('panes', [
    { k: 'record', label: 'Record · Meeting & Trails', lit: c.meeting && c.lessons },
    { k: 'actions', label: 'Action Registers', lit: c.corrective },
    { k: 'retro', label: 'Blameless Retro', lit: c.well && c.wrong },
    { k: 'factors', label: 'Contributing Factors', lit: c.factors },
    { k: 'whys', label: 'Five Whys', lit: c.whys },
    { k: 'root', label: 'Root Cause', lit: c.root },
    { k: 'metrics', label: 'Frozen Metrics', lit: hasMetrics.value },
    { k: 'summary', label: 'Executive Summary', lit: c.summary },
  ])
}, { immediate: true, deep: true })

const canSubmit = computed(() => props.pir?.status === 'draft' && props.canAct)
const gatesOk = computed(() => ck.value.summary && ck.value.root && ck.value.corrective)

/* ── adders ── */
const addFactor = () => {
  const v = factorIn.value.trim().replace(/\s+/g, '-').toLowerCase()
  if (!v) return
  doc.contributing_factors.push(v); factorIn.value = ''
}
const addReg = (key) => {
  const src = key === 'went_well' ? wellIn : wrongIn
  const v = src.value.trim()
  if (!v) return
  doc[key].push(v); src.value = ''
}
const addAction = (kind) => {
  const src = kind === 'corrective' ? corrIn : prevIn
  const v = src.value.trim()
  if (!v) return
  doc[`${kind}_actions`].push({
    action: v, status: 'open',
    owner_id: props.me?.id || null,
    owner_name: props.me?.full_name || props.me?.name || 'Me',
    target_date: null,
  })
  src.value = ''
}
const addPerson = () => {
  const raw = personIn.value.trim()
  if (!raw) return
  const [name, role] = raw.split('·').map(s => s.trim())
  if (!name) return
  doc.participants.push({ name, role: role || null })
  personIn.value = ''
}

/* ── action pills: draft-era edits stay local; sealed documents PATCH by aid ── */
const NEXT = { open: 'in_progress', in_progress: 'done', done: 'open' }
const cycleAction = (kind, index, a) => {
  const next = NEXT[a.status || 'open']
  if (editable.value) { a.status = next; return }
  if (canTrackAction(a)) {
    emit('action-status', { kind, index, aid: a.aid || null, status: next })
  }
}

/* ── payload + submit gate ── */
const payload = () => {
  let meetingAt = null
  if (meetDate.value) meetingAt = `${meetDate.value}T${meetTime.value || '15:00'}:00`
  const act = (rows) => rows
    .filter(a => (a.action || '').trim().length >= 3)
    .map(a => ({ aid: a.aid || undefined, action: a.action, owner_id: a.owner_id || undefined,
                 owner_name: a.owner_name || undefined, target_date: a.target_date || undefined,
                 status: a.status || 'open' }))
  return {
    executive_summary: doc.executive_summary || null,
    business_impact: doc.business_impact || null,
    technical_impact: doc.technical_impact || null,
    root_cause: doc.root_cause || null,
    root_cause_category: doc.root_cause_category || null,
    five_whys: doc.five_whys.filter(w => (w || '').trim()),
    contributing_factors: doc.contributing_factors,
    went_well: doc.went_well,
    went_wrong: doc.went_wrong,
    corrective_actions: act(doc.corrective_actions),
    preventive_actions: act(doc.preventive_actions),
    participants: doc.participants,
    review_meeting_at: meetingAt,
    review_meeting_notes: doc.review_meeting_notes || null,
    lessons_learned: doc.lessons_learned || null,
  }
}
const trySubmit = () => {
  if (!canSubmit.value) return
  if (!gatesOk.value) {
    const c = ck.value
    ;['summary', 'root', 'corrective'].forEach((k) => {
      if (!c[k]) { flash[k] = false; requestAnimationFrame(() => { flash[k] = true; setTimeout(() => { flash[k] = false }, 600) }) }
    })
    emit('blocked')
    return
  }
  emit('submit', payload())
}

/* ── formatting ── */
const plateText = computed(() => ({
  draft: 'Draft', in_review: 'In Review · Sealed Stack', approved: 'Approved', published: 'Published',
}[props.pir?.status] || '—'))
const plateClass = computed(() => ({ inrev: props.pir?.status === 'in_review',
  pub: ['approved', 'published'].includes(props.pir?.status) }))
const mins = (v) => {
  if (v == null) return '—'
  const n = Number(v)
  return n >= 60 ? `${Math.floor(n / 60)}h ${String(Math.round(n % 60)).padStart(2, '0')}m` : `${Math.round(n)}m`
}
const numFmt = (v) => (v == null ? '—' : Number(v).toLocaleString('en-IN'))
const shortAt = (iso) => {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
  } catch { return String(iso).slice(0, 16).replace('T', ' ') }
}
const todayIso = new Date().toISOString().slice(0, 10)
const isOver = (a) => (a.status || 'open') !== 'done' && !!a.target_date && String(a.target_date).slice(0, 10) < todayIso
const dueLabel = (a) => {
  if (!a.target_date) return '—'
  const d = String(a.target_date).slice(0, 10)
  try {
    const lbl = new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })
    return isOver(a) ? `${lbl} · overdue` : lbl
  } catch { return d }
}
const pillLabel = (s) => PILL[s || 'open'] || 'Open'
const initials = (n) => (n || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
const tlAt = (e) => String(e.at || '').slice(11, 16) || String(e.at || '').slice(0, 10)
const tlLabel = (e) => {
  const d = e.detail || {}
  const extra = d.preview || d.note || d.pir || ''
  return `${(e.event || '').replace(/_/g, ' ')}${e.actor ? ' — ' + e.actor : ''}${extra ? ' · ' + String(extra).slice(0, 60) : ''}`
}
const tlTone = (e) => {
  const ev = e.event || ''
  if (/breach|escalat|major|declared/.test(ev)) return 'crit'
  if (/resolved|closed|approved|published/.test(ev)) return 'win'
  return ''
}
</script>

<style scoped>
.gb-shell { border-radius: 20px; overflow: hidden; background: var(--sd-pir-glass);
  backdrop-filter: blur(26px) saturate(160%); -webkit-backdrop-filter: blur(26px) saturate(160%);
  border: 1px solid var(--sd-pir-brd); box-shadow: inset 0 1px 0 var(--sd-pir-spec), var(--sd-pir-shadow); }
.gb-head { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap;
  padding: 20px 24px 16px; border-bottom: 1px solid var(--sd-pir-brd); }
.gb-head h3 { font-weight: 300; font-size: 22px; letter-spacing: -0.01em; color: var(--sd-text); margin: 0; }
.gb-meta { display: flex; gap: 12px; margin-top: 7px; font-family: var(--sd-mono); font-size: 9.5px;
  letter-spacing: 0.16em; text-transform: uppercase; color: var(--sd-pir-ink3); flex-wrap: wrap; align-items: center; }
.gb-meta .sev.s1 { color: var(--sd-pir-red); }
.gb-meta .sev.s2 { color: var(--sd-pir-core); }
.gb-inc-link { border: none; background: none; cursor: pointer; font: inherit; color: var(--sd-pir-core);
  padding: 0; letter-spacing: inherit; text-transform: inherit; }
.gb-inc-link:hover { text-decoration: underline; }
.gb-head-right { display: flex; align-items: center; gap: 11px; }
.gb-plate { font-family: var(--sd-mono); font-size: 9.5px; letter-spacing: 0.26em; text-transform: uppercase;
  border: 1px solid var(--sd-pir-brd2); color: var(--sd-pir-core); border-radius: 20px; padding: 9px 17px;
  transition: all 0.4s; background: var(--sd-pir-core-soft); }
.gb-plate.inrev { border-color: var(--sd-pir-hot); color: var(--sd-pir-hot); box-shadow: 0 0 22px rgba(245, 158, 11, 0.22); }
.gb-plate.pub { border-color: var(--sd-pir-em); color: var(--sd-pir-em); }

.gb-cards { display: grid; grid-template-columns: repeat(12, 1fr); gap: 13px; padding: 20px 24px 8px; }
.gb-card { border-radius: 14px; border: 1px solid var(--sd-pir-brd); padding: 16px 17px; position: relative;
  background: linear-gradient(160deg, rgba(255, 251, 240, 0.04), rgba(255, 251, 240, 0.012));
  transition: border-color 0.3s, transform 0.3s, box-shadow 0.3s; }
[data-theme="light"] .gb-card { background: linear-gradient(160deg, rgba(255, 255, 255, 0.5), rgba(255, 253, 246, 0.3)); }
.gb-card:hover { border-color: var(--sd-pir-brd2); transform: translateY(-2px); }
.gb-card.fail-flash { animation: gb-shk 0.5s; border-color: var(--sd-pir-red); }
@keyframes gb-shk { 0%, 100% { transform: translateX(0); } 20% { transform: translateX(-7px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(3px); } }
.c-head { display: flex; align-items: center; gap: 9px; margin-bottom: 11px; }
.c-gem { width: 10px; height: 10px; border-radius: 3px; flex: none; background: var(--sd-pir-ink3);
  opacity: 0.5; transition: all 0.6s; transform: rotate(45deg); }
.c-gem.lit { background: linear-gradient(150deg, var(--sd-pir-hot), var(--sd-pir-deep)); opacity: 1;
  box-shadow: 0 0 10px rgba(232, 176, 75, 0.5); }
.c-name { font-family: var(--sd-mono); font-size: 9.5px; letter-spacing: 0.2em; text-transform: uppercase; color: var(--sd-pir-core); }
.c-name .req { color: var(--sd-pir-red); letter-spacing: 0.02em; text-transform: none; }
.c-state { margin-left: auto; font-family: var(--sd-mono); font-size: 8px; letter-spacing: 0.16em;
  text-transform: uppercase; color: var(--sd-pir-ink3); }
.c-state.ok { color: var(--sd-pir-em); }
.gb-mini { margin-left: 10px; border: 1px dashed var(--sd-pir-brd2); background: none; cursor: pointer;
  color: var(--sd-pir-ink2); font-family: var(--sd-mono); font-size: 8px; letter-spacing: 0.14em;
  text-transform: uppercase; border-radius: 12px; padding: 4px 9px; transition: all 0.25s; }
.gb-mini:hover { color: var(--sd-pir-core); border-color: var(--sd-pir-core); }
.c4 { grid-column: span 4; } .c6 { grid-column: span 6; } .c12 { grid-column: span 12; }
@media (max-width: 1080px) { .c4, .c6 { grid-column: span 12; } }

textarea, .gb-card input[type="text"], .gb-time {
  width: 100%; background: var(--sd-pir-field); border: 1px solid var(--sd-pir-brd); border-radius: 10px;
  font-family: inherit; font-size: 13px; color: var(--sd-text); line-height: 1.65; padding: 10px 13px;
  resize: vertical; transition: border-color 0.3s, background 0.3s; }
textarea:focus, .gb-card input:focus { outline: none; border-color: var(--sd-pir-brd2); background: var(--sd-pir-core-soft); }
textarea::placeholder, .gb-card input::placeholder { color: var(--sd-pir-ink3); }
textarea:disabled, .gb-card input:disabled { opacity: 0.65; cursor: not-allowed; }
.gb-time { width: 96px; flex: none; color-scheme: dark; }
[data-theme="light"] .gb-time { color-scheme: light; }
.gb-meet-row { display: flex; gap: 9px; align-items: center; }
.gb-meet-note { margin: 8px 0 0; font-size: 10.5px; color: var(--sd-pir-ink3); line-height: 1.5; }

.gb-slab { border-radius: 12px; overflow: hidden; border: 1px solid var(--sd-pir-brd2);
  background: linear-gradient(160deg, rgba(232, 176, 75, 0.08), rgba(232, 176, 75, 0.02)); }
.gb-slab.empty { display: flex; justify-content: space-between; align-items: center; gap: 12px;
  padding: 13px 15px; font-size: 12px; color: var(--sd-pir-ink2); border-style: dashed; }
.gb-slab-head { display: flex; justify-content: space-between; padding: 10px 15px; border-bottom: 1px solid var(--sd-pir-brd);
  font-family: var(--sd-mono); font-size: 9px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--sd-pir-ink3); }
.gb-slab-head b { color: var(--sd-pir-core); }
.gb-slab-grid { display: grid; grid-template-columns: repeat(8, 1fr); }
@media (max-width: 1080px) { .gb-slab-grid { grid-template-columns: repeat(4, 1fr); } }
.sl { padding: 13px 10px; border-right: 1px solid var(--sd-pir-brd); text-align: center; }
.sl:last-child { border-right: none; }
.sl .v { font-size: 19px; font-weight: 300; color: var(--sd-text); font-variant-numeric: tabular-nums; }
.sl .k { font-family: var(--sd-mono); font-size: 8px; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--sd-pir-ink3); margin-top: 5px; }

.gb-cats { display: flex; flex-wrap: wrap; gap: 7px; }
.gb-cat { cursor: pointer; font-family: var(--sd-mono); font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase;
  border: 1px solid var(--sd-pir-brd); border-radius: 18px; padding: 7px 13px; color: var(--sd-pir-ink2);
  background: transparent; transition: all 0.25s; }
.gb-cat:hover:not(:disabled) { transform: translateY(-2px); border-color: var(--sd-pir-brd2); color: var(--sd-pir-core); }
.gb-cat.on { background: linear-gradient(180deg, var(--sd-pir-hot), var(--sd-pir-deep)); border-color: transparent;
  color: var(--sd-pir-btn-ink); font-weight: 700; box-shadow: 0 4px 14px rgba(232, 176, 75, 0.3); }
.gb-cat:disabled { cursor: not-allowed; opacity: 0.65; }

.gb-whys { list-style: none; display: flex; flex-direction: column; gap: 8px; margin: 0; padding: 0; }
.gb-whys li { display: flex; gap: 10px; align-items: center; }
.gb-whys .wn { flex: none; font-family: var(--sd-mono); font-size: 9px; color: var(--sd-pir-core);
  border: 1px solid var(--sd-pir-brd2); border-radius: 9px; padding: 6px 9px; letter-spacing: 0.08em;
  background: var(--sd-pir-core-soft); }

.gb-tags { display: flex; flex-wrap: wrap; gap: 7px; margin-bottom: 10px; }
.gb-ftag { font-family: var(--sd-mono); font-size: 10px; color: var(--sd-pir-ink2); border: 1px solid var(--sd-pir-brd);
  border-radius: 14px; padding: 6px 11px; background: rgba(255, 251, 240, 0.04); display: inline-flex; gap: 8px;
  align-items: center; transition: transform 0.25s, border-color 0.25s; }
.gb-ftag:hover { transform: translateY(-2px); border-color: var(--sd-pir-brd2); }
.gb-ftag button, .gb-reg .rm, .gb-person .rm { border: none; background: none; cursor: pointer;
  color: var(--sd-pir-red); font-size: 12px; line-height: 1; padding: 0; }
.gb-add-line { display: flex; gap: 9px; margin-top: 10px; }
.gb-add-line input { flex: 1; }
.gb-add-btn { cursor: pointer; flex: none; font-family: var(--sd-mono); font-size: 9px; letter-spacing: 0.14em;
  text-transform: uppercase; border: 1px dashed var(--sd-pir-brd2); background: transparent; color: var(--sd-pir-ink2);
  border-radius: 16px; padding: 8px 13px; transition: all 0.25s; }
.gb-add-btn:hover { border-color: var(--sd-pir-core); color: var(--sd-pir-core); transform: translateY(-2px); }

.gb-reg { list-style: none; margin: 0; padding: 0; }
.gb-reg li { display: flex; gap: 10px; align-items: flex-start; padding: 9px 4px; border-bottom: 1px solid var(--sd-pir-brd);
  font-size: 13px; line-height: 1.55; color: var(--sd-pir-ink2); transition: background 0.25s; }
.gb-reg li:hover { background: var(--sd-pir-core-soft); }
.gb-reg li .gl { flex: none; font-family: var(--sd-mono); font-size: 11px; margin-top: 1px; }
.gb-reg.well li .gl { color: var(--sd-pir-em); }
.gb-reg.wrong li .gl { color: var(--sd-pir-red); }
.gb-reg li .rm { margin-left: auto; opacity: 0; transition: opacity 0.2s; }
.gb-reg li:hover .rm { opacity: 1; }

.gb-acts { width: 100%; border-collapse: collapse; }
.gb-acts th { font-family: var(--sd-mono); font-size: 8.5px; letter-spacing: 0.2em; text-transform: uppercase;
  color: var(--sd-pir-ink3); text-align: left; padding: 5px 7px; border-bottom: 1px solid var(--sd-pir-brd2); }
.gb-acts td { padding: 10px 7px; border-bottom: 1px solid var(--sd-pir-brd); font-size: 12.5px;
  vertical-align: middle; color: var(--sd-text); }
.gb-acts tbody tr:hover { background: var(--sd-pir-core-soft); }
.owner-chip { font-family: var(--sd-mono); font-size: 9px; background: rgba(255, 251, 240, 0.05);
  border: 1px solid var(--sd-pir-brd); border-radius: 11px; padding: 4px 10px; white-space: nowrap; color: var(--sd-pir-ink2); }
.due { font-family: var(--sd-mono); font-size: 10px; white-space: nowrap; color: var(--sd-pir-ink3); }
.due.over { color: var(--sd-pir-red); font-weight: 700; }
.gb-pill { cursor: pointer; border: none; font-family: var(--sd-mono); font-size: 8.5px; letter-spacing: 0.14em;
  text-transform: uppercase; border-radius: 11px; padding: 5px 12px; transition: all 0.25s; white-space: nowrap; }
.gb-pill:hover { transform: translateY(-2px) scale(1.04); }
.gb-pill.open { background: rgba(255, 251, 240, 0.06); color: var(--sd-pir-ink2); border: 1px solid var(--sd-pir-brd2); }
.gb-pill.in_progress { background: var(--sd-pir-hot-soft); color: var(--sd-pir-hot); border: 1px solid var(--sd-pir-hot); }
.gb-pill.done { background: rgba(52, 211, 153, 0.14); color: var(--sd-pir-em); border: 1px solid var(--sd-pir-em); }
.gb-pill.overdue-ring { box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2); animation: gb-pulse 2s infinite; }
@keyframes gb-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.55; } }

.gb-roster { display: flex; flex-wrap: wrap; gap: 9px; }
.gb-person { display: flex; align-items: center; gap: 9px; border: 1px solid var(--sd-pir-brd); border-radius: 22px;
  padding: 5px 14px 5px 5px; background: rgba(255, 251, 240, 0.04); transition: transform 0.25s, border-color 0.25s; }
.gb-person:hover { transform: translateY(-2px); border-color: var(--sd-pir-brd2); }
.gb-person .av { width: 27px; height: 27px; border-radius: 50%; display: grid; place-items: center;
  font-family: var(--sd-mono); font-size: 8.5px; color: var(--sd-pir-btn-ink); font-weight: 700;
  background: linear-gradient(150deg, var(--sd-pir-hot), var(--sd-pir-deep)); }
.gb-person .nm { font-size: 12px; color: var(--sd-text); }
.gb-person .rl { font-family: var(--sd-mono); font-size: 8px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--sd-pir-ink3); }

.gb-tl { list-style: none; position: relative; padding-left: 20px; margin: 0; }
.gb-tl::before { content: ''; position: absolute; left: 5px; top: 6px; bottom: 6px; width: 1px; background: var(--sd-pir-brd2); }
.gb-tl li { position: relative; padding: 5px 0; font-size: 12.5px; color: var(--sd-pir-ink2); line-height: 1.55; }
.gb-tl li::before { content: ''; position: absolute; left: -18.5px; top: 11px; width: 7px; height: 7px;
  border-radius: 50%; background: var(--sd-surface); border: 2px solid var(--sd-pir-core); }
.gb-tl li.crit::before { border-color: var(--sd-pir-red); }
.gb-tl li.win::before { border-color: var(--sd-pir-em); }
.gb-tl li.dim { color: var(--sd-pir-ink3); }
.gb-tl li b { font-family: var(--sd-mono); font-size: 10px; color: var(--sd-text); letter-spacing: 0.06em; margin-right: 8px; }

.gb-trail { list-style: none; margin: 0; padding: 0; }
.gb-trail li { padding: 9px 2px; border-bottom: 1px solid var(--sd-pir-brd); font-size: 12.5px;
  color: var(--sd-pir-ink2); line-height: 1.55; }
.gb-trail li b { color: var(--sd-text); }
.gb-trail li .tmono { font-family: var(--sd-mono); font-size: 9px; color: var(--sd-pir-ink3); letter-spacing: 0.1em; }
.gb-trail li.rej b { color: var(--sd-pir-red); }
.gb-trail li.dim { color: var(--sd-pir-ink3); }

.gb-empty { padding: 44px 24px; text-align: center; color: var(--sd-pir-ink3); font-size: 13px; }

.gb-ro-note { display: flex; align-items: center; gap: 11px; margin: 0 24px; padding: 12px 16px;
  border: 1px dashed var(--sd-pir-brd2); border-radius: 12px; background: var(--sd-pir-core-soft);
  font-size: 12.5px; line-height: 1.5; color: var(--sd-pir-ink2); }
.gb-ro-note .gb-ro-dot { width: 8px; height: 8px; border-radius: 50%; flex: none; background: var(--sd-pir-core); }

.gb-foot { display: flex; justify-content: space-between; align-items: center; gap: 20px; flex-wrap: wrap;
  padding: 16px 24px 20px; border-top: 1px solid var(--sd-pir-brd); margin-top: 14px; }
.gb-gates { display: flex; gap: 14px; flex-wrap: wrap; }
.gb-gate { display: flex; align-items: center; gap: 8px; font-family: var(--sd-mono); font-size: 9px;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--sd-pir-ink3); }
.gb-gate .lamp { width: 9px; height: 9px; border-radius: 50%; background: var(--sd-pir-red); transition: all 0.3s; }
.gb-gate.ok .lamp { background: var(--sd-pir-em); box-shadow: 0 0 8px rgba(52, 211, 153, 0.6); }
.gb-gate.ok { color: var(--sd-pir-ink2); }
.gb-verbs { display: flex; gap: 11px; }
.gb-btn { cursor: pointer; font-family: var(--sd-mono); font-size: 10px; letter-spacing: 0.18em;
  text-transform: uppercase; border-radius: 22px; padding: 12px 22px; border: 1px solid var(--sd-pir-brd2);
  background: transparent; color: var(--sd-pir-ink2); transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.gb-btn:hover:not(:disabled) { transform: translateY(-2px); border-color: var(--sd-pir-core); color: var(--sd-pir-core); }
.gb-btn:active { transform: scale(0.97); }
.gb-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.gb-btn.ghost { padding: 9px 16px; font-size: 9px; }
.gb-btn.ghost.sm { padding: 7px 13px; font-size: 8.5px; }
.gb-btn.primary { background: linear-gradient(180deg, var(--sd-pir-hot), var(--sd-pir-deep));
  color: var(--sd-pir-btn-ink); border: none; font-weight: 700; box-shadow: 0 8px 24px rgba(232, 176, 75, 0.25); }
.gb-btn.primary:hover:not(:disabled) { box-shadow: 0 14px 34px rgba(232, 176, 75, 0.4);
  color: var(--sd-pir-btn-ink); transform: translateY(-3px); }
.gb-btn.primary:disabled { transform: none; box-shadow: none; }
</style>
