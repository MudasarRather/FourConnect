<template>
  <teleport to="body">
    <Presence>
      <Motion v-if="open" key="ov" as="div" class="fm-ov perf-scope" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
        :exit="{ opacity: 0 }" :transition="{ duration: 0.22 }" @click.self="$emit('close')">
        <Motion as="div" class="fm" :initial="{ opacity: 0, y: 24, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 14, scale: 0.98 }" :transition="{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }">
          <span class="fm-edge" aria-hidden="true" />
          <span class="fm-mesh" aria-hidden="true" />

          <!-- header + stepper -->
          <header class="fm-head">
            <span class="fm-ic"><Orbit :size="18" /></span>
            <div class="fm-titles">
              <b>New 360° request</b>
              <span>Gather multi-rater feedback that feeds the review</span>
            </div>
            <button class="fm-x" type="button" @click="$emit('close')"><X :size="16" /></button>
          </header>

          <div class="fm-steps">
            <button v-for="(s, i) in STEPS" :key="s.key" type="button" class="fm-stepdot" :class="{ on: step === i, done: i < step }"
              :disabled="i > step && !canReach(i)" @click="goStep(i)">
              <span class="fm-stepdot-n"><component :is="i < step ? Check : s.icon" :size="13" /></span>
              <span class="fm-stepdot-l">{{ s.label }}</span>
              <span v-if="i < STEPS.length - 1" class="fm-stepdot-line" :class="{ fill: i < step }" />
            </button>
          </div>

          <div class="fm-split">
            <!-- ════ stepped form ════ -->
            <div class="fm-body">
              <transition :name="`fm-step-${stepDir}`" mode="out-in">
                <!-- STEP 0 · Subject -->
                <div v-if="step === 0" key="s0" class="fm-step">
                  <p class="fm-step-hint"><UserCheck :size="13" /> Who is this 360° about? Pick the subject employee.</p>
                  <div v-if="picked" class="fm-picked">
                    <span class="fm-picked-av">{{ initials(empName(picked)) }}</span>
                    <span class="fm-picked-txt">
                      <b>{{ empName(picked) }}</b>
                      <span>{{ picked.designation_name || picked.employee_id || '' }}{{ picked.department_name ? ' · ' + picked.department_name : '' }}</span>
                    </span>
                    <button class="fm-picked-clear" type="button" @click="clearPicked"><X :size="13" /></button>
                  </div>
                  <template v-else>
                    <div class="fm-search">
                      <Search :size="14" />
                      <input v-model="empSearch" class="fm-search-in" placeholder="Search employees by name…" autofocus />
                    </div>
                    <div class="fm-emps">
                      <div v-if="loadingEmps" class="fm-emps-load"><Loader2 :size="16" class="perf-spin" /> Loading…</div>
                      <button v-for="e in emps" :key="e.id" type="button" class="fm-emp" @click="pickEmp(e)">
                        <span class="fm-emp-av">{{ initials(empName(e)) }}</span>
                        <span class="fm-emp-txt"><b>{{ empName(e) }}</b><span>{{ e.designation_name || e.employee_id || '' }}</span></span>
                        <CircleDot :size="15" class="fm-emp-tick" />
                      </button>
                      <p v-if="!loadingEmps && !emps.length" class="fm-emps-empty">No employees match.</p>
                    </div>
                  </template>
                </div>

                <!-- STEP 1 · Scope & purpose -->
                <div v-else-if="step === 1" key="s1" class="fm-step">
                  <p class="fm-step-hint"><Compass :size="13" /> Frame the request — cycle, timing and why you're collecting it.</p>
                  <div class="fm-row">
                    <div class="fm-field">
                      <label class="fm-lab">Cycle</label>
                      <PerfSelect v-model="form.cycle" :options="cycleOptions" placeholder="Cycle…" />
                    </div>
                    <div class="fm-field">
                      <label class="fm-lab">Period label</label>
                      <input v-model="form.period_label" class="fm-input" placeholder="e.g. FY 2025-26" />
                    </div>
                  </div>
                  <div class="fm-row2">
                    <div class="fm-field">
                      <label class="fm-lab">Due date</label>
                      <HrDatePicker v-model="form.due_date" :min="today" placeholder="dd / mm / yyyy" clearable />
                    </div>
                    <div class="fm-field">
                      <label class="fm-lab">Rating scale</label>
                      <div class="fm-step-ctrl">
                        <button type="button" class="fm-step-b" :disabled="form.rating_max <= 3" @click="form.rating_max = Math.max(3, form.rating_max - 1)"><Minus :size="14" /></button>
                        <span class="fm-step-v">1–{{ form.rating_max }}</span>
                        <button type="button" class="fm-step-b" :disabled="form.rating_max >= 10" @click="form.rating_max = Math.min(10, form.rating_max + 1)"><Plus :size="14" /></button>
                      </div>
                    </div>
                  </div>

                  <div class="fm-field">
                    <label class="fm-lab">Title</label>
                    <input v-model="form.title" class="fm-input" placeholder="e.g. 360° feedback — H1 review" />
                  </div>

                  <div class="fm-field">
                    <label class="fm-lab">Purpose &amp; guidance to raters</label>
                    <textarea v-model="form.prompt" class="fm-area" rows="2" placeholder="Why this 360° is being run and what raters should focus on…" />
                  </div>

                  <button type="button" class="fm-toggle" :class="{ on: form.anonymous }" @click="form.anonymous = !form.anonymous">
                    <span class="fm-toggle-knob" />
                    <span class="fm-toggle-txt"><b>Anonymous responses</b><span>Hide rater names in the rollup</span></span>
                  </button>

                  <!-- link to review (closes the feedback→review loophole) -->
                  <div class="fm-linkrev" :class="{ on: form.review_id, off: !latestReview }">
                    <button type="button" class="fm-toggle fm-toggle-rev" :class="{ on: form.review_id }" :disabled="!latestReview" @click="toggleLink">
                      <span class="fm-toggle-knob" />
                      <span class="fm-toggle-txt">
                        <b>Feed into the review</b>
                        <span v-if="latestReview">Attach to {{ cycleMeta(latestReview.cycle).label }}{{ latestReview.period_label ? ' · ' + latestReview.period_label : '' }} · {{ reviewStatusLabel(latestReview.status) }}</span>
                        <span v-else>No live review found for this employee</span>
                      </span>
                      <Link2 :size="14" class="fm-linkrev-ic" />
                    </button>
                  </div>
                </div>

                <!-- STEP 2 · Competencies -->
                <div v-else-if="step === 2" key="s2" class="fm-step">
                  <p class="fm-step-hint"><Target :size="13" /> What competencies should raters score? Seed them from the appraisal rubric so the 360° matches the formal review.</p>
                  <div class="fm-field">
                    <label class="fm-lab">Seed from appraisal rubric</label>
                    <PerfSelect v-model="templateId" :options="templateOptions" placeholder="Pick a template to import its sections…" @update:modelValue="onTemplate" />
                    <p class="fm-seed-note"><FileText :size="11" /> {{ templateId ? 'Imported the template sections as competencies — edit below.' : 'Or use the default set / add your own.' }}</p>
                  </div>

                  <div class="fm-field">
                    <div class="fm-lab-row">
                      <label class="fm-lab">Competencies <i>*</i></label>
                      <button type="button" class="fm-mini" @click="useDefaults"><Sparkles :size="11" /> Default set</button>
                    </div>
                    <div class="fm-comps">
                      <Motion v-for="(c, i) in form.competencies" :key="c.key" as="span" class="fm-comp"
                        :initial="reduced ? false : { opacity: 0, scale: 0.8 }" :animate="{ opacity: 1, scale: 1 }"
                        :transition="{ duration: 0.26, delay: Math.min(i * 0.025, 0.25), ease: [0.16, 1, 0.3, 1] }">
                        <span class="fm-comp-dot" />{{ c.label }}
                        <button type="button" class="fm-comp-x" @click="removeComp(c.key)"><X :size="11" /></button>
                      </Motion>
                      <p v-if="!form.competencies.length" class="fm-comp-empty">Add at least one competency to score against.</p>
                    </div>
                    <div class="fm-comp-add">
                      <input v-model="compInput" class="fm-input" placeholder="Add a competency…" @keyup.enter="addComp" />
                      <button type="button" class="perf-btn perf-btn-steel fm-comp-addb" :disabled="!compInput.trim()" @click="addComp"><Plus :size="14" /></button>
                    </div>
                  </div>
                </div>

                <!-- STEP 3 · Raters -->
                <div v-else key="s3" class="fm-step">
                  <p class="fm-step-hint"><UsersRound :size="13" /> A 360° = downward (manager) + optional self + sideways (peers/reports). The manager is always invited; self-rating powers the self-vs-others gap.</p>

                  <div class="fm-raterset">
                    <button type="button" class="fm-rrow" :class="{ on: includeManager && managerUserId, dead: !managerUserId }"
                      :style="{ '--c': feedbackRelMeta('MANAGER').color }" :disabled="!managerUserId" @click="includeManager = !includeManager">
                      <span class="fm-rrow-av"><Crown :size="14" /></span>
                      <span class="fm-rrow-tx">
                        <b>{{ managerName || 'Reporting manager' }}</b>
                        <span v-if="managerUserId">Manager · downward feedback</span>
                        <span v-else>No reporting manager on record — set one on the profile</span>
                      </span>
                      <span class="fm-rrow-tag">Manager</span>
                      <span class="fm-rrow-knob"><Check v-if="includeManager && managerUserId" :size="12" /></span>
                    </button>

                    <button type="button" class="fm-rrow" :class="{ on: includeSelf && subjectUserId, dead: !subjectUserId }"
                      :style="{ '--c': feedbackRelMeta('SELF').color }" :disabled="!subjectUserId" @click="includeSelf = !includeSelf">
                      <span class="fm-rrow-av"><UserCheck :size="14" /></span>
                      <span class="fm-rrow-tx">
                        <b>{{ picked ? empName(picked) : 'Subject' }} <em>· self</em></b>
                        <span v-if="subjectUserId">Self-assessment · reveals the self-vs-others perception gap</span>
                        <span v-else>No login linked — self-rating unavailable</span>
                      </span>
                      <span class="fm-rrow-tag">Self</span>
                      <span class="fm-rrow-knob"><Check v-if="includeSelf && subjectUserId" :size="12" /></span>
                    </button>
                  </div>

                  <label class="fm-lab fm-lab-peers">Nominate peers, reports &amp; skip-levels</label>
                  <div class="fm-search">
                    <Search :size="14" />
                    <input v-model="nomSearch" class="fm-search-in" placeholder="Search peers to nominate…" />
                  </div>
                  <div v-if="nomSearch && nomResults.length" class="fm-emps fm-emps-sm">
                    <button v-for="e in nomResults" :key="e.id" type="button" class="fm-emp" @click="addNominee(e)">
                      <span class="fm-emp-av sm">{{ initials(empName(e)) }}</span>
                      <span class="fm-emp-txt"><b>{{ empName(e) }}</b><span>{{ e.designation_name || '' }}</span></span>
                      <UserPlus :size="14" class="fm-emp-tick" />
                    </button>
                  </div>
                  <div v-if="form.nominees.length" class="fm-noms">
                    <Motion v-for="(n, i) in form.nominees" :key="n._k" as="div" class="fm-nom"
                      :initial="reduced ? false : { opacity: 0, x: -8 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.26, delay: i * 0.02 }">
                      <span class="fm-nom-av" :style="{ '--c': feedbackRelMeta(n.relationship_type).color }">{{ initials(n.reviewer_name) }}</span>
                      <span class="fm-nom-txt"><b>{{ n.reviewer_name }}</b></span>
                      <div class="fm-nom-sel"><PerfSelect v-model="n.relationship_type" :options="nomRelOptions" /></div>
                      <button type="button" class="fm-nom-x" @click="removeNominee(i)"><X :size="13" /></button>
                    </Motion>
                  </div>
                  <p v-else class="fm-comp-empty">No peers yet — the manager{{ includeSelf && subjectUserId ? ' and self' : '' }} above will still be invited.</p>
                </div>
              </transition>
            </div>

            <!-- ════ live Feedback Pass ════ -->
            <aside class="fm-aside">
              <span class="fm-aside-grain" aria-hidden="true" />
              <span class="fm-aside-stamp" :class="canSave ? 'ready' : 'draft'">{{ canSave ? 'Ready' : 'Draft' }}</span>
              <div class="fm-prev-top">
                <span class="fm-prev-orbit" aria-hidden="true"><Orbit :size="22" /></span>
                <div class="fm-prev-id">
                  <b>{{ picked ? empName(picked) : 'Select an employee' }}</b>
                  <span>{{ picked ? (picked.designation_name || '360° request') : 'Subject of feedback' }}</span>
                </div>
              </div>
              <div class="fm-prev-title">{{ form.title || `360° feedback · ${cycleMeta(form.cycle).label}` }}</div>
              <div class="fm-prev-chips">
                <span class="fm-prev-chip"><CalendarRange :size="11" />{{ form.period_label || cycleMeta(form.cycle).label }}</span>
                <span class="fm-prev-chip"><Star :size="11" />1–{{ form.rating_max }}</span>
                <span class="fm-prev-chip" :class="{ anon: form.anonymous }"><component :is="form.anonymous ? Eye : Users" :size="11" />{{ form.anonymous ? 'Anonymous' : 'Named' }}</span>
                <span v-if="form.review_id" class="fm-prev-chip linked"><Link2 :size="11" />Feeds review</span>
              </div>
              <div class="fm-prev-sec">
                <span class="fm-prev-seclab">{{ form.competencies.length }} competenc{{ form.competencies.length === 1 ? 'y' : 'ies' }}</span>
                <div class="fm-prev-bars">
                  <span v-for="(c, i) in form.competencies.slice(0, 7)" :key="c.key" class="fm-prev-bar" :style="{ '--i': i }" :title="c.label" />
                  <span v-if="!form.competencies.length" class="fm-prev-bardim" />
                </div>
              </div>
              <div class="fm-prev-sec">
                <span class="fm-prev-seclab">Raters</span>
                <div class="fm-prev-raters">
                  <span v-if="includeManager && managerUserId" class="fm-prev-rmini" :style="{ '--c': feedbackRelMeta('MANAGER').color }" title="Manager"><Crown :size="11" /></span>
                  <span v-if="includeSelf && subjectUserId" class="fm-prev-rmini" :style="{ '--c': feedbackRelMeta('SELF').color }" title="Self"><UserCheck :size="11" /></span>
                  <span v-for="(n, i) in form.nominees.slice(0, 5)" :key="n._k" class="fm-prev-rmini" :style="{ '--c': feedbackRelMeta(n.relationship_type).color }">{{ initials(n.reviewer_name) }}</span>
                  <span v-if="form.nominees.length > 5" class="fm-prev-rmore">+{{ form.nominees.length - 5 }}</span>
                  <span v-if="!raterCount" class="fm-prev-rnone">No raters yet</span>
                </div>
              </div>
              <p class="fm-prev-foot">{{ raterCount }} rater{{ raterCount === 1 ? '' : 's' }} will be invited</p>
            </aside>
          </div>

          <footer class="fm-foot">
            <button class="perf-btn perf-btn-ghost" type="button" @click="step === 0 ? $emit('close') : back()">
              <ChevronLeft v-if="step > 0" :size="14" />{{ step === 0 ? 'Cancel' : 'Back' }}
            </button>
            <span class="fm-foot-prog">Step {{ step + 1 }} / {{ STEPS.length }}</span>
            <button v-if="step < STEPS.length - 1" class="perf-btn perf-btn-primary" type="button" :disabled="!canNext" @click="next">
              Next <ChevronRight :size="14" />
            </button>
            <button v-else class="perf-btn perf-btn-primary" type="button" :disabled="!canSave || saving" @click="submit">
              <Loader2 v-if="saving" :size="14" class="perf-spin" /><Send v-else :size="14" /> Launch request
            </button>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </teleport>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  Orbit, X, Search, Loader2, Plus, Minus, Send, CircleDot, UserPlus, Users, Crown, UserCheck, UsersRound,
  Star, Eye, CalendarRange, Compass, Target, Check, ChevronLeft, ChevronRight, Link2, FileText, Sparkles,
} from 'lucide-vue-next'
import PerfSelect from './PerfSelect.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import { fetchEmployeesForReview, fetchEmployeeLatestReview, fetchEmployeeDetail, feedbackRelMeta, DEFAULT_COMPETENCIES } from '@/composables/usePerformance'
import { CYCLES, cycleMeta } from '@/views/hr/settings/composables/appraisalVocab'
import { listAppraisalTemplates } from '@/views/hr/settings/composables/useHrSettings'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({ open: { type: Boolean, default: false }, saving: { type: Boolean, default: false } })
const emit = defineEmits(['close', 'save'])
const reduced = prefersReduced()

const STEPS = [
  { key: 'subject', label: 'Subject', icon: UserCheck },
  { key: 'scope', label: 'Scope', icon: Compass },
  { key: 'competencies', label: 'Competencies', icon: Target },
  { key: 'raters', label: 'Raters', icon: UsersRound },
]
const REVIEW_STATUS_LABEL = {
  DRAFT: 'Draft', SELF_ASSESSMENT: 'Self-assessment', MANAGER_ASSESSMENT: 'Manager review',
  COMPLETED: 'Completed', ACKNOWLEDGED: 'Acknowledged', CANCELLED: 'Cancelled',
}
const reviewStatusLabel = (s) => REVIEW_STATUS_LABEL[s] || s
const nomRelOptions = ['PEER', 'DIRECT_REPORT', 'SKIP_LEVEL', 'MANAGER', 'EXTERNAL'].map(k => ({
  value: k, label: feedbackRelMeta(k).label, dot: feedbackRelMeta(k).color, icon: feedbackRelMeta(k).icon,
}))
const cycleOptions = CYCLES.map(c => ({ value: c, label: cycleMeta(c).label }))
const today = new Date().toISOString().slice(0, 10)
const slug = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || `c_${Math.random().toString(36).slice(2, 7)}`

const step = ref(0)
const stepDir = ref('fwd')
const form = reactive({
  cycle: 'ANNUAL', period_label: '', due_date: '', title: '', prompt: '',
  rating_max: 5, anonymous: true, competencies: [], nominees: [], review_id: null,
})
const picked = ref(null)
const latestReview = ref(null)
// deterministic rater composition — manager (downward) + optional self + peers
const includeManager = ref(true)
const includeSelf = ref(true)
const managerName = ref('')
const subjectUserId = ref(null)
const managerUserId = ref(null)
const empSearch = ref('')
const nomSearch = ref('')
const compInput = ref('')
const templateId = ref('')
const emps = ref([])
const nomResults = ref([])
const templates = ref([])
const loadingEmps = ref(false)

const templateOptions = computed(() => [
  { value: '', label: '— None (manual / default) —' },
  ...templates.value.map(t => ({ value: t.id, label: t.name || 'Template', sub: `${(t.sections || []).length} sections` })),
])

function reset() {
  step.value = 0; stepDir.value = 'fwd'
  form.cycle = 'ANNUAL'; form.period_label = ''; form.due_date = ''; form.title = ''; form.prompt = ''
  form.rating_max = 5; form.anonymous = true; form.review_id = null
  form.competencies = DEFAULT_COMPETENCIES.map(c => ({ key: c.key, label: c.label }))
  form.nominees = []
  picked.value = null; latestReview.value = null; templateId.value = ''
  includeManager.value = true; includeSelf.value = true
  managerName.value = ''; subjectUserId.value = null; managerUserId.value = null
  empSearch.value = ''; nomSearch.value = ''; compInput.value = ''
}

const empName = (e) => e.full_name || [e.first_name, e.last_name].filter(Boolean).join(' ') || e.name || e.employee_id || '—'
const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'

async function loadEmps() {
  loadingEmps.value = true
  try { const data = await fetchEmployeesForReview({ search: empSearch.value || undefined }); emps.value = data.items || data || [] }
  catch { emps.value = [] } finally { loadingEmps.value = false }
}
async function loadNom() {
  if (!nomSearch.value.trim()) { nomResults.value = []; return }
  try {
    const data = await fetchEmployeesForReview({ search: nomSearch.value })
    const used = new Set(form.nominees.map(n => n.reviewer_employee_id))
    nomResults.value = (data.items || data || []).filter(e => e.id !== picked.value?.id && !used.has(e.id)).slice(0, 6)
  } catch { nomResults.value = [] }
}
async function loadTemplates() {
  try { const t = await listAppraisalTemplates(); templates.value = (t || []).filter(x => x.is_active !== false && (x.sections || []).length) }
  catch { templates.value = [] }
}

watch(() => props.open, (v) => { if (v) { reset(); loadEmps(); loadTemplates() } })
let te = null; watch(empSearch, () => { clearTimeout(te); te = setTimeout(loadEmps, 300) })
let tn = null; watch(nomSearch, () => { clearTimeout(tn); tn = setTimeout(loadNom, 300) })

async function pickEmp(e) {
  picked.value = e; empSearch.value = ''
  latestReview.value = null; form.review_id = null
  subjectUserId.value = e.user_id || null
  managerUserId.value = e.reporting_manager_id || null
  managerName.value = ''
  includeManager.value = true; includeSelf.value = true
  try { const r = await fetchEmployeeLatestReview(e.id); latestReview.value = r && r.id ? r : null }
  catch { latestReview.value = null }
  try {
    const d = await fetchEmployeeDetail(e.id)
    if (d) {
      subjectUserId.value = d.user_id || subjectUserId.value
      managerUserId.value = d.reporting_manager_id || (d.reporting_manager?.id) || managerUserId.value
      managerName.value = d.reporting_manager?.full_name || d.reporting_manager?.email || ''
    }
  } catch { /* keep list-row ids */ }
}
function clearPicked() {
  picked.value = null; latestReview.value = null; form.review_id = null
  subjectUserId.value = null; managerUserId.value = null; managerName.value = ''
  loadEmps()
}
const raterCount = computed(() =>
  (includeManager.value && managerUserId.value ? 1 : 0) + (includeSelf.value && subjectUserId.value ? 1 : 0) + form.nominees.length)
function toggleLink() { if (!latestReview.value) return; form.review_id = form.review_id ? null : latestReview.value.id }

function onTemplate(id) {
  if (!id) return
  const t = templates.value.find(x => x.id === id)
  if (!t) return
  const secs = (t.sections || []).map((s, i) => {
    const label = s.name || s.label || s.title || s.competency || `Section ${i + 1}`
    return { key: slug(label) + '_' + i, label }
  })
  if (secs.length) form.competencies = secs
}
function useDefaults() { form.competencies = DEFAULT_COMPETENCIES.map(c => ({ key: c.key, label: c.label })); templateId.value = '' }
function addComp() {
  const v = compInput.value.trim(); if (!v) return
  const key = slug(v); if (form.competencies.some(c => c.key === key)) { compInput.value = ''; return }
  form.competencies.push({ key, label: v }); compInput.value = ''
}
function removeComp(key) { form.competencies = form.competencies.filter(c => c.key !== key) }
function addNominee(e) {
  if (form.nominees.some(n => n.reviewer_employee_id === e.id)) return
  form.nominees.push({ _k: e.id, reviewer_user_id: e.user_id || null, reviewer_employee_id: e.id, reviewer_name: empName(e), relationship_type: 'PEER' })
  nomSearch.value = ''; nomResults.value = []
}
function removeNominee(i) { form.nominees.splice(i, 1) }

const stepValid = (i) => i === 0 ? !!picked.value : i === 2 ? form.competencies.length > 0 : true
const canNext = computed(() => stepValid(step.value))
const canSave = computed(() => !!picked.value && form.competencies.length > 0)
const canReach = (i) => { for (let k = 0; k < i; k++) if (!stepValid(k)) return false; return true }
function next() { if (step.value < STEPS.length - 1 && canNext.value) { stepDir.value = 'fwd'; step.value++ } }
function back() { if (step.value > 0) { stepDir.value = 'back'; step.value-- } }
function goStep(i) { if (i === step.value) return; if (i < step.value || canReach(i)) { stepDir.value = i > step.value ? 'fwd' : 'back'; step.value = i } }

function submit() {
  if (!canSave.value || props.saving) return
  emit('save', {
    employee_id: picked.value.id,
    review_id: form.review_id || null,
    cycle: form.cycle || null,
    period_label: form.period_label || null,
    title: form.title || null,
    prompt: form.prompt || null,
    competencies: form.competencies.map(c => ({ key: c.key, label: c.label })),
    rating_max: form.rating_max,
    anonymous: form.anonymous,
    due_date: form.due_date || null,
    include_manager: includeManager.value && !!managerUserId.value,
    include_self: includeSelf.value && !!subjectUserId.value,
    nominees: form.nominees.map(n => ({
      reviewer_user_id: n.reviewer_user_id || undefined,
      reviewer_employee_id: n.reviewer_employee_id,
      reviewer_name: n.reviewer_name,
      relationship_type: n.relationship_type,
    })),
  })
}
</script>

<style scoped>
.fm-ov { position: fixed; inset: 0; z-index: 1300; display: flex; align-items: center; justify-content: center; padding: 24px;
  background: rgba(5, 5, 6, 0.64); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
.fm { position: relative; width: 100%; max-width: 880px; max-height: 92vh; display: flex; flex-direction: column; overflow: hidden; border-radius: 22px;
  background: var(--perf-surface-elevated); border: 1px solid var(--perf-border-strong); box-shadow: 0 44px 100px -42px rgba(0,0,0,0.88); }
.fm-edge { position: absolute; left: 0; right: 0; top: 0; height: 3px; background: var(--perf-grad-hero); z-index: 3; }
.fm-mesh { position: absolute; inset: 0; pointer-events: none; opacity: 0.5; z-index: 0;
  background: radial-gradient(60% 50% at 100% 0%, color-mix(in srgb, var(--perf-gold) 9%, transparent), transparent 60%); }
.fm-head, .fm-steps, .fm-split, .fm-foot { position: relative; z-index: 1; }

.fm-head { display: flex; align-items: center; gap: 12px; padding: 17px 18px 13px; border-bottom: 1px solid var(--perf-border); }
.fm-ic { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0; color: var(--perf-gold);
  background: color-mix(in srgb, var(--perf-gold) 14%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 30%, transparent); }
.fm-titles { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.fm-titles b { font-size: 16px; font-weight: 800; color: var(--perf-text); }
.fm-titles span { font-size: 12px; color: var(--perf-text-muted); }
.fm-x { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; cursor: pointer; color: var(--perf-text-muted); background: transparent; border: 1px solid var(--perf-border); transition: all 0.2s; }
.fm-x:hover { color: var(--perf-text); transform: rotate(90deg); }

/* stepper */
.fm-steps { display: flex; align-items: flex-start; gap: 0; padding: 12px 22px 6px; }
.fm-stepdot { position: relative; flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; cursor: pointer; font: inherit; background: none; border: none; padding: 0; }
.fm-stepdot:disabled { cursor: not-allowed; opacity: 0.7; }
.fm-stepdot-n { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; color: var(--perf-text-muted);
  background: var(--perf-surface); border: 1px solid var(--perf-border); transition: all 0.3s var(--perf-spring); z-index: 1; }
.fm-stepdot.on .fm-stepdot-n { color: #1a1206; background: var(--perf-grad-hero); border-color: transparent; box-shadow: 0 0 0 4px color-mix(in srgb, var(--perf-gold) 16%, transparent); transform: scale(1.08); }
.fm-stepdot.done .fm-stepdot-n { color: var(--perf-ok); background: var(--perf-ok-soft); border-color: color-mix(in srgb, var(--perf-ok) 40%, transparent); }
.fm-stepdot-l { font-size: 10.5px; font-weight: 700; color: var(--perf-text-muted); }
.fm-stepdot.on .fm-stepdot-l { color: var(--perf-text); }
.fm-stepdot-line { position: absolute; top: 15px; left: 50%; width: 100%; height: 2px; background: var(--perf-border); z-index: 0; }
.fm-stepdot-line.fill { background: var(--perf-ok); }

.fm-split { flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 0.95fr); }
.fm-body { min-height: 0; overflow-y: auto; padding: 16px 18px; border-right: 1px solid var(--perf-border); }
.fm-step { display: flex; flex-direction: column; gap: 13px; }
.fm-step-hint { display: flex; align-items: flex-start; gap: 7px; margin: 0; padding: 9px 11px; border-radius: 11px; font-size: 11.5px; line-height: 1.45; color: var(--perf-text-secondary);
  background: color-mix(in srgb, var(--perf-gold) 7%, var(--perf-surface)); border: 1px solid var(--perf-border); }
.fm-step-hint :deep(svg) { color: var(--perf-gold); flex-shrink: 0; margin-top: 1px; }

.fm-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.fm-row { display: grid; grid-template-columns: 1fr 1.1fr; gap: 11px; }
.fm-row2 { display: grid; grid-template-columns: 1.2fr 1fr; gap: 11px; }
.fm-lab { font-size: 11.5px; font-weight: 700; color: var(--perf-text-secondary); }
.fm-lab i { color: var(--perf-conflict); font-style: normal; }
.fm-lab-row { display: flex; align-items: center; justify-content: space-between; }
.fm-mini { display: inline-flex; align-items: center; gap: 4px; padding: 3px 9px; border-radius: 8px; cursor: pointer; font: inherit; font-size: 10.5px; font-weight: 700;
  color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 11%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 26%, transparent); transition: all 0.18s; }
.fm-mini:hover { background: color-mix(in srgb, var(--perf-gold) 18%, transparent); }
.fm-input, .fm-area { width: 100%; padding: 0 12px; border-radius: 11px; font: inherit; font-size: 13px;
  color: var(--hr-input-text, var(--perf-text)); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); }
.fm-input { height: 42px; }
.fm-area { padding: 10px 12px; resize: vertical; line-height: 1.5; }
.fm-input:focus, .fm-area:focus { outline: none; border-color: var(--perf-border-warm); }
.fm-seed-note { display: flex; align-items: center; gap: 5px; margin: 0; font-size: 10.5px; color: var(--perf-text-dim); }
.fm-seed-note :deep(svg) { color: var(--perf-text-muted); }

.fm-search { display: flex; align-items: center; gap: 8px; height: 42px; padding: 0 12px; border-radius: 11px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); }
.fm-search :deep(svg) { color: var(--perf-text-muted); flex-shrink: 0; }
.fm-search-in { flex: 1; min-width: 0; border: none; background: transparent; font: inherit; font-size: 13px; color: var(--perf-text); }
.fm-search-in:focus { outline: none; }
.fm-emps { display: flex; flex-direction: column; gap: 5px; max-height: 280px; overflow-y: auto; padding: 4px; border-radius: 12px; background: var(--perf-panel); border: 1px solid var(--perf-border); }
.fm-emps-sm { max-height: 200px; }
.fm-emps-load, .fm-emps-empty { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 18px; font-size: 12px; color: var(--perf-text-muted); }
.fm-emp { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 10px; cursor: pointer; text-align: left; font: inherit; background: transparent; border: 1px solid transparent; transition: all 0.16s; }
.fm-emp:hover { background: var(--perf-surface-elevated); border-color: var(--perf-border); transform: translateX(2px); }
.fm-emp-av { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; font-size: 11px; font-weight: 800; color: #1a1206; background: var(--perf-grad-hero); }
.fm-emp-av.sm { width: 28px; height: 28px; font-size: 10px; }
.fm-emp-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.fm-emp-txt b { font-size: 12.5px; font-weight: 700; color: var(--perf-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fm-emp-txt span { font-size: 10.5px; color: var(--perf-text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fm-emp-tick { color: var(--perf-text-dim); flex-shrink: 0; }

.fm-picked { display: flex; align-items: center; gap: 11px; padding: 12px 13px; border-radius: 14px; background: color-mix(in srgb, var(--perf-gold) 10%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 30%, transparent); }
.fm-picked-av { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; font-size: 13px; font-weight: 800; color: #1a1206; background: var(--perf-grad-hero); }
.fm-picked-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.fm-picked-txt b { font-size: 14px; font-weight: 800; color: var(--perf-text); }
.fm-picked-txt span { font-size: 11px; color: var(--perf-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fm-picked-clear { width: 30px; height: 30px; border-radius: 8px; display: grid; place-items: center; cursor: pointer; color: var(--perf-text-muted); background: transparent; border: 1px solid var(--perf-border); transition: all 0.18s; }
.fm-picked-clear:hover { color: var(--perf-conflict); border-color: color-mix(in srgb, var(--perf-conflict) 30%, transparent); }

.fm-step-ctrl { display: inline-flex; align-items: center; gap: 2px; height: 42px; padding: 0 4px; border-radius: 11px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); }
.fm-step-b { width: 32px; height: 32px; border-radius: 8px; display: grid; place-items: center; cursor: pointer; color: var(--perf-text-secondary); background: transparent; border: none; transition: all 0.16s; }
.fm-step-b:hover:not(:disabled) { color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 12%, transparent); }
.fm-step-b:disabled { opacity: 0.35; cursor: not-allowed; }
.fm-step-v { flex: 1; text-align: center; font-size: 13px; font-weight: 800; color: var(--perf-text); font-variant-numeric: tabular-nums; }

.fm-toggle { display: flex; align-items: center; gap: 11px; width: 100%; padding: 11px 13px; border-radius: 12px; cursor: pointer; text-align: left; font: inherit;
  background: var(--perf-surface); border: 1px solid var(--perf-border); transition: all 0.2s; }
.fm-toggle:hover { border-color: var(--perf-border-strong); }
.fm-toggle.on { background: color-mix(in srgb, var(--perf-gold) 11%, transparent); border-color: color-mix(in srgb, var(--perf-gold) 32%, transparent); }
.fm-toggle:disabled { opacity: 0.55; cursor: not-allowed; }
.fm-toggle-knob { position: relative; width: 34px; height: 19px; border-radius: 999px; flex-shrink: 0; background: var(--perf-track); transition: background 0.22s; }
.fm-toggle-knob::after { content: ''; position: absolute; top: 2px; left: 2px; width: 15px; height: 15px; border-radius: 50%; background: var(--perf-text-muted); transition: transform 0.22s var(--perf-spring), background 0.22s; }
.fm-toggle.on .fm-toggle-knob { background: color-mix(in srgb, var(--perf-gold) 55%, transparent); }
.fm-toggle.on .fm-toggle-knob::after { transform: translateX(15px); background: var(--perf-gold); }
.fm-toggle-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.fm-toggle-txt b { font-size: 12px; font-weight: 800; color: var(--perf-text); }
.fm-toggle-txt span { font-size: 10px; color: var(--perf-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fm-toggle-rev .fm-linkrev-ic { color: var(--perf-text-muted); flex-shrink: 0; }
.fm-toggle-rev.on .fm-linkrev-ic { color: var(--perf-gold); }

.fm-comps { display: flex; flex-wrap: wrap; gap: 6px; }
.fm-comp { display: inline-flex; align-items: center; gap: 6px; padding: 6px 8px 6px 10px; border-radius: 999px; font-size: 11.5px; font-weight: 650;
  color: var(--perf-text-secondary); background: var(--perf-surface); border: 1px solid var(--perf-border); }
.fm-comp-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--perf-gold); }
.fm-comp-x { width: 17px; height: 17px; border-radius: 50%; display: grid; place-items: center; cursor: pointer; color: var(--perf-text-muted); background: transparent; border: none; transition: all 0.16s; }
.fm-comp-x:hover { color: var(--perf-conflict); background: var(--perf-conflict-soft); }
.fm-comp-empty { margin: 0; font-size: 11px; color: var(--perf-text-dim); font-style: italic; }
.fm-comp-add { display: flex; gap: 8px; margin-top: 7px; }
.fm-comp-addb { flex-shrink: 0; padding: 0 12px; }

.fm-raterset { display: flex; flex-direction: column; gap: 8px; }
.fm-rrow { display: flex; align-items: center; gap: 10px; width: 100%; padding: 9px 11px; border-radius: 13px; cursor: pointer; text-align: left; font: inherit; --c: var(--perf-gold);
  background: var(--perf-surface); border: 1px solid var(--perf-border); transition: border-color 0.2s, background 0.2s, transform 0.18s var(--perf-spring); }
.fm-rrow:hover:not(:disabled) { transform: translateX(2px); border-color: var(--perf-border-strong); }
.fm-rrow.on { background: color-mix(in srgb, var(--c) 10%, var(--perf-surface)); border-color: color-mix(in srgb, var(--c) 36%, transparent); }
.fm-rrow.dead { opacity: 0.6; cursor: not-allowed; }
.fm-rrow-av { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; color: var(--c); background: color-mix(in srgb, var(--c) 15%, transparent); border: 1px solid color-mix(in srgb, var(--c) 32%, transparent); }
.fm-rrow-tx { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.25; }
.fm-rrow-tx b { font-size: 12.5px; font-weight: 800; color: var(--perf-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fm-rrow-tx b em { font-style: normal; font-weight: 600; color: var(--perf-text-muted); }
.fm-rrow-tx span { font-size: 10px; color: var(--perf-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fm-rrow-tag { flex-shrink: 0; padding: 3px 8px; border-radius: 7px; font-size: 9px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--c); background: color-mix(in srgb, var(--c) 13%, transparent); }
.fm-rrow-knob { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 7px; flex-shrink: 0; color: #1a1206; background: var(--perf-track); transition: background 0.2s; }
.fm-rrow.on .fm-rrow-knob { background: var(--c); }
.fm-lab-peers { margin-top: 2px; }
.fm-prev-rnone { font-size: 10.5px; color: var(--perf-text-dim); font-style: italic; }
.fm-noms { display: flex; flex-direction: column; gap: 6px; margin-top: 4px; }
.fm-nom { display: flex; align-items: center; gap: 9px; padding: 7px 9px; border-radius: 11px; background: var(--perf-surface); border: 1px solid var(--perf-border); }
.fm-nom-av { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0; font-size: 10px; font-weight: 800;
  color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent); border: 1px solid color-mix(in srgb, var(--c) 34%, transparent); }
.fm-nom-txt { flex: 1; min-width: 0; }
.fm-nom-txt b { font-size: 12px; font-weight: 700; color: var(--perf-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
.fm-nom-sel { width: 142px; flex-shrink: 0; }
.fm-nom-x { width: 26px; height: 26px; border-radius: 7px; display: grid; place-items: center; cursor: pointer; color: var(--perf-text-muted); background: transparent; border: 1px solid var(--perf-border); transition: all 0.16s; flex-shrink: 0; }
.fm-nom-x:hover { color: var(--perf-conflict); border-color: color-mix(in srgb, var(--perf-conflict) 30%, transparent); }

/* ── live preview aside ── */
.fm-aside { position: relative; overflow: hidden; padding: 18px; display: flex; flex-direction: column; gap: 12px; background: var(--perf-panel); }
.fm-aside-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(color-mix(in srgb, var(--perf-gold) 6%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--perf-gold) 6%, transparent) 1px, transparent 1px);
  background-size: 26px 26px; mask-image: radial-gradient(120% 130% at 100% 0%, #000 12%, transparent 72%); -webkit-mask-image: radial-gradient(120% 130% at 100% 0%, #000 12%, transparent 72%); }
.fm-aside > * { position: relative; z-index: 1; }
.fm-aside-stamp { align-self: flex-start; padding: 4px 11px; border-radius: 999px; font-size: 10px; font-weight: 850; letter-spacing: 0.08em; text-transform: uppercase; }
.fm-aside-stamp.draft { color: var(--perf-text-muted); background: var(--perf-unset-soft); border: 1px solid color-mix(in srgb, var(--perf-unset) 30%, transparent); }
.fm-aside-stamp.ready { color: var(--perf-ok); background: var(--perf-ok-soft); border: 1px solid color-mix(in srgb, var(--perf-ok) 36%, transparent); }
.fm-prev-top { display: flex; align-items: center; gap: 11px; }
.fm-prev-orbit { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 13px; flex-shrink: 0; color: var(--perf-gold);
  background: color-mix(in srgb, var(--perf-gold) 13%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 28%, transparent); }
.fm-prev-id { min-width: 0; }
.fm-prev-id b { font-size: 14px; font-weight: 850; color: var(--perf-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }
.fm-prev-id span { font-size: 11px; color: var(--perf-text-muted); }
.fm-prev-title { font-size: 13px; font-weight: 700; color: var(--perf-text-secondary); line-height: 1.4; }
.fm-prev-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.fm-prev-chip { display: inline-flex; align-items: center; gap: 4px; padding: 4px 9px; border-radius: 8px; font-size: 10.5px; font-weight: 700;
  color: var(--perf-text-secondary); background: var(--perf-surface); border: 1px solid var(--perf-border); }
.fm-prev-chip :deep(svg) { color: var(--perf-gold); }
.fm-prev-chip.anon { color: var(--perf-orange); border-color: color-mix(in srgb, var(--perf-orange) 30%, transparent); }
.fm-prev-chip.anon :deep(svg) { color: var(--perf-orange); }
.fm-prev-chip.linked { color: var(--perf-ok); border-color: color-mix(in srgb, var(--perf-ok) 32%, transparent); }
.fm-prev-chip.linked :deep(svg) { color: var(--perf-ok); }
.fm-prev-sec { display: flex; flex-direction: column; gap: 7px; padding-top: 11px; border-top: 1px solid var(--perf-border); }
.fm-prev-seclab { font-size: 10px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--perf-text-muted); }
.fm-prev-bars { display: flex; gap: 5px; align-items: flex-end; height: 34px; }
.fm-prev-bar { flex: 1; border-radius: 4px 4px 0 0; background: var(--perf-grad-hero); animation: fm-grow 0.5s var(--perf-spring) both; animation-delay: calc(var(--i) * 0.06s); }
.fm-prev-bar:nth-child(3n) { height: 64%; } .fm-prev-bar:nth-child(3n+1) { height: 88%; } .fm-prev-bar:nth-child(3n+2) { height: 50%; }
.fm-prev-bardim { flex: 1; height: 10px; border-radius: 4px; background: var(--perf-track); }
.fm-prev-raters { display: flex; align-items: center; }
.fm-prev-rmini { display: grid; place-items: center; width: 27px; height: 27px; border-radius: 50%; margin-right: -7px; font-size: 9.5px; font-weight: 800;
  color: var(--c); background: color-mix(in srgb, var(--c) 18%, var(--perf-surface)); border: 2px solid var(--perf-panel); }
.fm-prev-rmore { display: grid; place-items: center; min-width: 27px; height: 27px; padding: 0 6px; border-radius: 999px; margin-left: 12px; font-size: 10px; font-weight: 800; color: var(--perf-text-muted); background: var(--perf-surface); border: 1px solid var(--perf-border); }
.fm-prev-foot { margin: 0; margin-top: auto; font-size: 11px; font-weight: 650; color: var(--perf-text-muted); }

.fm-foot { display: flex; align-items: center; gap: 12px; padding: 13px 18px; border-top: 1px solid var(--perf-border); }
.fm-foot-prog { margin-left: auto; font-size: 11px; font-weight: 700; color: var(--perf-text-muted); font-variant-numeric: tabular-nums; }

/* step transitions */
.fm-step-fwd-enter-active, .fm-step-fwd-leave-active, .fm-step-back-enter-active, .fm-step-back-leave-active { transition: opacity 0.26s var(--perf-spring), transform 0.26s var(--perf-spring); }
.fm-step-fwd-enter-from { opacity: 0; transform: translateX(22px); }
.fm-step-fwd-leave-to { opacity: 0; transform: translateX(-18px); }
.fm-step-back-enter-from { opacity: 0; transform: translateX(-22px); }
.fm-step-back-leave-to { opacity: 0; transform: translateX(18px); }

@keyframes fm-grow { from { transform: scaleY(0); transform-origin: bottom; opacity: 0; } to { transform: scaleY(1); opacity: 1; } }
@media (max-width: 820px) {
  .fm-split { grid-template-columns: 1fr; }
  .fm-body { border-right: none; border-bottom: 1px solid var(--perf-border); }
  .fm-aside { display: none; }
}
@media (max-width: 560px) { .fm-row, .fm-row2 { grid-template-columns: 1fr; } .fm-stepdot-l { display: none; } }
@media (prefers-reduced-motion: reduce) {
  .fm-x:hover { transform: none; }
  .fm-prev-bar { animation: none; transform: none; }
  .fm-step-fwd-enter-active, .fm-step-fwd-leave-active, .fm-step-back-enter-active, .fm-step-back-leave-active { transition: opacity 0.18s; }
  .fm-step-fwd-enter-from, .fm-step-back-enter-from, .fm-step-fwd-leave-to, .fm-step-back-leave-to { transform: none; }
}
</style>
