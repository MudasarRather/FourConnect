<template>
  <Teleport to="body">
    <Presence>
      <div v-if="open" class="icm-overlay" @mousedown.self="close">
        <Motion as="div" class="icm ex-grain" :initial="{ opacity: 0, y: 26, scale: 0.96 }"
          :animate="{ opacity: 1, y: 0, scale: 1 }" :exit="{ opacity: 0, y: 18, scale: 0.97 }"
          :transition="{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }">
          <span class="icm-aura" aria-hidden="true" />
          <span class="icm-edge" aria-hidden="true" />

          <header class="icm-head">
            <span class="icm-ico"><Mic :size="18" /></span>
            <div class="icm-htxt">
              <h3 class="icm-title">{{ isEdit ? 'Edit exit interview' : 'Conduct exit interview' }}</h3>
              <p class="icm-sub">{{ caseInfo?.employee_name || '—' }} · <span class="ex-mono">{{ caseInfo?.case_number || '' }}</span></p>
            </div>
            <button class="icm-x" @click="close" type="button"><X :size="17" /></button>
          </header>

          <!-- scheduled-session context -->
          <div class="icm-ctx" :class="{ form: schedIsForm }">
            <span class="ctx-ic"><component :is="schedMeta.icon" :size="15" /></span>
            <div class="ctx-t">
              <span class="ctx-l">{{ schedIsForm ? 'Self-service survey' : (schedMeta.label + ' session') }}</span>
              <span class="ctx-s">{{ schedWhen }}</span>
            </div>
            <span v-if="schedIsForm" class="ctx-tag"><Info :size="11" /> usually completed by the employee</span>
          </div>

          <div class="icm-grid">
            <!-- form -->
            <div class="icm-form">
              <!-- 1 · Session -->
              <section class="sec">
                <span class="sec-h"><i>1</i> Session</span>
                <div class="fld">
                  <label>Conducted as</label>
                  <div class="seg3">
                    <button v-for="m in MODES" :key="m.key" type="button" :class="{ on: mode === m.key }" @click="mode = m.key"><component :is="m.icon" :size="13" /> {{ m.label }}</button>
                  </div>
                </div>
              </section>

              <!-- 2 · Ratings -->
              <section class="sec">
                <span class="sec-h"><i>2</i> Ratings <em class="sec-prog" :class="{ done: ratedCount === totalRatings }">{{ ratedCount }}/{{ totalRatings }}</em></span>
                <div v-for="q in ratingQuestions" :key="q.key" class="rate-row">
                  <span class="rate-lab">{{ q.question }}</span>
                  <div class="stars">
                    <Motion v-for="n in 5" :key="n" as="button" type="button" :class="{ on: (answers[q.key] || 0) >= n }"
                      @click="setRating(q.key, n)" :whileHover="{ scale: 1.18 }" :whileTap="{ scale: 0.85 }">
                      <Star :size="18" :fill="(answers[q.key] || 0) >= n ? 'currentColor' : 'none'" />
                    </Motion>
                  </div>
                </div>
              </section>

              <!-- 3 · Voice of the employee -->
              <section class="sec">
                <span class="sec-h"><i>3</i> Voice of the employee</span>
                <div v-for="q in extraTextQuestions" :key="q.key" class="fld">
                  <label>{{ q.question }}</label>
                  <textarea v-model="answers[q.key]" rows="2" placeholder="Their words…" />
                </div>
                <div class="fld">
                  <label>Primary reason for leaving</label>
                  <ExSelect v-model="primaryReason" :options="reasonOpts" placeholder="Pick the strongest driver…" />
                </div>
                <div class="fld">
                  <label>Recommendation</label>
                  <div class="seg2">
                    <button type="button" :class="{ on: recommend === true, ok: recommend === true }" @click="recommend = recommend === true ? null : true"><ThumbsUp :size="13" /> Would recommend</button>
                    <button type="button" :class="{ on: recommend === false, no: recommend === false }" @click="recommend = recommend === false ? null : false"><ThumbsDown :size="13" /> Wouldn't</button>
                  </div>
                </div>
              </section>

              <!-- 4 · Summary -->
              <section class="sec">
                <span class="sec-h"><i>4</i> Summary</span>
                <div class="fld">
                  <label>Feedback summary</label>
                  <textarea v-model="summary" rows="3" placeholder="What stood out — and what we should fix before the next exit…" />
                </div>
              </section>
            </div>

            <!-- live voiceprint preview -->
            <aside class="icm-vp" :class="{ ready: valid }">
              <span class="vp-grain" aria-hidden="true" />
              <div class="vp-top">
                <span class="vp-brand"><AudioLines :size="13" /> Voiceprint</span>
                <span class="vp-stamp" :class="{ ready: valid }">{{ valid ? 'CAPTURED' : 'LISTENING' }}</span>
              </div>
              <div class="vp-ring" :style="{ '--p': ringDeg, '--c': sentColor }">
                <span class="vp-rv">{{ answers.overall || '—' }}</span><span class="vp-rk">/5</span>
              </div>
              <div class="vp-wave" aria-hidden="true">
                <span v-for="(b, i) in previewBars" :key="i" class="vp-b" :style="{ height: b.h + '%', background: b.color }" />
              </div>
              <div class="vp-eq">
                <div v-for="d in previewDims" :key="d.key" class="vpe">
                  <span class="vpe-bar"><span class="vpe-fill" :style="{ height: (d.v / 5 * 100) + '%', background: barColor(d.v) }" /></span>
                  <span class="vpe-lab">{{ d.short }}</span>
                </div>
              </div>
              <div class="vp-foot">
                <span v-if="recommend != null" class="vp-rec" :class="recommend ? 'yes' : 'no'"><component :is="recommend ? ThumbsUp : ThumbsDown" :size="11" />{{ recommend ? 'Recommends' : 'Does not' }}</span>
                <span class="vp-mode"><component :is="modeMeta.icon" :size="11" /> {{ modeMeta.label }}</span>
              </div>
            </aside>
          </div>

          <footer class="icm-foot">
            <button class="icm-btn ghost" @click="close" type="button">Cancel</button>
            <Motion as="button" class="icm-btn primary" :class="{ off: !valid || busy }" type="button"
              @click="submit" :whileHover="valid && !busy ? { y: -2 } : {}" :whileTap="valid && !busy ? { scale: 0.96 } : {}">
              <Loader2 v-if="busy" :size="15" class="spin" /><Check v-else :size="15" /> {{ isEdit ? 'Update interview' : 'Save interview' }}
            </Motion>
          </footer>
        </Motion>
      </div>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { Mic, X, Star, Check, Loader2, ThumbsUp, ThumbsDown, AudioLines, Video, Users, Captions, Info } from 'lucide-vue-next'
import ExSelect from '../components/ExSelect.vue'
import { REASON_CATEGORIES, reasonMeta, fmtDate } from '@/composables/useExit'

const props = defineProps({
  open: { type: Boolean, default: false },
  caseInfo: { type: Object, default: null },
  questions: { type: Array, default: () => [] },
  initial: { type: Object, default: null }, // existing interview for edit
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'submit'])

const DEFAULT_Q = [
  { key: 'overall', question: 'Overall, how was your experience here?', type: 'rating' },
  { key: 'management', question: 'How would you rate your manager / leadership?', type: 'rating' },
  { key: 'culture', question: 'How would you rate the work environment & culture?', type: 'rating' },
  { key: 'growth', question: 'How would you rate your career growth opportunities?', type: 'rating' },
  { key: 'compensation', question: 'How would you rate compensation & benefits?', type: 'rating' },
]
const MODES = [{ key: 'IN_PERSON', label: 'In person', icon: Users }, { key: 'VIDEO', label: 'Video', icon: Video }, { key: 'FORM', label: 'Form', icon: Captions }]
const reasonOpts = [{ value: '', label: '(none)' }, ...REASON_CATEGORIES.map(r => ({ value: r.key, label: r.label, icon: r.icon }))]

const resolved = computed(() => (props.questions && props.questions.length ? props.questions : DEFAULT_Q))
const ratingQuestions = computed(() => {
  const r = resolved.value.filter(q => q.type === 'rating')
  return r.length ? r : DEFAULT_Q
})
const extraTextQuestions = computed(() => resolved.value.filter(q => q.type !== 'rating' && !['primary_reason', 'suggestions'].includes(q.key)))

const answers = reactive({})
const primaryReason = ref('')
const recommend = ref(null)
const summary = ref('')
const mode = ref('FORM')
const isEdit = computed(() => props.initial?.status === 'COMPLETED')

const reset = () => {
  Object.keys(answers).forEach(k => delete answers[k])
  const iv = props.initial || {}
  Object.assign(answers, iv.ratings || {})
  // hydrate any saved text responses
  ;(iv.responses || []).forEach(r => { if (r && r.key && r.answer != null && answers[r.key] == null) answers[r.key] = r.answer })
  primaryReason.value = iv.primary_reason_category || ''
  recommend.value = iv.would_recommend ?? null
  summary.value = iv.feedback_summary || ''
  mode.value = iv.mode || 'FORM'
}
watch(() => props.open, (o) => { if (o) reset() })

const setRating = (key, n) => { answers[key] = answers[key] === n ? n - 1 : n }
const modeMeta = computed(() => MODES.find(m => m.key === mode.value) || MODES[2])

// ── scheduled-session context (what HR is recording) ──
const schedMeta = computed(() => MODES.find(m => m.key === (props.initial?.mode || mode.value)) || MODES[2])
const schedIsForm = computed(() => (props.initial?.mode || mode.value) === 'FORM')
const schedWhen = computed(() => {
  const at = props.initial?.scheduled_at
  if (!at) return 'Recording now — no slot was scheduled'
  const t = String(at).slice(11, 16)
  return schedIsForm.value
    ? `Survey opened${at ? ' · due ' + fmtDate(at) : ''}`
    : `${fmtDate(at)}${t ? ' · ' + t : ''}`
})
const totalRatings = computed(() => ratingQuestions.value.length)
const ratedCount = computed(() => ratingQuestions.value.filter(q => Number(answers[q.key] || 0) > 0).length)
const ringDeg = computed(() => (Number(answers.overall || 0) / 5 * 360) + 'deg')
const sentColor = computed(() => { const s = Number(answers.overall || 0); return s >= 4 ? 'var(--ex-cleared)' : s <= 2 && s > 0 ? 'var(--ex-blocked)' : 'var(--ex-amber)' })
const barColor = (v) => v >= 4 ? 'var(--ex-cleared)' : v <= 2 && v > 0 ? 'var(--ex-blocked)' : v > 0 ? 'var(--ex-amber)' : 'var(--ex-steel-dim)'

const previewDims = computed(() => [
  { key: 'management', short: 'Mgmt' }, { key: 'culture', short: 'Cult' }, { key: 'growth', short: 'Grow' }, { key: 'compensation', short: 'Comp' },
].map(d => ({ ...d, v: Number(answers[d.key] || 0) })))
const previewBars = computed(() => {
  const keys = ratingQuestions.value.map(q => q.key)
  return Array.from({ length: 18 }, (_, i) => {
    const k = keys[i % keys.length]
    const v = Number(answers[k] || 0)
    return { h: v ? 16 + (v / 5) * 84 : 8, color: v >= 4 ? 'var(--ex-cleared)' : v <= 2 && v > 0 ? 'var(--ex-blocked)' : v > 0 ? 'var(--ex-amber)' : 'var(--ex-steel-dim)' }
  })
})

const valid = computed(() => Number(answers.overall || 0) > 0)

const close = () => emit('close')
const submit = () => {
  if (!valid.value || props.busy) return
  const ratings = {}
  const responses = []
  ratingQuestions.value.forEach(q => {
    const v = Number(answers[q.key] || 0) || null
    if (v != null) ratings[q.key] = v
    responses.push({ key: q.key, question: q.question, rating: v })
  })
  extraTextQuestions.value.forEach(q => responses.push({ key: q.key, question: q.question, answer: answers[q.key] || '' }))
  if (primaryReason.value) responses.push({ key: 'primary_reason', question: 'Primary reason', answer: reasonMeta(primaryReason.value).label })
  emit('submit', {
    ratings, responses, mode: mode.value,
    would_recommend: recommend.value,
    primary_reason_category: primaryReason.value || null,
    feedback_summary: summary.value || null,
  })
}
</script>

<style scoped>
@property --p { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
.icm-overlay { position: fixed; inset: 0; z-index: 1440; display: grid; place-items: center; padding: 20px;
  background: rgba(6, 5, 10, 0.68); backdrop-filter: blur(9px); -webkit-backdrop-filter: blur(9px); }
[data-theme="light"] .icm-overlay { background: rgba(40, 30, 15, 0.42); }
.icm { position: relative; overflow: hidden; width: min(760px, 96vw); max-height: 92vh; overflow-y: auto;
  border-radius: 22px; background: var(--ex-surface-elevated); border: 1px solid var(--ex-border-strong); box-shadow: var(--ex-shadow); }
.icm-aura { position: absolute; inset: -40% 30% 55% -10%; pointer-events: none; animation: ex-aura-drift 11s ease-in-out infinite;
  background: radial-gradient(60% 80% at 20% 0%, rgba(251, 146, 60, 0.2), transparent 72%); }
.icm-edge { position: absolute; top: 0; left: 0; right: 0; height: 2px; pointer-events: none;
  background: linear-gradient(90deg, transparent, var(--ex-ember), var(--ex-amber-bright), transparent); opacity: 0.8; }
.icm-head { position: relative; display: flex; align-items: flex-start; gap: 12px; padding: 18px 20px 12px; }
.icm-ico { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0; color: var(--ex-violet); background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.icm-htxt { flex: 1; min-width: 0; }
.icm-title { font-size: 17px; font-weight: 850; color: var(--ex-text); margin: 0; }
.icm-sub { font-size: 12px; color: var(--ex-text-muted); margin: 2px 0 0; }
.icm-x { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; cursor: pointer; background: transparent; border: 1px solid var(--ex-border); color: var(--ex-text-muted); transition: all 0.2s; }
.icm-x:hover { color: var(--ex-text); border-color: var(--ex-border-strong); transform: rotate(90deg); }

.icm-grid { position: relative; display: grid; grid-template-columns: 1fr 232px; gap: 18px; padding: 4px 20px 14px; }
.icm-form { display: flex; flex-direction: column; gap: 13px; min-width: 0; }
.icm-form > * { animation: ex-fade-up 0.42s var(--ex-spring) backwards; }
.icm-form > *:nth-child(1) { animation-delay: 0.04s; } .icm-form > *:nth-child(2) { animation-delay: 0.08s; }
.icm-form > *:nth-child(3) { animation-delay: 0.12s; } .icm-form > *:nth-child(4) { animation-delay: 0.16s; }
.icm-form > *:nth-child(5) { animation-delay: 0.2s; } .icm-form > *:nth-child(6) { animation-delay: 0.24s; }
.icm-form > *:nth-child(7) { animation-delay: 0.28s; } .icm-form > *:nth-child(8) { animation-delay: 0.32s; }

/* scheduled-session context banner */
.icm-ctx { position: relative; display: flex; align-items: center; gap: 11px; margin: 0 20px 8px; padding: 10px 13px; border-radius: 13px;
  background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.icm-ctx.form { background: var(--ex-cleared-soft); border-color: color-mix(in srgb, var(--ex-cleared) 32%, transparent); }
.ctx-ic { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0; color: var(--ex-violet); background: color-mix(in srgb, var(--ex-violet) 14%, transparent); }
.icm-ctx.form .ctx-ic { color: var(--ex-cleared); background: var(--ex-cleared-soft); }
.ctx-t { display: flex; flex-direction: column; min-width: 0; }
.ctx-l { font-size: 12.5px; font-weight: 820; color: var(--ex-text); }
.ctx-s { font-size: 11px; color: var(--ex-text-muted); }
.ctx-tag { margin-left: auto; display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; font-weight: 700; color: var(--ex-cleared); flex-shrink: 0; }

/* form sections */
.sec { display: flex; flex-direction: column; gap: 11px; padding: 12px 13px; border-radius: 14px; background: var(--ex-surface); border: 1px solid var(--ex-border); }
.sec-h { display: inline-flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ex-text-muted); }
.sec-h i { display: grid; place-items: center; width: 18px; height: 18px; border-radius: 6px; font-style: normal; font-size: 10px; font-weight: 850; color: var(--ex-violet); background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.sec-prog { margin-left: auto; font-style: normal; font-family: var(--ex-mono); font-size: 11px; font-weight: 800; color: var(--ex-text-muted); padding: 2px 8px; border-radius: 999px; background: var(--ex-steel-soft); transition: all 0.3s; }
.sec-prog.done { color: var(--ex-cleared); background: var(--ex-cleared-soft); }

.rate-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.rate-lab { font-size: 12.5px; color: var(--ex-text-secondary); font-weight: 600; }
.stars { display: flex; gap: 3px; flex-shrink: 0; }
.stars button { background: none; border: none; cursor: pointer; color: var(--ex-steel); padding: 2px; display: grid; place-items: center; }
.stars button.on { color: var(--ex-amber); filter: drop-shadow(0 0 5px rgba(251, 191, 36, 0.5)); }

.fld { display: flex; flex-direction: column; gap: 6px; }
.fld label { font-size: 11px; font-weight: 750; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ex-text-muted); }
.fld textarea { width: 100%; padding: 10px 12px; border-radius: 10px; font-size: 13px; font-family: inherit; resize: vertical;
  background: rgba(0, 0, 0, 0.3); border: 1px solid var(--ex-border); color: var(--ex-text); transition: border-color 0.2s, box-shadow 0.2s; }
.fld textarea:focus { outline: none; border-color: var(--ex-violet-border); box-shadow: 0 0 0 3px rgba(251, 146, 60, 0.12); }
[data-theme="light"] .fld textarea { background: rgba(255, 250, 242, 0.72); }

.seg3, .seg2 { display: grid; gap: 7px; }
.seg3 { grid-template-columns: repeat(3, 1fr); } .seg2 { grid-template-columns: 1fr 1fr; }
.seg3 button, .seg2 button { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 9px; border-radius: 10px; cursor: pointer; font: inherit;
  font-size: 12px; font-weight: 700; background: var(--ex-surface); border: 1px solid var(--ex-border); color: var(--ex-text-secondary); transition: all 0.2s; }
.seg3 button.on { border-color: var(--ex-violet-border); background: var(--ex-violet-soft); color: var(--ex-violet); }
.seg2 button.on.ok { border-color: color-mix(in srgb, var(--ex-cleared) 40%, transparent); background: var(--ex-cleared-soft); color: var(--ex-cleared); }
.seg2 button.on.no { border-color: color-mix(in srgb, var(--ex-blocked) 40%, transparent); background: var(--ex-blocked-soft); color: var(--ex-blocked); }

/* voiceprint preview */
.icm-vp { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 12px; padding: 14px; border-radius: 18px;
  background: var(--ex-grad-card), var(--ex-panel); border: 1px solid var(--ex-border-strong); }
.icm-vp::before { content: ''; position: absolute; inset: -40% -10% 60% -10%; pointer-events: none; opacity: 0.55; transition: opacity 0.5s;
  background: radial-gradient(60% 80% at 70% 0%, rgba(251, 146, 60, 0.22), transparent 70%); }
.icm-vp.ready::before { opacity: 1; }
.vp-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.4; background-image: radial-gradient(rgba(255, 255, 255, 0.025) 1px, transparent 1px); background-size: 3px 3px; }
.vp-top { position: relative; display: flex; align-items: center; justify-content: space-between; }
.vp-brand { display: inline-flex; align-items: center; gap: 5px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ex-violet); }
.vp-stamp { font-size: 9px; font-weight: 850; letter-spacing: 0.1em; padding: 3px 8px; border-radius: 6px; color: var(--ex-text-muted); background: var(--ex-steel-soft); border: 1px dashed var(--ex-border-strong); transition: all 0.4s var(--ex-spring); }
.vp-stamp.ready { color: var(--ex-cleared); background: var(--ex-cleared-soft); border: 1px solid color-mix(in srgb, var(--ex-cleared) 38%, transparent); }
.vp-ring { position: relative; display: grid; place-items: center; width: 64px; height: 64px; border-radius: 50%; margin: 0 auto;
  background: conic-gradient(var(--c) var(--p, 0deg), var(--ex-steel-soft) 0); transition: --p 0.7s var(--ex-spring); }
.vp-ring::after { content: ''; position: absolute; inset: 6px; border-radius: 50%; background: var(--ex-panel); }
.vp-rv { position: relative; z-index: 1; font-family: var(--ex-mono); font-size: 19px; font-weight: 850; color: var(--ex-text); }
.vp-rk { position: relative; z-index: 1; font-size: 9px; color: var(--ex-text-muted); align-self: flex-end; margin-bottom: 13px; }
.vp-wave { position: relative; display: flex; align-items: center; gap: 2px; height: 40px; }
.vp-b { flex: 1; border-radius: 999px; min-height: 4px; transition: height 0.5s var(--ex-spring), background 0.3s; }
.vp-eq { position: relative; display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; }
.vpe { display: flex; flex-direction: column; align-items: center; gap: 3px; }
.vpe-bar { width: 100%; max-width: 24px; height: 30px; border-radius: 5px; background: var(--ex-steel-soft); border: 1px solid var(--ex-border); overflow: hidden; display: flex; align-items: flex-end; }
.vpe-fill { width: 100%; border-radius: 4px 4px 0 0; transition: height 0.7s var(--ex-spring); }
.vpe-lab { font-size: 8px; font-weight: 700; text-transform: uppercase; color: var(--ex-text-muted); }
.vp-foot { position: relative; display: flex; flex-wrap: wrap; gap: 6px; }
.vp-rec, .vp-mode { display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; font-weight: 750; padding: 3px 7px; border-radius: 999px; }
.vp-rec.yes { color: var(--ex-cleared); background: var(--ex-cleared-soft); } .vp-rec.no { color: var(--ex-blocked); background: var(--ex-blocked-soft); }
.vp-mode { color: var(--ex-text-muted); background: var(--ex-steel-soft); border: 1px solid var(--ex-border); }

.icm-foot { position: relative; display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px 18px; }
.icm-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 17px; border-radius: 12px; font-size: 13px; font-weight: 800; cursor: pointer; font-family: inherit; }
.icm-btn.ghost { background: transparent; border: 1px solid var(--ex-border-strong); color: var(--ex-text-secondary); }
.icm-btn.primary { border: none; background: var(--ex-grad-hero); color: #1a1206; box-shadow: 0 8px 22px -10px rgba(234, 88, 12, 0.7); }
.icm-btn.primary.off { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
.spin { animation: ex-spin-slow 0.8s linear infinite; }

@media (max-width: 680px) { .icm-grid { grid-template-columns: 1fr; } .icm-vp { order: -1; } }
@media (prefers-reduced-motion: reduce) {
  .icm-aura, .spin { animation: none; } .icm-form > * { animation: none; }
  .vp-ring, .vp-b, .vpe-fill { transition: none; }
}
</style>
