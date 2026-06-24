<template>
  <Teleport to="body">
    <Presence>
      <div v-if="open" class="exm-overlay" @mousedown.self="$emit('close')">
        <Motion as="div" class="exm ex-grain" :class="{ submitting: busy }"
          :initial="reduced ? false : { opacity: 0, y: 30, scale: 0.95 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 20, scale: 0.97 }" :transition="{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }">
          <span class="exm-aura" aria-hidden="true" />
          <span class="exm-sheen" aria-hidden="true" />

          <header class="exm-head">
            <span class="exm-ico"><component :is="isEdit ? FilePen : DoorOpen" :size="18" /></span>
            <div class="exm-htxt">
              <span class="exm-eyebrow"><Sparkles :size="11" /> {{ isEdit ? 'Amend resignation' : 'Begin your transition' }}</span>
              <h3 class="exm-title">{{ isEdit ? 'Edit resignation' : 'Submit resignation' }}</h3>
            </div>
            <button class="exm-x" type="button" @click="$emit('close')"><X :size="17" /></button>
          </header>

          <!-- stepper -->
          <div class="exm-steps">
            <div class="step-rail"><span class="step-beam" :style="{ width: railPct + '%' }" /></div>
            <button v-for="(s, i) in STEPS" :key="s.key" type="button" class="step" :class="{ on: step === i, done: step > i }" @click="goStep(i)">
              <span class="step-node"><component :is="step > i ? Check : s.icon" :size="13" /></span>
              <span class="step-lab">{{ s.label }}</span>
            </button>
          </div>

          <div class="exm-body">
            <Motion as="div" :key="step" class="panel"
              :initial="reduced ? false : { opacity: 0, x: dir * 26 }" :animate="{ opacity: 1, x: 0 }"
              :transition="{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }">

              <!-- STEP 1 · TYPE -->
              <template v-if="step === 0">
                <p class="lead">How are you moving on? This sets the right process for your separation.</p>
                <div class="types">
                  <button v-for="(t, i) in typeOpts" :key="t.key" type="button" class="type-card"
                    :class="{ on: form.resignation_type === t.key, locked: isEdit }" :disabled="isEdit && form.resignation_type !== t.key"
                    :style="{ '--d': (0.04 + i * 0.05) + 's' }" @click="!isEdit && (form.resignation_type = t.key)">
                    <span class="tc-ic"><component :is="t.icon" :size="17" /></span>
                    <span class="tc-txt"><b>{{ t.label }}</b><i>{{ t.desc }}</i></span>
                    <span class="tc-check"><Check :size="13" /></span>
                  </button>
                </div>
                <p v-if="isEdit" class="hint"><Info :size="12" /> Separation type is fixed once filed. You can still revise your reason and requested date.</p>
                <p v-else class="hint"><ShieldCheck :size="12" /> Mutual separation &amp; termination are initiated by HR — not listed here.</p>
              </template>

              <!-- STEP 2 · REASON -->
              <template v-else-if="step === 1">
                <p class="lead">What's driving your decision? <i>Optional &amp; confidential — it only helps us improve.</i></p>
                <div class="reasons">
                  <button v-for="(r, i) in REASON_CATEGORIES" :key="r.key" type="button" class="reason-chip"
                    :class="{ on: form.reason_category === r.key }" :style="{ '--d': (i * 0.025) + 's' }"
                    @click="form.reason_category = form.reason_category === r.key ? '' : r.key">
                    <component :is="r.icon" :size="13" /> {{ r.label }}
                  </button>
                </div>
                <label class="fl">A note for HR <i>optional</i></label>
                <textarea v-model="form.reason_detail" rows="3" maxlength="4000"
                  placeholder="Anything you'd like your manager &amp; HR to know…" />
                <span class="char">{{ (form.reason_detail || '').length }}/4000</span>
              </template>

              <!-- STEP 3 · TIMING -->
              <template v-else-if="step === 2">
                <p class="lead">When would you like your last working day to be?</p>
                <label class="fl">Requested last working day <i>optional</i></label>
                <HrDatePicker v-model="form.requested_last_working_date" :min="today" />
                <div class="timing-note">
                  <span class="tn-ic"><CalendarClock :size="15" /></span>
                  <div>
                    <b>Your notice period is set by policy.</b>
                    <span>Once accepted, HR confirms your notice period and final last working day based on your grade. Your requested date guides that decision.</span>
                  </div>
                </div>
                <div v-if="form.requested_last_working_date" class="timing-readout">
                  <Clock3 :size="13" /> About <b>{{ daysFromToday }}</b> day{{ daysFromToday === 1 ? '' : 's' }} from today
                </div>

                <label class="fl" for="ssr-pmail">Personal email <i>for your final documents</i></label>
                <div class="pmail-wrap">
                  <Mail :size="15" class="pmail-ic" />
                  <input id="ssr-pmail" v-model.trim="form.personal_email" type="email" class="pmail-input"
                    placeholder="you@personal.com" maxlength="255" />
                </div>
                <p class="hint"><ShieldCheck :size="12" /> Your relieving &amp; experience letters stay downloadable from a secure link even after your work access ends — we'll send it here too.</p>
              </template>

              <!-- STEP 4 · REVIEW -->
              <template v-else>
                <p class="lead">Review your {{ isEdit ? 'changes' : 'separation pass' }} before {{ isEdit ? 'saving' : 'submitting' }}.</p>

                <!-- boarding-pass style preview -->
                <div class="pass" :class="{ ready: confirm }">
                  <span class="pass-grid" aria-hidden="true" />
                  <div class="pass-main">
                    <div class="pass-top">
                      <span class="pass-eyebrow">Separation pass</span>
                      <span class="pass-stamp" :class="{ on: confirm }">{{ confirm ? 'READY' : 'DRAFT' }}</span>
                    </div>
                    <div class="pass-id">
                      <span class="pass-medal">{{ initials(empName || empCode || 'You') }}</span>
                      <div class="pass-who"><b>{{ empName || 'You' }}</b><i class="ex-mono">{{ empCode || '—' }}</i></div>
                      <span class="pass-type"><component :is="typeMeta.icon" :size="13" /> {{ typeMeta.label }}</span>
                    </div>
                    <div class="pass-rows">
                      <span class="pr"><i>Reason</i><b>{{ reasonLabel }}</b></span>
                      <span class="pr"><i>Requested last day</i><b>{{ form.requested_last_working_date ? fmtDate(form.requested_last_working_date) : 'HR to confirm' }}</b></span>
                      <span class="pr"><i>Routes to</i><b>Manager &amp; HR</b></span>
                    </div>
                    <p v-if="form.reason_detail" class="pass-note">“{{ form.reason_detail }}”</p>
                  </div>
                  <div class="pass-stub" aria-hidden="true">
                    <DoorOpen :size="20" />
                    <span class="pass-stub-t">EXIT</span>
                  </div>
                </div>

                <label class="confirm-row" :class="{ on: confirm }">
                  <input type="checkbox" v-model="confirm" />
                  <span>
                    <b>I understand</b> this notifies my manager &amp; HR{{ isEdit ? '' : ', and my notice period begins once the resignation is accepted.' }}
                    <template v-if="isEdit"> and updates my filed resignation.</template>
                  </span>
                </label>
              </template>
            </Motion>
          </div>

          <footer class="exm-foot">
            <button v-if="step > 0" class="exm-btn ghost" type="button" @click="back"><ChevronLeft :size="15" /> Back</button>
            <button v-else class="exm-btn ghost" type="button" @click="$emit('close')">Cancel</button>
            <span class="foot-spacer" />
            <Motion v-if="step < 3" as="button" type="button" class="exm-btn primary"
              :whileHover="reduced ? {} : { y: -1 }" :whileTap="{ scale: 0.97 }" @click="next">
              Continue <ChevronRight :size="15" />
            </Motion>
            <Motion v-else as="button" type="button" class="exm-btn submit" :disabled="!confirm || busy"
              :whileHover="confirm && !busy ? { y: -1 } : {}" :whileTap="confirm && !busy ? { scale: 0.96 } : {}" @click="submit">
              <Loader2 v-if="busy" :size="15" class="spin" /><component v-else :is="isEdit ? Check : Send" :size="15" />
              {{ isEdit ? 'Save changes' : 'Submit resignation' }}
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
import {
  DoorOpen, FilePen, Sparkles, X, Check, ChevronLeft, ChevronRight, Send, Loader2,
  Info, ShieldCheck, CalendarClock, Clock3, FileText, Heart, ListChecks, Stamp, Mail,
} from 'lucide-vue-next'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import {
  RESIGNATION_TYPES, REASON_CATEGORIES, resignationTypeMeta, reasonMeta,
  fmtDate, todayISO, daysBetween, initials,
} from '@/composables/useExit'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  open: { type: Boolean, default: false },
  editCase: { type: Object, default: null },
  empName: { type: String, default: '' },
  empCode: { type: String, default: '' },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'submit'])
const reduced = prefersReduced()
const today = todayISO()

const isEdit = computed(() => !!props.editCase)
const STEPS = [
  { key: 'type', label: 'Type', icon: FileText },
  { key: 'reason', label: 'Reason', icon: Heart },
  { key: 'timing', label: 'Timing', icon: CalendarClock },
  { key: 'review', label: 'Review', icon: Stamp },
]

const TYPE_DESC = {
  VOLUNTARY: 'Leaving by your own choice.',
  RETIREMENT: 'Concluding your career with us.',
  CONTRACT_COMPLETION: 'Your fixed-term contract has run its course.',
  PROBATION_EXIT: 'Stepping away during your probation.',
  TRANSFER: 'Moving to another entity or location.',
}
const typeOpts = RESIGNATION_TYPES.filter(t => t.selfAllowed).map(t => ({ key: t.key, label: t.label, icon: t.icon, desc: TYPE_DESC[t.key] || '' }))

const step = ref(0)
const dir = ref(1)
const confirm = ref(false)
const form = reactive({ resignation_type: 'VOLUNTARY', reason_category: '', reason_detail: '', requested_last_working_date: '', personal_email: '' })

const railPct = computed(() => (step.value / (STEPS.length - 1)) * 100)
const typeMeta = computed(() => resignationTypeMeta(form.resignation_type))
const reasonLabel = computed(() => (form.reason_category ? reasonMeta(form.reason_category).label : 'Prefer not to say'))
const daysFromToday = computed(() => Math.max(0, daysBetween(today, form.requested_last_working_date) ?? 0))

const goStep = (i) => { dir.value = i > step.value ? 1 : -1; step.value = i }
const next = () => { if (step.value < 3) { dir.value = 1; step.value++ } }
const back = () => { if (step.value > 0) { dir.value = -1; step.value-- } }

watch(() => props.open, (o) => {
  if (!o) return
  step.value = 0; dir.value = 1; confirm.value = false
  const e = props.editCase
  form.resignation_type = e?.resignation_type || 'VOLUNTARY'
  form.reason_category = e?.reason_category || ''
  form.reason_detail = e?.reason_detail || ''
  form.requested_last_working_date = e?.requested_last_working_date || ''
  form.personal_email = e?.personal_email || ''
}, { immediate: true })

const submit = () => {
  if (!confirm.value || props.busy) return
  emit('submit', {
    resignation_type: form.resignation_type,
    reason_category: form.reason_category || null,
    reason_detail: form.reason_detail?.trim() || null,
    requested_last_working_date: form.requested_last_working_date || null,
    personal_email: form.personal_email?.trim() || null,
  })
}
</script>

<style scoped>
.exm-overlay { position: fixed; inset: 0; z-index: 1440; display: grid; place-items: center; padding: 20px;
  background: rgba(6, 5, 10, 0.66); backdrop-filter: blur(9px); -webkit-backdrop-filter: blur(9px); }
[data-theme="light"] .exm-overlay { background: rgba(60, 45, 20, 0.34); }
.exm { position: relative; overflow: hidden; width: min(600px, 96vw); max-height: 92vh; display: flex; flex-direction: column;
  border-radius: 24px; background: var(--ex-surface-elevated); border: 1px solid var(--ex-border-strong); box-shadow: var(--ex-shadow); }
.exm-aura { position: absolute; inset: -55% 20% 55% -12%; pointer-events: none;
  background: radial-gradient(60% 80% at 32% 0%, rgba(251, 146, 60, 0.16), transparent 70%); }
.exm-sheen { position: absolute; inset: 0 0 auto; height: 2px; pointer-events: none;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--ex-amber) 75%, transparent), transparent); }

.exm-head { position: relative; z-index: 2; display: flex; align-items: center; gap: 13px; padding: 17px 18px 11px; }
.exm-ico { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0;
  color: var(--ex-violet); background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); box-shadow: var(--ex-violet-glow); }
.exm-htxt { flex: 1; min-width: 0; }
.exm-eyebrow { display: inline-flex; align-items: center; gap: 5px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ex-text-dim); }
.exm-title { font-size: 17px; font-weight: 840; margin: 2px 0 0; color: var(--ex-text); }
.exm-x { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; cursor: pointer; flex-shrink: 0;
  background: transparent; border: 1px solid var(--ex-border); color: var(--ex-text-muted); transition: color 0.2s, border-color 0.2s; }
.exm-x:hover { color: var(--ex-text); border-color: var(--ex-border-strong); }

.exm-steps { position: relative; z-index: 2; display: flex; justify-content: space-between; gap: 6px; padding: 6px 26px 14px; }
.step-rail { position: absolute; left: 44px; right: 44px; top: 20px; height: 2px; border-radius: 2px; background: var(--ex-border-strong); overflow: hidden; }
.step-beam { position: absolute; inset: 0 auto 0 0; border-radius: 2px; background: var(--ex-grad-hero); box-shadow: 0 0 8px color-mix(in srgb, var(--ex-amber) 50%, transparent); transition: width 0.45s var(--ex-spring); }
.step { position: relative; display: flex; flex-direction: column; align-items: center; gap: 5px; background: none; border: none; cursor: pointer; font-family: inherit; flex: 1; }
.step-node { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%; transition: all 0.3s var(--ex-spring);
  background: var(--ex-surface); border: 1.5px solid var(--ex-border-strong); color: var(--ex-text-muted); }
.step.on .step-node { border-color: var(--ex-violet); color: var(--ex-violet); background: var(--ex-violet-soft); box-shadow: 0 0 0 4px color-mix(in srgb, var(--ex-violet) 14%, transparent); transform: scale(1.08); }
.step.done .step-node { border-color: var(--ex-cleared); color: var(--ex-cleared); background: var(--ex-cleared-soft); }
.step-lab { font-size: 10.5px; font-weight: 750; color: var(--ex-text-muted); }
.step.on .step-lab { color: var(--ex-text); }

.exm-body { position: relative; z-index: 2; padding: 4px 20px 8px; overflow-y: auto; }
.panel { display: flex; flex-direction: column; gap: 11px; }
.lead { margin: 2px 0 4px; font-size: 13px; line-height: 1.5; color: var(--ex-text-secondary); }
.lead i { font-style: normal; color: var(--ex-text-muted); }
.hint { display: inline-flex; align-items: flex-start; gap: 6px; font-size: 11.5px; line-height: 1.45; color: var(--ex-text-muted); margin: 2px 0 0; }
.hint svg { color: var(--ex-violet); flex-shrink: 0; margin-top: 1px; }

/* type cards */
.types { display: flex; flex-direction: column; gap: 8px; }
.type-card { position: relative; display: flex; align-items: center; gap: 12px; padding: 12px 13px; border-radius: 14px; cursor: pointer; text-align: left; font-family: inherit;
  background: var(--ex-surface); border: 1px solid var(--ex-border); transition: border-color 0.22s, background 0.22s, transform 0.22s var(--ex-spring);
  animation: ssrm-pop 0.4s var(--ex-spring) backwards; animation-delay: var(--d); }
.type-card:hover:not(:disabled) { transform: translateY(-2px); border-color: var(--ex-border-strong); }
.type-card.on { border-color: var(--ex-violet-border); background: var(--ex-violet-soft); }
.type-card.locked:disabled { opacity: 0.4; cursor: not-allowed; }
.type-card.locked.on { opacity: 1; cursor: default; }
.tc-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0; color: var(--ex-violet);
  background: color-mix(in srgb, var(--ex-violet) 13%, transparent); border: 1px solid var(--ex-violet-border); }
.tc-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.tc-txt b { font-size: 13.5px; font-weight: 800; color: var(--ex-text); }
.tc-txt i { font-size: 11.5px; font-style: normal; color: var(--ex-text-muted); line-height: 1.35; }
.tc-check { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0; color: #06281b;
  background: var(--ex-cleared); opacity: 0; transform: scale(0.5); transition: all 0.25s var(--ex-spring); }
.type-card.on .tc-check { opacity: 1; transform: scale(1); }

/* reasons */
.reasons { display: flex; flex-wrap: wrap; gap: 7px; }
.reason-chip { display: inline-flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 999px; cursor: pointer; font-size: 12px; font-weight: 700; font-family: inherit;
  background: var(--ex-surface); border: 1px solid var(--ex-border); color: var(--ex-text-secondary); transition: all 0.2s;
  animation: ssrm-pop 0.34s var(--ex-spring) backwards; animation-delay: var(--d); }
.reason-chip svg { color: var(--ex-violet); }
.reason-chip:hover { border-color: var(--ex-border-strong); }
.reason-chip.on { border-color: var(--ex-violet-border); background: var(--ex-violet-soft); color: var(--ex-violet); }
.reason-chip.on svg { color: inherit; }

.fl { font-size: 11px; font-weight: 750; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ex-text-muted); margin-top: 4px; }
.fl i { font-style: normal; text-transform: none; letter-spacing: 0; font-weight: 600; color: var(--ex-text-dim); margin-left: 5px; }
textarea { width: 100%; padding: 10px 12px; border-radius: 11px; font-size: 13px; font-family: inherit; background: rgba(0, 0, 0, 0.3); border: 1px solid var(--ex-border); color: var(--ex-text); resize: vertical; }
textarea::placeholder { color: var(--ex-text-dim); }
[data-theme="light"] textarea { background: rgba(255, 250, 242, 0.74); }
.char { align-self: flex-end; font-size: 10px; color: var(--ex-text-dim); font-family: var(--ex-mono); }

/* timing */
.timing-note { display: flex; align-items: flex-start; gap: 10px; padding: 12px 13px; border-radius: 13px; background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); margin-top: 4px; }
.tn-ic { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0; color: var(--ex-violet); background: color-mix(in srgb, var(--ex-violet) 14%, transparent); }
.timing-note b { display: block; font-size: 12.5px; font-weight: 800; color: var(--ex-text); }
.timing-note span { font-size: 11.5px; line-height: 1.5; color: var(--ex-text-secondary); }
.timing-readout { display: inline-flex; align-items: center; gap: 6px; align-self: flex-start; font-size: 12px; font-weight: 650; color: var(--ex-text-muted); }
.timing-readout svg { color: var(--ex-violet); }
.timing-readout b { color: var(--ex-text); font-family: var(--ex-mono); }
.pmail-wrap { position: relative; }
.pmail-ic { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--ex-text-dim); pointer-events: none; }
.pmail-input { width: 100%; padding: 10px 12px 10px 36px; border-radius: 11px; font-size: 13px; font-family: inherit; color: var(--ex-text);
  background: rgba(0, 0, 0, 0.3); border: 1px solid var(--ex-border); transition: border-color 0.2s; }
.pmail-input::placeholder { color: var(--ex-text-dim); }
.pmail-input:focus { outline: none; border-color: var(--ex-violet-border); }
[data-theme="light"] .pmail-input { background: rgba(255, 250, 242, 0.74); }

/* separation pass */
.pass { position: relative; display: flex; overflow: hidden; border-radius: 18px; background: var(--ex-panel);
  border: 1px solid color-mix(in srgb, var(--ex-amber) 24%, var(--ex-border)); box-shadow: 0 14px 36px -16px rgba(0, 0, 0, 0.5); transition: border-color 0.4s, box-shadow 0.4s; }
.pass.ready { border-color: color-mix(in srgb, var(--ex-cleared) 40%, transparent); box-shadow: 0 16px 40px -14px color-mix(in srgb, var(--ex-cleared) 35%, transparent); }
.pass-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(var(--ex-border) 1px, transparent 1px), linear-gradient(90deg, var(--ex-border) 1px, transparent 1px); background-size: 22px 22px;
  -webkit-mask: radial-gradient(120% 100% at 100% 0, #000, transparent 72%); mask: radial-gradient(120% 100% at 100% 0, #000, transparent 72%); }
.pass-main { position: relative; flex: 1; min-width: 0; padding: 14px 15px; display: flex; flex-direction: column; gap: 10px; }
.pass-top { display: flex; align-items: center; justify-content: space-between; }
.pass-eyebrow { font-size: 9.5px; font-weight: 850; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ex-text-dim); }
.pass-stamp { font-size: 10px; font-weight: 900; letter-spacing: 0.1em; padding: 3px 10px; border-radius: 7px; color: var(--ex-text-muted); background: var(--ex-steel-soft); border: 1px solid var(--ex-border-strong); transition: all 0.4s; }
.pass-stamp.on { color: #06281b; background: var(--ex-cleared); border-color: transparent; transform: rotate(-3deg); box-shadow: 0 0 14px -2px color-mix(in srgb, var(--ex-cleared) 60%, transparent); }
.pass-id { display: flex; align-items: center; gap: 11px; }
.pass-medal { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0; font-family: var(--ex-mono); font-size: 13px; font-weight: 850;
  color: var(--ex-violet); background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.pass-who { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.pass-who b { font-size: 14px; font-weight: 820; color: var(--ex-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pass-who i { font-size: 10.5px; font-style: normal; color: var(--ex-text-muted); }
.pass-type { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 800; padding: 4px 9px; border-radius: 999px; white-space: nowrap;
  color: var(--ex-violet); background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.pass-rows { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 14px; padding-top: 9px; border-top: 1px dashed var(--ex-border); }
.pr { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.pr i { font-size: 9px; font-style: normal; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ex-text-dim); }
.pr b { font-size: 12px; font-weight: 750; color: var(--ex-text); }
.pass-note { margin: 0; font-size: 11.5px; font-style: italic; line-height: 1.45; color: var(--ex-text-muted); padding-top: 8px; border-top: 1px dashed var(--ex-border); }
.pass-stub { position: relative; flex-shrink: 0; width: 64px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; color: var(--ex-violet);
  background: var(--ex-violet-soft); border-left: 2px dashed var(--ex-violet-border); }
.pass-stub-t { font-size: 9px; font-weight: 900; letter-spacing: 0.18em; writing-mode: vertical-rl; }

.confirm-row { display: flex; align-items: flex-start; gap: 10px; padding: 12px 13px; border-radius: 13px; cursor: pointer; margin-top: 2px;
  background: var(--ex-surface); border: 1px solid var(--ex-border); transition: border-color 0.25s, background 0.25s; }
.confirm-row.on { border-color: color-mix(in srgb, var(--ex-cleared) 38%, transparent); background: color-mix(in srgb, var(--ex-cleared) 7%, transparent); }
.confirm-row input { width: 17px; height: 17px; margin-top: 1px; accent-color: var(--ex-cleared); flex-shrink: 0; cursor: pointer; }
.confirm-row span { font-size: 12px; line-height: 1.5; color: var(--ex-text-secondary); }
.confirm-row b { color: var(--ex-text); }

.exm-foot { position: relative; z-index: 2; display: flex; align-items: center; gap: 8px; padding: 12px 20px 18px; }
.foot-spacer { flex: 1; }
.exm-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px; border-radius: 12px; font-size: 13px; font-weight: 760; cursor: pointer; font-family: inherit; border: none; transition: opacity 0.2s; }
.exm-btn.ghost { background: transparent; border: 1px solid var(--ex-border-strong); color: var(--ex-text-secondary); }
.exm-btn.ghost:hover { color: var(--ex-text); }
.exm-btn.primary { background: var(--ex-grad-hero); color: #1a1206; }
.exm-btn.submit { padding: 11px 20px; background: linear-gradient(135deg, #6ee7b7, #34d399 55%, #10b981); color: #06281b; box-shadow: 0 8px 24px -10px rgba(52, 211, 153, 0.6); }
.exm-btn.submit:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
.spin { animation: ex-spin-slow 0.8s linear infinite; }

.exm-body::-webkit-scrollbar { width: 7px; }
.exm-body::-webkit-scrollbar-thumb { background: var(--ex-border-strong); border-radius: 999px; }

@keyframes ssrm-pop { from { opacity: 0; transform: translateY(8px) scale(0.96); } to { opacity: 1; transform: translateY(0) scale(1); } }
@media (max-width: 560px) { .pass-rows { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { .spin { animation: none; } .type-card, .reason-chip { animation: none; } .step-beam, .pass, .pass-stamp { transition: none; } }
</style>
