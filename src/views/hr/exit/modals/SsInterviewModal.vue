<template>
  <Teleport to="body">
    <Presence>
      <div v-if="open" class="exm-overlay" @mousedown.self="$emit('close')">
        <Motion as="div" class="exm ex-grain" :class="{ sealing }"
          :initial="reduced ? false : { opacity: 0, y: 30, scale: 0.95 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 20, scale: 0.97 }" :transition="{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }">
          <span class="exm-aura" aria-hidden="true" />
          <span class="exm-sheen" aria-hidden="true" />
          <span v-if="sealing" class="exm-flash" aria-hidden="true" />

          <header class="exm-head">
            <span class="exm-ico"><MessagesSquare :size="18" /></span>
            <div class="exm-htxt">
              <span class="exm-eyebrow"><Lock :size="11" /> Confidential</span>
              <h3 class="exm-title">Exit interview</h3>
            </div>
            <button class="exm-x" type="button" @click="$emit('close')"><X :size="17" /></button>
          </header>

          <div class="exm-body">
            <p v-if="interview?.details" class="hrnote"><MessageSquare :size="13" /> {{ interview.details }}</p>
            <p class="lead">Your candid answers are confidential and shared only as anonymised insight. Thank you for helping us improve.</p>

            <Motion v-for="(q, i) in questions" :key="q.key" as="div" class="q"
              :initial="reduced ? false : { opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.32, delay: 0.05 + i * 0.05, ease: [0.16, 1, 0.3, 1] }">
              <span class="q-lab">{{ q.question }}</span>

              <!-- rating -->
              <div v-if="q.type === 'rating'" class="stars">
                <Motion v-for="n in 5" :key="n" as="button" type="button" class="star" :class="{ on: (ratings[q.key] || 0) >= n }"
                  :whileHover="reduced ? {} : { scale: 1.18, y: -2 }" :whileTap="{ scale: 0.9 }" @click="ratings[q.key] = n">
                  <Star :size="20" :fill="(ratings[q.key] || 0) >= n ? 'currentColor' : 'none'" />
                </Motion>
                <span v-if="ratings[q.key]" class="star-val">{{ RATING_WORD[ratings[q.key]] }}</span>
              </div>

              <!-- structured reason -->
              <ExSelect v-else-if="isReason(q.key)" v-model="primaryReason" :options="reasonOpts" searchable placeholder="Choose a reason…" />

              <!-- free text -->
              <textarea v-else v-model="answers[q.key]" rows="3" :placeholder="'Your thoughts…'" />
            </Motion>

            <label class="recommend" :class="{ on: wouldRecommend }">
              <span class="rec-ic"><ThumbsUp :size="15" /></span>
              <span class="rec-txt"><b>Would you recommend us as an employer?</b><i>Your honest take matters.</i></span>
              <span class="rec-switch" :class="{ on: wouldRecommend }" @click.prevent="wouldRecommend = !wouldRecommend"><span class="rec-knob" /></span>
            </label>
          </div>

          <footer class="exm-foot">
            <button class="exm-btn ghost" type="button" @click="$emit('close')">Cancel</button>
            <span class="foot-spacer" />
            <Motion as="button" type="button" class="exm-btn submit" :disabled="!canSubmit || busy"
              :whileHover="canSubmit && !busy ? { y: -1 } : {}" :whileTap="canSubmit && !busy ? { scale: 0.96 } : {}" @click="submit">
              <Loader2 v-if="busy" :size="15" class="spin" /><Check v-else :size="15" /> Submit feedback
            </Motion>
          </footer>
        </Motion>
      </div>
    </Presence>
  </Teleport>
</template>

<script setup>
import { reactive, ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { MessagesSquare, MessageSquare, Lock, X, Star, ThumbsUp, Check, Loader2 } from 'lucide-vue-next'
import ExSelect from '../components/ExSelect.vue'
import { REASON_CATEGORIES } from '@/composables/useExit'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  open: { type: Boolean, default: false },
  interview: { type: Object, default: null },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'submit'])
const reduced = prefersReduced()

const DEFAULT_QUESTIONS = [
  { key: 'overall', question: 'Overall, how was your experience here?', type: 'rating' },
  { key: 'management', question: 'How would you rate your manager / leadership?', type: 'rating' },
  { key: 'culture', question: 'How would you rate the work environment & culture?', type: 'rating' },
  { key: 'growth', question: 'How would you rate your career growth opportunities?', type: 'rating' },
  { key: 'compensation', question: 'How would you rate compensation & benefits?', type: 'rating' },
  { key: 'primary_reason', question: 'What is the primary reason for your departure?', type: 'text' },
  { key: 'suggestions', question: 'What could we have done better?', type: 'text' },
]
const RATING_WORD = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Great', 5: 'Excellent' }
const reasonOpts = [{ value: '', label: '(prefer not to say)' }, ...REASON_CATEGORIES.map(r => ({ value: r.key, label: r.label, icon: r.icon }))]

const questions = computed(() => (props.interview?.questions?.length ? props.interview.questions : DEFAULT_QUESTIONS))
const isReason = (key) => /reason/i.test(key)

const ratings = reactive({})
const answers = reactive({})
const primaryReason = ref('')
const wouldRecommend = ref(false)
const sealing = ref(false)

const ratingKeys = computed(() => questions.value.filter(q => q.type === 'rating').map(q => q.key))
const canSubmit = computed(() => ratingKeys.value.some(k => ratings[k]) || Object.values(answers).some(v => (v || '').trim()) || !!primaryReason.value)

watch(() => props.open, (o) => {
  if (!o) return
  Object.keys(ratings).forEach(k => delete ratings[k])
  Object.keys(answers).forEach(k => delete answers[k])
  primaryReason.value = ''
  wouldRecommend.value = false
  sealing.value = false
})
watch(() => props.busy, (b, prev) => { if (prev && !b) sealing.value = false })

const submit = () => {
  if (!canSubmit.value || props.busy) return
  sealing.value = true
  // feedback_summary = the first non-reason text answer (e.g. 'suggestions')
  const textKeys = questions.value.filter(q => q.type === 'text' && !isReason(q.key)).map(q => q.key)
  const summary = textKeys.map(k => answers[k]).find(v => (v || '').trim()) || null
  const responses = questions.value.map(q => {
    if (q.type === 'rating') return { question: q.key, rating: ratings[q.key] || null }
    if (isReason(q.key)) return { question: q.key, answer: primaryReason.value || null }
    return { question: q.key, answer: (answers[q.key] || '').trim() || null }
  })
  emit('submit', {
    ratings: { ...ratings },
    responses,
    would_recommend: wouldRecommend.value,
    primary_reason_category: primaryReason.value || null,
    feedback_summary: summary,
  })
}
</script>

<style scoped>
.exm-overlay { position: fixed; inset: 0; z-index: 1440; display: grid; place-items: center; padding: 20px;
  background: rgba(6, 5, 10, 0.66); backdrop-filter: blur(9px); -webkit-backdrop-filter: blur(9px); }
[data-theme="light"] .exm-overlay { background: rgba(60, 45, 20, 0.34); }
.exm { position: relative; overflow: hidden; width: min(560px, 96vw); max-height: 92vh; display: flex; flex-direction: column;
  border-radius: 24px; background: var(--ex-surface-elevated); border: 1px solid var(--ex-border-strong); box-shadow: var(--ex-shadow); }
.exm-aura { position: absolute; inset: -55% 20% 55% -12%; pointer-events: none;
  background: radial-gradient(60% 80% at 32% 0%, rgba(251, 146, 60, 0.16), transparent 70%); }
.exm-sheen { position: absolute; inset: 0 0 auto; height: 2px; pointer-events: none;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--ex-amber) 75%, transparent), transparent); }
.exm-flash { position: absolute; inset: 0; z-index: 6; pointer-events: none;
  background: radial-gradient(circle at 50% 40%, color-mix(in srgb, var(--ex-cleared) 28%, transparent), transparent 60%); animation: exm-flash 0.7s ease-out; }
@keyframes exm-flash { 0% { opacity: 0; transform: scale(0.6); } 30% { opacity: 1; } 100% { opacity: 0; transform: scale(1.3); } }

.exm-head { position: relative; z-index: 2; display: flex; align-items: center; gap: 13px; padding: 17px 18px 11px; }
.exm-ico { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0; color: var(--ex-violet); background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); box-shadow: var(--ex-violet-glow); }
.exm-htxt { flex: 1; min-width: 0; }
.exm-eyebrow { display: inline-flex; align-items: center; gap: 5px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ex-text-dim); }
.exm-title { font-size: 17px; font-weight: 840; margin: 2px 0 0; color: var(--ex-text); }
.exm-x { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; cursor: pointer; flex-shrink: 0; background: transparent; border: 1px solid var(--ex-border); color: var(--ex-text-muted); transition: color 0.2s, border-color 0.2s; }
.exm-x:hover { color: var(--ex-text); border-color: var(--ex-border-strong); }

.exm-body { position: relative; z-index: 2; padding: 4px 20px 8px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
.hrnote { display: flex; align-items: flex-start; gap: 7px; font-size: 12px; line-height: 1.45; color: var(--ex-text-secondary); margin: 4px 0 0; padding: 9px 11px; border-radius: 10px; background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.hrnote svg { color: var(--ex-violet); flex-shrink: 0; margin-top: 1px; }
.lead { margin: 0; font-size: 12.5px; line-height: 1.5; color: var(--ex-text-muted); }

.q { display: flex; flex-direction: column; gap: 8px; padding: 12px 13px; border-radius: 14px; background: var(--ex-surface); border: 1px solid var(--ex-border); }
.q-lab { font-size: 12.5px; font-weight: 700; color: var(--ex-text); line-height: 1.4; }
.stars { display: flex; align-items: center; gap: 4px; }
.star { background: none; border: none; cursor: pointer; color: var(--ex-steel); padding: 2px; line-height: 0; transition: color 0.2s; }
.star.on { color: var(--ex-amber); filter: drop-shadow(0 0 6px color-mix(in srgb, var(--ex-amber) 50%, transparent)); }
.star-val { margin-left: 8px; font-size: 11px; font-weight: 800; color: var(--ex-amber); letter-spacing: 0.04em; }
textarea { width: 100%; padding: 10px 12px; border-radius: 11px; font-size: 13px; font-family: inherit; background: rgba(0, 0, 0, 0.3); border: 1px solid var(--ex-border); color: var(--ex-text); resize: vertical; }
textarea::placeholder { color: var(--ex-text-dim); }
[data-theme="light"] textarea { background: rgba(255, 250, 242, 0.74); }

.recommend { display: flex; align-items: center; gap: 11px; padding: 12px 13px; border-radius: 14px; cursor: pointer;
  background: var(--ex-surface); border: 1px solid var(--ex-border); transition: border-color 0.25s, background 0.25s; }
.recommend.on { border-color: color-mix(in srgb, var(--ex-cleared) 38%, transparent); background: color-mix(in srgb, var(--ex-cleared) 7%, transparent); }
.rec-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 11px; flex-shrink: 0; color: var(--ex-violet); background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); transition: all 0.3s; }
.recommend.on .rec-ic { color: var(--ex-cleared); background: var(--ex-cleared-soft); border-color: color-mix(in srgb, var(--ex-cleared) 30%, transparent); }
.rec-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.rec-txt b { font-size: 12.5px; font-weight: 750; color: var(--ex-text); }
.rec-txt i { font-size: 11px; font-style: normal; color: var(--ex-text-muted); }
.rec-switch { position: relative; flex-shrink: 0; width: 42px; height: 24px; border-radius: 999px; background: var(--ex-steel-soft); border: 1px solid var(--ex-border-strong); transition: background 0.3s, border-color 0.3s; }
.rec-switch.on { background: var(--ex-cleared); border-color: transparent; }
.rec-knob { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; border-radius: 50%; background: var(--ex-text-muted); transition: transform 0.3s var(--ex-spring), background 0.3s; }
.rec-switch.on .rec-knob { transform: translateX(18px); background: #06281b; }

.exm-foot { position: relative; z-index: 2; display: flex; align-items: center; gap: 8px; padding: 12px 20px 18px; }
.foot-spacer { flex: 1; }
.exm-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px; border-radius: 12px; font-size: 13px; font-weight: 760; cursor: pointer; font-family: inherit; border: none; }
.exm-btn.ghost { background: transparent; border: 1px solid var(--ex-border-strong); color: var(--ex-text-secondary); }
.exm-btn.submit { padding: 11px 20px; background: linear-gradient(135deg, #6ee7b7, #34d399 55%, #10b981); color: #06281b; box-shadow: 0 8px 24px -10px rgba(52, 211, 153, 0.6); }
.exm-btn.submit:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
.spin { animation: ex-spin-slow 0.8s linear infinite; }
.exm-body::-webkit-scrollbar { width: 7px; }
.exm-body::-webkit-scrollbar-thumb { background: var(--ex-border-strong); border-radius: 999px; }

@media (prefers-reduced-motion: reduce) { .spin { animation: none; } .exm-flash { animation: none; display: none; } .rec-knob, .rec-switch, .rec-ic { transition: none; } }
</style>
