<template>
  <teleport to="body">
    <Presence>
      <Motion v-if="open" key="ov" as="div" class="tpc-ov perf-scope" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
        :exit="{ opacity: 0 }" :transition="{ duration: 0.24 }" @click.self="$emit('close')">
        <Motion as="aside" class="tpc" :initial="reduced ? false : { x: 70, opacity: 0 }" :animate="{ x: 0, opacity: 1 }" :exit="{ x: 50, opacity: 0 }"
          :transition="{ duration: 0.46, ease: [0.16, 1, 0.3, 1] }">
          <span class="tpc-edge" aria-hidden="true" />
          <span class="tpc-aura" aria-hidden="true" />

          <!-- header -->
          <header class="tpc-head">
            <span class="tpc-av">{{ initials(r.employee_name) }}<span class="tpc-av-ring" :style="{ '--c': scoreColor }" /></span>
            <div class="tpc-head-id">
              <b>{{ r.employee_name || 'Report' }}</b>
              <span>{{ r.designation_name || '' }}{{ r.department_name ? ' · ' + r.department_name : '' }}</span>
            </div>
            <button class="tpc-x" type="button" @click="$emit('close')"><X :size="17" /></button>
          </header>

          <!-- facts strip -->
          <div class="tpc-facts">
            <span><CalendarRange :size="12" /> {{ r.period_label || r.cycle || '—' }}</span>
            <span v-if="r.template_name"><ClipboardList :size="12" /> {{ r.template_name }}</span>
            <span v-if="r.due_date"><Clock :size="12" /> due {{ fmtDate(r.due_date) }}</span>
            <span class="tpc-facts-stamp"><PerfStatusStamp v-if="r.status" :status="r.status" :label="stage.title" /></span>
          </div>

          <!-- workflow stepper -->
          <div class="tpc-steps">
            <div v-for="(p, i) in PIPELINE" :key="p.key" class="tpc-step" :class="stepClass(i)">
              <span class="tpc-step-dot"><component :is="p.icon" :size="11" /></span>
              <span class="tpc-step-lab">{{ p.label }}</span>
              <span v-if="i < PIPELINE.length - 1" class="tpc-step-beam" :class="{ lit: i < curStep }" />
            </div>
          </div>

          <div class="tpc-body">
            <div v-if="loading" class="tpc-load"><Loader2 :size="18" class="perf-spin" /> Loading…</div>
            <template v-else>
              <!-- what to do now -->
              <Motion as="div" class="tpc-guide" :style="{ '--c': stage.color }" v-bind="anim(0)">
                <span class="tpc-guide-ic"><component :is="stage.icon" :size="16" /></span>
                <div><b>{{ stage.title }}</b><p>{{ stage.desc }}</p></div>
              </Motion>

              <!-- live scorecard (updates as you rate) -->
              <Motion as="div" class="tpc-card" v-bind="anim(1)">
                <span class="tpc-card-spark" aria-hidden="true" />
                <div class="tpc-card-gauge" :style="{ '--perf-p': liveGaugeDeg + 'deg', '--c': liveColor }">
                  <div class="tpc-card-gauge-in">
                    <b v-if="liveManager != null"><SetCountUp :value="liveManager" :decimals="1" /></b><b v-else class="muted">—</b>
                    <span>/{{ max }}</span>
                  </div>
                </div>
                <div class="tpc-card-meta">
                  <span class="tpc-card-lab">{{ editable ? 'Live manager score' : 'Official score' }}</span>
                  <div class="tpc-card-chips">
                    <span class="tpc-card-chip" :style="{ '--c': liveColor }"><UserCheck :size="11" /> Manager {{ fmtScore(liveManager) }}</span>
                    <span class="tpc-card-chip ghost"><PencilRuler :size="11" /> Self {{ fmtScore(liveSelf) }}</span>
                    <span v-if="r.hike_status && r.hike_status !== 'NONE'" class="tpc-card-chip" :style="{ '--c': hikeMeta.color }">
                      <component :is="hikeMeta.icon" :size="11" /> {{ hikeMeta.label }}<template v-if="r.recommended_hike_pct != null"> · {{ r.recommended_hike_pct }}%</template>
                    </span>
                  </div>
                  <div v-if="editable" class="tpc-card-prog">
                    <span class="tpc-card-prog-bar"><span :style="{ width: progPct + '%' }" /></span>
                    <span class="tpc-card-prog-lab">{{ scoredCount }}/{{ sectionCount }} scored</span>
                  </div>
                </div>
              </Motion>

              <!-- ① context: reflection + the signals that pre-filled the score -->
              <template v-if="r.self_comments || (editable && (prefilled || basisList.length))">
                <div class="tpc-zone"><span class="tpc-zone-n">1</span> Context <span class="tpc-zone-line" /></div>
                <Motion as="div" class="tpc-reflect" :class="{ muted: !r.self_comments }" v-bind="anim(2)">
                  <div class="tpc-reflect-h"><MessageSquareText :size="13" /> Employee reflection</div>
                  <p v-if="r.self_comments">{{ r.self_comments }}</p>
                  <p v-else class="tpc-empty">No reflection submitted — optional, employee-written context.</p>
                </Motion>
                <Motion v-if="editable && (prefilled || basisList.length)" as="div" class="tpc-signals" v-bind="anim(3)">
                  <div class="tpc-signals-h"><Sparkles :size="13" /> Signals behind the pre-fill</div>
                  <p v-if="prefilled" class="tpc-signals-note">Pre-filled from goals, attendance, 360° and last cycle — adjust freely; you own the score.</p>
                  <div v-for="b in basisList" :key="b.key" class="tpc-basis-row"><b>{{ b.title }}</b><span>{{ b.basis }}</span><em>{{ b.suggested_rating }}/{{ r.rating_max }}</em></div>
                </Motion>
              </template>

              <!-- ② score each section -->
              <div class="tpc-zone"><span class="tpc-zone-n">2</span> {{ editable ? 'Score each section' : 'Scores' }} <span class="tpc-zone-line" /></div>
              <Motion as="div" v-bind="anim(4)">
                <PerfScoreSheet :draft="draft" :role="scoreRole" :rating-max="r.rating_max" :rating-labels="r.rating_labels" :show-overall="false" :suggestions="suggestions" />
              </Motion>

              <!-- governance: justify any score raised above the suggested baseline -->
              <Transition name="tpc-fade">
                <div v-if="editable && unjustified.length" class="tpc-warn">
                  <AlertTriangle :size="15" />
                  <span><b>{{ unjustified.length }}</b> section{{ unjustified.length > 1 ? 's' : '' }} rated above the suggested score. Add a reason in the note to complete the review.</span>
                </div>
              </Transition>

              <!-- ③ increment -->
              <Transition name="tpc-fade">
                <div v-if="canRecommend">
                  <div class="tpc-zone"><span class="tpc-zone-n">3</span> Increment <span class="tpc-zone-line" /></div>
                  <div class="tpc-hike">
                    <div class="tpc-hike-h"><Coins :size="14" /> Recommend an increment</div>
                    <div v-if="merit.band" class="tpc-band" :style="{ '--bc': bandTone(merit.band.key) }">
                      <div class="tpc-band-id"><b>{{ merit.band.label }}</b><span>score {{ merit.score != null ? merit.score.toFixed(1) : '—' }}/{{ merit.rating_max }} · {{ merit.source === 'calibration' ? 'calibrated' : 'manager' }}</span></div>
                      <span class="tpc-band-rng">{{ merit.hike_min_pct }}–{{ merit.hike_max_pct }}%</span>
                    </div>
                    <p v-else class="tpc-empty">No merit band resolved — ensure a merit policy is active.</p>
                    <template v-if="merit.band && merit.hike_max_pct > 0">
                      <div class="tpc-slider">
                        <input type="range" :min="merit.hike_min_pct" :max="merit.hike_max_pct" step="0.5" v-model.number="hikePct"
                          :style="{ '--fill': fillPct + '%', '--bc': bandTone(merit.band.key) }" />
                        <div class="tpc-slider-val" :style="{ color: bandTone(merit.band.key) }">{{ hikePct }}%</div>
                      </div>
                      <div class="tpc-slider-ends"><span>min {{ merit.hike_min_pct }}%</span><span>max {{ merit.hike_max_pct }}%</span></div>
                    </template>
                    <div v-else-if="merit.band" class="tpc-nohike"><Info :size="13" /> This band carries no increment.</div>
                    <textarea v-model="recNote" class="tpc-note" rows="2" placeholder="Justification for HR (optional but recommended)…" />
                  </div>
                </div>
              </Transition>

              <!-- ③ increment — locked until the review is completed -->
              <template v-if="editable">
                <div class="tpc-zone"><span class="tpc-zone-n">3</span> Increment <span class="tpc-zone-line" /></div>
                <div class="tpc-locked">
                  <span class="tpc-locked-ic"><Lock :size="15" /></span>
                  <div>
                    <b>Recommend an increment</b>
                    <p>Unlocks once you <em>complete the review</em>. The hike is then bounded by the merit band for the final score and routed to HR for budget approval.</p>
                  </div>
                </div>
              </template>
            </template>
          </div>

          <footer class="tpc-foot">
            <span class="tpc-grow" />
            <template v-if="editable">
              <button class="perf-btn" :disabled="!!saving" @click="save(false)">
                <Loader2 v-if="saving === 'draft'" :size="14" class="perf-spin" /><Check v-else :size="14" /> Save draft
              </button>
              <button class="perf-btn perf-btn-primary" :disabled="!!saving || !canComplete" @click="save(true)"
                :title="completeHint">
                <Loader2 v-if="saving === 'complete'" :size="14" class="perf-spin" /><CheckCircle2 v-else :size="14" /> Complete review
              </button>
            </template>
            <button v-if="canRecommend && merit.band && merit.hike_max_pct > 0" class="perf-btn perf-btn-primary" :disabled="!!saving" @click="recommend">
              <Loader2 v-if="saving === 'rec'" :size="14" class="perf-spin" /><Send v-else :size="14" />
              {{ r.hike_status === 'RECOMMENDED' ? 'Update recommendation' : 'Recommend to HR' }}
            </button>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </teleport>
</template>

<script setup>
import { reactive, ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  X, Loader2, Check, CheckCircle2, Send, Coins, CalendarRange, Clock,
  ClipboardList, MessageSquareText, Sparkles, Info, UserCheck, PencilRuler, Lock, AlertTriangle,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import PerfScoreSheet from './PerfScoreSheet.vue'
import PerfStatusStamp from './PerfStatusStamp.vue'
import SetCountUp from '../../settings/components/SetCountUp.vue'
import {
  scoreTone, bandTone, hikeStatusMeta, statusMeta, PIPELINE, STATUS_ORDER,
  fetchMyReview, fetchTeamSuggestions, submitManagerAssessment, recommendHikeManager,
} from '@/composables/usePerformance'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  open: { type: Boolean, default: false },
  review: { type: Object, default: null },
})
const emit = defineEmits(['close', 'mutated'])
const toast = useToast()
const reduced = prefersReduced()

const r = reactive({})
const draft = reactive({ sections: [], self_comments: '', manager_comments: '' })
const suggestions = ref([])
const merit = ref({})
const loading = ref(false)
const saving = ref(false)
const prefilled = ref(false)
const hikePct = ref(0)
const recNote = ref('')
const clone = (x) => JSON.parse(JSON.stringify(x || []))
const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?'
const fmtDate = (d) => { try { return new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) } catch { return d } }
const anim = (i) => reduced ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.38, delay: 0.06 + i * 0.055, ease: [0.16, 1, 0.3, 1] } }

const max = computed(() => r.rating_max || 5)
const scoreColor = computed(() => scoreTone(r.overall_score, max.value))
const editable = computed(() => ['DRAFT', 'SELF_ASSESSMENT', 'MANAGER_ASSESSMENT'].includes(r.status))

// live weighted score from the working draft (so the scorecard moves as you rate)
const fmtScore = (v) => v == null ? '—' : Number(v).toFixed(1)
const weightedDraft = (field) => {
  let num = 0, den = 0, flat = []
  for (const s of draft.sections || []) {
    const v = s[field]; if (v == null) continue
    const w = Number(s.weight) || 0; flat.push(Number(v)); num += w * Number(v); den += w
  }
  if (den > 0) return Math.round((num / den) * 100) / 100
  if (flat.length) return Math.round((flat.reduce((a, b) => a + b, 0) / flat.length) * 100) / 100
  return null
}
const liveManager = computed(() => editable.value ? weightedDraft('manager_rating') : (r.overall_score ?? null))
const liveSelf = computed(() => weightedDraft('self_rating'))
const liveColor = computed(() => scoreTone(liveManager.value, max.value))
const liveGaugeDeg = computed(() => liveManager.value != null ? Math.round((liveManager.value / max.value) * 360) : 0)
const sectionCount = computed(() => (draft.sections || []).length)
const scoredCount = computed(() => (draft.sections || []).filter(s => s.manager_rating != null).length)
const progPct = computed(() => sectionCount.value ? Math.round((scoredCount.value / sectionCount.value) * 100) : 0)
const allScored = computed(() => sectionCount.value > 0 && scoredCount.value === sectionCount.value)

// governance: a manager who rates ABOVE the suggested baseline must justify it in the
// section note. Baseline = the rounded suggested_rating (what was pre-filled).
const suggBase = computed(() => {
  const m = {}
  for (const s of suggestions.value || []) {
    if (s && s.key != null && s.suggested_rating != null) m[s.key] = Math.round(Number(s.suggested_rating))
  }
  return m
})
const unjustified = computed(() => (draft.sections || []).filter(s => {
  const base = s.key in suggBase.value ? suggBase.value[s.key] : null
  return base != null && s.manager_rating != null && s.manager_rating > base && !((s.manager_comment || '').trim())
}))
const canComplete = computed(() => allScored.value && unjustified.value.length === 0)
const completeHint = computed(() => {
  if (!allScored.value) return `Score all ${sectionCount.value} sections to complete`
  if (unjustified.value.length) return 'Add a reason for every score raised above the suggestion'
  return ''
})
const scoreRole = computed(() => editable.value ? 'manager' : 'view')
const canRecommend = computed(() => ['COMPLETED', 'ACKNOWLEDGED'].includes(r.status) && r.hike_status !== 'APPLIED')
const hikeMeta = computed(() => hikeStatusMeta(r.hike_status))
const fillPct = computed(() => {
  const lo = Number(merit.value.hike_min_pct) || 0, hi = Number(merit.value.hike_max_pct) || 0
  if (hi <= lo) return 100
  return Math.round(((hikePct.value - lo) / (hi - lo)) * 100)
})
const basisList = computed(() => suggestions.value.filter(s => s.suggested_rating != null && s.basis))
const curStep = computed(() => STATUS_ORDER.indexOf(r.status))
const stepClass = (i) => {
  if (r.status === 'CANCELLED') return 'cancel'
  if (i < curStep.value) return 'done'
  if (i === curStep.value) return 'active'
  return ''
}

// manager-context stage guidance (never says "self review")
const STAGE = {
  DRAFT: { title: 'Draft', color: 'var(--perf-unset)', icon: ClipboardList, desc: 'Open for scoring — rate each section to set the official rating.' },
  SELF_ASSESSMENT: { title: 'Awaiting your review', color: 'var(--perf-amber)', icon: MessageSquareText, desc: 'Your report can add an optional reflection. Score each section — you own the rating; they never self-rate.' },
  MANAGER_ASSESSMENT: { title: 'Your review', color: 'var(--perf-orange)', icon: CheckCircle2, desc: 'Rate each section. Submitting computes the weighted overall and completes the review.' },
  COMPLETED: { title: 'Completed', color: 'var(--perf-gold)', icon: Coins, desc: 'The score is locked. Recommend an increment within the merit band — HR approves it against budget.' },
  ACKNOWLEDGED: { title: 'Acknowledged', color: 'var(--perf-ok)', icon: Check, desc: 'Your report has signed off. You can still recommend a hike if one is pending.' },
  CANCELLED: { title: 'Cancelled', color: 'var(--perf-conflict)', icon: X, desc: 'This review was withdrawn by HR.' },
}
const stage = computed(() => STAGE[r.status] || STAGE.MANAGER_ASSESSMENT)

function hydrate(src) {
  Object.keys(r).forEach(k => delete r[k]); Object.assign(r, src || {})
  draft.sections = clone(src?.sections)
  draft.self_comments = src?.self_comments || ''
  draft.manager_comments = src?.manager_comments || ''
  recNote.value = src?.recommendation_note || ''
}
function applySuggestions() {
  const byKey = {}
  for (const s of suggestions.value) byKey[s.key] = s
  let applied = 0
  for (const sec of draft.sections) {
    const sug = byKey[sec.key]
    if (sug && sug.suggested_rating != null && sec.manager_rating == null) { sec.manager_rating = Math.round(sug.suggested_rating); applied++ }
  }
  prefilled.value = applied > 0
}
function seedHike() {
  const lo = Number(merit.value.hike_min_pct) || 0, hi = Number(merit.value.hike_max_pct) || 0
  if (r.recommended_hike_pct != null) hikePct.value = Number(r.recommended_hike_pct)
  else if (merit.value.band) hikePct.value = Math.round(((lo + hi) / 2) * 2) / 2
}
async function loadConsole() {
  if (!props.review?.id) return
  loading.value = true; prefilled.value = false
  try {
    const full = await fetchMyReview(props.review.id); hydrate(full)
    try { const s = await fetchTeamSuggestions(props.review.id); suggestions.value = s.suggestions || []; merit.value = s.merit || {} }
    catch { suggestions.value = []; merit.value = {} }
    if (editable.value) applySuggestions()
    seedHike()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load review') }
  finally { loading.value = false }
}
watch(() => props.open, (v) => { if (v) loadConsole() })

async function refreshMerit() {
  try { const s = await fetchTeamSuggestions(props.review.id); suggestions.value = s.suggestions || []; merit.value = s.merit || {}; seedHike() } catch {}
}
async function save(complete) {
  saving.value = complete ? 'complete' : 'draft'
  try {
    const payload = {
      sections: draft.sections.map(s => ({ key: s.key, rating: s.manager_rating ?? null, comment: s.manager_comment ?? null })),
      comments: draft.manager_comments, submit: complete,
    }
    const updated = await submitManagerAssessment(r.id, payload); hydrate(updated); emit('mutated', updated)
    toast.success(complete ? 'Review completed' : 'Saved')
    if (complete) await refreshMerit()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to save') } finally { saving.value = false }
}
async function recommend() {
  saving.value = 'rec'
  try {
    const updated = await recommendHikeManager(r.id, { hike_pct: Number(hikePct.value), note: recNote.value || null })
    hydrate(updated); emit('mutated', updated); toast.success('Hike recommended to HR')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not recommend') } finally { saving.value = false }
}
</script>

<style scoped>
.tpc-ov { position: fixed; inset: 0; z-index: 1300; display: flex; justify-content: flex-end; background: rgba(5, 5, 6, 0.62); backdrop-filter: blur(11px); }
.tpc { position: relative; width: min(580px, 100%); height: 100%; display: flex; flex-direction: column; overflow: hidden; background: var(--perf-surface-elevated); border-left: 1px solid var(--perf-border-strong); box-shadow: -34px 0 90px -42px rgba(0,0,0,0.92); }
.tpc-edge { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--perf-grad-hero); z-index: 3; }
.tpc-aura { position: absolute; top: -120px; right: -80px; width: 320px; height: 320px; border-radius: 50%; background: radial-gradient(circle, color-mix(in srgb, var(--perf-gold) 22%, transparent), transparent 70%); filter: blur(50px); pointer-events: none; }
.tpc-head { position: relative; z-index: 1; display: flex; align-items: center; gap: 11px; padding: 16px 18px 12px; border-bottom: 1px solid var(--perf-border); }
.tpc-av { position: relative; display: grid; place-items: center; width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; font-size: 13px; font-weight: 850; color: #1a1206; background: var(--perf-grad-hero); }
.tpc-av-ring { position: absolute; inset: -3px; border-radius: 50%; border: 1.5px solid color-mix(in srgb, var(--c) 65%, transparent); }
.tpc-head-id { flex: 1; min-width: 0; }
.tpc-head-id b { display: block; font-size: 15px; font-weight: 850; color: var(--perf-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tpc-head-id span { font-size: 11px; color: var(--perf-text-muted); }
.tpc-x { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; flex-shrink: 0; cursor: pointer; color: var(--perf-text-muted); background: transparent; border: 1px solid var(--perf-border); transition: all 0.2s; }
.tpc-x:hover { color: var(--perf-text); transform: rotate(90deg); }
.tpc-facts { position: relative; z-index: 1; display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 10px 18px; border-bottom: 1px solid var(--perf-border); }
.tpc-facts span { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--perf-text-muted); }
.tpc-facts :deep(svg) { color: var(--perf-text-dim); }
.tpc-facts-stamp { margin-left: auto; }

/* stepper */
.tpc-steps { display: flex; align-items: center; padding: 13px 18px; border-bottom: 1px solid var(--perf-border); gap: 0; }
.tpc-step { position: relative; display: flex; flex-direction: column; align-items: center; gap: 5px; flex: 1; }
.tpc-step-dot { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; color: var(--perf-text-dim); background: var(--perf-panel); border: 1px solid var(--perf-border); transition: all 0.3s var(--perf-spring); z-index: 1; }
.tpc-step-lab { font-size: 9.5px; font-weight: 700; color: var(--perf-text-dim); text-align: center; }
.tpc-step-beam { position: absolute; top: 13px; left: 50%; width: 100%; height: 2px; background: var(--perf-border); z-index: 0; }
.tpc-step-beam.lit { background: var(--perf-gold); box-shadow: 0 0 8px color-mix(in srgb, var(--perf-gold) 60%, transparent); }
.tpc-step.done .tpc-step-dot { color: var(--perf-gold); border-color: var(--perf-gold); }
.tpc-step.active .tpc-step-dot { color: #1a1206; background: var(--perf-grad-hero); border-color: transparent; box-shadow: 0 0 0 4px color-mix(in srgb, var(--perf-gold) 16%, transparent); }
.tpc-step.active .tpc-step-lab { color: var(--perf-text); }
.tpc-step.cancel .tpc-step-dot { color: var(--perf-conflict); }

.tpc-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 15px 18px; display: flex; flex-direction: column; gap: 13px; position: relative; z-index: 1; }
/* in a scrolling flex column, children must NOT shrink — otherwise the scorecard
   gets compressed below its content height and clips (label + progress cut off). */
.tpc-body > * { flex-shrink: 0; }
.tpc-load { display: flex; align-items: center; justify-content: center; gap: 9px; padding: 40px; color: var(--perf-text-muted); font-size: 13px; }

.tpc-guide { display: flex; align-items: flex-start; gap: 10px; padding: 12px 13px; border-radius: 12px; color: var(--perf-text-secondary);
  background: color-mix(in srgb, var(--c) 9%, transparent); border: 1px solid color-mix(in srgb, var(--c) 24%, transparent); }
.tpc-guide-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); }
.tpc-guide b { font-size: 12.5px; font-weight: 800; color: var(--perf-text); }
.tpc-guide p { margin: 2px 0 0; font-size: 11.5px; line-height: 1.45; }

/* zone dividers — give the body clear numbered structure */
.tpc-zone { display: flex; align-items: center; gap: 9px; margin-top: 3px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase; color: var(--perf-text-muted); }
.tpc-zone-n { display: grid; place-items: center; width: 18px; height: 18px; border-radius: 6px; flex-shrink: 0; font-size: 10px; color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 14%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 26%, transparent); }
.tpc-zone-line { flex: 1; height: 1px; background: var(--perf-border); }

/* live scorecard */
.tpc-card { position: relative; overflow: hidden; display: flex; align-items: center; gap: 15px; padding: 15px 16px; border-radius: 16px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--perf-gold) 8%, var(--perf-surface)), var(--perf-surface)); border: 1px solid var(--perf-border-warm); }
.tpc-card-spark { position: absolute; top: -40%; left: -40%; width: 55%; height: 180%; transform: skewX(-16deg); pointer-events: none;
  background: linear-gradient(100deg, transparent, color-mix(in srgb, var(--perf-gold) 16%, transparent), transparent); animation: tpc-sweep 5.5s ease-in-out infinite; }
.tpc-card-gauge { position: relative; width: 72px; height: 72px; border-radius: 50%; flex-shrink: 0;
  background: conic-gradient(var(--c) var(--perf-p, 0deg), var(--perf-track) 0); transition: --perf-p 0.9s var(--perf-spring);
  filter: drop-shadow(0 0 12px color-mix(in srgb, var(--c) 32%, transparent)); }
.tpc-card-gauge-in { position: absolute; inset: 5px; border-radius: 50%; background: var(--perf-surface-elevated); display: flex; flex-direction: column; align-items: center; justify-content: center; }
.tpc-card-gauge-in b { font-size: 22px; font-weight: 850; color: var(--perf-text); line-height: 1; font-variant-numeric: tabular-nums; }
.tpc-card-gauge-in b.muted { color: var(--perf-text-dim); }
.tpc-card-gauge-in span { font-size: 9px; color: var(--perf-text-muted); }
.tpc-card-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 7px; }
.tpc-card-lab { font-size: 10px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--perf-gold); }
.tpc-card-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.tpc-card-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 800; padding: 3px 9px; border-radius: 999px; font-variant-numeric: tabular-nums;
  color: var(--c, var(--perf-text)); background: color-mix(in srgb, var(--c, var(--perf-gold)) 13%, transparent); border: 1px solid color-mix(in srgb, var(--c, var(--perf-gold)) 24%, transparent); }
.tpc-card-chip.ghost { color: var(--perf-text-muted); background: var(--perf-panel); border-color: var(--perf-border); }
.tpc-card-chip :deep(svg) { flex-shrink: 0; }
.tpc-card-prog { display: flex; align-items: center; gap: 9px; }
.tpc-card-prog-bar { flex: 1; height: 5px; border-radius: 999px; background: var(--perf-track); overflow: hidden; }
.tpc-card-prog-bar span { display: block; height: 100%; border-radius: inherit; background: var(--perf-grad-hero); transition: width 0.5s var(--perf-spring); }
.tpc-card-prog-lab { font-size: 10px; font-weight: 700; color: var(--perf-text-muted); white-space: nowrap; }
@keyframes tpc-sweep { 0% { left: -45%; } 55%, 100% { left: 130%; } }

.tpc-reflect { padding: 12px 13px; border-radius: 12px; background: var(--perf-surface); border: 1px solid var(--perf-border); }
.tpc-reflect-h { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.03em; text-transform: uppercase; color: var(--perf-text-muted); margin-bottom: 7px; }
.tpc-reflect-h :deep(svg) { color: var(--perf-gold); }
.tpc-reflect p { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--perf-text-secondary); white-space: pre-wrap; }
.tpc-empty { color: var(--perf-text-dim) !important; font-style: italic; }

.tpc-signals { padding: 11px 13px; border-radius: 12px; background: color-mix(in srgb, var(--perf-gold) 6%, var(--perf-panel)); border: 1px solid color-mix(in srgb, var(--perf-gold) 22%, transparent); }
.tpc-signals-h { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--perf-text-secondary); margin-bottom: 7px; }
.tpc-signals-h :deep(svg) { color: var(--perf-gold); }
.tpc-signals-note { margin: 0 0 8px; font-size: 11.5px; line-height: 1.45; color: var(--perf-text-secondary); }
.tpc-basis-row { display: flex; align-items: center; gap: 8px; padding: 4px 0; font-size: 11.5px; }
.tpc-basis-row b { color: var(--perf-text-secondary); font-weight: 700; min-width: 88px; }
.tpc-basis-row span { flex: 1; color: var(--perf-text-muted); }
.tpc-basis-row em { font-style: normal; font-weight: 800; color: var(--perf-gold); font-variant-numeric: tabular-nums; }

.tpc-hike { padding: 14px 15px; border-radius: 14px; background: var(--perf-surface); border: 1px solid var(--perf-border-warm); display: flex; flex-direction: column; gap: 11px; }
.tpc-hike-h { display: inline-flex; align-items: center; gap: 7px; font-size: 13px; font-weight: 800; color: var(--perf-text); }
.tpc-hike-h :deep(svg) { color: var(--perf-gold); }
.tpc-band { display: flex; align-items: center; gap: 10px; padding: 9px 11px; border-radius: 11px; background: var(--perf-panel); border: 1px solid var(--perf-border); border-left: 3px solid var(--bc); }
.tpc-band-id { flex: 1; min-width: 0; }
.tpc-band-id b { display: block; font-size: 12.5px; font-weight: 800; color: var(--bc); }
.tpc-band-id span { font-size: 10.5px; color: var(--perf-text-muted); }
.tpc-band-rng { font-size: 12px; font-weight: 800; color: var(--bc); font-variant-numeric: tabular-nums; }
.tpc-slider { display: flex; align-items: center; gap: 12px; }
.tpc-slider input[type=range] { flex: 1; appearance: none; height: 6px; border-radius: 999px; background: linear-gradient(90deg, var(--bc) var(--fill, 50%), var(--perf-track) var(--fill, 50%)); outline: none; }
.tpc-slider input[type=range]::-webkit-slider-thumb { appearance: none; width: 18px; height: 18px; border-radius: 50%; background: var(--bc); cursor: pointer; border: 3px solid var(--perf-surface-elevated); box-shadow: 0 2px 8px rgba(0,0,0,0.4); }
.tpc-slider input[type=range]::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: var(--bc); cursor: pointer; border: 3px solid var(--perf-surface-elevated); }
.tpc-slider-val { font-size: 21px; font-weight: 850; font-variant-numeric: tabular-nums; min-width: 58px; text-align: right; }
.tpc-slider-ends { display: flex; justify-content: space-between; font-size: 10px; color: var(--perf-text-dim); font-variant-numeric: tabular-nums; margin-top: -4px; }
.tpc-nohike { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--perf-text-muted); }
.tpc-nohike :deep(svg) { color: var(--perf-text-dim); }
.tpc-note { width: 100%; box-sizing: border-box; resize: vertical; font: inherit; font-size: 12.5px; color: var(--perf-text); background: var(--perf-panel); border: 1px solid var(--perf-border-strong); border-radius: 10px; padding: 9px 11px; }
.tpc-note:focus { outline: none; border-color: var(--perf-gold); }

.tpc-warn { display: flex; align-items: flex-start; gap: 9px; padding: 11px 13px; border-radius: 12px; font-size: 11.5px; line-height: 1.45; color: var(--perf-text-secondary);
  background: var(--perf-conflict-soft); border: 1px solid color-mix(in srgb, var(--perf-conflict) 32%, transparent); }
.tpc-warn :deep(svg) { color: var(--perf-conflict); flex-shrink: 0; margin-top: 1px; }
.tpc-warn b { color: var(--perf-text); }

.tpc-locked { display: flex; align-items: flex-start; gap: 11px; padding: 13px 14px; border-radius: 14px; border: 1px dashed var(--perf-border-strong); background: var(--perf-panel); }
.tpc-locked-ic { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0; color: var(--perf-text-muted); background: var(--perf-track); }
.tpc-locked b { font-size: 12.5px; font-weight: 800; color: var(--perf-text-secondary); }
.tpc-locked p { margin: 3px 0 0; font-size: 11.5px; line-height: 1.45; color: var(--perf-text-muted); }
.tpc-locked em { font-style: normal; font-weight: 700; color: var(--perf-gold); }

.tpc-foot { position: relative; z-index: 1; display: flex; align-items: center; gap: 8px; padding: 13px 18px; border-top: 1px solid var(--perf-border); flex-wrap: wrap; }
.tpc-grow { flex: 1; }
.tpc-fade-enter-active, .tpc-fade-leave-active { transition: opacity 0.25s, transform 0.25s; }
.tpc-fade-enter-from { opacity: 0; transform: translateY(8px); }

@media (max-width: 580px) { .tpc { width: 100%; } }
@media (prefers-reduced-motion: reduce) {
  .tpc-x:hover { transform: none; }
  .tpc-card-gauge { transition: none; }
  .tpc-card-spark { animation: none; display: none; }
  .tpc-card-prog-bar span { transition: none; }
}
</style>
