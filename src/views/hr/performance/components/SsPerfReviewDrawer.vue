<template>
  <teleport to="body">
    <Presence>
      <Motion v-if="open" key="ov" as="div" class="sd-ov perf-scope" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
        :exit="{ opacity: 0 }" :transition="{ duration: 0.22 }" @click.self="$emit('close')">
        <Motion as="aside" class="sd" :class="{ reduced }" :initial="reduced ? false : { x: 64, opacity: 0 }" :animate="{ x: 0, opacity: 1 }" :exit="{ x: 44, opacity: 0 }"
          :transition="{ duration: 0.44, ease: [0.16, 1, 0.3, 1] }">
          <span class="sd-edge" aria-hidden="true" />
          <span class="sd-aura" aria-hidden="true" />

          <!-- header -->
          <header class="sd-head">
            <div class="sd-head-id">
              <b>{{ context === 'manager' ? r.employee_name : (r.template_name || 'Review') }}</b>
              <span>{{ r.period_label || cycleLabel }}</span>
            </div>
            <PerfStatusStamp :status="r.status" />
            <button class="sd-x" type="button" @click="$emit('close')"><X :size="17" /></button>
          </header>

          <!-- workflow stepper -->
          <div class="sd-steps">
            <div v-for="(p, i) in PIPELINE" :key="p.key" class="sd-step" :class="stepClass(i)">
              <span class="sd-step-dot"><component :is="p.icon" :size="11" /></span>
              <span class="sd-step-lab">{{ p.label }}</span>
              <span v-if="i < PIPELINE.length - 1" class="sd-step-beam" :class="{ lit: i < curStep }" />
            </div>
          </div>

          <div class="sd-body">
            <!-- scorecard -->
            <Motion as="div" class="sd-card" v-bind="anim(0)">
              <span class="sd-card-spark" aria-hidden="true" />
              <div class="sd-gauge" :style="{ '--perf-p': gaugeDeg + 'deg', '--c': scoreColor }">
                <div class="sd-gauge-in">
                  <b v-if="r.overall_score != null"><SetCountUp :value="r.overall_score" :decimals="1" /></b><b v-else class="muted">—</b>
                  <span>/{{ max }}</span>
                </div>
              </div>
              <div class="sd-card-meta">
                <span class="sd-card-lab">{{ scored ? 'Your official score' : 'Awaiting your manager\'s score' }}</span>
                <div class="sd-card-chips">
                  <span v-if="bandLabel" class="sd-chip" :style="{ '--c': bandTone(r.final_rating_band) }"><Award :size="11" /> {{ bandLabel }}</span>
                  <span v-if="scored" class="sd-chip ghost">{{ scoreWord }}</span>
                </div>
                <p class="sd-card-hint">{{ hint }}</p>
              </div>
            </Motion>

            <!-- reporting manager — always visible so the employee knows who owns their review -->
            <Motion v-if="context === 'self'" as="div" class="sd-reviewer" v-bind="anim(1)">
              <span class="sd-reviewer-av">{{ reviewerInitials }}</span>
              <div class="sd-reviewer-txt">
                <em>Reporting manager · reviewer</em>
                <b>{{ r.reviewer_name || 'Not yet assigned' }}</b>
              </div>
              <span class="sd-reviewer-tag"><UserCheck :size="12" /> Owns your score</span>
            </Motion>

            <!-- increment outcome — only reveal the exact % once APPLIED -->
            <Motion v-if="hasAppliedHike" as="div" class="sd-hike applied" v-bind="anim(2)">
              <div class="sd-hike-h"><Coins :size="14" /> Your increment</div>
              <div class="sd-hike-body">
                <span class="sd-hike-pct"><SetCountUp :value="appliedPct" :decimals="appliedPct % 1 ? 1 : 0" suffix="%" /></span>
                <div class="sd-hike-meta">
                  <span v-if="bandLabel" class="sd-chip" :style="{ '--c': bandTone(r.final_rating_band) }"><Award :size="11" /> {{ bandLabel }}</span>
                  <span v-if="r.hike_effective_from" class="sd-hike-eff"><CalendarRange :size="11" /> Effective {{ fmtDate(r.hike_effective_from) }}</span>
                </div>
              </div>
            </Motion>
            <Motion v-else-if="hikePending" as="div" class="sd-hike pending" v-bind="anim(2)">
              <span class="sd-hike-ic"><Coins :size="14" /></span>
              <div><b>An increment recommendation is with HR</b><p>Your manager has put forward a raise for this review. The final amount is confirmed once HR approves it against budget.</p></div>
            </Motion>

            <!-- ① your reflection (employee-written context) -->
            <Motion v-if="context === 'self'" as="div" class="sd-reflect" v-bind="anim(3)">
              <div class="sd-reflect-head"><MessageSquareText :size="13" /> <b>Your reflection</b> <span>optional · shared with your manager</span></div>
              <textarea v-if="reflectEditable" v-model="draft.self_comments" class="sd-reflect-ta" rows="4"
                placeholder="Share context on your period — wins, challenges, what you want to grow. This isn't a rating; your manager writes the assessment." />
              <p v-else-if="draft.self_comments" class="sd-reflect-ro">{{ draft.self_comments }}</p>
              <p v-else class="sd-reflect-empty">No reflection added{{ reflectEditable ? ' yet — add one above.' : '.' }}</p>
            </Motion>

            <!-- ② manager's assessment — FIRST-CLASS: the employee always sees their reporting
                 manager's verdict (or a clear "awaiting" state), never just their own input. -->
            <Motion v-if="context === 'self'" as="div" class="sd-verdict" :class="{ awaiting: !r.manager_comments }" v-bind="anim(4)">
              <div class="sd-verdict-head">
                <span class="sd-verdict-av">{{ reviewerInitials }}</span>
                <div class="sd-verdict-who"><b>{{ r.reviewer_name || 'Your reporting manager' }}</b><em>Manager's assessment</em></div>
                <component :is="r.manager_comments ? CheckCircle2 : Clock" :size="15" class="sd-verdict-mark" />
              </div>
              <p v-if="r.manager_comments" class="sd-verdict-body">{{ r.manager_comments }}</p>
              <p v-else class="sd-verdict-await">{{ mgrAwaitMsg }}</p>
            </Motion>

            <!-- acknowledgement note (dedicated field — not the reflection) -->
            <Motion v-if="context === 'self' && (r.status === 'COMPLETED' || (r.status === 'ACKNOWLEDGED' && r.ack_comments))" as="div" class="sd-ack" v-bind="anim(5)">
              <div class="sd-ack-head"><BadgeCheck :size="13" /> {{ r.status === 'ACKNOWLEDGED' ? 'Your acknowledgement' : 'Acknowledge this review' }}</div>
              <textarea v-if="r.status === 'COMPLETED'" v-model="ackNote" class="sd-ack-ta" rows="2"
                placeholder="Optional note for the record — your agreement, a comment, or a follow-up you'd like to raise. Sign off with Acknowledge below." />
              <p v-else class="sd-ack-ro">{{ r.ack_comments }}</p>
            </Motion>

            <!-- score breakdown -->
            <div class="sd-zone"><span class="sd-zone-n"><ClipboardList :size="12" /></span> Section scores <span class="sd-zone-line" /></div>
            <Motion as="div" v-bind="anim(6)">
              <PerfScoreSheet :draft="draft" :role="role" :rating-max="r.rating_max" :rating-labels="r.rating_labels" :show-overall="false" />
            </Motion>

            <!-- timeline -->
            <template v-if="timeline.length">
              <div class="sd-zone"><span class="sd-zone-n"><Clock :size="12" /></span> Timeline <span class="sd-zone-line" /></div>
              <Motion as="div" class="sd-timeline" v-bind="anim(7)">
                <div v-for="(ev, i) in timeline" :key="ev.k" class="sd-tl" :style="{ '--i': i }">
                  <span class="sd-tl-dot"><component :is="ev.icon" :size="11" /></span>
                  <div class="sd-tl-txt"><b>{{ ev.label }}</b><span>{{ fmtDateTime(ev.at) }}</span></div>
                </div>
              </Motion>
            </template>
          </div>

          <footer v-if="footerActions.length" class="sd-foot">
            <span class="sd-grow" />
            <Motion v-for="a in footerActions" :key="a.label" as="button" class="perf-btn" :class="a.primary ? 'perf-btn-primary' : ''" type="button"
              :disabled="!!saving" :whileHover="(reduced || saving) ? {} : { y: -2, scale: 1.02 }" :whileTap="(reduced || saving) ? {} : { scale: 0.97 }" @click="a.fn">
              <Loader2 v-if="saving === a.key" :size="14" class="perf-spin" /><component v-else :is="a.icon" :size="14" /> {{ a.label }}
            </Motion>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </teleport>
</template>

<script setup>
import { reactive, computed, ref, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { X, Loader2, Check, BadgeCheck, CheckCircle2, MessageSquareText, Coins, Award, CalendarRange, Clock, ClipboardList, UserCheck } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import PerfScoreSheet from './PerfScoreSheet.vue'
import PerfStatusStamp from './PerfStatusStamp.vue'
import SetCountUp from '../../settings/components/SetCountUp.vue'
import { scoreTone, bandTone, hikeStatusMeta, submitSelfReflection, acknowledgeReview, submitManagerAssessment, PIPELINE, STATUS_ORDER } from '@/composables/usePerformance'
import { cycleMeta } from '@/views/hr/settings/composables/appraisalVocab'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  open: { type: Boolean, default: false },
  review: { type: Object, default: null },
  context: { type: String, default: 'self' },   // self | manager
})
const emit = defineEmits(['close', 'mutated'])
const toast = useToast()
const reduced = prefersReduced()

const r = reactive({})
const draft = reactive({ sections: [], self_comments: '', manager_comments: '' })
const ackNote = ref('')
const saving = ref(false)
const clone = (x) => JSON.parse(JSON.stringify(x || []))
const anim = (i) => reduced ? {} : { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4, delay: 0.05 + i * 0.055, ease: [0.16, 1, 0.3, 1] } }

function hydrate(src) {
  Object.keys(r).forEach(k => delete r[k]); Object.assign(r, src || {})
  draft.sections = clone(src?.sections)
  draft.self_comments = src?.self_comments || ''
  draft.manager_comments = src?.manager_comments || ''
  ackNote.value = src?.ack_comments || ''
}
watch(() => props.review, (v) => { if (v) hydrate(v) }, { immediate: true })
watch(() => props.open, (v) => { if (v && props.review) hydrate(props.review) })

const cycleLabel = computed(() => cycleMeta(r.cycle).label)
const max = computed(() => r.rating_max || 5)
const scored = computed(() => r.overall_score != null)
const scoreColor = computed(() => scoreTone(r.overall_score, max.value))
const gaugeDeg = computed(() => scored.value ? Math.round((r.overall_score / max.value) * 360) : 0)
const bandLabel = computed(() => r.final_rating_band || null)
const scoreWord = computed(() => {
  if (!scored.value) return ''
  const f = r.overall_score / max.value
  if (f >= 0.9) return 'Exceptional'
  if (f >= 0.7) return 'Exceeds expectations'
  if (f >= 0.5) return 'Meets expectations'
  if (f >= 0.3) return 'Partially meets'
  return 'Below expectations'
})

// reporting manager identity
const reviewerInitials = computed(() => (r.reviewer_name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase() || '?')
const mgrAwaitMsg = computed(() => {
  if (['DRAFT', 'SELF_ASSESSMENT', 'MANAGER_ASSESSMENT'].includes(r.status))
    return 'Your manager hasn\'t finalized their assessment yet — their written summary appears here once they complete the review.'
  return 'Your manager finalized this review without a written summary. Their section-by-section scores and notes are below.'
})

// increment outcome — only reveal the exact % once APPLIED (finalized); pending stays vague
const hasAppliedHike = computed(() => r.hike_status === 'APPLIED')
const hikePending = computed(() => ['RECOMMENDED', 'APPROVED'].includes(r.hike_status))
const appliedPct = computed(() => Number(r.approved_hike_pct ?? r.recommended_hike_pct ?? 0))

// workflow stepper
const curStep = computed(() => STATUS_ORDER.indexOf(r.status))
const stepClass = (i) => {
  if (r.status === 'CANCELLED') return 'cancel'
  if (i < curStep.value) return 'done'
  if (i === curStep.value) return 'active'
  return ''
}

const role = computed(() => (props.context === 'manager' && r.status === 'MANAGER_ASSESSMENT') ? 'manager' : 'view')
const reflectEditable = computed(() => props.context === 'self' && ['DRAFT', 'SELF_ASSESSMENT', 'MANAGER_ASSESSMENT'].includes(r.status))
const hint = computed(() => {
  if (props.context === 'self') {
    if (['DRAFT', 'SELF_ASSESSMENT', 'MANAGER_ASSESSMENT'].includes(r.status)) return 'Your manager scores this review. Add an optional reflection — you don\'t rate yourself.'
    if (r.status === 'COMPLETED') return 'Your manager has finalized this review. Read it and acknowledge.'
    if (r.status === 'ACKNOWLEDGED') return 'Acknowledged — this review is closed.'
    return 'This review is closed.'
  }
  if (r.status === 'MANAGER_ASSESSMENT') return 'Score your report on each section and complete the review.'
  return 'This review is finalized.'
})

const fmtDate = (d) => { try { return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return d } }
const fmtDateTime = (d) => { try { return new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) + ' · ' + new Date(d).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) } catch { return d } }
const timeline = computed(() => {
  const ev = []
  if (r.created_at) ev.push({ k: 'opened', label: 'Review opened', at: r.created_at, icon: ClipboardList })
  if (r.self_submitted_at) ev.push({ k: 'reflected', label: 'You added a reflection', at: r.self_submitted_at, icon: MessageSquareText })
  if (r.manager_submitted_at || r.completed_at) ev.push({ k: 'reviewed', label: 'Manager finalized the assessment', at: r.manager_submitted_at || r.completed_at, icon: UserCheck })
  if (r.recommended_at) ev.push({ k: 'hike', label: 'Increment ' + hikeStatusMeta(r.hike_status).label.toLowerCase(), at: r.recommended_at, icon: Coins })
  if (r.acknowledged_at) ev.push({ k: 'ack', label: 'You acknowledged the review', at: r.acknowledged_at, icon: BadgeCheck })
  return ev.filter(e => e.at)
})

async function doReflect() {
  saving.value = 'reflect'
  try {
    const updated = await submitSelfReflection(r.id, { comments: draft.self_comments })
    hydrate(updated); emit('mutated', updated); toast.success('Reflection saved')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to save') } finally { saving.value = false }
}
async function doManager(submit) {
  saving.value = submit ? 'submit' : 'draft'
  try {
    const payload = { sections: draft.sections.map(s => ({ key: s.key, rating: s.manager_rating ?? null, comment: s.manager_comment ?? null })), comments: draft.manager_comments, submit }
    const updated = await submitManagerAssessment(r.id, payload); hydrate(updated); emit('mutated', updated)
    toast.success(submit ? 'Review completed' : 'Saved')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to save') } finally { saving.value = false }
}
async function doAck() {
  saving.value = 'ack'
  try {
    const updated = await acknowledgeReview(r.id, { comments: ackNote.value || null }); hydrate(updated); emit('mutated', updated)
    toast.success('Acknowledged')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed') } finally { saving.value = false }
}

const footerActions = computed(() => {
  if (props.context === 'self') {
    const acts = []
    if (reflectEditable.value) acts.push({ key: 'reflect', label: 'Save reflection', icon: Check, fn: doReflect })
    if (r.status === 'COMPLETED') acts.push({ key: 'ack', label: 'Acknowledge', icon: BadgeCheck, primary: true, fn: doAck })
    return acts
  }
  if (r.status === 'MANAGER_ASSESSMENT') return [
    { key: 'draft', label: 'Save draft', icon: Check, fn: () => doManager(false) },
    { key: 'submit', label: 'Complete', icon: CheckCircle2, primary: true, fn: () => doManager(true) },
  ]
  return []
})
</script>

<style scoped>
.sd-ov { position: fixed; inset: 0; z-index: 1300; display: flex; justify-content: flex-end; background: rgba(5, 5, 6, 0.6); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
.sd { position: relative; width: min(560px, 100%); height: 100%; display: flex; flex-direction: column; overflow: hidden; background: var(--perf-surface-elevated); border-left: 1px solid var(--perf-border-strong); box-shadow: -30px 0 80px -40px rgba(0,0,0,0.9); }
.sd-edge { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; z-index: 3; background: var(--perf-grad-hero); }
.sd-aura { position: absolute; top: -120px; right: -80px; width: 320px; height: 320px; border-radius: 50%; pointer-events: none; background: radial-gradient(circle, color-mix(in srgb, var(--perf-gold) 20%, transparent), transparent 70%); filter: blur(50px); }

.sd-head { position: relative; z-index: 1; display: flex; align-items: center; gap: 12px; padding: 17px 18px 13px; border-bottom: 1px solid var(--perf-border); }
.sd-head-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.sd-head-id b { font-size: 15px; font-weight: 850; color: var(--perf-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sd-head-id span { font-size: 11px; color: var(--perf-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sd-x { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; flex-shrink: 0; cursor: pointer; color: var(--perf-text-muted); background: transparent; border: 1px solid var(--perf-border); transition: all 0.2s; }
.sd-x:hover { color: var(--perf-text); transform: rotate(90deg); }

/* stepper */
.sd-steps { position: relative; z-index: 1; display: flex; align-items: center; padding: 13px 18px; border-bottom: 1px solid var(--perf-border); }
.sd-step { position: relative; display: flex; flex-direction: column; align-items: center; gap: 5px; flex: 1; }
.sd-step-dot { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; color: var(--perf-text-dim); background: var(--perf-panel); border: 1px solid var(--perf-border); transition: all 0.3s var(--perf-spring); z-index: 1; }
.sd-step-lab { font-size: 9.5px; font-weight: 700; color: var(--perf-text-dim); text-align: center; }
.sd-step-beam { position: absolute; top: 13px; left: 50%; width: 100%; height: 2px; background: var(--perf-border); z-index: 0; }
.sd-step-beam.lit { background: var(--perf-gold); box-shadow: 0 0 8px color-mix(in srgb, var(--perf-gold) 60%, transparent); }
.sd-step.done .sd-step-dot { color: var(--perf-gold); border-color: var(--perf-gold); }
.sd-step.active .sd-step-dot { color: #1a1206; background: var(--perf-grad-hero); border-color: transparent; box-shadow: 0 0 0 4px color-mix(in srgb, var(--perf-gold) 16%, transparent); }
.sd-step.active .sd-step-lab { color: var(--perf-text); }
.sd-step.cancel .sd-step-dot { color: var(--perf-conflict); }

.sd-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 15px 18px; display: flex; flex-direction: column; gap: 13px; position: relative; z-index: 1; }
.sd-body > * { flex-shrink: 0; }

/* scorecard */
.sd-card { position: relative; overflow: hidden; display: flex; align-items: center; gap: 15px; padding: 15px 16px; border-radius: 16px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--perf-gold) 8%, var(--perf-surface)), var(--perf-surface)); border: 1px solid var(--perf-border-warm); }
.sd-card-spark { position: absolute; top: -40%; left: -40%; width: 55%; height: 180%; transform: skewX(-16deg); pointer-events: none;
  background: linear-gradient(100deg, transparent, color-mix(in srgb, var(--perf-gold) 15%, transparent), transparent); animation: sd-sweep 5.5s ease-in-out infinite; }
.sd-gauge { position: relative; width: 72px; height: 72px; border-radius: 50%; flex-shrink: 0; background: conic-gradient(var(--c) var(--perf-p, 0deg), var(--perf-track) 0); transition: --perf-p 0.9s var(--perf-spring); filter: drop-shadow(0 0 12px color-mix(in srgb, var(--c) 32%, transparent)); }
.sd-gauge-in { position: absolute; inset: 5px; border-radius: 50%; background: var(--perf-surface-elevated); display: flex; flex-direction: column; align-items: center; justify-content: center; }
.sd-gauge-in b { font-size: 22px; font-weight: 850; color: var(--perf-text); line-height: 1; font-variant-numeric: tabular-nums; }
.sd-gauge-in b.muted { color: var(--perf-text-dim); }
.sd-gauge-in span { font-size: 9px; color: var(--perf-text-muted); }
.sd-card-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.sd-card-lab { font-size: 10px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--perf-gold); }
.sd-card-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.sd-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 800; padding: 3px 9px; border-radius: 999px;
  color: var(--c, var(--perf-gold)); background: color-mix(in srgb, var(--c, var(--perf-gold)) 13%, transparent); border: 1px solid color-mix(in srgb, var(--c, var(--perf-gold)) 24%, transparent); }
.sd-chip.ghost { color: var(--perf-text-secondary); background: var(--perf-panel); border-color: var(--perf-border); }
.sd-card-hint { margin: 0; font-size: 11px; line-height: 1.45; color: var(--perf-text-muted); }

/* reporting manager identity */
.sd-reviewer { display: flex; align-items: center; gap: 11px; padding: 11px 13px; border-radius: 13px; background: var(--perf-surface); border: 1px solid var(--perf-border); }
.sd-reviewer-av { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0; font-size: 12px; font-weight: 850; color: #1a1206; background: var(--perf-grad-hero); }
.sd-reviewer-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.3; }
.sd-reviewer-txt em { font-size: 9.5px; font-style: normal; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--perf-text-dim); }
.sd-reviewer-txt b { font-size: 13px; font-weight: 800; color: var(--perf-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sd-reviewer-tag { display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0; font-size: 10px; font-weight: 700; padding: 4px 9px; border-radius: 999px; color: var(--perf-orange); background: color-mix(in srgb, var(--perf-orange) 12%, transparent); border: 1px solid color-mix(in srgb, var(--perf-orange) 26%, transparent); }

/* increment */
.sd-hike.applied { display: flex; flex-direction: column; gap: 9px; padding: 14px 15px; border-radius: 15px; background: var(--perf-ok-soft); border: 1px solid color-mix(in srgb, var(--perf-ok) 34%, transparent); }
.sd-hike-h { display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 800; color: var(--perf-text); }
.sd-hike-h :deep(svg) { color: var(--perf-ok); }
.sd-hike-body { display: flex; align-items: center; gap: 14px; }
.sd-hike-pct { font-size: 30px; font-weight: 850; color: var(--perf-ok); font-variant-numeric: tabular-nums; line-height: 1; }
.sd-hike-meta { display: flex; flex-direction: column; gap: 5px; }
.sd-hike-eff { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--perf-text-muted); }
.sd-hike-eff :deep(svg) { color: var(--perf-text-dim); }
.sd-hike.pending { display: flex; align-items: flex-start; gap: 11px; padding: 13px 14px; border-radius: 14px; background: color-mix(in srgb, var(--perf-amber) 9%, transparent); border: 1px solid color-mix(in srgb, var(--perf-amber) 26%, transparent); }
.sd-hike-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0; color: var(--perf-amber); background: color-mix(in srgb, var(--perf-amber) 14%, transparent); }
.sd-hike.pending b { font-size: 12.5px; font-weight: 800; color: var(--perf-text); }
.sd-hike.pending p { margin: 3px 0 0; font-size: 11.5px; line-height: 1.45; color: var(--perf-text-muted); }

/* reflection */
.sd-reflect { padding: 13px 14px; border-radius: 13px; background: var(--perf-surface); border: 1px solid var(--perf-border); }
.sd-reflect-head { display: flex; align-items: center; gap: 7px; font-size: 12.5px; color: var(--perf-text-secondary); margin-bottom: 9px; }
.sd-reflect-head :deep(svg) { color: var(--perf-gold); }
.sd-reflect-head b { font-weight: 800; color: var(--perf-text); }
.sd-reflect-head span { font-size: 10.5px; color: var(--perf-text-dim); margin-left: auto; }
.sd-reflect-ta { width: 100%; box-sizing: border-box; font: inherit; font-size: 12.5px; color: var(--perf-text); background: var(--perf-panel); border: 1px solid var(--perf-border-strong); border-radius: 10px; padding: 10px 11px; resize: vertical; transition: border-color 0.2s; }
.sd-reflect-ta:focus { outline: none; border-color: var(--perf-gold); }
.sd-reflect-ro { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--perf-text-secondary); white-space: pre-wrap; }
.sd-reflect-empty { margin: 0; font-size: 12px; color: var(--perf-text-dim); font-style: italic; }

/* manager's assessment — first-class verdict card */
.sd-verdict { position: relative; overflow: hidden; padding: 14px 15px; border-radius: 15px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--perf-orange) 9%, var(--perf-surface)), var(--perf-surface)); border: 1px solid color-mix(in srgb, var(--perf-orange) 28%, transparent); }
.sd-verdict.awaiting { background: var(--perf-surface); border: 1px dashed var(--perf-border-strong); }
.sd-verdict-head { display: flex; align-items: center; gap: 10px; margin-bottom: 9px; }
.sd-verdict-av { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; font-size: 11px; font-weight: 850; color: #1a1206; background: linear-gradient(135deg, var(--perf-orange), var(--perf-ember)); }
.sd-verdict.awaiting .sd-verdict-av { background: var(--perf-track); color: var(--perf-text-muted); }
.sd-verdict-who { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.3; }
.sd-verdict-who b { font-size: 13px; font-weight: 800; color: var(--perf-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sd-verdict-who em { font-size: 9.5px; font-style: normal; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--perf-orange); }
.sd-verdict.awaiting .sd-verdict-who em { color: var(--perf-text-muted); }
.sd-verdict-mark { color: var(--perf-orange); flex-shrink: 0; }
.sd-verdict.awaiting .sd-verdict-mark { color: var(--perf-text-dim); }
.sd-verdict-body { margin: 0; font-size: 12.5px; line-height: 1.6; color: var(--perf-text-secondary); white-space: pre-wrap; }
.sd-verdict-await { margin: 0; font-size: 12px; line-height: 1.5; color: var(--perf-text-muted); font-style: italic; }

/* acknowledgement */
.sd-ack { padding: 13px 14px; border-radius: 14px; background: color-mix(in srgb, var(--perf-ok) 8%, var(--perf-surface)); border: 1px solid color-mix(in srgb, var(--perf-ok) 28%, transparent); }
.sd-ack-head { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 800; color: var(--perf-text); margin-bottom: 8px; }
.sd-ack-head :deep(svg) { color: var(--perf-ok); }
.sd-ack-ta { width: 100%; box-sizing: border-box; font: inherit; font-size: 12.5px; color: var(--perf-text); background: var(--perf-panel); border: 1px solid var(--perf-border-strong); border-radius: 10px; padding: 10px 11px; resize: vertical; transition: border-color 0.2s; }
.sd-ack-ta:focus { outline: none; border-color: var(--perf-ok); }
.sd-ack-ro { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--perf-text-secondary); white-space: pre-wrap; }

/* zone dividers */
.sd-zone { display: flex; align-items: center; gap: 9px; margin-top: 3px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase; color: var(--perf-text-muted); }
.sd-zone-n { display: grid; place-items: center; width: 18px; height: 18px; border-radius: 6px; flex-shrink: 0; color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 14%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 26%, transparent); }
.sd-zone-line { flex: 1; height: 1px; background: var(--perf-border); }

/* timeline */
.sd-timeline { display: flex; flex-direction: column; gap: 0; padding-left: 4px; }
.sd-tl { position: relative; display: flex; align-items: flex-start; gap: 11px; padding: 0 0 14px 0;
  opacity: 0; transform: translateX(8px); animation: sd-tl-in 0.4s var(--perf-spring) forwards; animation-delay: calc(0.1s + var(--i) * 0.07s); }
.sd-tl::before { content: ''; position: absolute; left: 12px; top: 24px; bottom: -2px; width: 1.5px; background: var(--perf-border); }
.sd-tl:last-child { padding-bottom: 0; }
.sd-tl:last-child::before { display: none; }
.sd-tl-dot { display: grid; place-items: center; width: 25px; height: 25px; border-radius: 50%; flex-shrink: 0; z-index: 1; color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 13%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 30%, transparent); }
.sd-tl-txt { display: flex; flex-direction: column; gap: 1px; padding-top: 3px; }
.sd-tl-txt b { font-size: 12px; font-weight: 750; color: var(--perf-text-secondary); }
.sd-tl-txt span { font-size: 10.5px; color: var(--perf-text-dim); font-variant-numeric: tabular-nums; }

.sd-foot { position: relative; z-index: 1; display: flex; align-items: center; gap: 8px; padding: 13px 18px; border-top: 1px solid var(--perf-border); }
.sd-grow { flex: 1; }

@keyframes sd-sweep { 0% { left: -45%; } 55%, 100% { left: 130%; } }
@keyframes sd-tl-in { to { opacity: 1; transform: none; } }

@media (max-width: 560px) { .sd { width: 100%; } }
.sd.reduced .sd-card-spark { animation: none; display: none; }
.sd.reduced .sd-tl { animation: none; opacity: 1; transform: none; }
.sd.reduced .sd-gauge { transition: none; }
@media (prefers-reduced-motion: reduce) {
  .sd-x:hover { transform: none; }
  .sd-card-spark { animation: none; display: none; }
  .sd-tl { animation: none; opacity: 1; transform: none; }
  .sd-gauge { transition: none; }
}
</style>
