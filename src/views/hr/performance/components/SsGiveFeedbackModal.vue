<template>
  <teleport to="body">
    <Presence>
      <Motion v-if="open && req" key="ov" as="div" class="gf-ov perf-scope" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
        :exit="{ opacity: 0 }" :transition="{ duration: 0.22 }" @click.self="$emit('close')">
        <Motion as="div" class="gf" :class="{ locked }" :initial="{ opacity: 0, y: 22, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 14, scale: 0.98 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
          <span class="gf-edge" aria-hidden="true" />
          <header class="gf-head">
            <span class="gf-ic" :class="{ done: submitted, declined }"><component :is="headIcon" :size="18" /></span>
            <div class="gf-titles">
              <b>{{ headTitle }}</b>
              <span>on {{ req.subject_name }}{{ req.subject_designation ? ' · ' + req.subject_designation : '' }}</span>
            </div>
            <span v-if="locked" class="gf-stamp" :class="{ declined }">{{ declined ? 'Declined' : 'Submitted' }}</span>
            <button class="gf-x" type="button" @click="$emit('close')"><X :size="16" /></button>
          </header>

          <div class="gf-body">
            <p v-if="req.prompt" class="gf-prompt">{{ req.prompt }}</p>

            <!-- declined state -->
            <div v-if="declined" class="gf-declined">
              <CircleSlash :size="20" />
              <div><b>You declined this request</b><p>You chose not to provide feedback. This is final and can't be edited.</p></div>
            </div>

            <template v-else>
              <p v-if="req.anonymous && !locked" class="gf-anon"><Eye :size="12" /> Your response is anonymous — only aggregated themes are shown.</p>
              <p v-else-if="locked" class="gf-lockmsg"><Lock :size="12" /> This feedback has been submitted and is now read-only.</p>

              <!-- competency ratings -->
              <div v-for="c in localRatings" :key="c.key" class="gf-comp" :class="{ ro: locked }">
                <span class="gf-comp-lab">{{ c.label }}</span>
                <!-- editable pips -->
                <div v-if="!locked" class="gf-pips">
                  <button v-for="n in max" :key="n" type="button" class="gf-pip" :class="{ on: c.rating >= n, exact: c.rating === n }" @click="c.rating = (c.rating === n ? null : n)">{{ n }}</button>
                </div>
                <!-- read-only value + meter -->
                <div v-else class="gf-comp-ro">
                  <span class="gf-comp-meter"><i :style="{ width: ((c.rating || 0) / max * 100) + '%' }" /></span>
                  <span class="gf-comp-val" :class="{ muted: c.rating == null }">{{ c.rating != null ? c.rating : '—' }}<i>/{{ max }}</i></span>
                </div>
              </div>

              <!-- text fields -->
              <div class="gf-field">
                <label>Strengths</label>
                <textarea v-if="!locked" v-model="strengths" rows="2" placeholder="What does this person do well?" />
                <p v-else class="gf-ro">{{ strengths || 'No note provided.' }}</p>
              </div>
              <div class="gf-field">
                <label>Areas to improve</label>
                <textarea v-if="!locked" v-model="improvements" rows="2" placeholder="Where could they grow?" />
                <p v-else class="gf-ro">{{ improvements || 'No note provided.' }}</p>
              </div>
              <div class="gf-field">
                <label>Other comments</label>
                <textarea v-if="!locked" v-model="comments" rows="2" placeholder="Anything else…" />
                <p v-else class="gf-ro">{{ comments || 'No note provided.' }}</p>
              </div>
            </template>
          </div>

          <footer class="gf-foot">
            <!-- locked: view-only — only Close -->
            <template v-if="locked">
              <span class="gf-grow" />
              <button class="perf-btn perf-btn-primary" type="button" @click="$emit('close')"><Check :size="13" /> Done</button>
            </template>
            <!-- editable -->
            <template v-else>
              <button class="perf-btn gf-decline" type="button" :disabled="!!busy" @click="submit(false, true)">
                <Loader2 v-if="busy === 'decline'" :size="13" class="perf-spin" /><CircleSlash v-else :size="13" /> Decline
              </button>
              <span class="gf-grow" />
              <button class="perf-btn perf-btn-ghost" type="button" :disabled="!!busy" @click="submit(false, false)">
                <Loader2 v-if="busy === 'draft'" :size="13" class="perf-spin" /><Check v-else :size="13" /> Save draft
              </button>
              <button class="perf-btn perf-btn-primary" type="button" :disabled="!!busy || !canSubmit" :title="canSubmit ? '' : 'Rate at least one competency'" @click="submit(true, false)">
                <Loader2 v-if="busy === 'submit'" :size="13" class="perf-spin" /><Send v-else :size="13" /> Submit
              </button>
            </template>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { Orbit, X, Eye, Check, Send, Loader2, CircleSlash, CheckCircle2, Lock } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { submitMyFeedback } from '@/composables/usePerformance'

const props = defineProps({ open: Boolean, req: { type: Object, default: null } })
const emit = defineEmits(['close', 'done'])
const toast = useToast()

const localRatings = ref([])
const strengths = ref('')
const improvements = ref('')
const comments = ref('')
const busy = ref(false)
const max = computed(() => Math.round(props.req?.rating_max || 5))

// a SUBMITTED or DECLINED response is locked → the modal is view-only (no re-submit).
const submitted = computed(() => props.req?.status === 'SUBMITTED')
const declined = computed(() => props.req?.status === 'DECLINED')
const locked = computed(() => submitted.value || declined.value)
const canSubmit = computed(() => localRatings.value.some(c => c.rating != null) || !!(strengths.value || improvements.value || comments.value))

const headIcon = computed(() => declined.value ? CircleSlash : submitted.value ? CheckCircle2 : Orbit)
const headTitle = computed(() => declined.value ? 'Feedback declined' : submitted.value ? 'Feedback submitted' : 'Give feedback')

watch(() => props.open, (v) => {
  if (v && props.req) {
    const existing = {}
    for (const r of (props.req.ratings || [])) existing[r.key] = r.rating
    localRatings.value = (props.req.competencies || []).map(c => ({ key: c.key, label: c.label, rating: existing[c.key] ?? null }))
    strengths.value = props.req.strengths || ''
    improvements.value = props.req.improvements || ''
    comments.value = props.req.comments || ''
  }
})

async function submit(doSubmit, decline) {
  if (locked.value) return   // guard: never re-submit a locked response
  busy.value = decline ? 'decline' : (doSubmit ? 'submit' : 'draft')
  try {
    await submitMyFeedback(props.req.response_id, {
      ratings: localRatings.value.map(c => ({ key: c.key, label: c.label, rating: c.rating })),
      strengths: strengths.value || null, improvements: improvements.value || null, comments: comments.value || null,
      submit: doSubmit, decline,
    })
    toast.success(decline ? 'Feedback declined' : doSubmit ? 'Feedback submitted' : 'Draft saved')
    emit('done')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to submit') }
  finally { busy.value = false }
}
</script>

<style scoped>
.gf-ov { position: fixed; inset: 0; z-index: 1320; display: flex; align-items: center; justify-content: center; padding: 24px;
  background: rgba(5,5,6,0.64); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); }
.gf { position: relative; width: 100%; max-width: 540px; max-height: 90vh; display: flex; flex-direction: column; overflow: hidden; border-radius: 22px;
  background: var(--perf-surface-elevated); border: 1px solid var(--perf-border-strong); box-shadow: 0 44px 100px -42px rgba(0,0,0,0.88); }
.gf-edge { position: absolute; left: 0; right: 0; top: 0; height: 3px; background: var(--perf-grad-hero); }
.gf.locked .gf-edge { background: linear-gradient(90deg, var(--perf-ok), color-mix(in srgb, var(--perf-ok) 60%, var(--perf-gold))); }
.gf-head { display: flex; align-items: center; gap: 12px; padding: 17px 18px 14px; border-bottom: 1px solid var(--perf-border); }
.gf-ic { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0; color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 14%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 30%, transparent); }
.gf-ic.done { color: var(--perf-ok); background: var(--perf-ok-soft); border-color: color-mix(in srgb, var(--perf-ok) 30%, transparent); }
.gf-ic.declined { color: var(--perf-text-muted); background: var(--perf-unset-soft); border-color: var(--perf-border-strong); }
.gf-titles { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.gf-titles b { font-size: 16px; font-weight: 800; color: var(--perf-text); }
.gf-titles span { font-size: 12px; color: var(--perf-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.gf-stamp { flex-shrink: 0; font-size: 10px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; padding: 4px 10px; border-radius: 999px; color: var(--perf-ok); background: var(--perf-ok-soft); border: 1px solid color-mix(in srgb, var(--perf-ok) 30%, transparent); }
.gf-stamp.declined { color: var(--perf-text-muted); background: var(--perf-unset-soft); border-color: var(--perf-border-strong); }
.gf-x { width: 32px; height: 32px; border-radius: 9px; display: grid; place-items: center; cursor: pointer; color: var(--perf-text-muted); background: transparent; border: 1px solid var(--perf-border); transition: all 0.2s; }
.gf-x:hover { color: var(--perf-text); transform: rotate(90deg); }
.gf-body { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 18px; display: flex; flex-direction: column; gap: 13px; }
.gf-prompt { margin: 0; font-size: 12.5px; color: var(--perf-text-secondary); line-height: 1.5; padding: 10px 12px; border-radius: 10px; background: var(--perf-panel); border: 1px solid var(--perf-border); }
.gf-anon { display: flex; align-items: center; gap: 6px; margin: 0; font-size: 11.5px; color: var(--perf-orange); }
.gf-lockmsg { display: flex; align-items: center; gap: 6px; margin: 0; font-size: 11.5px; color: var(--perf-ok); }
.gf-declined { display: flex; align-items: flex-start; gap: 12px; padding: 14px 15px; border-radius: 13px; background: var(--perf-unset-soft); border: 1px solid var(--perf-border-strong); }
.gf-declined :deep(svg) { color: var(--perf-text-muted); flex-shrink: 0; margin-top: 1px; }
.gf-declined b { font-size: 13px; font-weight: 800; color: var(--perf-text); }
.gf-declined p { margin: 3px 0 0; font-size: 11.5px; color: var(--perf-text-muted); line-height: 1.45; }
.gf-comp { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 9px 11px; border-radius: 11px; background: var(--perf-panel); border: 1px solid var(--perf-border); }
.gf-comp.ro { background: var(--perf-surface); }
.gf-comp-lab { font-size: 12.5px; font-weight: 650; color: var(--perf-text); }
.gf-pips { display: inline-flex; gap: 4px; }
.gf-pip { width: 30px; height: 30px; border-radius: 8px; cursor: pointer; font: inherit; font-size: 12px; font-weight: 800; color: var(--perf-text-muted); background: var(--perf-surface-elevated); border: 1px solid var(--perf-border); transition: all 0.16s; font-variant-numeric: tabular-nums; }
.gf-pip:hover { color: var(--perf-text); transform: translateY(-1px); }
.gf-pip.on { color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 14%, transparent); border-color: color-mix(in srgb, var(--perf-gold) 36%, transparent); }
.gf-pip.exact { box-shadow: 0 0 0 2px color-mix(in srgb, var(--perf-gold) 40%, transparent); }
.gf-comp-ro { display: flex; align-items: center; gap: 10px; }
.gf-comp-meter { width: 96px; height: 6px; border-radius: 999px; background: var(--perf-track); overflow: hidden; }
.gf-comp-meter i { display: block; height: 100%; border-radius: 999px; background: var(--perf-grad-hero); }
.gf-comp-val { font-size: 14px; font-weight: 850; color: var(--perf-gold); font-variant-numeric: tabular-nums; min-width: 42px; text-align: right; }
.gf-comp-val.muted { color: var(--perf-text-dim); }
.gf-comp-val i { font-size: 9px; font-style: normal; font-weight: 600; color: var(--perf-text-muted); }
.gf-field { display: flex; flex-direction: column; gap: 6px; }
.gf-field label { font-size: 11.5px; font-weight: 700; color: var(--perf-text-secondary); }
.gf-field textarea { width: 100%; resize: vertical; min-height: 48px; padding: 9px 11px; border-radius: 10px; font: inherit; font-size: 12.5px; color: var(--hr-input-text, var(--perf-text)); background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); }
.gf-field textarea:focus { outline: none; border-color: var(--perf-border-warm); }
.gf-ro { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--perf-text-secondary); white-space: pre-wrap; padding: 9px 11px; border-radius: 10px; background: var(--perf-panel); border: 1px solid var(--perf-border); }
.gf-foot { display: flex; align-items: center; gap: 10px; padding: 13px 18px; border-top: 1px solid var(--perf-border); }
.gf-grow { flex: 1; }
.gf-decline { color: var(--perf-text-muted); }
.gf-decline:hover { color: var(--perf-conflict); border-color: color-mix(in srgb, var(--perf-conflict) 30%, transparent); }
@media (prefers-reduced-motion: reduce) { .gf-x:hover { transform: none; } .gf-pip:hover { transform: none; } }
</style>
