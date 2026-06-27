<template>
  <teleport to="body">
    <Presence>
      <Motion v-if="open" key="ov" as="div" class="ac-ov perf-scope" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
        :exit="{ opacity: 0 }" :transition="{ duration: 0.24 }" @click.self="$emit('close')">
        <Motion as="div" class="ac" :initial="{ opacity: 0, y: 26, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 16, scale: 0.98 }" :transition="{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }">
          <span class="ac-edge" aria-hidden="true" />

          <!-- header + employee context -->
          <header class="ac-head">
            <span class="ac-av">{{ initials(employeeName) }}</span>
            <div class="ac-id">
              <span class="ac-eyebrow"><Gauge :size="11" /> Appraisal Console</span>
              <b>{{ employeeName }}</b>
              <div class="ac-facts">
                <span class="ac-fact mono">{{ snapshot.employee?.employee_id || employee?.employee_id || '' }}</span>
                <span v-if="facts.role" class="ac-fact"><Briefcase :size="11" />{{ facts.role }}</span>
                <span v-if="facts.dept" class="ac-fact"><Building2 :size="11" />{{ facts.dept }}</span>
                <span v-if="facts.manager" class="ac-fact"><UserCheck :size="11" />Reports to {{ facts.manager }}</span>
                <span v-if="facts.tenure" class="ac-fact"><CalendarClock :size="11" />{{ facts.tenure }}</span>
              </div>
            </div>
            <button class="ac-x" type="button" @click="$emit('close')"><X :size="18" /></button>
          </header>

          <!-- hero strip -->
          <div class="ac-hero">
            <div class="ac-gauge" :style="{ '--perf-p': gaugeDeg + 'deg', '--c': gaugeColor }">
              <div class="ac-gauge-in">
                <span v-if="latestScore != null" class="ac-gauge-val">{{ latestScore.toFixed(1) }}<i>/{{ latestMax }}</i></span>
                <span v-else class="ac-gauge-val muted">—</span>
                <span class="ac-gauge-lab">Latest</span>
              </div>
            </div>
            <div class="ac-hero-mid">
              <div class="ac-spark">
                <svg v-if="history.length > 1" viewBox="0 0 240 56" preserveAspectRatio="none" class="ac-spark-svg">
                  <polyline :points="sparkLine" class="ac-spark-line" />
                  <polygon :points="sparkArea" class="ac-spark-area" />
                </svg>
                <span v-else class="ac-spark-empty">Score trend appears after the first completed review.</span>
              </div>
              <div class="ac-lenses">
                <button class="ac-lens" type="button" @click="go('reviews')"><b>{{ snapshot.stats?.reviews || 0 }}</b><span>Reviews</span></button>
                <button class="ac-lens" type="button" @click="go('goals')"><b>{{ snapshot.stats?.open_goals || 0 }}</b><span>Open goals</span></button>
                <button class="ac-lens" type="button" @click="go('feedback')"><b>{{ (snapshot.feedback || []).length }}</b><span>360°</span></button>
                <button class="ac-lens" type="button" @click="go('pips')"><b>{{ snapshot.stats?.active_pips || 0 }}</b><span>Active PIPs</span></button>
              </div>
            </div>
          </div>

          <!-- body -->
          <div class="ac-body">
            <!-- left rail -->
            <div class="ac-rail">
              <div class="ac-rail-tabs">
                <button :class="{ on: railTab === 'reviews' }" @click="railTab = 'reviews'"><ClipboardList :size="13" /> Reviews</button>
                <button :class="{ on: railTab === 'growth' }" @click="railTab = 'growth'"><Sparkles :size="13" /> Growth</button>
              </div>
              <button class="ac-launch-btn" type="button" :class="{ on: mode === 'launch' }" @click="startLaunch"><Plus :size="14" /> Launch appraisal</button>

              <template v-if="railTab === 'reviews'">
                <div v-if="loading" class="ac-rail-load"><Loader2 :size="15" class="perf-spin" /></div>
                <div v-else-if="!reviews.length" class="ac-rail-empty">No reviews yet.</div>
                <button v-for="r in reviews" :key="r.id" class="ac-rev" :class="{ on: selected?.id === r.id }" @click="selectReview(r)">
                  <span class="ac-rev-spine" :style="{ background: statusMeta(r.status).color }" />
                  <div class="ac-rev-txt">
                    <b>{{ r.period_label || cycleMeta(r.cycle).label }}</b>
                    <span>{{ r.template_name || cycleMeta(r.cycle).label }}</span>
                  </div>
                  <span v-if="r.overall_score != null" class="ac-rev-score" :style="{ color: scoreTone(r.overall_score, r.rating_max) }">{{ r.overall_score.toFixed(1) }}</span>
                  <PerfStatusStamp :status="r.status" size="sm" />
                </button>
              </template>
              <template v-else>
                <div class="ac-growth">
                  <div class="ac-gr-card" @click="go('goals')">
                    <span class="ac-gr-ic" style="--c: var(--perf-gold)"><Target :size="14" /></span>
                    <div><b>{{ (snapshot.goals || []).length }} objectives</b><span>{{ snapshot.stats?.open_goals || 0 }} open</span></div>
                    <ChevronRight :size="14" />
                  </div>
                  <div class="ac-gr-card" @click="go('feedback')">
                    <span class="ac-gr-ic" style="--c: var(--perf-orange)"><Orbit :size="14" /></span>
                    <div><b>{{ (snapshot.feedback || []).length }} 360° requests</b><span>multi-rater feedback</span></div>
                    <ChevronRight :size="14" />
                  </div>
                  <div class="ac-gr-card" @click="go('calibration')">
                    <span class="ac-gr-ic" style="--c: var(--perf-ember)"><Grid3x3 :size="14" /></span>
                    <div><b>{{ calBox ? calBox.label : 'Not placed' }}</b><span>9-box position</span></div>
                    <ChevronRight :size="14" />
                  </div>
                  <div class="ac-gr-card" @click="go('pips')">
                    <span class="ac-gr-ic" style="--c: var(--perf-conflict)"><LifeBuoy :size="14" /></span>
                    <div><b>{{ (snapshot.pips || []).length }} plans</b><span>{{ snapshot.stats?.active_pips || 0 }} active</span></div>
                    <ChevronRight :size="14" />
                  </div>
                </div>
              </template>
            </div>

            <!-- main pane -->
            <div class="ac-main">
              <!-- launch -->
              <div v-if="mode === 'launch'" class="ac-launch">
                <h3 class="ac-launch-title"><Rocket :size="16" /> Launch a new appraisal</h3>
                <p class="ac-launch-sub">Open a review against an appraisal rubric for {{ employeeName }}.</p>
                <div class="ac-field">
                  <label>Appraisal rubric <i>*</i></label>
                  <select v-model="launchForm.template_id" class="ac-input">
                    <option :value="null" disabled>Select a template…</option>
                    <option v-for="t in templates" :key="t.id" :value="t.id">{{ t.name }} ({{ t.code }}) · {{ (t.sections || []).length }} sec</option>
                  </select>
                  <p v-if="!templates.length" class="ac-warn">No appraisal templates — create one in Settings → Appraisal Templates.</p>
                </div>
                <div class="ac-row3">
                  <div class="ac-field"><label>Cycle</label><select v-model="launchForm.cycle" class="ac-input"><option v-for="c in CYCLES" :key="c" :value="c">{{ cycleMeta(c).label }}</option></select></div>
                  <div class="ac-field"><label>Period</label><input v-model="launchForm.period_label" class="ac-input" placeholder="FY 2025-26" /></div>
                  <div class="ac-field"><label>Due date</label><HrDatePicker v-model="launchForm.due_date" placeholder="dd / mm / yyyy" /></div>
                </div>
                <div class="ac-launch-acts">
                  <button class="perf-btn perf-btn-ghost" type="button" @click="mode = 'view'; selectFirst()">Cancel</button>
                  <button class="perf-btn perf-btn-primary" type="button" :disabled="!launchForm.template_id || busy" @click="launch">
                    <Loader2 v-if="busy === 'launch'" :size="14" class="perf-spin" /><Rocket v-else :size="14" /> Create review
                  </button>
                </div>
              </div>

              <!-- selected review -->
              <template v-else-if="selected">
                <div class="ac-rev-head">
                  <div>
                    <b>{{ selected.period_label || cycleMeta(selected.cycle).label }}</b>
                    <span>{{ selected.template_name }} · scored against {{ (selected.sections || []).length }} sections{{ selected.due_date ? ' · due ' + fmtDate(selected.due_date) : '' }}</span>
                  </div>
                  <PerfStatusStamp :status="selected.status" />
                </div>

                <!-- workflow stepper -->
                <div class="ac-steps">
                  <div v-for="(p, i) in PIPELINE" :key="p.key" class="ac-step" :class="stepClass(i)">
                    <span class="ac-step-dot"><component :is="p.icon" :size="11" /></span>
                    <span class="ac-step-lab">{{ p.label }}</span>
                    <span v-if="i < PIPELINE.length - 1" class="ac-step-beam" :class="{ lit: i < curStep }" />
                  </div>
                </div>

                <!-- EDIT MODE: score sheet for a role -->
                <template v-if="editRole">
                  <Motion as="div" class="ac-edit" :initial="reduced ? false : { opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }">
                    <div class="ac-edit-banner" :class="editRole">
                      <component :is="editRole === 'self' ? PencilRuler : UserCheck" :size="15" />
                      <span><b>{{ editRole === 'self' ? 'Recording self-assessment' : 'Recording manager review' }}</b> — rate each section on the {{ selected.rating_max }}-point scale{{ editRole === 'self' ? '. Submitting advances to the manager review.' : '. Submitting computes the weighted overall and completes the review.' }}</span>
                    </div>
                    <PerfScoreSheet :draft="draft" :role="editRole" :rating-max="selected.rating_max" :rating-labels="selected.rating_labels" />
                  </Motion>
                </template>

                <!-- VIEW MODE: guidance + dual scores + read-only sheet -->
                <template v-else>
                  <Motion as="div" class="ac-guide" :style="{ '--c': stage.color }"
                    :initial="reduced ? false : { opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }">
                    <span class="ac-guide-ic"><component :is="stage.icon" :size="17" /></span>
                    <div class="ac-guide-txt">
                      <b>{{ stage.title }} <i v-if="stage.who">· {{ stage.who }}</i></b>
                      <p>{{ stage.desc }}</p>
                    </div>
                  </Motion>

                  <div class="ac-scores">
                    <div class="ac-score" :class="{ filled: selected.self_overall != null }">
                      <div class="ac-score-top">
                        <span class="ac-score-lab"><PencilRuler :size="12" /> Self</span>
                        <button v-if="canScoreSelf" class="ac-score-edit" type="button" @click="startEdit('self')">{{ selected.self_overall != null ? 'Edit' : 'Record' }}</button>
                      </div>
                      <div class="ac-score-val" :style="{ color: selected.self_overall != null ? scoreTone(selected.self_overall, selected.rating_max) : 'var(--perf-text-dim)' }">
                        {{ selected.self_overall != null ? selected.self_overall.toFixed(1) : '—' }}<i>/{{ selected.rating_max }}</i>
                      </div>
                      <span class="ac-score-state">{{ selected.self_overall != null ? 'Recorded' : 'Not recorded yet' }}</span>
                    </div>
                    <div class="ac-score" :class="{ filled: selected.manager_overall != null }">
                      <div class="ac-score-top">
                        <span class="ac-score-lab"><UserCheck :size="12" /> Manager</span>
                        <button v-if="canScoreManager" class="ac-score-edit" type="button" @click="startEdit('manager')">{{ selected.manager_overall != null ? 'Edit' : 'Record' }}</button>
                      </div>
                      <div class="ac-score-val" :style="{ color: selected.manager_overall != null ? scoreTone(selected.manager_overall, selected.rating_max) : 'var(--perf-text-dim)' }">
                        {{ selected.manager_overall != null ? selected.manager_overall.toFixed(1) : '—' }}<i>/{{ selected.rating_max }}</i>
                      </div>
                      <span class="ac-score-state">{{ selected.manager_overall != null ? 'Recorded' : 'Not recorded yet' }}</span>
                    </div>
                  </div>

                  <div class="ac-sheet">
                    <PerfScoreSheet :draft="viewDraft" role="view" :rating-max="selected.rating_max" :rating-labels="selected.rating_labels" />
                  </div>

                  <!-- Merit & increment — HR recommends/approves, applies to payroll -->
                  <div v-if="showMerit" class="ac-merit">
                    <div class="ac-merit-h"><Coins :size="14" /> Merit &amp; increment <span v-if="merit.policy_name" class="ac-merit-pol">{{ merit.policy_name }}</span></div>

                    <div v-if="selected.hike_status === 'APPLIED'" class="ac-merit-applied">
                      <CheckCircle2 :size="16" />
                      <div>
                        <b>Increment applied{{ selected.approved_hike_pct != null ? ' · ' + selected.approved_hike_pct + '%' : '' }}</b>
                        <span v-if="selected.prev_annual_ctc && selected.new_annual_ctc">CTC {{ inr(selected.prev_annual_ctc) }} → {{ inr(selected.new_annual_ctc) }}{{ selected.hike_effective_from ? ' · eff ' + fmtDate(selected.hike_effective_from) : '' }}</span>
                        <span v-else>Pushed to payroll as an effective-dated revision.</span>
                      </div>
                    </div>

                    <template v-else>
                      <div v-if="merit.band" class="ac-band" :style="{ '--bc': bandTone(merit.band.key) }">
                        <div class="ac-band-id"><b>{{ merit.band.label }}</b><span>score {{ merit.score != null ? merit.score.toFixed(1) : '—' }}/{{ merit.rating_max }} · {{ merit.source === 'calibration' ? 'calibrated' : 'manager' }}</span></div>
                        <span class="ac-band-rng">{{ merit.hike_min_pct }}–{{ merit.hike_max_pct }}%</span>
                      </div>
                      <p v-else class="ac-merit-none"><Info :size="13" /> No merit band — set an active default policy in Settings → Merit &amp; Increment Policy.</p>

                      <template v-if="merit.band && merit.hike_max_pct > 0">
                        <div class="ac-slider">
                          <input type="range" :min="merit.hike_min_pct" :max="merit.hike_max_pct" step="0.5" v-model.number="hikePct" :style="{ '--fill': fillPct + '%', '--bc': bandTone(merit.band.key) }" />
                          <div class="ac-slider-val" :style="{ color: bandTone(merit.band.key) }">{{ hikePct }}%</div>
                        </div>
                        <div v-if="currentCtc != null" class="ac-ctc">
                          <span><Wallet :size="12" /> {{ inr(currentCtc) }}</span><ArrowRight :size="13" /><b>{{ inr(projectedCtc) }}</b><em>/ yr</em>
                        </div>
                        <div class="ac-eff">
                          <label>Effective from</label>
                          <HrDatePicker v-model="effDate" placeholder="dd / mm / yyyy" />
                        </div>
                        <textarea v-model="recNote" class="ac-merit-note" rows="2" placeholder="Justification / HR note (optional)…" />
                        <div class="ac-merit-acts">
                          <button class="perf-btn" type="button" :disabled="mtBusy" @click="recommendHere"><Loader2 v-if="mtBusy === 'rec'" :size="13" class="perf-spin" /><Send v-else :size="13" /> {{ selected.hike_status === 'RECOMMENDED' ? 'Update' : 'Recommend' }}</button>
                          <button v-if="['RECOMMENDED', 'APPROVED'].includes(selected.hike_status)" class="perf-btn ac-ghost" type="button" :disabled="mtBusy" @click="rejectHere"><CircleSlash :size="13" /> Reject</button>
                          <span class="ac-grow" />
                          <button class="perf-btn perf-btn-primary" type="button" :disabled="mtBusy" @click="approveHere"><Loader2 v-if="mtBusy === 'apply'" :size="13" class="perf-spin" /><CheckCircle2 v-else :size="13" /> Approve &amp; apply</button>
                        </div>
                      </template>
                      <div v-else-if="merit.band" class="ac-merit-none"><Info :size="13" /> This band carries no increment.{{ merit.band.auto_pip ? ' A PIP is recommended.' : '' }}</div>
                    </template>
                  </div>
                </template>

                <!-- footer actions -->
                <div class="ac-rev-acts">
                  <template v-if="editRole">
                    <button class="perf-btn perf-btn-ghost" type="button" :disabled="busy" @click="editRole = null">Cancel</button>
                    <span class="ac-grow" />
                    <button class="perf-btn" type="button" :disabled="busy" @click="saveScores(false)"><Loader2 v-if="busy === 'draft'" :size="13" class="perf-spin" /><Check v-else :size="13" /> Save draft</button>
                    <button class="perf-btn perf-btn-primary" type="button" :disabled="busy" @click="saveScores(true)">
                      <Loader2 v-if="busy === 'submit'" :size="13" class="perf-spin" /><component v-else :is="editRole === 'self' ? ArrowRight : CheckCircle2" :size="13" />
                      {{ editRole === 'self' ? 'Submit & send to manager' : 'Submit & complete' }}
                    </button>
                  </template>

                  <!-- inline reason capture (cancel / acknowledge) -->
                  <template v-else-if="reasonMode">
                    <div class="ac-reason">
                      <input v-model="reasonText" class="ac-reason-in" :placeholder="reasonMode === 'cancel' ? 'Reason for cancelling (recorded)…' : 'Acknowledgement note (optional)…'" />
                      <button class="perf-btn perf-btn-ghost" type="button" @click="reasonMode = null">Back</button>
                      <button class="perf-btn perf-btn-primary" type="button" :disabled="busy || (reasonMode === 'cancel' && !reasonText.trim())" @click="confirmReason">
                        <Loader2 v-if="busy" :size="13" class="perf-spin" /><Check v-else :size="13" /> {{ reasonMode === 'cancel' ? 'Cancel review' : 'Acknowledge' }}
                      </button>
                    </div>
                  </template>

                  <template v-else>
                    <button v-for="a in actions" :key="a.key" class="perf-btn" :class="a.tone" type="button" :disabled="busy" @click="a.fn">
                      <Loader2 v-if="busy === a.key" :size="13" class="perf-spin" /><component v-else :is="a.icon" :size="13" /> {{ a.label }}
                    </button>
                  </template>
                </div>
              </template>

              <!-- empty -->
              <div v-else class="ac-empty">
                <span class="ac-empty-ic"><ClipboardList :size="26" /></span>
                <b>No appraisal selected</b>
                <p>Pick a review on the left, or launch a new appraisal for {{ employeeName }}.</p>
                <button class="perf-btn perf-btn-primary" type="button" @click="startLaunch"><Plus :size="14" /> Launch appraisal</button>
              </div>
            </div>
          </div>
        </Motion>
      </Motion>
    </Presence>
  </teleport>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  X, Gauge, Plus, Rocket, Loader2, Check, CheckCircle2, ClipboardList, Sparkles,
  Target, Orbit, Grid3x3, LifeBuoy, ChevronRight, ArrowRight, UserCheck, RotateCcw, BadgeCheck, CircleSlash,
  PencilRuler, Briefcase, Building2, CalendarClock, FileText, Play, Coins, Send, Wallet, Info,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import '@/styles/performance-theme.css'
import PerfScoreSheet from '@/views/hr/performance/components/PerfScoreSheet.vue'
import PerfStatusStamp from '@/views/hr/performance/components/PerfStatusStamp.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import {
  fetchEmployeeSnapshot, fetchReview, createReview, adminSelfScores, adminManagerScores, transitionReview,
  statusMeta, scoreTone, PIPELINE, STATUS_ORDER, boxMeta,
  fetchReviewMerit, recommendHikeAdmin, approveHike, rejectHike, bandTone, hikeStatusMeta,
} from '@/composables/usePerformance'
import { listAppraisalTemplates } from '@/views/hr/settings/composables/useHrSettings'
import { CYCLES, cycleMeta } from '@/views/hr/settings/composables/appraisalVocab'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  open: { type: Boolean, default: false },
  employee: { type: Object, default: null },
})
const emit = defineEmits(['close', 'changed'])
const toast = useToast()
const router = useRouter()
const reduced = prefersReduced()

const snapshot = reactive({})
const reviews = ref([])
const templates = ref([])
const loading = ref(false)
const busy = ref(false)
const railTab = ref('reviews')
const mode = ref('view')          // view | launch
const selected = ref(null)
const editRole = ref(null)        // null | self | manager
const reasonMode = ref(null)      // null | cancel | ack
const reasonText = ref('')
const draft = reactive({ sections: [], self_comments: '', manager_comments: '' })
const launchForm = reactive({ template_id: null, cycle: 'ANNUAL', period_label: '', due_date: '' })

const employeeName = computed(() => snapshot.employee?.name || props.employee?.user?.full_name || props.employee?.full_name || '—')

// employee context facts from the full profile object
const facts = computed(() => {
  const e = props.employee || {}
  let tenure = ''
  if (e.joining_date) {
    const days = Math.max(0, Math.floor((Date.now() - new Date(e.joining_date).getTime()) / 86400000))
    const y = Math.floor(days / 365), m = Math.floor((days % 365) / 30)
    tenure = y > 0 ? `${y}y ${m}m` : `${m}m`
  }
  return {
    role: e.designation?.name || '',
    dept: e.department?.name || '',
    manager: e.reporting_manager?.full_name || '',
    tenure,
  }
})

const history = computed(() => snapshot.score_history || [])
const latest = computed(() => snapshot.latest_review || null)
const latestScore = computed(() => latest.value?.overall_score ?? (history.value.length ? history.value[history.value.length - 1].score : null))
const latestMax = computed(() => latest.value?.rating_max || (history.value.length ? history.value[history.value.length - 1].rating_max : 5) || 5)
const gaugeDeg = computed(() => latestScore.value != null ? Math.round(latestScore.value / latestMax.value * 360) : 0)
const gaugeColor = computed(() => scoreTone(latestScore.value, latestMax.value))
const calBox = computed(() => { const c = (snapshot.calibration || [])[0]; return c ? boxMeta(c.box) : null })

const sparkPts = computed(() => {
  const h = history.value
  if (h.length < 2) return []
  const max = Math.max(...h.map(x => x.rating_max || 5), 5)
  return h.map((x, i) => ({ x: i / (h.length - 1) * 240, y: 52 - (x.score / max) * 48 }))
})
const sparkLine = computed(() => sparkPts.value.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' '))
const sparkArea = computed(() => sparkPts.value.length ? `0,56 ${sparkLine.value} 240,56` : '')

const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
const fmtDate = (d) => { try { return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) } catch { return d } }

const curStep = computed(() => STATUS_ORDER.indexOf(selected.value?.status))
const stepClass = (i) => {
  if (selected.value?.status === 'CANCELLED') return 'cancel'
  if (i < curStep.value) return 'done'
  if (i === curStep.value) return 'active'
  return ''
}

// stage guidance (corporate workflow explainer)
const STAGE_GUIDE = {
  DRAFT: { title: 'Draft', who: 'HR', color: 'var(--perf-unset)', icon: FileText, desc: 'Not yet opened. Record the self-assessment or send it to the employee to begin.' },
  SELF_ASSESSMENT: { title: 'Self-assessment', who: 'Employee', color: 'var(--perf-amber)', icon: PencilRuler, desc: 'The employee rates themselves against each rubric section. They can submit from their self-service portal — or you can record it on their behalf, then it advances to the manager review.' },
  MANAGER_ASSESSMENT: { title: 'Manager review', who: 'Reporting manager', color: 'var(--perf-orange)', icon: UserCheck, desc: 'The reviewing manager scores each section with the self ratings shown alongside for context. Submitting computes the weighted overall and finalises the review.' },
  COMPLETED: { title: 'Finalised', who: 'HR · Employee', color: 'var(--perf-gold)', icon: CheckCircle2, desc: 'The weighted overall is locked. Share the outcome with the employee and capture their acknowledgement to close the loop.' },
  ACKNOWLEDGED: { title: 'Acknowledged', who: '', color: 'var(--perf-ok)', icon: BadgeCheck, desc: 'The employee has signed off on the outcome. This review is closed — it feeds calibration, the 9-box and promotion evidence.' },
  CANCELLED: { title: 'Cancelled', who: '', color: 'var(--perf-conflict)', icon: CircleSlash, desc: 'This review was withdrawn. Reinstate it to resume the cycle.' },
}
const stage = computed(() => STAGE_GUIDE[selected.value?.status] || STAGE_GUIDE.DRAFT)

const canScoreSelf = computed(() => ['DRAFT', 'SELF_ASSESSMENT', 'MANAGER_ASSESSMENT'].includes(selected.value?.status))
const canScoreManager = computed(() => ['SELF_ASSESSMENT', 'MANAGER_ASSESSMENT'].includes(selected.value?.status))

// read-only sheet view of the selected review
const viewDraft = computed(() => ({ sections: selected.value?.sections || [], self_comments: selected.value?.self_comments, manager_comments: selected.value?.manager_comments }))

// ── Merit & increment (HR approves & applies to payroll) ──
const merit = reactive({ band: null, score: null, rating_max: 5, source: 'manager', hike_min_pct: null, hike_max_pct: null, policy_name: null })
const hikePct = ref(0)
const recNote = ref('')
const effDate = ref('')
const mtBusy = ref(false)
const hikeMeta = computed(() => hikeStatusMeta(selected.value?.hike_status))
const showMerit = computed(() => ['COMPLETED', 'ACKNOWLEDGED'].includes(selected.value?.status))
const currentCtc = computed(() => Number(props.employee?.annual_ctc) || null)
const projectedCtc = computed(() => currentCtc.value != null ? Math.round(currentCtc.value * (1 + Number(hikePct.value || 0) / 100)) : null)
const fillPct = computed(() => { const lo = Number(merit.hike_min_pct) || 0, hi = Number(merit.hike_max_pct) || 0; if (hi <= lo) return 100; return Math.round(((hikePct.value - lo) / (hi - lo)) * 100) })
const inr = (v) => v == null ? '—' : '₹' + Number(v).toLocaleString('en-IN')

async function loadMerit() {
  if (!selected.value || !showMerit.value) return
  try {
    const m = await fetchReviewMerit(selected.value.id)
    Object.assign(merit, m)
    if (selected.value.recommended_hike_pct != null) hikePct.value = Number(selected.value.recommended_hike_pct)
    else if (m.band) hikePct.value = Math.round(((Number(m.hike_min_pct) + Number(m.hike_max_pct)) / 2) * 2) / 2
    recNote.value = selected.value.recommendation_note || ''
    effDate.value = selected.value.hike_effective_from || ''
  } catch { /* no active policy / not completed */ }
}
watch(() => selected.value?.status, () => { if (showMerit.value) loadMerit() })

async function recommendHere() {
  mtBusy.value = 'rec'
  try { selected.value = await recommendHikeAdmin(selected.value.id, { hike_pct: Number(hikePct.value), note: recNote.value || null }); syncRow(); emit('changed'); toast.success('Hike recommended'); await loadMerit() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Could not recommend') } finally { mtBusy.value = false }
}
async function approveHere() {
  mtBusy.value = 'apply'
  try {
    const body = { approved_hike_pct: Number(hikePct.value) }
    if (effDate.value) body.effective_from = effDate.value
    selected.value = await approveHike(selected.value.id, body); syncRow(); emit('changed'); toast.success('Increment applied to payroll'); await loadMerit()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not apply hike') } finally { mtBusy.value = false }
}
async function rejectHere() {
  mtBusy.value = 'reject'
  try { selected.value = await rejectHike(selected.value.id, { to: selected.value.status, note: recNote.value || null }); syncRow(); emit('changed'); toast.success('Hike rejected'); await loadMerit() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Failed') } finally { mtBusy.value = false }
}

async function load() {
  const id = props.employee?.id
  if (!id) return
  loading.value = true
  try {
    const data = await fetchEmployeeSnapshot(id)
    Object.assign(snapshot, data)
    reviews.value = data.reviews || []
    selectFirst()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load appraisals') }
  finally { loading.value = false }
  try { const t = await listAppraisalTemplates(); templates.value = (t || []).filter(x => x.is_active !== false && (x.sections || []).length); launchForm.template_id = templates.value[0]?.id || null }
  catch { templates.value = [] }
}
function selectFirst() { if (reviews.value.length) selectReview(reviews.value[0]); else selected.value = null }

watch(() => props.open, (v) => {
  if (v) { Object.keys(snapshot).forEach(k => delete snapshot[k]); mode.value = 'view'; railTab.value = 'reviews'; editRole.value = null; reasonMode.value = null; selected.value = null; load() }
})

const clone = (x) => JSON.parse(JSON.stringify(x || []))
async function selectReview(r) {
  mode.value = 'view'; editRole.value = null; reasonMode.value = null
  try { selected.value = await fetchReview(r.id) } catch { selected.value = r }
}

function startLaunch() { mode.value = 'launch'; selected.value = null; editRole.value = null; reasonMode.value = null }
async function launch() {
  if (!launchForm.template_id) return
  busy.value = 'launch'
  try {
    const created = await createReview({
      employee_id: props.employee.id, template_id: launchForm.template_id, cycle: launchForm.cycle,
      period_label: launchForm.period_label || null, due_date: launchForm.due_date || null,
    })
    toast.success('Appraisal launched')
    await load()
    selected.value = await fetchReview(created.id)
    mode.value = 'view'
    emit('changed')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to launch') }
  finally { busy.value = false }
}

function startEdit(role) {
  draft.sections = clone(selected.value.sections)
  draft.self_comments = selected.value.self_comments || ''
  draft.manager_comments = selected.value.manager_comments || ''
  editRole.value = role
}
async function saveScores(submit) {
  busy.value = submit ? 'submit' : 'draft'
  try {
    const role = editRole.value
    const sections = draft.sections.map(s => ({
      key: s.key,
      rating: role === 'self' ? (s.self_rating ?? null) : (s.manager_rating ?? null),
      comment: role === 'self' ? (s.self_comment ?? null) : (s.manager_comment ?? null),
    }))
    const payload = { sections, comments: role === 'self' ? draft.self_comments : draft.manager_comments, submit }
    selected.value = role === 'self' ? await adminSelfScores(selected.value.id, payload) : await adminManagerScores(selected.value.id, payload)
    editRole.value = null
    syncRow(); emit('changed')
    toast.success(submit ? (role === 'self' ? 'Self-assessment recorded · sent to manager' : 'Review completed') : 'Scores saved as draft')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to save') }
  finally { busy.value = false }
}
async function doTransition(to, msg, key, note) {
  busy.value = key
  try { selected.value = await transitionReview(selected.value.id, note ? { to, note } : { to }); syncRow(); emit('changed'); toast.success(msg); reasonMode.value = null; reasonText.value = '' }
  catch (e) { toast.error(e?.response?.data?.detail || 'Action failed') }
  finally { busy.value = false }
}
function confirmReason() {
  if (reasonMode.value === 'cancel') doTransition('CANCELLED', 'Review cancelled', 'cancel', reasonText.value.trim())
  else doTransition('ACKNOWLEDGED', 'Acknowledged', 'ack', reasonText.value.trim())
}
function syncRow() {
  const i = reviews.value.findIndex(r => r.id === selected.value.id)
  if (i >= 0) reviews.value[i] = { ...reviews.value[i], status: selected.value.status, overall_score: selected.value.overall_score }
}

const actions = computed(() => {
  const a = []
  const st = selected.value?.status
  if (st === 'DRAFT') {
    a.push({ key: 'self', label: 'Record self-assessment', icon: PencilRuler, tone: 'perf-btn-primary', fn: () => startEdit('self') })
    a.push({ key: 'open', label: 'Open for self', icon: Play, tone: '', fn: () => doTransition('SELF_ASSESSMENT', 'Opened for self-assessment', 'open') })
  } else if (st === 'SELF_ASSESSMENT') {
    a.push({ key: 'self', label: 'Record self-assessment', icon: PencilRuler, tone: 'perf-btn-primary', fn: () => startEdit('self') })
    a.push({ key: 'adv', label: 'Skip to manager', icon: ArrowRight, tone: '', fn: () => doTransition('MANAGER_ASSESSMENT', 'Moved to manager review', 'adv') })
    a.push({ key: 'cancel', label: 'Cancel', icon: CircleSlash, tone: 'ac-ghost', fn: () => { reasonMode.value = 'cancel'; reasonText.value = '' } })
  } else if (st === 'MANAGER_ASSESSMENT') {
    a.push({ key: 'mgr', label: 'Record manager scores', icon: UserCheck, tone: 'perf-btn-primary', fn: () => startEdit('manager') })
    a.push({ key: 'back', label: 'Back to self', icon: RotateCcw, tone: '', fn: () => doTransition('SELF_ASSESSMENT', 'Returned to self-assessment', 'back') })
    a.push({ key: 'cancel', label: 'Cancel', icon: CircleSlash, tone: 'ac-ghost', fn: () => { reasonMode.value = 'cancel'; reasonText.value = '' } })
  } else if (st === 'COMPLETED') {
    a.push({ key: 'ack', label: 'Mark acknowledged', icon: BadgeCheck, tone: 'perf-btn-primary', fn: () => { reasonMode.value = 'ack'; reasonText.value = '' } })
    a.push({ key: 'rescore', label: 'Reopen for re-score', icon: RotateCcw, tone: '', fn: () => doTransition('MANAGER_ASSESSMENT', 'Reopened for manager', 'rescore') })
  } else if (st === 'ACKNOWLEDGED') {
    a.push({ key: 'reopen', label: 'Reopen', icon: RotateCcw, tone: '', fn: () => doTransition('COMPLETED', 'Reopened', 'reopen') })
  } else if (st === 'CANCELLED') {
    a.push({ key: 'reopen', label: 'Reinstate', icon: RotateCcw, tone: 'perf-btn-primary', fn: () => doTransition('SELF_ASSESSMENT', 'Reinstated', 'reopen') })
  }
  return a
})

function go(tab) { emit('close'); router.push({ name: 'HrPerformanceTab', params: { tab } }) }
</script>

<style scoped>
.ac-ov { position: fixed; inset: 0; z-index: 1300; display: flex; align-items: center; justify-content: center; padding: 22px;
  background: rgba(5, 5, 6, 0.66); backdrop-filter: blur(13px); -webkit-backdrop-filter: blur(13px); }
.ac { position: relative; width: 100%; max-width: 1020px; height: 90vh; max-height: 900px; display: flex; flex-direction: column; overflow: hidden; border-radius: 24px;
  background: var(--perf-surface-elevated); border: 1px solid var(--perf-border-strong); box-shadow: 0 48px 110px -44px rgba(0,0,0,0.9); }
.ac-edge { position: absolute; left: 0; right: 0; top: 0; height: 3px; background: var(--perf-grad-hero); z-index: 2; }

.ac-head { display: flex; align-items: flex-start; gap: 13px; padding: 16px 18px 14px; border-bottom: 1px solid var(--perf-border); }
.ac-av { display: grid; place-items: center; width: 46px; height: 46px; border-radius: 13px; flex-shrink: 0; font-size: 16px; font-weight: 850; color: #1a1206; background: var(--perf-grad-hero); }
.ac-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.ac-eyebrow { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--perf-gold); }
.ac-id b { font-size: 18px; font-weight: 850; color: var(--perf-text); line-height: 1.1; }
.ac-facts { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 2px; }
.ac-fact { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 600; color: var(--perf-text-muted); }
.ac-fact :deep(svg) { color: var(--perf-text-dim); }
.ac-fact.mono { font-family: var(--perf-mono); font-weight: 700; color: var(--perf-text-secondary); }
.ac-x { width: 34px; height: 34px; border-radius: 10px; display: grid; place-items: center; cursor: pointer; flex-shrink: 0; color: var(--perf-text-muted); background: transparent; border: 1px solid var(--perf-border); transition: all 0.2s; }
.ac-x:hover { color: var(--perf-text); transform: rotate(90deg); }

.ac-hero { display: flex; align-items: center; gap: 18px; padding: 15px 18px; border-bottom: 1px solid var(--perf-border); background: var(--perf-panel); }
.ac-gauge { position: relative; width: 78px; height: 78px; border-radius: 50%; flex-shrink: 0; background: conic-gradient(var(--c) var(--perf-p, 0deg), var(--perf-track) 0); transition: --perf-p 1s var(--perf-spring); }
.ac-gauge-in { position: absolute; inset: 6px; border-radius: 50%; background: var(--perf-panel); display: flex; flex-direction: column; align-items: center; justify-content: center; }
.ac-gauge-val { font-size: 20px; font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; }
.ac-gauge-val.muted { color: var(--perf-text-dim); }
.ac-gauge-val i { font-size: 10px; font-style: normal; color: var(--perf-text-muted); }
.ac-gauge-lab { font-size: 9px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--perf-text-muted); }
.ac-hero-mid { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 11px; }
.ac-spark { height: 40px; }
.ac-spark-svg { width: 100%; height: 100%; overflow: visible; }
.ac-spark-line { fill: none; stroke: var(--perf-gold); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
.ac-spark-area { fill: color-mix(in srgb, var(--perf-gold) 12%, transparent); }
.ac-spark-empty { font-size: 11.5px; color: var(--perf-text-dim); font-style: italic; }
.ac-lenses { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; }
.ac-lens { display: flex; flex-direction: column; gap: 1px; cursor: pointer; padding: 7px 10px; border-radius: 10px; text-align: left; font: inherit; background: var(--perf-surface); border: 1px solid var(--perf-border); transition: all 0.18s; }
.ac-lens:hover { border-color: var(--perf-border-warm); transform: translateY(-2px); }
.ac-lens b { font-size: 16px; font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; }
.ac-lens span { font-size: 9.5px; font-weight: 650; color: var(--perf-text-muted); }

.ac-body { flex: 1 1 auto; min-height: 0; display: grid; grid-template-columns: 270px 1fr; }
.ac-rail { min-height: 0; overflow-y: auto; padding: 14px; display: flex; flex-direction: column; gap: 8px; border-right: 1px solid var(--perf-border); background: var(--perf-panel); }
.ac-rail-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; padding: 3px; border-radius: 10px; background: var(--perf-surface); border: 1px solid var(--perf-border); }
.ac-rail-tabs button { display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 7px; border-radius: 8px; cursor: pointer; font: inherit; font-size: 11.5px; font-weight: 700; color: var(--perf-text-muted); background: transparent; border: none; transition: all 0.16s; }
.ac-rail-tabs button.on { color: var(--perf-text); background: var(--perf-surface-elevated); }
.ac-launch-btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 9px; border-radius: 10px; cursor: pointer; font: inherit; font-size: 12px; font-weight: 700;
  color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 10%, transparent); border: 1px dashed color-mix(in srgb, var(--perf-gold) 34%, transparent); transition: all 0.18s; }
.ac-launch-btn:hover, .ac-launch-btn.on { background: color-mix(in srgb, var(--perf-gold) 16%, transparent); }
.ac-rail-load, .ac-rail-empty { padding: 18px; text-align: center; font-size: 12px; color: var(--perf-text-muted); }
.ac-rev { position: relative; display: flex; align-items: center; gap: 9px; padding: 9px 11px 9px 13px; border-radius: 11px; cursor: pointer; text-align: left; font: inherit; background: var(--perf-surface); border: 1px solid var(--perf-border); transition: all 0.16s; overflow: hidden; }
.ac-rev:hover { border-color: var(--perf-border-warm); }
.ac-rev.on { border-color: var(--perf-border-warm); background: color-mix(in srgb, var(--perf-gold) 8%, var(--perf-surface)); }
.ac-rev-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; }
.ac-rev-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.ac-rev-txt b { font-size: 12px; font-weight: 700; color: var(--perf-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ac-rev-txt span { font-size: 10px; color: var(--perf-text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ac-rev-score { font-size: 13px; font-weight: 850; font-variant-numeric: tabular-nums; }

.ac-growth { display: flex; flex-direction: column; gap: 8px; }
.ac-gr-card { display: flex; align-items: center; gap: 11px; padding: 11px 12px; border-radius: 12px; cursor: pointer; background: var(--perf-surface); border: 1px solid var(--perf-border); transition: all 0.18s; }
.ac-gr-card:hover { border-color: var(--perf-border-warm); transform: translateX(2px); }
.ac-gr-ic { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); }
.ac-gr-card > div { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.ac-gr-card b { font-size: 12.5px; font-weight: 700; color: var(--perf-text); }
.ac-gr-card span { font-size: 10.5px; color: var(--perf-text-muted); }
.ac-gr-card :deep(svg:last-child) { color: var(--perf-text-dim); }

.ac-main { min-height: 0; overflow-y: auto; padding: 18px; }
.ac-launch-title { display: flex; align-items: center; gap: 8px; margin: 0; font-size: 16px; font-weight: 800; color: var(--perf-text); }
.ac-launch-title :deep(svg) { color: var(--perf-gold); }
.ac-launch-sub { margin: 6px 0 16px; font-size: 12.5px; color: var(--perf-text-muted); }
.ac-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 13px; }
.ac-field label { font-size: 11.5px; font-weight: 700; color: var(--perf-text-secondary); }
.ac-field label i { color: var(--perf-conflict); font-style: normal; }
.ac-input { width: 100%; height: 42px; padding: 0 12px; border-radius: 11px; font: inherit; font-size: 13px; color: var(--hr-input-text, var(--perf-text)); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); }
.ac-input:focus { outline: none; border-color: var(--perf-border-warm); }
.ac-warn { margin: 0; font-size: 11px; color: var(--perf-orange); }
.ac-row3 { display: grid; grid-template-columns: 1fr 1.2fr 1fr; gap: 11px; }
.ac-launch-acts { display: flex; justify-content: flex-end; gap: 10px; margin-top: 6px; }

.ac-rev-head { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.ac-rev-head > div { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.ac-rev-head b { font-size: 16px; font-weight: 850; color: var(--perf-text); }
.ac-rev-head span { font-size: 11.5px; color: var(--perf-text-muted); }

.ac-steps { display: flex; gap: 0; margin-bottom: 16px; }
.ac-step { position: relative; flex: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; }
.ac-step-dot { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; color: var(--perf-text-dim); background: var(--perf-surface); border: 1px solid var(--perf-border); transition: all 0.3s; z-index: 1; }
.ac-step-lab { font-size: 9px; font-weight: 700; color: var(--perf-text-dim); }
.ac-step-beam { position: absolute; top: 14px; left: 50%; width: 100%; height: 2px; background: var(--perf-border); }
.ac-step-beam.lit { background: var(--perf-ok); box-shadow: 0 0 8px color-mix(in srgb, var(--perf-ok) 60%, transparent); }
.ac-step.done .ac-step-dot { color: var(--perf-ok); border-color: color-mix(in srgb, var(--perf-ok) 40%, transparent); background: var(--perf-ok-soft); }
.ac-step.active .ac-step-dot { color: #1a1206; background: var(--perf-grad-hero); border-color: transparent; box-shadow: 0 0 12px color-mix(in srgb, var(--perf-gold) 50%, transparent); }
.ac-step.active .ac-step-lab { color: var(--perf-text); }
.ac-step.cancel .ac-step-dot { color: var(--perf-conflict); border-color: color-mix(in srgb, var(--perf-conflict) 30%, transparent); }

.ac-guide { display: flex; gap: 12px; padding: 13px 15px; border-radius: 14px; margin-bottom: 14px; --c: var(--perf-gold);
  background: color-mix(in srgb, var(--c) 8%, var(--perf-surface)); border: 1px solid color-mix(in srgb, var(--c) 26%, transparent); }
.ac-guide-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0; color: var(--c); background: color-mix(in srgb, var(--c) 15%, transparent); }
.ac-guide-txt { min-width: 0; }
.ac-guide-txt b { font-size: 13.5px; font-weight: 800; color: var(--perf-text); }
.ac-guide-txt b i { font-style: normal; font-weight: 650; color: var(--perf-text-muted); }
.ac-guide-txt p { margin: 4px 0 0; font-size: 12px; line-height: 1.5; color: var(--perf-text-secondary); }

.ac-scores { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; margin-bottom: 16px; }
.ac-score { display: flex; flex-direction: column; gap: 4px; padding: 12px 14px; border-radius: 14px; background: var(--perf-panel); border: 1px solid var(--perf-border); transition: border-color 0.3s; }
.ac-score.filled { border-color: var(--perf-border-warm); }
.ac-score-top { display: flex; align-items: center; justify-content: space-between; }
.ac-score-lab { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 800; letter-spacing: 0.03em; text-transform: uppercase; color: var(--perf-text-muted); }
.ac-score-lab :deep(svg) { color: var(--perf-text-dim); }
.ac-score-edit { font: inherit; font-size: 11px; font-weight: 700; color: var(--perf-gold); background: none; border: none; cursor: pointer; }
.ac-score-edit:hover { text-decoration: underline; }
.ac-score-val { font-size: 28px; font-weight: 850; font-variant-numeric: tabular-nums; line-height: 1; }
.ac-score-val i { font-size: 13px; font-style: normal; color: var(--perf-text-muted); }
.ac-score-state { font-size: 10.5px; font-weight: 650; color: var(--perf-text-muted); }

.ac-edit-banner { display: flex; align-items: flex-start; gap: 9px; padding: 11px 13px; border-radius: 12px; margin-bottom: 14px; font-size: 12px; line-height: 1.5; color: var(--perf-text-secondary); }
.ac-edit-banner.self { background: color-mix(in srgb, var(--perf-amber) 11%, transparent); border: 1px solid color-mix(in srgb, var(--perf-amber) 28%, transparent); }
.ac-edit-banner.manager { background: color-mix(in srgb, var(--perf-orange) 11%, transparent); border: 1px solid color-mix(in srgb, var(--perf-orange) 28%, transparent); }
.ac-edit-banner :deep(svg) { flex-shrink: 0; margin-top: 1px; }
.ac-edit-banner.self :deep(svg) { color: var(--perf-amber); }
.ac-edit-banner.manager :deep(svg) { color: var(--perf-orange); }
.ac-edit-banner b { color: var(--perf-text); }

.ac-sheet { margin-bottom: 16px; }

/* Merit & increment panel */
.ac-merit { margin-bottom: 16px; padding: 15px 16px; border-radius: 16px; background: var(--perf-surface); border: 1px solid var(--perf-border-warm); display: flex; flex-direction: column; gap: 12px; }
.ac-merit-h { display: inline-flex; align-items: center; gap: 7px; font-size: 13.5px; font-weight: 850; color: var(--perf-text); }
.ac-merit-h :deep(svg) { color: var(--perf-gold); }
.ac-merit-pol { margin-left: auto; font-size: 10.5px; font-weight: 700; color: var(--perf-text-muted); padding: 3px 9px; border-radius: 999px; background: var(--perf-panel); border: 1px solid var(--perf-border); }
.ac-merit-applied { display: flex; align-items: center; gap: 11px; padding: 12px 13px; border-radius: 12px; color: var(--perf-ok); background: var(--perf-ok-soft); border: 1px solid color-mix(in srgb, var(--perf-ok) 28%, transparent); }
.ac-merit-applied > div { display: flex; flex-direction: column; }
.ac-merit-applied b { font-size: 13px; font-weight: 800; color: var(--perf-text); }
.ac-merit-applied span { font-size: 11.5px; color: var(--perf-text-secondary); }
.ac-merit-none { display: flex; align-items: flex-start; gap: 7px; margin: 0; font-size: 11.5px; line-height: 1.45; color: var(--perf-text-muted); }
.ac-merit-none :deep(svg) { color: var(--perf-amber); flex-shrink: 0; margin-top: 1px; }
.ac-band { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px; background: var(--perf-panel); border: 1px solid var(--perf-border); border-left: 3px solid var(--bc); }
.ac-band-id { flex: 1; min-width: 0; }
.ac-band-id b { display: block; font-size: 13px; font-weight: 800; color: var(--bc); }
.ac-band-id span { font-size: 10.5px; color: var(--perf-text-muted); }
.ac-band-rng { font-size: 13px; font-weight: 800; color: var(--bc); font-variant-numeric: tabular-nums; }
.ac-slider { display: flex; align-items: center; gap: 13px; }
.ac-slider input[type=range] { flex: 1; appearance: none; height: 6px; border-radius: 999px; background: linear-gradient(90deg, var(--bc) var(--fill, 50%), var(--perf-track) var(--fill, 50%)); outline: none; }
.ac-slider input[type=range]::-webkit-slider-thumb { appearance: none; width: 18px; height: 18px; border-radius: 50%; background: var(--bc); cursor: pointer; border: 3px solid var(--perf-surface-elevated); box-shadow: 0 2px 8px rgba(0,0,0,0.4); }
.ac-slider input[type=range]::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: var(--bc); cursor: pointer; border: 3px solid var(--perf-surface-elevated); }
.ac-slider-val { font-size: 21px; font-weight: 850; font-variant-numeric: tabular-nums; min-width: 58px; text-align: right; }
.ac-ctc { display: flex; align-items: center; gap: 9px; font-size: 13px; color: var(--perf-text-secondary); }
.ac-ctc span { display: inline-flex; align-items: center; gap: 5px; }
.ac-ctc :deep(svg) { color: var(--perf-text-dim); }
.ac-ctc b { font-size: 15px; font-weight: 850; color: var(--perf-gold); font-variant-numeric: tabular-nums; }
.ac-ctc em { font-style: normal; font-size: 11px; color: var(--perf-text-muted); }
.ac-eff { display: flex; align-items: center; gap: 9px; }
.ac-eff label { font-size: 11.5px; font-weight: 700; color: var(--perf-text-secondary); flex-shrink: 0; }
.ac-eff :deep(.hr-dp) { flex: 1; min-width: 0; }
.ac-merit-note { width: 100%; box-sizing: border-box; resize: vertical; font: inherit; font-size: 12.5px; color: var(--perf-text); background: var(--perf-panel); border: 1px solid var(--perf-border-strong); border-radius: 10px; padding: 9px 11px; }
.ac-merit-note:focus { outline: none; border-color: var(--perf-gold); }
.ac-merit-acts { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ac-merit-acts .ac-ghost:hover { color: var(--perf-conflict); border-color: color-mix(in srgb, var(--perf-conflict) 30%, transparent); }

.ac-rev-acts { display: flex; align-items: center; gap: 8px; padding-top: 14px; border-top: 1px solid var(--perf-border); position: sticky; bottom: -18px; background: var(--perf-surface-elevated); padding-bottom: 2px; flex-wrap: wrap; }
.ac-grow { flex: 1; }
.ac-rev-acts .ac-ghost { color: var(--perf-text-muted); margin-left: auto; }
.ac-rev-acts .ac-ghost:hover { color: var(--perf-conflict); border-color: color-mix(in srgb, var(--perf-conflict) 30%, transparent); }
.ac-reason { display: flex; align-items: center; gap: 8px; width: 100%; }
.ac-reason-in { flex: 1; min-width: 0; height: 40px; padding: 0 12px; border-radius: 10px; font: inherit; font-size: 12.5px; color: var(--hr-input-text, var(--perf-text)); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); }
.ac-reason-in:focus { outline: none; border-color: var(--perf-border-warm); }

.ac-empty { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 10px; }
.ac-empty-ic { display: grid; place-items: center; width: 60px; height: 60px; border-radius: 18px; color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 12%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 26%, transparent); }
.ac-empty b { font-size: 15px; font-weight: 800; color: var(--perf-text); }
.ac-empty p { margin: 0; font-size: 12.5px; color: var(--perf-text-muted); max-width: 40ch; line-height: 1.5; }

@media (max-width: 860px) {
  .ac { height: 94vh; }
  .ac-body { grid-template-columns: 1fr; }
  .ac-rail { border-right: none; border-bottom: 1px solid var(--perf-border); max-height: 220px; }
  .ac-row3, .ac-scores { grid-template-columns: 1fr; }
  .ac-hero { flex-wrap: wrap; }
}
@media (prefers-reduced-motion: reduce) { .ac-x:hover { transform: none; } .ac-gauge, .ac-lens:hover, .ac-gr-card:hover { transition: none; transform: none; } }
</style>
