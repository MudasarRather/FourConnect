<template>
  <!-- ═══════════════════ PIP CONSOLE · Recovery Brief + plan workbench ═══════════════════
       Two-pane. A live "Recovery Brief" aside (left) assembles as you build the plan — owner,
       window, objectives, vital pulse, DRAFT→ACTIVE stamp, and (manage) the auto-spawn
       provenance + manager. The main pane is a 4-step CREATE wizard (Who → Why → Objectives →
       Schedule & open) or the MANAGE workbench (lifecycle stepper, objective status, check-in
       timeline, outcome, transitions). Dates use the assets-register HrDatePicker; the review
       link uses the teleported PerfSelect. -->
  <teleport to="body">
    <Presence>
      <Motion v-if="open" key="ov" as="div" class="pip-ov perf-scope" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
        :exit="{ opacity: 0 }" :transition="{ duration: 0.22 }" @click.self="$emit('close')">
        <Motion as="div" class="pip" :initial="{ opacity: 0, y: 22, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 14, scale: 0.98 }" :transition="{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }">
          <span class="pip-mesh" aria-hidden="true" />

          <!-- ───────── aside · live Recovery Brief ───────── -->
          <aside class="pip-pass">
            <span class="pip-pass-grain" aria-hidden="true" />
            <div class="pip-pass-stamp" :class="stampClass">{{ stampLabel }}</div>

            <div class="pip-pass-mon">
              <svg class="pip-pass-svg" viewBox="0 0 200 70" preserveAspectRatio="none" aria-hidden="true">
                <path class="pip-pass-ghost" :d="passSpark" />
                <path class="pip-pass-line" :d="passSpark" />
              </svg>
              <span class="pip-pass-mon-cap"><HeartPulse :size="10" /> recovery pulse</span>
            </div>

            <div class="pip-pass-body">
              <span class="pip-pass-eyebrow"><LifeBuoy :size="12" /> {{ manage ? 'Improvement plan' : 'New plan' }}</span>
              <div class="pip-pass-emp" v-if="passName">
                <span class="pip-pass-av">{{ initials(passName) }}</span>
                <div class="pip-pass-emp-txt"><b>{{ passName }}</b><span v-if="passRole">{{ passRole }}</span></div>
              </div>
              <div v-else class="pip-pass-emp ghost"><span class="pip-pass-av"><Search :size="13" /></span><span>Pick an employee</span></div>

              <b class="pip-pass-title">{{ form.title || 'Plan title…' }}</b>

              <div class="pip-pass-meter">
                <div class="pip-pass-meter-h"><Target :size="11" /> {{ metCount }}/{{ filledObjCount }} objectives met</div>
                <div class="pip-pass-meter-track"><i :style="{ width: objPct + '%' }" /></div>
              </div>

              <div class="pip-pass-window" v-if="form.start_date && form.end_date">
                <CalendarRange :size="12" /> {{ windowLabel }}
              </div>

              <div class="pip-pass-foot">
                <button v-if="manage && m.review_id" class="pip-pass-prov" type="button" @click="$emit('go-review')"><GitBranch :size="11" /> Spawned from a review</button>
                <span v-if="manage && m.manager_name" class="pip-pass-mgr"><UserRound :size="11" /> {{ m.manager_name }}</span>
                <span v-else-if="!manage" class="pip-pass-mgr hint"><UserRound :size="11" /> Manager auto-linked from reporting line</span>
              </div>
            </div>
          </aside>

          <!-- ───────── main ───────── -->
          <div class="pip-main">
            <header class="pip-head">
              <span class="pip-ic" :style="manage ? { '--c': statusColor } : null"><component :is="manage ? statusIcon : LifeBuoy" :size="17" /></span>
              <div class="pip-titles">
                <b>{{ manage ? (m.employee_name || 'Improvement plan') : 'New improvement plan' }}</b>
                <span>{{ manage ? (m.designation_name || m.employee_code || '') : createStepMeta[step].sub }}</span>
              </div>
              <span v-if="manage" class="pip-stamp" :style="{ '--c': statusColor }"><component :is="statusIcon" :size="11" />{{ statusLabel }}</span>
              <button class="pip-x" type="button" @click="$emit('close')"><X :size="16" /></button>
            </header>

            <!-- CREATE stepper -->
            <div v-if="!manage" class="pip-steps">
              <button v-for="(s, i) in createStepMeta" :key="s.key" class="pip-cstep" :class="{ on: i === step, done: i < step }"
                type="button" :disabled="i > maxReached" @click="goStep(i)">
                <span class="pip-cstep-dot"><component :is="i < step ? Check : s.icon" :size="12" /></span>
                <span class="pip-cstep-lab">{{ s.label }}</span>
              </button>
              <span class="pip-cstep-rail"><span class="pip-cstep-fill" :style="{ width: (step / (createStepMeta.length - 1)) * 100 + '%' }" /></span>
            </div>

            <!-- MANAGE lifecycle stepper -->
            <div v-else class="pip-life">
              <div v-for="(p, i) in WORKFLOW" :key="p.key" class="pip-life-step" :class="stepClass(i)">
                <span class="pip-life-dot"><component :is="p.icon" :size="12" /></span>
                <span class="pip-life-lab">{{ p.label }}</span>
              </div>
            </div>

            <div class="pip-body">
              <!-- ════════════ CREATE WIZARD ════════════ -->
              <template v-if="!manage">
                <transition :name="`pip-slide-${slideDir}`" mode="out-in">
                  <!-- STEP 0 · WHO & WHAT -->
                  <div v-if="step === 0" key="c0" class="pip-pane">
                    <div class="pip-field">
                      <label class="pip-lab"><UserRound :size="12" /> Employee on the plan <i>*</i></label>
                      <div v-if="!form.employee_id" class="pip-search">
                        <Search :size="14" /><input v-model="search" class="pip-search-in" placeholder="Search employees…" />
                      </div>
                      <div v-if="!form.employee_id" class="pip-emps">
                        <div v-if="loadingEmps" class="pip-emps-load"><Loader2 :size="15" class="perf-spin" /> Loading…</div>
                        <Motion v-for="(e, i) in emps" :key="e.id" as="button" type="button" class="pip-emp" @click="pickEmp(e)"
                          :initial="reduced ? false : { opacity: 0, x: -8 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.3, delay: i * 0.03 }">
                          <span class="pip-emp-av">{{ initials(empName(e)) }}</span>
                          <span class="pip-emp-txt"><b>{{ empName(e) }}</b><span>{{ e.designation_name || e.employee_id || '' }}</span></span>
                          <ChevronRight :size="14" class="pip-emp-go" />
                        </Motion>
                        <p v-if="!loadingEmps && !emps.length" class="pip-emps-empty">No employees match.</p>
                      </div>
                      <div v-else class="pip-emp-chip">
                        <span class="pip-emp-av lg">{{ initials(pickedName) }}</span>
                        <div class="pip-emp-chip-txt"><b>{{ pickedName }}</b><span>On the plan</span></div>
                        <button type="button" @click="clearEmp"><X :size="14" /></button>
                      </div>
                    </div>
                    <div class="pip-field">
                      <label class="pip-lab"><LifeBuoy :size="12" /> Plan title <i>*</i></label>
                      <input v-model="form.title" class="pip-input" placeholder="e.g. 90-day delivery improvement plan" />
                    </div>
                    <div class="pip-field" v-if="form.employee_id">
                      <label class="pip-lab"><GitBranch :size="12" /> Triggered by review <i class="opt">(optional)</i></label>
                      <PerfSelect v-model="form.review_id" :options="reviewOpts" :placeholder="loadingReviews ? 'Loading reviews…' : 'Link the review that prompted this'" />
                      <p class="pip-hint"><Info :size="11" /> Links the plan to the performance review that surfaced the gap — the same link a below-band auto-PIP carries.</p>
                    </div>
                  </div>

                  <!-- STEP 1 · WHY -->
                  <div v-else-if="step === 1" key="c1" class="pip-pane">
                    <p class="pip-banner"><Info :size="12" /> A fair plan is specific: name the gap, define the standard, and the support you’ll provide to close it.</p>
                    <div class="pip-field">
                      <label class="pip-lab"><AlertTriangle :size="12" /> Reason for the plan</label>
                      <textarea v-model="form.reason" class="pip-area" rows="2" placeholder="What performance gap prompted this plan?" />
                    </div>
                    <div class="pip-field">
                      <label class="pip-lab"><Target :size="12" /> Expectations</label>
                      <textarea v-model="form.expectations" class="pip-area" rows="2" placeholder="What 'good' looks like by the end of the plan." />
                    </div>
                    <div class="pip-field">
                      <label class="pip-lab"><LifeBuoy :size="12" /> Support offered</label>
                      <textarea v-model="form.support" class="pip-area" rows="2" placeholder="Coaching, training, mentoring, resources provided." />
                    </div>
                  </div>

                  <!-- STEP 2 · OBJECTIVES -->
                  <div v-else-if="step === 2" key="c2" class="pip-pane">
                    <p class="pip-banner"><Target :size="12" /> Measurable objectives are how the plan’s outcome is judged. Each needs a way to track it and a target.</p>
                    <ObjectivesEditor :objectives="form.objectives" :manage="false" @add="addObjective" @remove="removeObjective" />
                  </div>

                  <!-- STEP 3 · SCHEDULE & OPEN -->
                  <div v-else key="c3" class="pip-pane">
                    <div class="pip-row2">
                      <div class="pip-field">
                        <label class="pip-lab"><CalendarRange :size="12" /> Start date</label>
                        <HrDatePicker v-model="form.start_date" placeholder="dd / mm / yyyy" />
                      </div>
                      <div class="pip-field">
                        <label class="pip-lab"><Flag :size="12" /> Target end date</label>
                        <HrDatePicker v-model="form.end_date" :min="form.start_date || ''" placeholder="dd / mm / yyyy" />
                        <p v-if="dateWarn" class="pip-hint warn"><AlertTriangle :size="11" /> End date is before the start date.</p>
                      </div>
                    </div>

                    <div class="pip-field">
                      <label class="pip-lab"><Activity :size="12" /> Open as</label>
                      <div class="pip-seg">
                        <button type="button" class="pip-seg-btn" :class="{ on: !form.activate }" @click="form.activate = false"><FileText :size="14" /> Draft</button>
                        <button type="button" class="pip-seg-btn" :class="{ on: form.activate }" @click="form.activate = true"><Activity :size="14" /> Active now</button>
                      </div>
                      <p class="pip-hint">{{ form.activate ? 'The plan opens ACTIVE — the employee is on it immediately.' : 'Saved as a DRAFT you can review before activating.' }}</p>
                    </div>

                    <div class="pip-process">
                      <span class="pip-process-h"><CircleCheckBig :size="13" /> On create</span>
                      <ul>
                        <li><Check :size="12" /> Opens as <b>{{ form.activate ? 'Active' : 'Draft' }}</b> with <b>{{ filledObjCount }}</b> objective{{ filledObjCount === 1 ? '' : 's' }}.</li>
                        <li><Check :size="12" /> The manager is auto-linked from the employee’s reporting line.</li>
                        <li><Check :size="12" /> Log scheduled check-ins, then record a <b>Successful / Unsuccessful</b> outcome at the end.</li>
                      </ul>
                    </div>
                  </div>
                </transition>
              </template>

              <!-- ════════════ MANAGE WORKBENCH ════════════ -->
              <template v-else>
                <div class="pip-field">
                  <label class="pip-lab"><LifeBuoy :size="12" /> Plan title</label>
                  <input v-model="form.title" class="pip-input" placeholder="Plan title" />
                </div>
                <div class="pip-row2">
                  <div class="pip-field">
                    <label class="pip-lab"><CalendarRange :size="12" /> Start date</label>
                    <HrDatePicker v-model="form.start_date" placeholder="dd / mm / yyyy" />
                  </div>
                  <div class="pip-field">
                    <label class="pip-lab"><Flag :size="12" /> Target end date</label>
                    <HrDatePicker v-model="form.end_date" :min="form.start_date || ''" placeholder="dd / mm / yyyy" />
                    <p v-if="dateWarn" class="pip-hint warn"><AlertTriangle :size="11" /> End date is before the start date.</p>
                  </div>
                </div>
                <div class="pip-field">
                  <label class="pip-lab"><AlertTriangle :size="12" /> Reason</label>
                  <textarea v-model="form.reason" class="pip-area" rows="2" placeholder="What performance gap prompted this plan?" />
                </div>
                <div class="pip-row2">
                  <div class="pip-field">
                    <label class="pip-lab"><Target :size="12" /> Expectations</label>
                    <textarea v-model="form.expectations" class="pip-area" rows="2" placeholder="The standard to reach." />
                  </div>
                  <div class="pip-field">
                    <label class="pip-lab"><LifeBuoy :size="12" /> Support</label>
                    <textarea v-model="form.support" class="pip-area" rows="2" placeholder="Coaching / resources offered." />
                  </div>
                </div>

                <div class="pip-field">
                  <div class="pip-lab-row"><label class="pip-lab"><Target :size="12" /> Objectives</label><span class="pip-obj-tally">{{ metCount }}/{{ filledObjCount }} met</span></div>
                  <ObjectivesEditor :objectives="form.objectives" :manage="true" :obj-saving="objSaving" @add="addObjective" @remove="removeObjective" @set-status="setObjStatus" />
                </div>

                <!-- check-ins -->
                <div class="pip-field">
                  <label class="pip-lab"><MessageSquarePlus :size="12" /> Check-ins</label>
                  <div v-if="orderedCheckIns.length" class="pip-timeline">
                    <div v-for="(c, i) in orderedCheckIns" :key="i" class="pip-ci">
                      <span class="pip-ci-dot" aria-hidden="true" />
                      <div class="pip-ci-body">
                        <div class="pip-ci-head">
                          <span v-if="c.rating" class="pip-ci-rating" :class="ratingClass(c.rating)">{{ c.rating }}</span>
                          <span class="pip-ci-at"><Clock :size="11" /> {{ fmtDate(c.at) }}</span>
                          <span v-if="c.by" class="pip-ci-by">{{ c.by }}</span>
                        </div>
                        <p class="pip-ci-note">{{ c.note }}</p>
                      </div>
                    </div>
                  </div>
                  <p v-else class="pip-empty-line">No check-ins logged yet.</p>
                  <div class="pip-ci-form">
                    <div class="pip-ci-presets">
                      <button v-for="r in CHECK_RATINGS" :key="r.key" type="button" class="pip-ci-preset" :class="[ratingClass(r.key), { on: ci.rating === r.key }]" @click="ci.rating = (ci.rating === r.key ? '' : r.key)"><component :is="r.icon" :size="12" /> {{ r.key }}</button>
                    </div>
                    <div class="pip-ci-row">
                      <input v-model="ci.note" class="pip-input" placeholder="Log a check-in note…" @keyup.enter="addCheckIn" />
                      <button class="perf-btn perf-btn-primary pip-ci-add" type="button" :disabled="!ci.note.trim() || ciSaving" @click="addCheckIn">
                        <Loader2 v-if="ciSaving" :size="14" class="perf-spin" /><MessageSquarePlus v-else :size="14" /> Log
                      </button>
                    </div>
                  </div>
                </div>

                <div class="pip-field">
                  <label class="pip-lab"><FileText :size="12" /> Outcome / closing note</label>
                  <textarea v-model="form.outcome" class="pip-area" rows="2" placeholder="Summary of the plan's result — recorded on close." />
                </div>
              </template>
            </div>

            <!-- footer -->
            <footer class="pip-foot">
              <template v-if="manage">
                <button class="perf-btn pip-del" type="button" :class="{ armed: confirmDel }" :disabled="busy" :title="confirmDel ? 'Tap again to delete' : 'Delete plan'" @click="onDelete">
                  <Loader2 v-if="busy === 'del'" :size="14" class="perf-spin" /><Trash2 v-else :size="14" />{{ confirmDel ? ' Confirm' : '' }}
                </button>
                <button class="perf-btn perf-btn-ghost" type="button" :disabled="busy" @click="saveFields">
                  <Loader2 v-if="busy === 'save'" :size="14" class="perf-spin" /><Check v-else :size="14" /> Save
                </button>
                <span class="pip-grow" />
                <button v-for="a in transitions" :key="a.to" class="perf-btn" :class="a.primary ? 'perf-btn-primary' : ''" type="button" :disabled="busy" @click="doTransition(a)">
                  <Loader2 v-if="busy === a.to" :size="14" class="perf-spin" /><component v-else :is="a.icon" :size="14" /> {{ a.label }}
                </button>
              </template>
              <template v-else>
                <button v-if="step > 0" class="perf-btn perf-btn-steel" type="button" @click="back"><ChevronLeft :size="15" /> Back</button>
                <span class="pip-grow" />
                <button class="perf-btn perf-btn-ghost" type="button" @click="$emit('close')">Cancel</button>
                <button v-if="step < createStepMeta.length - 1" class="perf-btn perf-btn-primary" type="button" :disabled="!stepValid" @click="next">Continue <ChevronRight :size="15" /></button>
                <button v-else class="perf-btn perf-btn-primary" type="button" :disabled="!canCreate || busy" @click="onCreate">
                  <Loader2 v-if="busy === 'create'" :size="14" class="perf-spin" /><component v-else :is="form.activate ? Activity : Plus" :size="14" /> {{ form.activate ? 'Create & activate' : 'Save draft' }}
                </button>
              </template>
            </footer>
          </div>
        </Motion>
      </Motion>
    </Presence>
  </teleport>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  LifeBuoy, Plus, X, Search, Loader2, Activity, CalendarRange, CheckCircle2, MinusCircle,
  CircleSlash, FileText, Target, Flag, MessageSquarePlus, ArrowRight, Trash2, Clock, Check, CircleDot,
  ChevronLeft, ChevronRight, UserRound, GitBranch, HeartPulse, Info, CircleCheckBig, AlertTriangle,
  Smile, Meh, Frown,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { prefersReduced, seededWave } from '@/composables/useShiftMotion'
import PerfSelect from './PerfSelect.vue'
import ObjectivesEditor from './PipObjectivesEditor.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import {
  pipStatusMeta, fetchEmployeesForReview, fetchReviews,
  createPip, updatePip, pipCheckIn, transitionPip, deletePip,
} from '@/composables/usePerformance'

const props = defineProps({
  open: { type: Boolean, default: false },
  pip: { type: Object, default: null },   // present → MANAGE; null → CREATE
})
const emit = defineEmits(['close', 'save', 'mutated', 'deleted', 'go-review'])
const toast = useToast()
const reduced = prefersReduced()
const manage = computed(() => !!props.pip)

const m = reactive({})
const form = reactive({
  employee_id: null, review_id: null, title: '', reason: '', expectations: '', support: '',
  start_date: '', end_date: '', objectives: [], outcome: '', activate: false,
})
const pickedName = ref('')
const pickedRole = ref('')

/* ── create wizard ── */
const step = ref(0)
const maxReached = ref(0)
const slideDir = ref('fwd')
const createStepMeta = [
  { key: 'who', label: 'Who', icon: UserRound, sub: 'Who is on the plan' },
  { key: 'why', label: 'Why', icon: AlertTriangle, sub: 'Gap, expectations & support' },
  { key: 'obj', label: 'Objectives', icon: Target, sub: 'Measurable outcomes' },
  { key: 'plan', label: 'Schedule', icon: CalendarRange, sub: 'Window & how it opens' },
]
const stepValid = computed(() => {
  if (step.value === 0) return !!form.employee_id && !!form.title.trim()
  if (step.value === 2) return filledObjs.value.length > 0
  if (step.value === 3) return !dateWarn.value
  return true
})
function next() { if (!stepValid.value) return; slideDir.value = 'fwd'; step.value = Math.min(createStepMeta.length - 1, step.value + 1); maxReached.value = Math.max(maxReached.value, step.value) }
function back() { slideDir.value = 'back'; step.value = Math.max(0, step.value - 1) }
function goStep(i) { if (i > maxReached.value) return; slideDir.value = i > step.value ? 'fwd' : 'back'; step.value = i }

/* ── workflow vocab ── */
const WORKFLOW = [
  { key: 'DRAFT', label: 'Draft', icon: FileText },
  { key: 'ACTIVE', label: 'Active', icon: Activity },
  { key: 'EXTENDED', label: 'Extended', icon: CalendarRange },
  { key: 'CLOSED', label: 'Closed', icon: CheckCircle2 },
]
const STEP_ORDER = ['DRAFT', 'ACTIVE', 'EXTENDED', 'CLOSED']
const CLOSED_SET = new Set(['SUCCESSFUL', 'UNSUCCESSFUL'])
const CHECK_RATINGS = [
  { key: 'Improving', icon: Smile }, { key: 'On-track', icon: Meh }, { key: 'No change', icon: Frown },
]
const TRANSITION_MAP = {
  DRAFT:        [{ to: 'ACTIVE', label: 'Activate', icon: Activity, primary: true }, { to: 'CANCELLED', label: 'Cancel', icon: CircleSlash }],
  ACTIVE:       [{ to: 'EXTENDED', label: 'Extend', icon: CalendarRange }, { to: 'SUCCESSFUL', label: 'Successful', icon: CheckCircle2, primary: true, outcome: true }, { to: 'UNSUCCESSFUL', label: 'Unsuccessful', icon: MinusCircle, outcome: true }, { to: 'CANCELLED', label: 'Cancel', icon: CircleSlash }],
  EXTENDED:     [{ to: 'SUCCESSFUL', label: 'Successful', icon: CheckCircle2, primary: true, outcome: true }, { to: 'UNSUCCESSFUL', label: 'Unsuccessful', icon: MinusCircle, outcome: true }, { to: 'ACTIVE', label: 'Back to active', icon: ArrowRight }, { to: 'CANCELLED', label: 'Cancel', icon: CircleSlash }],
  SUCCESSFUL:   [{ to: 'ACTIVE', label: 'Reopen', icon: ArrowRight, primary: true }],
  UNSUCCESSFUL: [{ to: 'ACTIVE', label: 'Reopen', icon: ArrowRight, primary: true }],
  CANCELLED:    [{ to: 'DRAFT', label: 'Restore draft', icon: FileText }, { to: 'ACTIVE', label: 'Reactivate', icon: Activity, primary: true }],
}
const transitions = computed(() => TRANSITION_MAP[m.status] || [])

/* ── status meta ── */
const statusMetaObj = computed(() => pipStatusMeta(m.status))
const statusColor = computed(() => statusMetaObj.value.color)
const statusIcon = computed(() => statusMetaObj.value.icon)
const statusLabel = computed(() => statusMetaObj.value.label)
const curStep = computed(() => {
  if (CLOSED_SET.has(m.status)) return STEP_ORDER.indexOf('CLOSED')
  if (m.status === 'CANCELLED') return -1
  return STEP_ORDER.indexOf(m.status)
})
const stepClass = (i) => {
  if (m.status === 'CANCELLED') return 'cancel'
  if (i < curStep.value) return 'done'
  if (i === curStep.value) return 'active'
  return ''
}

/* ── aside brief ── */
const stampLabel = computed(() => manage.value ? statusLabel.value : (form.activate ? 'ACTIVE' : 'DRAFT'))
const stampClass = computed(() => {
  if (manage.value) {
    if (CLOSED_SET.has(m.status)) return m.status === 'SUCCESSFUL' ? 'ok' : 'bad'
    if (m.status === 'CANCELLED') return 'muted'
    return 'live'
  }
  return form.activate ? 'live' : 'muted'
})
const passName = computed(() => manage.value ? m.employee_name : pickedName.value)
const passRole = computed(() => manage.value ? (m.designation_name || m.employee_code || '') : pickedRole.value)
const passSpark = computed(() => {
  const rated = (manage.value ? (m.check_ins || []) : []).filter(c => c.rating).map(c => ({ Improving: 0.92, 'On-track': 0.6, 'No change': 0.28 }[c.rating] ?? 0.5))
  let vals = rated
  if (vals.length < 2) {
    const seed = ((manage.value ? m.id : form.title) || 'pip').split('').reduce((a, ch) => a + ch.charCodeAt(0), 0)
    vals = seededWave(seed, 10)
  }
  const n = vals.length, W = 200, H = 70, pad = 4
  return vals.map((v, i) => {
    const x = pad + (i / (n - 1)) * (W - pad * 2)
    const y = H - pad - v * (H - pad * 2)
    return (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1)
  }).join(' ')
})
const windowLabel = computed(() => {
  if (!form.start_date || !form.end_date) return ''
  const s = new Date(form.start_date), e = new Date(form.end_date)
  const days = Math.round((e - s) / 86400000)
  if (manage.value && ['ACTIVE', 'EXTENDED'].includes(m.status)) {
    const left = Math.round((e - Date.now()) / 86400000)
    if (left < 0) return `${days}-day window · ${-left}d overdue`
    return `${days}-day window · ${left}d left`
  }
  return `${days}-day window`
})

/* ── objectives ── */
let objSeq = 0
const keyed = (arr) => (Array.isArray(arr) ? arr : []).map(o => ({ title: o.title || '', measure: o.measure || '', target: o.target || '', status: o.status || 'OPEN', _k: 'o' + (objSeq++) }))
const filledObjs = computed(() => form.objectives.filter(o => (o.title || '').trim()))
const filledObjCount = computed(() => filledObjs.value.length)
const metCount = computed(() => form.objectives.filter(o => o.status === 'MET').length)
const objPct = computed(() => filledObjCount.value ? Math.round(metCount.value / filledObjCount.value * 100) : 0)
function addObjective() { form.objectives.push({ title: '', measure: '', target: '', status: 'OPEN', _k: 'o' + (objSeq++) }) }
function removeObjective(i) { form.objectives.splice(i, 1); if (manage.value) persistObjectives() }
const objSaving = ref(false)
async function setObjStatus(i, status) {
  if (!manage.value || objSaving.value) return
  form.objectives[i].status = status
  await persistObjectives()
}
const cleanObjectives = () => form.objectives.filter(o => (o.title || '').trim())
  .map(o => ({ title: o.title.trim(), measure: (o.measure || '').trim(), target: (o.target || '').trim(), status: o.status || 'OPEN' }))
async function persistObjectives() {
  if (!manage.value) return
  objSaving.value = true
  try { const updated = await updatePip(m.id, { objectives: cleanObjectives() }); hydrate(updated); emit('mutated', updated) }
  catch (e) { toast.error(e?.response?.data?.detail || 'Failed to update objectives') }
  finally { objSaving.value = false }
}

/* ── employees + reviews (create) ── */
const search = ref('')
const emps = ref([])
const loadingEmps = ref(false)
async function loadEmps() {
  loadingEmps.value = true
  try { const data = await fetchEmployeesForReview({ search: search.value || undefined }); emps.value = data.items || data || [] }
  catch { emps.value = [] } finally { loadingEmps.value = false }
}
let st = null
watch(search, () => { clearTimeout(st); st = setTimeout(loadEmps, 300) })
const empName = (e) => e.full_name || [e.first_name, e.last_name].filter(Boolean).join(' ') || e.name || e.employee_id || '—'
const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
function pickEmp(e) { form.employee_id = e.id; pickedName.value = empName(e); pickedRole.value = e.designation_name || e.employee_id || ''; loadReviews(e.id) }
function clearEmp() { form.employee_id = null; pickedName.value = ''; pickedRole.value = ''; form.review_id = null; reviewOpts.value = [{ value: null, label: '— Not linked' }] }

const reviewOpts = ref([{ value: null, label: '— Not linked' }])
const loadingReviews = ref(false)
async function loadReviews(empId) {
  loadingReviews.value = true
  try {
    const d = await fetchReviews({ employee_id: empId, limit: 50 })
    const items = (d.items || []).map(r => ({
      value: r.id,
      label: `${r.period_label || r.cycle || 'Review'}${r.final_rating_band ? ' · ' + r.final_rating_band : (r.overall_score != null ? ' · ' + r.overall_score : '')}`,
    }))
    reviewOpts.value = [{ value: null, label: '— Not linked' }, ...items]
  } catch { reviewOpts.value = [{ value: null, label: '— Not linked' }] }
  finally { loadingReviews.value = false }
}

/* ── check-ins ── */
const ci = reactive({ note: '', rating: '' })
const ciSaving = ref(false)
const orderedCheckIns = computed(() => [...(m.check_ins || [])].sort((a, b) => new Date(b.at) - new Date(a.at)))
const ratingClass = (r) => r === 'Improving' ? 'good' : r === 'On-track' ? 'mid' : r === 'No change' ? 'low' : ''
async function addCheckIn() {
  if (!ci.note.trim() || ciSaving.value) return
  ciSaving.value = true
  try {
    const payload = { note: ci.note.trim() }
    if (ci.rating) payload.rating = ci.rating
    const updated = await pipCheckIn(m.id, payload); hydrate(updated); emit('mutated', updated)
    ci.note = ''; ci.rating = ''; toast.success('Check-in logged')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to log check-in') }
  finally { ciSaving.value = false }
}

/* ── dates / validity ── */
const dateWarn = computed(() => form.start_date && form.end_date && form.end_date < form.start_date)
const canCreate = computed(() => !!form.employee_id && !!form.title.trim() && !dateWarn.value && filledObjs.value.length > 0)
const fmtDate = (iso) => { if (!iso) return '—'; const d = new Date(iso); if (isNaN(d)) return iso; return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }

/* ── hydration ── */
function hydrate(src) {
  Object.keys(m).forEach(k => delete m[k])
  Object.assign(m, src || {})
  form.employee_id = src?.employee_id || null
  form.review_id = src?.review_id || null
  form.title = src?.title || ''
  form.reason = src?.reason || ''
  form.expectations = src?.expectations || ''
  form.support = src?.support || ''
  form.start_date = (src?.start_date || '').slice(0, 10)
  form.end_date = (src?.end_date || '').slice(0, 10)
  form.outcome = src?.outcome || ''
  form.objectives = keyed(src?.objectives)
}
function resetCreate() {
  Object.keys(m).forEach(k => delete m[k])
  form.employee_id = null; form.review_id = null; form.title = ''; form.reason = ''; form.expectations = ''
  form.support = ''; form.start_date = ''; form.end_date = ''; form.outcome = ''; form.activate = false
  form.objectives = [{ title: '', measure: '', target: '', status: 'OPEN', _k: 'o' + (objSeq++) }]
  search.value = ''; pickedName.value = ''; pickedRole.value = ''
  reviewOpts.value = [{ value: null, label: '— Not linked' }]
  step.value = 0; maxReached.value = 0; slideDir.value = 'fwd'
}
watch(() => props.open, (v) => {
  if (!v) return
  if (props.pip) { hydrate(props.pip) } else { resetCreate(); loadEmps() }
  ci.note = ''; ci.rating = ''; confirmDel.value = false
})

/* ── actions ── */
const busy = ref(false)
async function onCreate() {
  if (!canCreate.value) return
  busy.value = 'create'
  try {
    const payload = {
      employee_id: form.employee_id, review_id: form.review_id || null,
      title: form.title.trim(), reason: form.reason.trim() || null,
      expectations: form.expectations.trim() || null, support: form.support.trim() || null,
      start_date: form.start_date || null, end_date: form.end_date || null,
      objectives: cleanObjectives(), activate: !!form.activate,
    }
    const created = await createPip(payload)
    toast.success(form.activate ? 'Plan created & activated' : 'Draft plan created')
    emit('save', created); emit('close')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to create plan') }
  finally { busy.value = false }
}
async function saveFields() {
  busy.value = 'save'
  try {
    const payload = {
      title: form.title.trim(), reason: form.reason.trim() || null,
      expectations: form.expectations.trim() || null, support: form.support.trim() || null,
      start_date: form.start_date || null, end_date: form.end_date || null,
      objectives: cleanObjectives(), outcome: form.outcome.trim() || null,
    }
    const updated = await updatePip(m.id, payload); hydrate(updated); emit('mutated', updated)
    toast.success('Plan updated')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to save') }
  finally { busy.value = false }
}
async function doTransition(a) {
  busy.value = a.to
  try {
    const payload = { to: a.to }
    if (a.outcome && form.outcome.trim()) payload.outcome = form.outcome.trim()
    const updated = await transitionPip(m.id, payload); hydrate(updated); emit('mutated', updated)
    toast.success(`${a.label} · ${pipStatusMeta(a.to).label}`)
  } catch (e) { toast.error(e?.response?.data?.detail || 'Action failed') }
  finally { busy.value = false }
}
const confirmDel = ref(false)
let delTimer = null
async function onDelete() {
  if (!confirmDel.value) { confirmDel.value = true; clearTimeout(delTimer); delTimer = setTimeout(() => { confirmDel.value = false }, 3500); return }
  clearTimeout(delTimer); confirmDel.value = false; busy.value = 'del'
  try { await deletePip(m.id); toast.success('Plan deleted'); emit('deleted', m.id); emit('close') }
  catch (e) { toast.error(e?.response?.data?.detail || 'Delete failed') }
  finally { busy.value = false }
}
</script>

<style scoped>
.pip-ov { position: fixed; inset: 0; z-index: 1300; display: flex; align-items: center; justify-content: center; padding: 24px;
  background: rgba(5, 5, 6, 0.64); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
.pip { position: relative; width: 100%; max-width: 880px; max-height: 92vh; display: grid; grid-template-columns: 260px 1fr; overflow: hidden; border-radius: 22px;
  background: var(--perf-surface-elevated); border: 1px solid var(--perf-border-strong); box-shadow: 0 50px 110px -42px rgba(0, 0, 0, 0.88); }
.pip-mesh { position: absolute; inset: 0; pointer-events: none; opacity: 0.7; z-index: 0;
  background: radial-gradient(70% 50% at 14% -8%, color-mix(in srgb, var(--perf-gold) 12%, transparent), transparent 60%),
    radial-gradient(60% 60% at 100% 100%, color-mix(in srgb, var(--perf-orange) 9%, transparent), transparent 60%); }

/* aside */
.pip-pass { position: relative; overflow: hidden; z-index: 1; display: flex; flex-direction: column; gap: 14px; padding: 20px 18px; border-right: 1px solid var(--perf-border);
  background: linear-gradient(170deg, color-mix(in srgb, var(--perf-gold) 9%, var(--perf-panel)), var(--perf-panel)); }
.pip-pass-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.45;
  background-image: linear-gradient(color-mix(in srgb, var(--perf-gold) 7%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--perf-gold) 7%, transparent) 1px, transparent 1px);
  background-size: 24px 24px; mask-image: radial-gradient(120% 70% at 50% 0%, #000, transparent 80%); -webkit-mask-image: radial-gradient(120% 70% at 50% 0%, #000, transparent 80%); }
.pip-pass-stamp { position: absolute; top: 15px; right: -28px; transform: rotate(38deg); z-index: 3; padding: 3px 34px; font-size: 9px; font-weight: 900; letter-spacing: 0.14em; color: var(--perf-text-muted); background: var(--perf-track); }
.pip-pass-stamp.live { color: #1a1206; background: var(--perf-grad-hero); }
.pip-pass-stamp.ok { color: #06281a; background: var(--perf-ok); }
.pip-pass-stamp.bad { color: #fff; background: var(--perf-conflict); }
.pip-pass-stamp.muted { color: var(--perf-text-muted); background: var(--perf-track); }
.pip-pass-mon { position: relative; z-index: 1; height: 64px; border-radius: 12px; overflow: hidden; background: color-mix(in srgb, var(--perf-noir, #000) 18%, var(--perf-surface)); border: 1px solid var(--perf-border); }
.pip-pass-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.pip-pass-ghost { fill: none; stroke: color-mix(in srgb, var(--perf-text-muted) 24%, transparent); stroke-width: 1.4; }
.pip-pass-line { fill: none; stroke: var(--perf-gold); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; filter: drop-shadow(0 0 4px color-mix(in srgb, var(--perf-gold) 50%, transparent));
  stroke-dasharray: 320; stroke-dashoffset: 320; animation: pip-draw 1.2s var(--perf-ease) 0.2s forwards; }
@keyframes pip-draw { to { stroke-dashoffset: 0; } }
.pip-pass-mon-cap { position: absolute; bottom: 4px; left: 7px; display: inline-flex; align-items: center; gap: 4px; font-size: 8px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--perf-text-muted); }
.pip-pass-mon-cap :deep(svg) { color: var(--perf-gold); }
.pip-pass-body { position: relative; z-index: 1; flex: 1; display: flex; flex-direction: column; gap: 11px; }
.pip-pass-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--perf-gold); }
.pip-pass-emp { display: flex; align-items: center; gap: 9px; }
.pip-pass-emp.ghost { color: var(--perf-text-muted); font-size: 12px; }
.pip-pass-av { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; font-size: 11px; font-weight: 850; color: #1a1206; background: var(--perf-grad-hero); }
.pip-pass-emp.ghost .pip-pass-av { color: var(--perf-text-muted); background: var(--perf-track); }
.pip-pass-emp-txt { min-width: 0; display: flex; flex-direction: column; }
.pip-pass-emp-txt b { font-size: 13px; font-weight: 800; color: var(--perf-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pip-pass-emp-txt span { font-size: 10.5px; color: var(--perf-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pip-pass-title { font-size: 14px; font-weight: 800; line-height: 1.25; color: var(--perf-text); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.pip-pass-meter { display: flex; flex-direction: column; gap: 5px; }
.pip-pass-meter-h { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 750; color: var(--perf-text-secondary); }
.pip-pass-meter-h :deep(svg) { color: var(--perf-gold); }
.pip-pass-meter-track { height: 6px; border-radius: 999px; background: var(--perf-track); overflow: hidden; }
.pip-pass-meter-track i { display: block; height: 100%; border-radius: 999px; background: var(--perf-grad-hero); transition: width 0.4s var(--perf-spring); }
.pip-pass-window { display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; font-size: 10.5px; font-weight: 700; color: var(--perf-text-secondary); padding: 4px 10px; border-radius: 999px; background: var(--perf-surface); border: 1px solid var(--perf-border); }
.pip-pass-window :deep(svg) { color: var(--perf-gold); }
.pip-pass-foot { margin-top: auto; display: flex; flex-direction: column; gap: 7px; padding-top: 10px; border-top: 1px dashed var(--perf-border); }
.pip-pass-prov { display: inline-flex; align-items: center; gap: 5px; align-self: flex-start; cursor: pointer; font: inherit; font-size: 10.5px; font-weight: 750; padding: 4px 10px; border-radius: 999px;
  color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 10%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 28%, transparent); transition: all 0.18s; }
.pip-pass-prov:hover { background: color-mix(in srgb, var(--perf-gold) 18%, transparent); }
.pip-pass-mgr { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; color: var(--perf-text-muted); }
.pip-pass-mgr :deep(svg) { color: var(--perf-text-dim); }
.pip-pass-mgr.hint { font-style: italic; }

/* main */
.pip-main { position: relative; z-index: 1; display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.pip-head { display: flex; align-items: center; gap: 11px; padding: 16px 18px 13px; border-bottom: 1px solid var(--perf-border); }
.pip-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 12px; flex-shrink: 0; --c: var(--perf-gold); color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.pip-titles { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.pip-titles b { font-size: 16px; font-weight: 850; color: var(--perf-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pip-titles span { font-size: 11.5px; color: var(--perf-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pip-stamp { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 999px; flex-shrink: 0; font-size: 10.5px; font-weight: 800; white-space: nowrap; --c: var(--perf-gold); color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 32%, transparent); }
.pip-x { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; cursor: pointer; flex-shrink: 0; color: var(--perf-text-muted); background: transparent; border: 1px solid var(--perf-border); transition: all 0.2s; }
.pip-x:hover { color: var(--perf-text); transform: rotate(90deg); }

/* create stepper */
.pip-steps { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 4px; padding: 13px 18px 11px; }
.pip-cstep-rail { position: absolute; left: 30px; right: 30px; top: 26px; height: 2px; border-radius: 2px; background: var(--perf-track); z-index: 0; }
.pip-cstep-fill { display: block; height: 100%; border-radius: 2px; background: var(--perf-grad-hero); transition: width 0.4s var(--perf-spring); }
.pip-cstep { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; cursor: pointer; font: inherit; background: none; border: none; flex: 1; }
.pip-cstep:disabled { cursor: default; }
.pip-cstep-dot { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; color: var(--perf-text-muted); background: var(--perf-surface); border: 1px solid var(--perf-border); transition: all 0.25s var(--perf-spring); }
.pip-cstep.on .pip-cstep-dot { color: #1a1206; background: var(--perf-grad-hero); border-color: transparent; box-shadow: 0 0 16px -3px color-mix(in srgb, var(--perf-gold) 70%, transparent); transform: scale(1.1); }
.pip-cstep.done .pip-cstep-dot { color: var(--perf-ok); background: var(--perf-ok-soft); border-color: color-mix(in srgb, var(--perf-ok) 36%, transparent); }
.pip-cstep-lab { font-size: 10px; font-weight: 750; color: var(--perf-text-muted); }
.pip-cstep.on .pip-cstep-lab { color: var(--perf-text); }

/* manage lifecycle stepper */
.pip-life { display: flex; gap: 6px; padding: 14px 18px 4px; }
.pip-life-step { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; }
.pip-life-dot { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; color: var(--perf-text-dim); background: var(--perf-surface); border: 1px solid var(--perf-border); transition: all 0.3s; }
.pip-life-lab { font-size: 9.5px; font-weight: 700; color: var(--perf-text-dim); }
.pip-life-step.done .pip-life-dot { color: var(--perf-ok); border-color: color-mix(in srgb, var(--perf-ok) 40%, transparent); background: var(--perf-ok-soft); }
.pip-life-step.active .pip-life-dot { color: #1a1206; background: var(--perf-grad-hero); border-color: transparent; box-shadow: 0 0 14px color-mix(in srgb, var(--perf-gold) 50%, transparent); }
.pip-life-step.active .pip-life-lab { color: var(--perf-text); }
.pip-life-step.cancel .pip-life-dot { color: var(--perf-conflict); border-color: color-mix(in srgb, var(--perf-conflict) 30%, transparent); background: color-mix(in srgb, var(--perf-conflict) 10%, transparent); }

.pip-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 16px 18px; display: flex; flex-direction: column; gap: 14px; }
.pip-pane { display: flex; flex-direction: column; gap: 14px; }
.pip-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; }
.pip-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.pip-lab { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 700; color: var(--perf-text-secondary); }
.pip-lab :deep(svg) { color: var(--perf-gold); }
.pip-lab i { color: var(--perf-conflict); font-style: normal; } .pip-lab i.opt { color: var(--perf-text-dim); font-weight: 500; }
.pip-lab-row { display: flex; align-items: center; justify-content: space-between; }
.pip-obj-tally { font-size: 11px; font-weight: 800; color: var(--perf-gold); font-variant-numeric: tabular-nums; }
.pip-hint { display: inline-flex; align-items: flex-start; gap: 5px; margin: 0; font-size: 10.5px; line-height: 1.4; color: var(--perf-text-muted); }
.pip-hint :deep(svg) { color: var(--perf-gold); flex-shrink: 0; margin-top: 1px; }
.pip-hint.warn { color: var(--perf-conflict); } .pip-hint.warn :deep(svg) { color: var(--perf-conflict); }
.pip-banner { display: flex; align-items: flex-start; gap: 8px; margin: 0; padding: 10px 12px; border-radius: 11px; font-size: 11.5px; line-height: 1.45; color: var(--perf-text-secondary); background: color-mix(in srgb, var(--perf-gold) 6%, var(--perf-panel)); border: 1px solid var(--perf-border-warm); }
.pip-banner :deep(svg) { color: var(--perf-gold); flex-shrink: 0; margin-top: 1px; }

.pip-input, .pip-area { width: 100%; padding: 10px 12px; border-radius: 11px; font: inherit; font-size: 13px; color: var(--hr-input-text, var(--perf-text)); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); }
.pip-input { height: 42px; padding: 0 12px; }
.pip-area { resize: vertical; line-height: 1.5; min-height: 56px; }
.pip-input:focus, .pip-area:focus { outline: none; border-color: var(--perf-border-warm); }

.pip-search { display: flex; align-items: center; gap: 8px; height: 42px; padding: 0 12px; border-radius: 11px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); }
.pip-search :deep(svg) { color: var(--perf-text-muted); flex-shrink: 0; }
.pip-search-in { flex: 1; min-width: 0; border: none; background: transparent; font: inherit; font-size: 13px; color: var(--perf-text); }
.pip-search-in:focus { outline: none; }
.pip-emps { display: flex; flex-direction: column; gap: 4px; max-height: 240px; overflow-y: auto; margin-top: 6px; padding: 4px; border-radius: 12px; background: var(--perf-panel); border: 1px solid var(--perf-border); }
.pip-emps-load, .pip-emps-empty { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 18px; font-size: 12px; color: var(--perf-text-muted); }
.pip-emp { display: flex; align-items: center; gap: 10px; padding: 8px 9px; border-radius: 10px; cursor: pointer; text-align: left; font: inherit; background: transparent; border: 1px solid transparent; transition: background 0.16s, border-color 0.16s; }
.pip-emp:hover { background: var(--perf-surface-elevated); border-color: var(--perf-border); }
.pip-emp-av { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; font-size: 11px; font-weight: 850; color: #1a1206; background: var(--perf-grad-hero); }
.pip-emp-av.lg { width: 38px; height: 38px; font-size: 13px; }
.pip-emp-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.pip-emp-txt b { font-size: 12.5px; font-weight: 700; color: var(--perf-text); }
.pip-emp-txt span { font-size: 10.5px; color: var(--perf-text-dim); }
.pip-emp-go { color: var(--perf-text-dim); flex-shrink: 0; }
.pip-emp-chip { display: flex; align-items: center; gap: 11px; padding: 9px 11px; border-radius: 13px; background: color-mix(in srgb, var(--perf-gold) 9%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 28%, transparent); }
.pip-emp-chip-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.pip-emp-chip-txt b { font-size: 13px; color: var(--perf-text); }
.pip-emp-chip-txt span { font-size: 10px; color: var(--perf-text-muted); }
.pip-emp-chip button { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; color: var(--perf-text-muted); background: transparent; border: 1px solid var(--perf-border); }
.pip-emp-chip button:hover { color: var(--perf-conflict); border-color: color-mix(in srgb, var(--perf-conflict) 30%, transparent); }

.pip-seg { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.pip-seg-btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 11px; border-radius: 11px; cursor: pointer; font: inherit; font-size: 12.5px; font-weight: 700;
  color: var(--perf-text-muted); background: var(--perf-surface); border: 1px solid var(--perf-border); transition: all 0.2s var(--perf-spring); }
.pip-seg-btn:hover { color: var(--perf-text); border-color: var(--perf-border-warm); }
.pip-seg-btn.on { color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 12%, transparent); border-color: color-mix(in srgb, var(--perf-gold) 40%, transparent); }

.pip-process { padding: 13px; border-radius: 13px; background: color-mix(in srgb, var(--perf-ok) 7%, var(--perf-panel)); border: 1px solid color-mix(in srgb, var(--perf-ok) 22%, var(--perf-border)); }
.pip-process-h { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--perf-ok); }
.pip-process ul { margin: 9px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 7px; }
.pip-process li { display: flex; align-items: flex-start; gap: 7px; font-size: 11.5px; line-height: 1.45; color: var(--perf-text-secondary); }
.pip-process li :deep(svg) { color: var(--perf-ok); flex-shrink: 0; margin-top: 2px; }
.pip-process b { color: var(--perf-text); font-weight: 750; }

/* check-ins timeline */
.pip-timeline { display: flex; flex-direction: column; gap: 0; padding-left: 4px; }
.pip-ci { position: relative; display: flex; gap: 12px; padding: 0 0 12px 14px; border-left: 2px solid var(--perf-border); }
.pip-ci:last-child { border-left-color: transparent; padding-bottom: 2px; }
.pip-ci-dot { position: absolute; left: -6px; top: 3px; width: 10px; height: 10px; border-radius: 50%; background: var(--perf-grad-hero); box-shadow: 0 0 0 3px var(--perf-surface-elevated); }
.pip-ci-body { flex: 1; min-width: 0; }
.pip-ci-head { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.pip-ci-rating { font-size: 10.5px; font-weight: 800; padding: 2px 8px; border-radius: 999px; color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 13%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 30%, transparent); }
.pip-ci-rating.good { color: var(--perf-ok); background: var(--perf-ok-soft); border-color: color-mix(in srgb, var(--perf-ok) 30%, transparent); }
.pip-ci-rating.mid { color: var(--perf-amber); background: color-mix(in srgb, var(--perf-amber) 13%, transparent); border-color: color-mix(in srgb, var(--perf-amber) 30%, transparent); }
.pip-ci-rating.low { color: var(--perf-conflict); background: color-mix(in srgb, var(--perf-conflict) 12%, transparent); border-color: color-mix(in srgb, var(--perf-conflict) 30%, transparent); }
.pip-ci-at { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 650; color: var(--perf-text-muted); }
.pip-ci-at :deep(svg) { color: var(--perf-text-dim); }
.pip-ci-by { font-size: 10.5px; color: var(--perf-text-dim); }
.pip-ci-note { margin: 3px 0 0; font-size: 12.5px; line-height: 1.5; color: var(--perf-text-secondary); white-space: pre-wrap; word-break: break-word; }
.pip-empty-line { margin: 0; font-size: 12px; color: var(--perf-text-dim); font-style: italic; }
.pip-ci-form { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; padding-top: 12px; border-top: 1px solid var(--perf-border); }
.pip-ci-presets { display: flex; flex-wrap: wrap; gap: 6px; }
.pip-ci-preset { display: inline-flex; align-items: center; gap: 5px; padding: 5px 11px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 11px; font-weight: 650; color: var(--perf-text-muted); background: var(--perf-surface); border: 1px solid var(--perf-border); transition: all 0.18s; }
.pip-ci-preset:hover { color: var(--perf-text); border-color: var(--perf-border-strong); }
.pip-ci-preset.on.good { color: var(--perf-ok); background: var(--perf-ok-soft); border-color: color-mix(in srgb, var(--perf-ok) 36%, transparent); }
.pip-ci-preset.on.mid { color: var(--perf-amber); background: color-mix(in srgb, var(--perf-amber) 13%, transparent); border-color: color-mix(in srgb, var(--perf-amber) 36%, transparent); }
.pip-ci-preset.on.low { color: var(--perf-conflict); background: color-mix(in srgb, var(--perf-conflict) 12%, transparent); border-color: color-mix(in srgb, var(--perf-conflict) 36%, transparent); }
.pip-ci-row { display: flex; gap: 8px; }
.pip-ci-row .pip-input { flex: 1; }
.pip-ci-add { flex-shrink: 0; }

/* footer */
.pip-foot { display: flex; align-items: center; gap: 8px; padding: 13px 18px; border-top: 1px solid var(--perf-border); flex-wrap: wrap; }
.pip-grow { flex: 1; }
.pip-del { color: var(--perf-text-muted); padding: 9px 11px; }
.pip-del:hover, .pip-del.armed { color: var(--perf-conflict); border-color: color-mix(in srgb, var(--perf-conflict) 32%, transparent); background: color-mix(in srgb, var(--perf-conflict) 10%, transparent); }

.pip-slide-fwd-enter-active, .pip-slide-fwd-leave-active, .pip-slide-back-enter-active, .pip-slide-back-leave-active { transition: opacity 0.26s var(--perf-ease), transform 0.26s var(--perf-spring); }
.pip-slide-fwd-enter-from { opacity: 0; transform: translateX(16px); } .pip-slide-fwd-leave-to { opacity: 0; transform: translateX(-12px); }
.pip-slide-back-enter-from { opacity: 0; transform: translateX(-16px); } .pip-slide-back-leave-to { opacity: 0; transform: translateX(12px); }

@media (max-width: 720px) {
  .pip { grid-template-columns: 1fr; max-width: 560px; }
  .pip-pass { display: none; }
  .pip-row2 { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) {
  .pip-x:hover { transform: none; } .pip-pass-line { animation: none; stroke-dashoffset: 0; }
  .pip-slide-fwd-enter-from, .pip-slide-fwd-leave-to, .pip-slide-back-enter-from, .pip-slide-back-leave-to { transform: none; }
}
</style>
