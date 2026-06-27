<template>
  <!-- ════════════════════ OBJECTIVE COMPOSER · the OKR creation console ════════════════════
       A 2-pane wizard: a live "Objective Pass" preview (left) that assembles as you type, and a
       4-step flow (right) — Aim (owner + title + rationale) → Key results (measurable) →
       Schedule & align (cycle + the EXACT HrDatePicker calendar + alignment note) → Review.
       Dropdowns are the teleported PerfSelect; dates are the assets-register HrDatePicker.
       "Add key result" mode collapses to a single compact pane. -->
  <teleport to="body">
    <Presence>
      <Motion v-if="open" key="ov" as="div" class="om-ov perf-scope" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
        :exit="{ opacity: 0 }" :transition="{ duration: 0.22 }" @click.self="$emit('close')">
        <Motion as="div" class="om" :class="{ kr: krMode }" :initial="{ opacity: 0, y: 22, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 14, scale: 0.98 }" :transition="{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }">
          <span class="om-mesh" aria-hidden="true" />

          <!-- ───────── aside · live objective pass ───────── -->
          <aside v-if="!krMode" class="om-pass">
            <span class="om-pass-grain" aria-hidden="true" />
            <div class="om-pass-stamp" :class="{ ready: canSave }">{{ canSave ? 'READY' : 'DRAFT' }}</div>

            <svg class="om-pass-peak" viewBox="0 0 200 110" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
              <path d="M-10 110 L 60 60 L 110 78 L 165 26 L 210 64 L 210 120 L -10 120 Z" fill="url(#omPeak)" />
              <defs><linearGradient id="omPeak" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--perf-gold)" stop-opacity="0.35" /><stop offset="100%" stop-color="var(--perf-gold)" stop-opacity="0" /></linearGradient></defs>
              <path :d="starPath(165, 24, 9, 5)" class="om-pass-star" />
            </svg>

            <div class="om-pass-body">
              <span class="om-pass-eyebrow"><Target :size="12" /> New objective</span>
              <b class="om-pass-title">{{ form.title || 'Your objective…' }}</b>
              <p v-if="form.description" class="om-pass-why">{{ form.description }}</p>

              <div class="om-pass-owner" v-if="pickedName">
                <span class="om-pass-av">{{ initials(pickedName) }}</span><span>{{ pickedName }}</span>
              </div>
              <div v-else class="om-pass-owner ghost"><span class="om-pass-av"><User :size="13" /></span><span>Unassigned</span></div>

              <div class="om-pass-krs">
                <span class="om-pass-krs-h"><ListChecks :size="12" /> {{ filledKrs.length }} key result{{ filledKrs.length === 1 ? '' : 's' }}</span>
                <div v-for="(k, i) in filledKrs.slice(0, 4)" :key="i" class="om-pass-kr"><i>{{ i + 1 }}</i>{{ k.title }}</div>
                <div v-if="!filledKrs.length" class="om-pass-kr empty">Add measurable results…</div>
              </div>

              <div class="om-pass-meta">
                <span><CalendarDays :size="11" /> {{ cycleLabel(form.cycle) }}</span>
                <span v-if="form.due_date"><CalendarClock :size="11" /> {{ fmtDate(form.due_date) }}</span>
                <span v-if="form.category"><Sparkles :size="11" /> {{ form.category }}</span>
              </div>
            </div>
          </aside>

          <!-- ───────── aside · live KEY-RESULT pass (contribution dial) ───────── -->
          <aside v-else class="om-krpass">
            <span class="om-pass-grain" aria-hidden="true" />
            <div class="om-pass-stamp" :class="{ ready: krReady }">{{ krReady ? 'READY' : 'DRAFT' }}</div>

            <div class="om-krpass-dialwrap">
              <div class="om-krpass-dial" :style="{ '--perf-p': (krShare / 100 * 360) + 'deg' }">
                <span class="om-krpass-dial-sheen" aria-hidden="true" />
                <div class="om-krpass-dial-in">
                  <b>{{ krShare }}</b><i>%</i>
                </div>
              </div>
              <span class="om-krpass-dial-cap"><Scale :size="10" /> pull on the objective</span>
            </div>

            <div class="om-krpass-body">
              <span class="om-pass-eyebrow"><ListChecks :size="12" /> New key result</span>
              <b class="om-krpass-title">{{ krOne.title || 'Your measurable result…' }}</b>

              <span class="om-krpass-metric"><component :is="METRIC_ICON[krOne.metric_type]" :size="11" /> {{ metricLabelOf(krOne.metric_type) }}</span>

              <div v-if="!isBinary(krOne)" class="om-krpass-rail">
                <div class="om-krpass-rail-track"><span class="om-krpass-now" /></div>
                <div class="om-krpass-rail-caps">
                  <span><i>Now</i>{{ fmtVal(krOne.start_value) }}{{ unitOf(krOne) }}</span>
                  <span class="t"><i>Target</i>{{ fmtVal(krOne.target_value) }}{{ unitOf(krOne) }}</span>
                </div>
              </div>
              <div v-else class="om-krpass-binary"><span>Not done</span><ArrowRight :size="12" /><span class="done">Done</span></div>

              <div class="om-krpass-under">
                <span class="om-krpass-under-cap">Climbs under</span>
                <span class="om-krpass-under-obj"><Target :size="12" /> {{ addKrTo.title }}</span>
                <span class="om-krpass-under-prog">at {{ Math.round(Number(addKrTo.progress || 0)) }}% · {{ existingKrs.length }} key result{{ existingKrs.length === 1 ? '' : 's' }} today</span>
              </div>
            </div>
          </aside>

          <!-- ───────── main ───────── -->
          <div class="om-main">
            <header class="om-head">
              <span class="om-ic"><component :is="krMode ? ListChecks : Target" :size="17" /></span>
              <div class="om-titles">
                <b>{{ krMode ? 'Add key result' : 'New objective' }}</b>
                <span>{{ krMode ? `Under “${addKrTo.title}”` : stepMeta[step].sub }}</span>
              </div>
              <button class="om-x" type="button" @click="$emit('close')"><X :size="16" /></button>
            </header>

            <!-- stepper -->
            <div v-if="!krMode" class="om-steps">
              <button v-for="(s, i) in stepMeta" :key="s.key" class="om-step" :class="{ on: i === step, done: i < step }"
                type="button" :disabled="i > maxReached" @click="goStep(i)">
                <span class="om-step-dot"><component :is="i < step ? Check : s.icon" :size="12" /></span>
                <span class="om-step-lab">{{ s.label }}</span>
              </button>
              <span class="om-steps-rail"><span class="om-steps-fill" :style="{ width: (step / (stepMeta.length - 1)) * 100 + '%' }" /></span>
            </div>

            <div class="om-body">
              <transition :name="`om-slide-${slideDir}`" mode="out-in">
                <!-- ══ KR MODE · the Key-Result Forge ══ -->
                <div v-if="krMode" key="krmode" class="om-pane om-krpane">
                  <Motion as="div" class="om-krinfo" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(0)">
                    <span class="om-krinfo-ic"><Lightbulb :size="14" /></span>
                    <p>A <b>key result</b> is the measurable proof your objective is moving — not a task, an <i>outcome</i>. Set where you stand now and what “done” looks like; its progress is computed automatically and rolls up into the objective.</p>
                  </Motion>

                  <Motion as="div" class="om-field" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(1)">
                    <label class="om-lab"><ListChecks :size="12" /> Measurable result <i>*</i></label>
                    <input v-model="krOne.title" class="om-input" placeholder="e.g. Close 12 new enterprise logos" />
                  </Motion>

                  <Motion as="div" class="om-field" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(2)">
                    <label class="om-lab"><Gauge :size="12" /> How is it measured?</label>
                    <div class="om-seg">
                      <button v-for="m in metricOptions" :key="m.value" type="button" class="om-seg-btn" :class="{ on: krOne.metric_type === m.value }"
                        @click="krOne.metric_type = m.value; onMetricChange(krOne)">
                        <component :is="METRIC_ICON[m.value]" :size="15" />
                        <span>{{ segLabel(m.value) }}</span>
                      </button>
                    </div>
                    <p class="om-seg-blurb"><component :is="METRIC_ICON[krOne.metric_type]" :size="11" /> {{ metricBlurb(krOne.metric_type) }}</p>
                  </Motion>

                  <Motion v-if="!isBinary(krOne)" as="div" class="om-field" key="krrange" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(3)">
                    <label class="om-lab"><Ruler :size="12" /> Set the range — baseline to target</label>
                    <div class="om-kr-grid">
                      <label class="om-measure"><span class="om-measure-cap">Baseline · now</span><span class="om-num"><input v-model.number="krOne.start_value" type="number" placeholder="0" /><i v-if="unitOf(krOne)">{{ unitOf(krOne) }}</i></span></label>
                      <label class="om-measure"><span class="om-measure-cap">Target <i>*</i></span><span class="om-num"><input v-model.number="krOne.target_value" type="number" placeholder="100" /><i v-if="unitOf(krOne)">{{ unitOf(krOne) }}</i></span></label>
                      <label v-if="krOne.metric_type === 'NUMBER'" class="om-measure"><span class="om-measure-cap">Unit</span><input v-model="krOne.unit" class="om-input om-mini" placeholder="e.g. logos" /></label>
                    </div>
                  </Motion>
                  <Motion v-else as="div" class="om-krbinary-note" key="krbin" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(3)">
                    <CircleCheckBig :size="14" /> A single done / not-done checkpoint — you’ll flip it complete from a check-in. No baseline or target needed.
                  </Motion>

                  <Motion as="div" class="om-field" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(4)">
                    <label class="om-lab"><Scale :size="12" /> Weight — its pull on the objective</label>
                    <div class="om-weightrow">
                      <div class="om-kr-weight big">
                        <button type="button" :disabled="(krOne.weight || 1) <= 1" @click="krOne.weight = Math.max(1, (krOne.weight || 1) - 1)">–</button>
                        <b>{{ krOne.weight || 1 }}</b>
                        <button type="button" @click="krOne.weight = (krOne.weight || 1) + 1">+</button>
                      </div>
                      <div class="om-weightbar">
                        <div class="om-weightbar-track"><i :style="{ width: krShare + '%' }" /></div>
                        <span>~<b>{{ krShare }}%</b> of <b>“{{ shortTitle }}”</b> roll-up<template v-if="existingKrs.length"> · sharing with {{ existingKrs.length }} existing</template></span>
                      </div>
                    </div>
                  </Motion>

                  <Motion as="div" class="om-process kr" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(5)">
                    <span class="om-process-h"><CircleCheckBig :size="13" /> On add</span>
                    <ul>
                      <li><Check :size="12" /> It joins <b>“{{ shortTitle }}”</b> at <b>0%</b> — current sits at the baseline.</li>
                      <li><Check :size="12" /> Its weight sets how much it moves the objective’s progress.</li>
                      <li><Check :size="12" /> Log progress anytime via <b>Check in</b> — the objective re-rolls-up instantly.</li>
                    </ul>
                  </Motion>
                </div>

                <!-- ══ STEP 0 · AIM ══ -->
                <div v-else-if="step === 0" key="s0" class="om-pane">
                  <div class="om-field">
                    <label class="om-lab"><User :size="12" /> Owner <i>*</i></label>
                    <div v-if="!form.employee_id" class="om-search">
                      <Search :size="14" />
                      <input v-model="search" class="om-search-in" placeholder="Search employees by name…" />
                    </div>
                    <div v-if="!form.employee_id" class="om-emps">
                      <div v-if="loadingEmps" class="om-emps-load"><Loader2 :size="15" class="perf-spin" /> Loading…</div>
                      <Motion v-for="(e, i) in emps" :key="e.id" as="button" type="button" class="om-emp" @click="pickEmp(e)"
                        :initial="{ opacity: 0, x: -8 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.3, delay: i * 0.03 }">
                        <span class="om-emp-av">{{ initials(empName(e)) }}</span>
                        <span class="om-emp-txt"><b>{{ empName(e) }}</b><span>{{ e.designation_name || e.employee_id || '' }}</span></span>
                        <ChevronRight :size="14" class="om-emp-go" />
                      </Motion>
                      <p v-if="!loadingEmps && !emps.length" class="om-emps-empty">No employees match.</p>
                    </div>
                    <div v-else class="om-emp-chip">
                      <span class="om-emp-av lg">{{ initials(pickedName) }}</span>
                      <div class="om-emp-chip-txt"><b>{{ pickedName }}</b><span>Objective owner</span></div>
                      <button type="button" @click="clearEmp"><X :size="14" /></button>
                    </div>
                  </div>
                  <div class="om-field">
                    <label class="om-lab"><Target :size="12" /> Objective <i>*</i></label>
                    <input v-model="form.title" class="om-input" placeholder="A qualitative aim — e.g. Grow enterprise pipeline" />
                  </div>
                  <div class="om-row2">
                    <div class="om-field">
                      <label class="om-lab"><Sparkles :size="12" /> Category</label>
                      <PerfSelect v-model="form.category" :options="categoryOptions" placeholder="— Uncategorised" />
                    </div>
                    <div class="om-field">
                      <label class="om-lab"><CalendarDays :size="12" /> Cycle</label>
                      <PerfSelect v-model="form.cycle" :options="cycleOptions" placeholder="Cycle" />
                    </div>
                  </div>
                  <div class="om-field">
                    <label class="om-lab"><ScrollText :size="12" /> Why this matters <i class="opt">(rationale)</i></label>
                    <textarea v-model="form.description" class="om-input" rows="2" placeholder="The reason this objective is a priority this cycle…" />
                  </div>
                </div>

                <!-- ══ STEP 1 · KEY RESULTS ══ -->
                <div v-else-if="step === 1" key="s1" class="om-pane">
                  <p class="om-hint"><Info :size="12" /> Key results are the measurable outcomes that prove the objective. Progress rolls up from these.</p>
                  <div v-for="(kr, i) in form.key_results" :key="kr._k" class="om-kr-card">
                    <div class="om-kr-head">
                      <span class="om-kr-idx">{{ i + 1 }}</span>
                      <input v-model="kr.title" class="om-input om-kr-title" placeholder="Measurable result (e.g. Close 12 new logos)" />
                      <button v-if="form.key_results.length > 1" type="button" class="om-kr-rm" @click="removeKr(i)"><Trash2 :size="13" /></button>
                    </div>
                    <div class="om-kr-grid">
                      <label class="om-measure m-metric"><span class="om-measure-cap">Measure</span><PerfSelect v-model="kr.metric_type" :options="metricOptions" placeholder="Metric" @update:modelValue="onMetricChange(kr)" /></label>
                      <label v-if="isBinary(kr)" class="om-measure m-grow"><span class="om-measure-cap">Tracking</span><span class="om-kr-binary"><CircleCheckBig :size="13" /> Done / not done — set via check-in</span></label>
                      <template v-else>
                        <label class="om-measure"><span class="om-measure-cap">Baseline</span><span class="om-num"><input v-model.number="kr.start_value" type="number" placeholder="0" /><i v-if="unitOf(kr)">{{ unitOf(kr) }}</i></span></label>
                        <label class="om-measure"><span class="om-measure-cap">Target <i>*</i></span><span class="om-num"><input v-model.number="kr.target_value" type="number" placeholder="100" /><i v-if="unitOf(kr)">{{ unitOf(kr) }}</i></span></label>
                        <label v-if="kr.metric_type === 'NUMBER'" class="om-measure"><span class="om-measure-cap">Unit</span><input v-model="kr.unit" class="om-input om-mini" placeholder="e.g. logos" /></label>
                      </template>
                    </div>
                    <div class="om-kr-weight">
                      <span>Weight</span>
                      <button type="button" @click="kr.weight = Math.max(1, (kr.weight || 1) - 1)">–</button>
                      <b>{{ kr.weight || 1 }}</b>
                      <button type="button" @click="kr.weight = (kr.weight || 1) + 1">+</button>
                    </div>
                  </div>
                  <button type="button" class="om-addkr" @click="addKr"><Plus :size="14" /> Add key result</button>
                </div>

                <!-- ══ STEP 2 · SCHEDULE & ALIGN ══ -->
                <div v-else-if="step === 2" key="s2" class="om-pane">
                  <div class="om-row2">
                    <div class="om-field">
                      <label class="om-lab"><CalendarDays :size="12" /> Start date</label>
                      <HrDatePicker v-model="form.start_date" placeholder="dd / mm / yyyy" />
                    </div>
                    <div class="om-field">
                      <label class="om-lab"><CalendarClock :size="12" /> Due date</label>
                      <HrDatePicker v-model="form.due_date" :min="form.start_date || ''" placeholder="dd / mm / yyyy" />
                    </div>
                  </div>
                  <div class="om-field">
                    <label class="om-lab"><Milestone :size="12" /> Period label</label>
                    <input v-model="form.period_label" class="om-input" placeholder="e.g. FY 2025-26 · Q2" />
                  </div>
                  <div class="om-align">
                    <span class="om-align-ic"><GitMerge :size="14" /></span>
                    <p>This objective can be scored as the <b>Goals</b> section of a performance review and feeds the Insights goal-health gauge. Align it to a cycle so it surfaces with that review.</p>
                  </div>
                </div>

                <!-- ══ STEP 3 · REVIEW ══ -->
                <div v-else key="s3" class="om-pane">
                  <div class="om-review">
                    <div class="om-rev-row"><span><User :size="13" /> Owner</span><b>{{ pickedName || '—' }}</b></div>
                    <div class="om-rev-row"><span><Target :size="13" /> Objective</span><b>{{ form.title || '—' }}</b></div>
                    <div class="om-rev-row"><span><ListChecks :size="13" /> Key results</span><b>{{ filledKrs.length }}</b></div>
                    <div class="om-rev-row"><span><CalendarDays :size="13" /> Cycle</span><b>{{ cycleLabel(form.cycle) }}</b></div>
                    <div class="om-rev-row" v-if="form.due_date"><span><CalendarClock :size="13" /> Due</span><b>{{ fmtDate(form.due_date) }}</b></div>
                  </div>
                  <div class="om-process">
                    <span class="om-process-h"><CircleCheckBig :size="13" /> On create</span>
                    <ul>
                      <li><Check :size="12" /> The objective opens <b>On track</b> with its {{ filledKrs.length }} key result{{ filledKrs.length === 1 ? '' : 's' }}.</li>
                      <li><Check :size="12" /> Progress auto-rolls up from each key result's check-ins.</li>
                      <li><Check :size="12" /> It joins the owner's ascent and the cycle's goal-health.</li>
                    </ul>
                  </div>
                </div>
              </transition>
            </div>

            <footer class="om-foot">
              <button v-if="!krMode && step > 0" class="perf-btn perf-btn-steel" type="button" @click="back"><ChevronLeft :size="15" /> Back</button>
              <span class="om-foot-grow" />
              <button class="perf-btn perf-btn-ghost" type="button" @click="$emit('close')">Cancel</button>
              <button v-if="krMode" class="perf-btn perf-btn-primary" type="button" :disabled="!krOne.title.trim() || saving" @click="submitKr">
                <Loader2 v-if="saving" :size="14" class="perf-spin" /><Plus v-else :size="14" /> Add key result
              </button>
              <template v-else>
                <button v-if="step < stepMeta.length - 1" class="perf-btn perf-btn-primary" type="button" :disabled="!stepValid" @click="next">
                  Continue <ChevronRight :size="15" />
                </button>
                <button v-else class="perf-btn perf-btn-primary" type="button" :disabled="!canSave || saving" @click="submitObjective">
                  <Loader2 v-if="saving" :size="14" class="perf-spin" /><Target v-else :size="14" /> Create objective
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
  X, Search, Loader2, Plus, Trash2, Target, ListChecks, User, ChevronRight, ChevronLeft,
  CalendarDays, CalendarClock, Sparkles, ScrollText, Milestone, GitMerge, Info, Check, CircleCheckBig,
  Lightbulb, Gauge, Ruler, Scale, Percent, Hash, IndianRupee, ArrowRight,
} from 'lucide-vue-next'
import PerfSelect from './PerfSelect.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import { fetchEmployeesForReview, GOAL_METRICS, GOAL_CATEGORIES } from '@/composables/usePerformance'
import { CYCLES, cycleMeta } from '@/views/hr/settings/composables/appraisalVocab'

const props = defineProps({
  open: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  addKrTo: { type: Object, default: null },
})
const emit = defineEmits(['close', 'save', 'save-kr'])

const krMode = computed(() => !!props.addKrTo)
let krSeq = 0
const blankKr = () => ({ _k: ++krSeq, title: '', metric_type: 'PERCENT', start_value: 0, target_value: 100, current_value: 0, unit: '', weight: 1 })
const form = reactive({ employee_id: null, title: '', description: '', category: null, cycle: 'ANNUAL', period_label: '', start_date: '', due_date: '', key_results: [blankKr()] })
const krOne = reactive(blankKr())
const pickedName = ref('')

const step = ref(0)
const maxReached = ref(0)
const slideDir = ref('fwd')
const search = ref('')
const emps = ref([])
const loadingEmps = ref(false)

const stepMeta = [
  { key: 'aim', label: 'Aim', icon: Target, sub: 'Who owns it and what is the aim' },
  { key: 'kr', label: 'Key results', icon: ListChecks, sub: 'The measurable outcomes' },
  { key: 'plan', label: 'Schedule', icon: CalendarDays, sub: 'Timeline & alignment' },
  { key: 'review', label: 'Review', icon: CircleCheckBig, sub: 'Confirm and create' },
]

const categoryOptions = computed(() => [{ value: null, label: '— Uncategorised' }, ...GOAL_CATEGORIES.map(c => ({ value: c, label: c }))])
const cycleOptions = computed(() => CYCLES.map(c => ({ value: c, label: cycleMeta(c).label })))
const metricOptions = computed(() => GOAL_METRICS.map(m => ({ value: m.value, label: m.label })))
const isBinary = (kr) => ['MILESTONE', 'BOOLEAN'].includes(kr.metric_type)
// implied unit shown as a suffix inside the start/target fields
const unitOf = (kr) => kr.metric_type === 'PERCENT' ? '%' : kr.metric_type === 'CURRENCY' ? '₹' : (kr.unit || '')
// metric drives the measurement fields — auto-set unit + a sensible target, clear for binary
function onMetricChange(kr) {
  if (kr.metric_type === 'PERCENT') { kr.unit = '%'; if (!kr.target_value) kr.target_value = 100 }
  else if (kr.metric_type === 'CURRENCY') { kr.unit = '₹' }
  else if (isBinary(kr)) { kr.unit = ''; kr.start_value = 0; kr.target_value = 1 }
  else if (kr.metric_type === 'NUMBER' && ['%', '₹'].includes(kr.unit)) { kr.unit = '' }
}
const filledKrs = computed(() => form.key_results.filter(k => k.title.trim()))

// ── Key-Result Forge (krMode) helpers ──
const METRIC_ICON = { PERCENT: Percent, NUMBER: Hash, CURRENCY: IndianRupee, MILESTONE: Milestone, BOOLEAN: CircleCheckBig }
const segLabel = (v) => ({ PERCENT: 'Percent', NUMBER: 'Number', CURRENCY: 'Currency', MILESTONE: 'Milestone', BOOLEAN: 'Done / not' }[v] || v)
const metricBlurb = (mt) => ({
  PERCENT: 'Progress as a percentage climbing toward 100%.',
  NUMBER: 'A raw count climbing from baseline to target.',
  CURRENCY: 'A rupee amount building toward a target figure.',
  MILESTONE: 'A single milestone — reached or not yet.',
  BOOLEAN: 'A yes / no checkpoint, flipped at check-in.',
}[mt] || '')
const metricLabelOf = (mt) => (GOAL_METRICS.find(m => m.value === mt) || {}).label || mt
const fmtVal = (v) => (v == null || v === '' ? '—' : Number(v).toLocaleString('en-IN'))
const krReady = computed(() => !!krOne.title.trim())
const shortTitle = computed(() => { const t = props.addKrTo?.title || 'the objective'; return t.length > 26 ? t.slice(0, 25) + '…' : t })
const existingKrs = computed(() => props.addKrTo?.key_results || [])
const existingWeight = computed(() => existingKrs.value.reduce((s, k) => s + (Number(k.weight) || 1), 0))
const krShare = computed(() => {
  const w = Number(krOne.weight) || 1
  const total = existingWeight.value + w
  return total ? Math.round((w / total) * 100) : 100
})
// staggered field entrance
const fT = (i) => ({ duration: 0.4, delay: 0.05 + i * 0.06, ease: [0.16, 1, 0.3, 1] })

const stepValid = computed(() => {
  if (step.value === 0) return !!form.employee_id && !!form.title.trim()
  if (step.value === 1) return filledKrs.value.length > 0
  return true
})
const canSave = computed(() => !!form.employee_id && !!form.title.trim() && filledKrs.value.length > 0)

function reset() {
  form.employee_id = null; form.title = ''; form.description = ''; form.category = null
  form.cycle = 'ANNUAL'; form.period_label = ''; form.start_date = ''; form.due_date = ''
  form.key_results = [blankKr()]
  Object.assign(krOne, blankKr())
  if (krMode.value) { krOne.metric_type = 'PERCENT' }
  pickedName.value = ''; search.value = ''; step.value = 0; maxReached.value = 0; slideDir.value = 'fwd'
}
async function loadEmps() {
  loadingEmps.value = true
  try { const d = await fetchEmployeesForReview({ search: search.value || undefined }); emps.value = d.items || d || [] }
  catch { emps.value = [] } finally { loadingEmps.value = false }
}
watch(() => props.open, (v) => { if (v) { reset(); if (!krMode.value) loadEmps() } })
let t = null
watch(search, () => { clearTimeout(t); t = setTimeout(loadEmps, 300) })

const empName = (e) => e.full_name || [e.first_name, e.last_name].filter(Boolean).join(' ') || e.name || e.employee_id || '—'
const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
const pickEmp = (e) => { form.employee_id = e.id; pickedName.value = empName(e) }
const clearEmp = () => { form.employee_id = null; pickedName.value = '' }
const addKr = () => form.key_results.push(blankKr())
const removeKr = (i) => form.key_results.splice(i, 1)
const cycleLabel = (c) => cycleMeta(c).label
const fmtDate = (iso) => { try { return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return iso } }

function starPath(cx, cy, r, spikes) {
  const inner = r * 0.42; let d = ''
  for (let i = 0; i < spikes * 2; i++) {
    const rad = i % 2 === 0 ? r : inner; const a = (Math.PI / spikes) * i - Math.PI / 2
    d += (i === 0 ? 'M' : 'L') + (cx + Math.cos(a) * rad).toFixed(1) + ' ' + (cy + Math.sin(a) * rad).toFixed(1) + ' '
  }
  return d + 'Z'
}

function next() { if (!stepValid.value) return; slideDir.value = 'fwd'; step.value = Math.min(stepMeta.length - 1, step.value + 1); maxReached.value = Math.max(maxReached.value, step.value) }
function back() { slideDir.value = 'back'; step.value = Math.max(0, step.value - 1) }
function goStep(i) { if (i > maxReached.value) return; slideDir.value = i > step.value ? 'fwd' : 'back'; step.value = i }

function submitObjective() {
  if (!canSave.value) return
  emit('save', {
    employee_id: form.employee_id, title: form.title.trim(), description: form.description || null,
    category: form.category, cycle: form.cycle, period_label: form.period_label || null,
    start_date: form.start_date || null, due_date: form.due_date || null,
    key_results: filledKrs.value.map(k => ({
      title: k.title.trim(), metric_type: k.metric_type, start_value: k.start_value, target_value: k.target_value,
      current_value: 0, unit: k.unit || null, weight: k.weight || 1,
    })),
  })
}
function submitKr() {
  if (!krOne.title.trim()) return
  emit('save-kr', {
    employee_id: props.addKrTo.employee_id, parent_id: props.addKrTo.id, goal_type: 'KEY_RESULT',
    title: krOne.title.trim(), metric_type: krOne.metric_type, start_value: krOne.start_value, target_value: krOne.target_value,
    current_value: 0, unit: krOne.unit || null, weight: krOne.weight || 1,
    cycle: props.addKrTo.cycle, period_label: props.addKrTo.period_label,
  })
}
</script>

<style scoped>
.om-ov { position: fixed; inset: 0; z-index: 1440; display: flex; align-items: center; justify-content: center; padding: 24px;
  background: rgba(5, 5, 6, 0.6); backdrop-filter: blur(11px); -webkit-backdrop-filter: blur(11px); }
.om { position: relative; width: 100%; max-width: 780px; max-height: 92vh; display: grid; grid-template-columns: 250px 1fr; overflow: hidden; border-radius: 22px;
  background: var(--perf-surface-elevated); border: 1px solid var(--perf-border-strong); box-shadow: 0 50px 110px -42px rgba(0,0,0,0.85); }
.om.kr { grid-template-columns: 220px 1fr; max-width: 768px; }
.om-mesh { position: absolute; inset: 0; pointer-events: none; opacity: 0.7; z-index: 0;
  background: radial-gradient(70% 50% at 14% -8%, color-mix(in srgb, var(--perf-gold) 12%, transparent), transparent 60%),
    radial-gradient(60% 60% at 100% 100%, color-mix(in srgb, var(--perf-orange) 9%, transparent), transparent 60%); }

/* aside */
.om-pass { position: relative; overflow: hidden; z-index: 1; display: flex; flex-direction: column; border-right: 1px solid var(--perf-border);
  background: linear-gradient(170deg, color-mix(in srgb, var(--perf-gold) 9%, var(--perf-panel)), var(--perf-panel)); }
.om-pass-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(color-mix(in srgb, var(--perf-gold) 7%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--perf-gold) 7%, transparent) 1px, transparent 1px);
  background-size: 26px 26px; mask-image: radial-gradient(120% 80% at 50% 0%, #000, transparent 80%); -webkit-mask-image: radial-gradient(120% 80% at 50% 0%, #000, transparent 80%); }
.om-pass-stamp { position: absolute; top: 16px; right: -26px; transform: rotate(38deg); z-index: 3; padding: 3px 32px; font-size: 9px; font-weight: 900; letter-spacing: 0.14em;
  color: var(--perf-text-muted); background: var(--perf-track); }
.om-pass-stamp.ready { color: #1a1206; background: var(--perf-grad-hero); }
.om-pass-peak { position: relative; z-index: 1; width: 100%; height: 78px; display: block; }
.om-pass-star { fill: var(--perf-gold-bright); filter: drop-shadow(0 0 5px var(--perf-gold)); animation: om-tw 2.8s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
@keyframes om-tw { 0%, 100% { opacity: 0.8; } 50% { opacity: 1; } }
.om-pass-body { position: relative; z-index: 1; flex: 1; display: flex; flex-direction: column; gap: 9px; padding: 6px 18px 18px; }
.om-pass-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--perf-gold); }
.om-pass-title { font-size: 16px; font-weight: 850; line-height: 1.2; color: var(--perf-text); }
.om-pass-why { margin: 0; font-size: 11px; line-height: 1.5; color: var(--perf-text-muted); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.om-pass-owner { display: inline-flex; align-items: center; gap: 8px; align-self: flex-start; padding: 5px 11px 5px 5px; border-radius: 999px;
  background: color-mix(in srgb, var(--perf-gold) 11%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 26%, transparent); font-size: 12px; font-weight: 700; color: var(--perf-text); }
.om-pass-owner.ghost { background: var(--perf-surface); border-color: var(--perf-border); color: var(--perf-text-muted); }
.om-pass-av { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; flex-shrink: 0; font-size: 10px; font-weight: 800; color: #1a1206; background: var(--perf-grad-hero); }
.om-pass-owner.ghost .om-pass-av { color: var(--perf-text-muted); background: var(--perf-track); }
.om-pass-krs { display: flex; flex-direction: column; gap: 5px; margin-top: 2px; }
.om-pass-krs-h { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--perf-text-secondary); }
.om-pass-kr { display: flex; align-items: center; gap: 7px; font-size: 11px; color: var(--perf-text-secondary); padding: 5px 8px; border-radius: 8px; background: var(--perf-surface); border: 1px solid var(--perf-border); }
.om-pass-kr i { display: grid; place-items: center; width: 15px; height: 15px; flex-shrink: 0; border-radius: 5px; font-style: normal; font-size: 8.5px; font-weight: 800; color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 14%, transparent); }
.om-pass-kr.empty { color: var(--perf-text-dim); font-style: italic; border-style: dashed; }
.om-pass-meta { display: flex; flex-wrap: wrap; gap: 5px 12px; margin-top: auto; padding-top: 8px; }
.om-pass-meta span { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; color: var(--perf-text-muted); }
.om-pass-meta :deep(svg) { color: var(--perf-gold); }

/* ── KR pass (contribution dial) ── */
.om-krpass { position: relative; overflow: hidden; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 13px; padding: 22px 16px 18px; border-right: 1px solid var(--perf-border);
  background: linear-gradient(170deg, color-mix(in srgb, var(--perf-amber) 10%, var(--perf-panel)), var(--perf-panel)); }
.om-krpass-dialwrap { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 8px; margin-top: 4px; }
.om-krpass-dial { position: relative; width: 104px; height: 104px; border-radius: 50%; display: grid; place-items: center;
  background: conic-gradient(var(--perf-gold) var(--perf-p, 0deg), var(--perf-track) 0deg); transition: --perf-p 0.7s var(--perf-spring); }
.om-krpass-dial-sheen { position: absolute; inset: -1px; border-radius: 50%; pointer-events: none; opacity: 0.45;
  background: conic-gradient(from 0deg, transparent, color-mix(in srgb, var(--perf-gold-bright) 55%, transparent), transparent 28%); animation: om-dial-spin 4.8s linear infinite; }
@keyframes om-dial-spin { to { transform: rotate(360deg); } }
.om-krpass-dial-in { position: absolute; inset: 9px; border-radius: 50%; background: var(--perf-surface-elevated); display: flex; align-items: baseline; justify-content: center; gap: 1px;
  box-shadow: inset 0 1px 8px rgba(0,0,0,0.25); }
.om-krpass-dial-in b { font-size: 27px; font-weight: 850; color: var(--perf-text); font-variant-numeric: tabular-nums; line-height: 1; }
.om-krpass-dial-in i { font-size: 12px; font-style: normal; font-weight: 800; color: var(--perf-gold); }
.om-krpass-dial-cap { display: inline-flex; align-items: center; gap: 4px; font-size: 9px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--perf-text-muted); }
.om-krpass-dial-cap :deep(svg) { color: var(--perf-gold); }
.om-krpass-body { position: relative; z-index: 1; flex: 1; width: 100%; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; }
.om-krpass-body .om-pass-eyebrow { color: var(--perf-amber); }
.om-krpass-title { font-size: 13.5px; font-weight: 800; line-height: 1.3; color: var(--perf-text); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.om-krpass-metric { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; font-weight: 750; color: var(--perf-amber); padding: 3px 9px; border-radius: 999px;
  background: color-mix(in srgb, var(--perf-amber) 12%, transparent); border: 1px solid color-mix(in srgb, var(--perf-amber) 26%, transparent); }
.om-krpass-rail { width: 100%; display: flex; flex-direction: column; gap: 6px; margin-top: 2px; }
.om-krpass-rail-track { position: relative; height: 6px; border-radius: 999px; overflow: visible;
  background: linear-gradient(90deg, color-mix(in srgb, var(--perf-gold) 24%, var(--perf-track)), var(--perf-track)); }
.om-krpass-now { position: absolute; left: 1px; top: 50%; transform: translateY(-50%); width: 9px; height: 9px; border-radius: 50%; background: var(--perf-gold-bright);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--perf-gold) 26%, transparent); animation: om-now-pulse 2.4s ease-in-out infinite; }
@keyframes om-now-pulse { 0%, 100% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--perf-gold) 26%, transparent); } 50% { box-shadow: 0 0 0 5px color-mix(in srgb, var(--perf-gold) 12%, transparent); } }
.om-krpass-rail-caps { display: flex; justify-content: space-between; gap: 8px; }
.om-krpass-rail-caps span { display: flex; flex-direction: column; font-size: 10.5px; font-weight: 800; color: var(--perf-text-secondary); }
.om-krpass-rail-caps span.t { text-align: right; align-items: flex-end; color: var(--perf-gold); }
.om-krpass-rail-caps i { font-style: normal; font-size: 8px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: var(--perf-text-dim); }
.om-krpass-binary { display: inline-flex; align-items: center; gap: 8px; font-size: 11.5px; font-weight: 750; color: var(--perf-text-muted); margin-top: 2px; }
.om-krpass-binary .done { color: var(--perf-ok); }
.om-krpass-binary :deep(svg) { color: var(--perf-gold); }
.om-krpass-under { width: 100%; margin-top: auto; padding-top: 12px; display: flex; flex-direction: column; align-items: center; gap: 3px; border-top: 1px dashed var(--perf-border); }
.om-krpass-under-cap { font-size: 8.5px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.07em; color: var(--perf-text-dim); }
.om-krpass-under-obj { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; font-weight: 800; color: var(--perf-text); }
.om-krpass-under-obj :deep(svg) { color: var(--perf-gold); }
.om-krpass-under-prog { font-size: 9.5px; color: var(--perf-text-muted); }

/* ── KR forge (main pane) ── */
.om-krpane { gap: 13px; }
.om-krinfo { display: flex; gap: 10px; padding: 11px 13px; border-radius: 13px; background: color-mix(in srgb, var(--perf-gold) 6%, var(--perf-panel)); border: 1px solid var(--perf-border-warm); }
.om-krinfo-ic { display: grid; place-items: center; width: 28px; height: 28px; flex-shrink: 0; border-radius: 9px; color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 13%, transparent); }
.om-krinfo p { margin: 0; font-size: 11.5px; line-height: 1.5; color: var(--perf-text-secondary); }
.om-krinfo b { color: var(--perf-text); font-weight: 800; }
.om-krinfo i { font-style: italic; color: var(--perf-gold); }
.om-seg { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
.om-seg-btn { display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 10px 4px; border-radius: 11px; cursor: pointer; font: inherit; font-size: 9.5px; font-weight: 750; line-height: 1.15; text-align: center;
  color: var(--perf-text-muted); background: var(--perf-surface); border: 1px solid var(--perf-border); transition: transform 0.2s var(--perf-spring), border-color 0.2s, background 0.2s, color 0.2s, box-shadow 0.2s; }
.om-seg-btn:hover { color: var(--perf-text); border-color: var(--perf-border-warm); transform: translateY(-2px); }
.om-seg-btn.on { color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 12%, transparent); border-color: color-mix(in srgb, var(--perf-gold) 40%, transparent); box-shadow: 0 6px 16px -9px color-mix(in srgb, var(--perf-gold) 70%, transparent); }
.om-seg-btn :deep(svg) { transition: transform 0.2s var(--perf-spring); }
.om-seg-btn.on :deep(svg) { transform: scale(1.14); }
.om-seg-blurb { display: inline-flex; align-items: center; gap: 6px; margin: 8px 0 0; font-size: 10.5px; color: var(--perf-text-muted); }
.om-seg-blurb :deep(svg) { color: var(--perf-gold); flex-shrink: 0; }
.om-krbinary-note { display: flex; align-items: center; gap: 9px; padding: 12px 14px; border-radius: 13px; font-size: 11.5px; line-height: 1.45; font-weight: 600;
  color: var(--perf-ok); background: var(--perf-ok-soft); border: 1px solid color-mix(in srgb, var(--perf-ok) 26%, transparent); }
.om-krbinary-note :deep(svg) { flex-shrink: 0; }
.om-weightrow { display: flex; align-items: center; gap: 13px; }
.om-kr-weight.big { gap: 9px; padding: 5px 7px; border-radius: 11px; background: var(--perf-panel); border: 1px solid var(--perf-border); }
.om-kr-weight.big button { width: 28px; height: 28px; border-radius: 8px; font-size: 16px; }
.om-kr-weight.big b { font-size: 15px; }
.om-kr-weight button:disabled { opacity: 0.4; cursor: default; }
.om-weightbar { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.om-weightbar-track { height: 8px; border-radius: 999px; background: var(--perf-track); overflow: hidden; }
.om-weightbar-track i { display: block; height: 100%; border-radius: 999px; background: var(--perf-grad-hero); transition: width 0.4s var(--perf-spring); }
.om-weightbar span { font-size: 10.5px; color: var(--perf-text-muted); line-height: 1.4; }
.om-weightbar b { color: var(--perf-text); font-weight: 800; }
.om-process.kr { margin-top: 0; }

/* main */
.om-main { position: relative; z-index: 1; display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.om-head { display: flex; align-items: center; gap: 11px; padding: 16px 18px 13px; border-bottom: 1px solid var(--perf-border); }
.om-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 12px; flex-shrink: 0; color: #1a1206; background: var(--perf-grad-hero); }
.om-titles { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.om-titles b { font-size: 16px; font-weight: 850; color: var(--perf-text); }
.om-titles span { font-size: 11.5px; color: var(--perf-text-muted); }
.om-x { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; cursor: pointer; color: var(--perf-text-muted); background: transparent; border: 1px solid var(--perf-border); transition: all 0.2s; }
.om-x:hover { color: var(--perf-text); transform: rotate(90deg); }

.om-steps { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 4px; padding: 13px 18px 11px; }
.om-steps-rail { position: absolute; left: 30px; right: 30px; top: 26px; height: 2px; border-radius: 2px; background: var(--perf-track); z-index: 0; }
.om-steps-fill { display: block; height: 100%; border-radius: 2px; background: var(--perf-grad-hero); transition: width 0.4s var(--perf-spring); }
.om-step { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; cursor: pointer; font: inherit; background: none; border: none; flex: 1; }
.om-step:disabled { cursor: default; }
.om-step-dot { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; color: var(--perf-text-muted);
  background: var(--perf-surface); border: 1px solid var(--perf-border); transition: all 0.25s var(--perf-spring); }
.om-step.on .om-step-dot { color: #1a1206; background: var(--perf-grad-hero); border-color: transparent; box-shadow: 0 0 16px -3px color-mix(in srgb, var(--perf-gold) 70%, transparent); transform: scale(1.1); }
.om-step.done .om-step-dot { color: var(--perf-ok); background: var(--perf-ok-soft); border-color: color-mix(in srgb, var(--perf-ok) 36%, transparent); }
.om-step-lab { font-size: 10px; font-weight: 750; color: var(--perf-text-muted); }
.om-step.on .om-step-lab { color: var(--perf-text); }

.om-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 16px 18px; }
.om-pane { display: flex; flex-direction: column; gap: 12px; }
.om-field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.om-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; }
.om-lab { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 700; color: var(--perf-text-secondary); }
.om-lab :deep(svg) { color: var(--perf-gold); }
.om-lab i { color: var(--perf-conflict); font-style: normal; } .om-lab i.opt { color: var(--perf-text-dim); font-weight: 500; }
.om-input { width: 100%; min-height: 42px; padding: 9px 12px; border-radius: 11px; font: inherit; font-size: 13px; resize: vertical;
  color: var(--hr-input-text, var(--perf-text)); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); transition: border-color 0.2s; }
.om-input:focus { outline: none; border-color: var(--perf-border-warm); }
.om-mini { min-height: 38px; font-size: 12px; padding: 6px 10px; }
.om-input[type="number"]::-webkit-outer-spin-button, .om-input[type="number"]::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.om-input[type="number"] { -moz-appearance: textfield; }
.om-hint { display: flex; align-items: flex-start; gap: 7px; margin: 0; padding: 9px 11px; border-radius: 11px; font-size: 11px; line-height: 1.45; color: var(--perf-text-muted); background: var(--perf-panel); border: 1px solid var(--perf-border); }
.om-hint :deep(svg) { color: var(--perf-gold); flex-shrink: 0; margin-top: 1px; }

.om-search { display: flex; align-items: center; gap: 8px; height: 42px; padding: 0 12px; border-radius: 11px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); }
.om-search :deep(svg) { color: var(--perf-text-muted); flex-shrink: 0; }
.om-search-in { flex: 1; min-width: 0; border: none; background: transparent; font: inherit; font-size: 13px; color: var(--perf-text); }
.om-search-in:focus { outline: none; }
.om-emps { display: flex; flex-direction: column; gap: 4px; max-height: 230px; overflow-y: auto; margin-top: 6px; padding: 4px; border-radius: 12px; background: var(--perf-panel); border: 1px solid var(--perf-border); }
.om-emps-load, .om-emps-empty { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 18px; font-size: 12px; color: var(--perf-text-muted); }
.om-emp { display: flex; align-items: center; gap: 10px; padding: 8px 9px; border-radius: 10px; cursor: pointer; text-align: left; font: inherit; background: transparent; border: 1px solid transparent; transition: background 0.16s, border-color 0.16s; }
.om-emp:hover { background: var(--perf-surface-elevated); border-color: var(--perf-border); }
.om-emp-av { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; font-size: 11px; font-weight: 800; color: #1a1206; background: var(--perf-grad-hero); }
.om-emp-av.lg { width: 38px; height: 38px; font-size: 13px; }
.om-emp-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.om-emp-txt b { font-size: 12.5px; font-weight: 700; color: var(--perf-text); }
.om-emp-txt span { font-size: 10.5px; color: var(--perf-text-dim); }
.om-emp-go { color: var(--perf-text-dim); flex-shrink: 0; }
.om-emp-chip { display: flex; align-items: center; gap: 11px; padding: 9px 11px; border-radius: 13px; background: color-mix(in srgb, var(--perf-gold) 9%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 28%, transparent); }
.om-emp-chip-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.om-emp-chip-txt b { font-size: 13px; color: var(--perf-text); }
.om-emp-chip-txt span { font-size: 10px; color: var(--perf-text-muted); }
.om-emp-chip button { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; cursor: pointer; color: var(--perf-text-muted); background: transparent; border: 1px solid var(--perf-border); }
.om-emp-chip button:hover { color: var(--perf-conflict); border-color: color-mix(in srgb, var(--perf-conflict) 30%, transparent); }

.om-kr-card { display: flex; flex-direction: column; gap: 9px; padding: 12px; border-radius: 13px; background: var(--perf-panel); border: 1px solid var(--perf-border); }
.om-kr-head { display: flex; align-items: center; gap: 8px; }
.om-kr-idx { width: 24px; height: 24px; flex-shrink: 0; border-radius: 8px; display: grid; place-items: center; font-size: 11px; font-weight: 800; color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 14%, transparent); }
.om-kr-title { flex: 1; }
.om-kr-rm { width: 32px; height: 32px; flex-shrink: 0; border-radius: 9px; display: grid; place-items: center; cursor: pointer; color: var(--perf-text-muted); background: transparent; border: 1px solid var(--perf-border); }
.om-kr-rm:hover { color: var(--perf-conflict); border-color: color-mix(in srgb, var(--perf-conflict) 30%, transparent); }
.om-kr-grid { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 8px; }
.om-measure { display: flex; flex-direction: column; gap: 4px; flex: 1 1 88px; min-width: 80px; }
.om-measure.m-metric { flex: 1.6 1 150px; min-width: 144px; }
.om-measure.m-grow { flex: 2 1 220px; }
.om-measure-cap { font-size: 9px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--perf-text-dim); padding-left: 2px; }
.om-measure-cap i { color: var(--perf-conflict); font-style: normal; }
.om-num { display: flex; align-items: center; gap: 5px; height: 38px; padding: 0 11px; border-radius: 11px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); transition: border-color 0.2s; }
.om-num:focus-within { border-color: var(--perf-border-warm); }
.om-num input { flex: 1; min-width: 0; border: none; background: none; outline: none; font: inherit; font-size: 12px; color: var(--perf-text); -moz-appearance: textfield; }
.om-num input::-webkit-outer-spin-button, .om-num input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.om-num i { font-style: normal; font-size: 11px; font-weight: 800; color: var(--perf-text-muted); }
.om-kr-binary { display: inline-flex; align-items: center; gap: 7px; height: 38px; padding: 0 13px; border-radius: 11px; font-size: 11.5px; font-weight: 650;
  color: var(--perf-ok); background: var(--perf-ok-soft); border: 1px solid color-mix(in srgb, var(--perf-ok) 28%, transparent); }
.om-kr-binary :deep(svg) { flex-shrink: 0; }
.om-kr-weight { display: inline-flex; align-items: center; gap: 7px; align-self: flex-start; font-size: 11px; color: var(--perf-text-muted); }
.om-kr-weight button { width: 24px; height: 24px; border-radius: 7px; cursor: pointer; font: inherit; font-size: 14px; font-weight: 800; color: var(--perf-text-secondary); background: var(--perf-surface-elevated); border: 1px solid var(--perf-border); }
.om-kr-weight button:hover { color: var(--perf-gold); border-color: var(--perf-border-warm); }
.om-kr-weight b { font-size: 13px; font-weight: 850; color: var(--perf-text); min-width: 14px; text-align: center; font-variant-numeric: tabular-nums; }
.om-addkr { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 10px; border-radius: 11px; cursor: pointer; font: inherit; font-size: 12.5px; font-weight: 700;
  color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 7%, transparent); border: 1px dashed var(--perf-border-warm); transition: all 0.18s; }
.om-addkr:hover { background: color-mix(in srgb, var(--perf-gold) 13%, transparent); }

.om-align { display: flex; align-items: flex-start; gap: 10px; padding: 12px 13px; border-radius: 13px; background: var(--perf-panel); border: 1px solid var(--perf-border); }
.om-align-ic { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 9px; flex-shrink: 0; color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 13%, transparent); }
.om-align p { margin: 0; font-size: 11.5px; line-height: 1.5; color: var(--perf-text-muted); }
.om-align b { color: var(--perf-text-secondary); font-weight: 750; }

.om-review { display: flex; flex-direction: column; gap: 1px; border-radius: 13px; overflow: hidden; border: 1px solid var(--perf-border); }
.om-rev-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 11px 13px; background: var(--perf-surface); }
.om-rev-row span { display: inline-flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--perf-text-muted); }
.om-rev-row span :deep(svg) { color: var(--perf-gold); }
.om-rev-row b { font-size: 13px; font-weight: 800; color: var(--perf-text); text-align: right; min-width: 0; overflow: hidden; text-overflow: ellipsis; }
.om-process { margin-top: 12px; padding: 13px; border-radius: 13px; background: color-mix(in srgb, var(--perf-ok) 7%, var(--perf-panel)); border: 1px solid color-mix(in srgb, var(--perf-ok) 22%, var(--perf-border)); }
.om-process-h { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: var(--perf-ok); }
.om-process ul { margin: 9px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 7px; }
.om-process li { display: flex; align-items: flex-start; gap: 7px; font-size: 11.5px; line-height: 1.45; color: var(--perf-text-secondary); }
.om-process li :deep(svg) { color: var(--perf-ok); flex-shrink: 0; margin-top: 2px; }
.om-process b { color: var(--perf-text); font-weight: 750; }

.om-foot { display: flex; align-items: center; gap: 9px; padding: 13px 18px; border-top: 1px solid var(--perf-border); }
.om-foot-grow { flex: 1; }

.om-slide-fwd-enter-active, .om-slide-fwd-leave-active, .om-slide-back-enter-active, .om-slide-back-leave-active { transition: opacity 0.26s var(--perf-ease), transform 0.26s var(--perf-spring); }
.om-slide-fwd-enter-from { opacity: 0; transform: translateX(16px); } .om-slide-fwd-leave-to { opacity: 0; transform: translateX(-12px); }
.om-slide-back-enter-from { opacity: 0; transform: translateX(-16px); } .om-slide-back-leave-to { opacity: 0; transform: translateX(12px); }

@media (max-width: 680px) {
  .om { grid-template-columns: 1fr; max-width: 520px; }
  .om.kr { grid-template-columns: 1fr; max-width: 520px; }
  .om-pass, .om-krpass { display: none; }
  .om-kr-grid { grid-template-columns: 1fr 1fr; }
  .om-seg { grid-template-columns: repeat(5, 1fr); }
}
@media (prefers-reduced-motion: reduce) {
  .om-x:hover { transform: none; } .om-pass-star, .om-krpass-dial-sheen, .om-krpass-now { animation: none; }
  .om-krpass-dial { transition: none; }
  .om-seg-btn:hover { transform: none; }
  .om-slide-fwd-enter-from, .om-slide-fwd-leave-to, .om-slide-back-enter-from, .om-slide-back-leave-to { transform: none; }
}
</style>
