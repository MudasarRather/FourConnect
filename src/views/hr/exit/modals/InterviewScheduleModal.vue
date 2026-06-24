<template>
  <Teleport to="body">
    <Presence>
      <div v-if="open" class="ism-overlay" @mousedown.self="close">
        <Motion as="div" class="ism ex-grain" :class="`owner-${modeMeta.owner}`"
          :initial="reduced ? false : { opacity: 0, y: 26, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 18, scale: 0.97 }" :transition="{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }">
          <span class="ism-aura" aria-hidden="true" />
          <span class="ism-edge" aria-hidden="true" />

          <header class="ism-head">
            <span class="ism-ico"><CalendarClock :size="18" /></span>
            <div class="ism-htxt">
              <h3 class="ism-title">Schedule exit interview</h3>
              <p class="ism-sub">{{ caseInfo?.employee_name || '—' }} · <span class="ex-mono">{{ caseInfo?.case_number || '' }}</span></p>
            </div>
            <button class="ism-x" @click="close" type="button"><X :size="17" /></button>
          </header>

          <div class="ism-grid">
            <!-- ── form column ── -->
            <div class="ism-form">
              <!-- mode -->
              <div class="fld">
                <label>Format <i>*</i></label>
                <div class="mode-grid">
                  <button v-for="m in MODES" :key="m.key" type="button" class="mode-opt" :class="{ on: mode === m.key }" @click="mode = m.key">
                    <span class="mo-ic"><component :is="m.icon" :size="16" /></span>
                    <span class="mo-l">{{ m.label }}</span>
                    <span class="mo-tag" :class="m.owner">{{ m.owner === 'hr' ? 'HR-led' : 'Employee' }}</span>
                  </button>
                </div>
                <p class="mode-desc"><component :is="modeMeta.icon" :size="12" /> {{ modeMeta.desc }}</p>
              </div>

              <!-- date / time -->
              <div class="fld-row">
                <div class="fld"><label>{{ isForm ? 'Complete by' : 'Date' }} <i v-if="!isForm">*</i><span v-if="isForm" class="opt">optional</span></label>
                  <HrDatePicker v-model="date" :min="today" /></div>
                <div v-if="!isForm" class="fld"><label>Time</label>
                  <input v-model="time" type="time" class="time-in" /></div>
              </div>

              <!-- details / instructions -->
              <div class="fld">
                <label>{{ modeMeta.detailLabel }}<span v-if="modeMeta.owner === 'employee'" class="opt">optional</span></label>
                <div class="det-wrap">
                  <component :is="modeMeta.detailIcon" :size="14" class="det-ic" />
                  <textarea v-model="details" rows="2" :placeholder="modeMeta.detailPh" />
                </div>
              </div>

              <!-- corporate workflow strip -->
              <div class="flow">
                <span class="flow-h">How this works</span>
                <div class="flow-steps">
                  <div v-for="(s, i) in steps" :key="i" class="fstep" :class="{ on: i === 0 }">
                    <span class="fs-dot"><component :is="s.icon" :size="11" /></span>
                    <span class="fs-l">{{ s.label }}</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- ── live invitation preview (what the employee will see) ── -->
            <aside class="ism-prev">
              <span class="pv-grain" aria-hidden="true" />
              <div class="pv-top">
                <span class="pv-brand"><Send :size="12" /> Employee will see</span>
                <span class="pv-stamp" :class="{ ready: canSubmit }">{{ canSubmit ? 'READY' : 'DRAFT' }}</span>
              </div>
              <Presence mode="wait">
                <Motion :key="mode" as="div" class="pv-card" :class="modeMeta.owner"
                  :initial="reduced ? false : { opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: -8 }"
                  :transition="{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }">
                  <span class="pvc-ic"><component :is="modeMeta.icon" :size="20" /></span>
                  <span class="pvc-kind">{{ modeMeta.owner === 'hr' ? 'Interview invitation' : 'Confidential exit survey' }}</span>
                  <span class="pvc-when">{{ previewWhen }}</span>
                  <p v-if="details.trim()" class="pvc-det">“{{ details.trim() }}”</p>
                  <span class="pvc-foot"><component :is="modeMeta.owner === 'hr' ? Mic : ClipboardCheck" :size="11" />
                    {{ modeMeta.owner === 'hr' ? 'Attend — your interviewer records it' : 'You complete it when ready' }}</span>
                </Motion>
              </Presence>
              <p class="pv-note"><BellRing :size="11" /> Scheduling instantly surfaces this on the employee’s self-service exit page.</p>
            </aside>
          </div>

          <footer class="ism-foot">
            <button class="ism-btn ghost" @click="close" type="button">Cancel</button>
            <Motion as="button" class="ism-btn primary" :class="{ off: !canSubmit || busy }" type="button"
              @click="submit" :whileHover="canSubmit && !busy ? { y: -2 } : {}" :whileTap="canSubmit && !busy ? { scale: 0.96 } : {}">
              <Loader2 v-if="busy" :size="15" class="spin" /><Send v-else :size="15" />
              {{ isForm ? 'Send survey' : 'Schedule & notify' }}
            </Motion>
          </footer>
        </Motion>
      </div>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { CalendarClock, X, Loader2, Users, Video, Captions, Send, BellRing, Mic, ClipboardCheck, MapPin, Link2, MessageSquare, BarChart3 } from 'lucide-vue-next'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import { todayISO, fmtDate } from '@/composables/useExit'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  open: { type: Boolean, default: false },
  caseInfo: { type: Object, default: null },
  initial: { type: Object, default: null },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'submit'])
const today = todayISO()
const reduced = prefersReduced()

const MODES = [
  { key: 'IN_PERSON', label: 'In person', icon: Users, owner: 'hr', desc: 'Face-to-face session — you conduct and record it.', detailLabel: 'Location & instructions', detailIcon: MapPin, detailPh: 'Room 4B, 2nd floor · please bring your access card…' },
  { key: 'VIDEO', label: 'Video call', icon: Video, owner: 'hr', desc: 'Remote call — you conduct and record it.', detailLabel: 'Meeting link & instructions', detailIcon: Link2, detailPh: 'https://meet.google.com/abc-defg-hij · join 5 min early…' },
  { key: 'FORM', label: 'Survey', icon: Captions, owner: 'employee', desc: 'Confidential survey — the employee completes it themselves.', detailLabel: 'Note for the employee', detailIcon: MessageSquare, detailPh: 'Your candid feedback is confidential and helps us improve…' },
]

const date = ref('')
const time = ref('10:00')
const mode = ref('FORM')
const details = ref('')

const reset = () => {
  const iv = props.initial || {}
  date.value = iv.scheduled_at ? String(iv.scheduled_at).slice(0, 10) : ''
  time.value = iv.scheduled_at ? (String(iv.scheduled_at).slice(11, 16) || '10:00') : '10:00'
  mode.value = iv.mode || 'FORM'
  details.value = iv.details || ''
}
watch(() => props.open, (o) => { if (o) reset() })

const modeMeta = computed(() => MODES.find(m => m.key === mode.value) || MODES[2])
const isForm = computed(() => mode.value === 'FORM')
const canSubmit = computed(() => isForm.value || !!date.value)   // HR-led needs a date; survey can open without a deadline

const steps = computed(() => modeMeta.value.owner === 'hr'
  ? [{ icon: CalendarClock, label: 'Schedule' }, { icon: BellRing, label: 'Employee notified' }, { icon: Mic, label: 'You conduct & record' }, { icon: BarChart3, label: 'Insights' }]
  : [{ icon: Send, label: 'Invite' }, { icon: BellRing, label: 'Employee notified' }, { icon: ClipboardCheck, label: 'They submit' }, { icon: BarChart3, label: 'Insights' }])

const previewWhen = computed(() => {
  if (isForm.value) return date.value ? `Complete by ${fmtDate(date.value)}` : 'Complete when you’re ready'
  return date.value ? `${fmtDate(date.value)} · ${time.value || '10:00'}` : 'Date to be set'
})

const close = () => emit('close')
const submit = () => {
  if (!canSubmit.value || props.busy) return
  let scheduled_at = null
  if (isForm.value) scheduled_at = date.value ? `${date.value}T23:59:00` : null
  else scheduled_at = `${date.value}T${time.value || '10:00'}:00`
  emit('submit', { scheduled_at, mode: mode.value, details: details.value.trim() || null })
}
</script>

<style scoped>
.ism-overlay { position: fixed; inset: 0; z-index: 1440; display: grid; place-items: center; padding: 20px;
  background: rgba(6, 5, 10, 0.68); backdrop-filter: blur(9px); -webkit-backdrop-filter: blur(9px); }
[data-theme="light"] .ism-overlay { background: rgba(40, 30, 15, 0.42); }
.ism { position: relative; overflow: hidden; width: min(720px, 96vw); max-height: 92vh; overflow-y: auto;
  border-radius: 22px; background: var(--ex-surface-elevated); border: 1px solid var(--ex-border-strong); box-shadow: var(--ex-shadow);
  --acc: var(--ex-violet); --acc-soft: var(--ex-violet-soft); --acc-bd: var(--ex-violet-border); }
.ism.owner-employee { --acc: var(--ex-cleared); --acc-soft: var(--ex-cleared-soft); --acc-bd: color-mix(in srgb, var(--ex-cleared) 34%, transparent); }
.ism-aura { position: absolute; inset: -45% 30% 55% -10%; pointer-events: none; animation: ex-aura-drift 11s ease-in-out infinite;
  background: radial-gradient(60% 80% at 20% 0%, color-mix(in srgb, var(--acc) 20%, transparent), transparent 72%); transition: background 0.5s; }
.ism-edge { position: absolute; top: 0; left: 0; right: 0; height: 2px; pointer-events: none;
  background: linear-gradient(90deg, transparent, var(--acc), transparent); opacity: 0.85; }
.ism-head { position: relative; display: flex; align-items: flex-start; gap: 12px; padding: 18px 20px 12px; }
.ism-ico { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; flex-shrink: 0; color: var(--acc); background: var(--acc-soft); border: 1px solid var(--acc-bd); transition: all 0.4s; }
.ism-htxt { flex: 1; min-width: 0; }
.ism-title { font-size: 17px; font-weight: 850; color: var(--ex-text); margin: 0; }
.ism-sub { font-size: 12px; color: var(--ex-text-muted); margin: 2px 0 0; }
.ism-x { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; cursor: pointer; background: transparent; border: 1px solid var(--ex-border); color: var(--ex-text-muted); transition: all 0.2s; }
.ism-x:hover { color: var(--ex-text); border-color: var(--ex-border-strong); transform: rotate(90deg); }

.ism-grid { position: relative; display: grid; grid-template-columns: 1fr 244px; gap: 18px; padding: 4px 20px 14px; }
.ism-form { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.ism-form > * { animation: ex-fade-up 0.42s var(--ex-spring) backwards; }
.ism-form > *:nth-child(1) { animation-delay: 0.04s; } .ism-form > *:nth-child(2) { animation-delay: 0.09s; }
.ism-form > *:nth-child(3) { animation-delay: 0.14s; } .ism-form > *:nth-child(4) { animation-delay: 0.19s; }

.fld { display: flex; flex-direction: column; gap: 6px; }
.fld label { font-size: 11px; font-weight: 750; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ex-text-muted); }
.fld label i { color: var(--acc); font-style: normal; }
.fld label .opt { font-size: 10px; font-weight: 600; text-transform: none; letter-spacing: 0; color: var(--ex-text-dim); margin-left: 5px; }
.fld-row { display: grid; grid-template-columns: 1fr 0.7fr; gap: 12px; }

.mode-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 7px; }
.mode-opt { position: relative; display: flex; flex-direction: column; align-items: flex-start; gap: 5px; padding: 10px 11px; border-radius: 12px; cursor: pointer; font: inherit; text-align: left;
  background: var(--ex-surface); border: 1px solid var(--ex-border); color: var(--ex-text-secondary); transition: all 0.2s var(--ex-spring); }
.mode-opt:hover { transform: translateY(-2px); border-color: var(--ex-border-strong); }
.mode-opt.on { border-color: var(--acc-bd); background: var(--acc-soft); color: var(--ex-text); }
.mo-ic { display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; color: var(--ex-text-muted); background: var(--ex-steel-soft); transition: all 0.2s; }
.mode-opt.on .mo-ic { color: var(--acc); background: color-mix(in srgb, var(--acc) 16%, transparent); }
.mo-l { font-size: 12.5px; font-weight: 800; }
.mo-tag { font-size: 8.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; padding: 2px 6px; border-radius: 999px; }
.mo-tag.hr { color: var(--ex-violet); background: var(--ex-violet-soft); }
.mo-tag.employee { color: var(--ex-cleared); background: var(--ex-cleared-soft); }
.mode-desc { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--ex-text-secondary); margin: 2px 0 0; }
.mode-desc svg { color: var(--acc); flex-shrink: 0; }

.det-wrap { position: relative; }
.det-wrap .det-ic { position: absolute; left: 11px; top: 11px; color: var(--ex-text-dim); }
.det-wrap textarea { width: 100%; padding: 10px 12px 10px 32px; border-radius: 10px; font-size: 13px; font-family: inherit; resize: vertical;
  background: rgba(0, 0, 0, 0.3); border: 1px solid var(--ex-border); color: var(--ex-text); transition: border-color 0.2s, box-shadow 0.2s; }
.det-wrap textarea:focus { outline: none; border-color: var(--acc-bd); box-shadow: 0 0 0 3px var(--acc-soft); }
[data-theme="light"] .det-wrap textarea { background: rgba(255, 250, 242, 0.72); }
.time-in { width: 100%; padding: 10px 12px; border-radius: 10px; font-size: 13px; font-family: inherit; background: rgba(0, 0, 0, 0.3); border: 1px solid var(--ex-border); color: var(--ex-text); }
.time-in:focus { outline: none; border-color: var(--acc-bd); box-shadow: 0 0 0 3px var(--acc-soft); }
[data-theme="light"] .time-in { background: rgba(255, 250, 242, 0.72); }
.time-in::-webkit-calendar-picker-indicator { filter: invert(0.6) sepia(1) saturate(4) hue-rotate(350deg); cursor: pointer; }

/* workflow strip */
.flow { padding: 11px 13px; border-radius: 13px; background: var(--ex-panel); border: 1px solid var(--ex-border); }
.flow-h { font-size: 10px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: var(--ex-text-dim); }
.flow-steps { display: flex; align-items: center; gap: 4px; margin-top: 9px; flex-wrap: wrap; }
.fstep { display: inline-flex; align-items: center; gap: 6px; }
.fstep:not(:last-child)::after { content: ''; width: 14px; height: 1.5px; margin: 0 2px; background: var(--ex-border-strong); border-radius: 2px; }
.fs-dot { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 7px; flex-shrink: 0; color: var(--ex-text-muted); background: var(--ex-steel-soft); border: 1px solid var(--ex-border); }
.fstep.on .fs-dot { color: var(--acc); background: var(--acc-soft); border-color: var(--acc-bd); }
.fs-l { font-size: 10.5px; font-weight: 700; color: var(--ex-text-secondary); }
.fstep.on .fs-l { color: var(--ex-text); }

/* invitation preview */
.ism-prev { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 12px; padding: 14px; border-radius: 18px;
  background: var(--ex-grad-card), var(--ex-panel); border: 1px solid var(--ex-border-strong); }
.pv-grain { position: absolute; inset: -40% -10% 60% -10%; pointer-events: none; opacity: 0.6; transition: opacity 0.5s;
  background: radial-gradient(60% 80% at 70% 0%, color-mix(in srgb, var(--acc) 22%, transparent), transparent 70%); }
.pv-top { position: relative; display: flex; align-items: center; justify-content: space-between; }
.pv-brand { display: inline-flex; align-items: center; gap: 5px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--acc); }
.pv-stamp { font-size: 9px; font-weight: 850; letter-spacing: 0.1em; padding: 3px 8px; border-radius: 6px; color: var(--ex-text-muted); background: var(--ex-steel-soft); border: 1px dashed var(--ex-border-strong); transition: all 0.4s var(--ex-spring); }
.pv-stamp.ready { color: var(--ex-cleared); background: var(--ex-cleared-soft); border: 1px solid color-mix(in srgb, var(--ex-cleared) 38%, transparent); }
.pv-card { position: relative; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 7px; padding: 16px 13px; border-radius: 14px;
  background: var(--ex-surface); border: 1px solid var(--acc-bd); }
.pvc-ic { display: grid; place-items: center; width: 44px; height: 44px; border-radius: 13px; color: var(--acc); background: var(--acc-soft); border: 1px solid var(--acc-bd); }
.pvc-kind { font-size: 13px; font-weight: 850; color: var(--ex-text); }
.pvc-when { font-size: 11.5px; font-weight: 700; color: var(--acc); }
.pvc-det { font-size: 11px; font-style: italic; color: var(--ex-text-secondary); margin: 2px 0 0; line-height: 1.4; max-width: 100%; word-break: break-word; }
.pvc-foot { display: inline-flex; align-items: center; gap: 5px; margin-top: 4px; font-size: 10px; font-weight: 700; color: var(--ex-text-muted); }
.pv-note { position: relative; display: flex; align-items: flex-start; gap: 6px; font-size: 10.5px; line-height: 1.45; color: var(--ex-text-muted); margin: 0; }
.pv-note svg { color: var(--acc); flex-shrink: 0; margin-top: 1px; }

.ism-foot { position: relative; display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px 18px; }
.ism-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 17px; border-radius: 12px; font-size: 13px; font-weight: 800; cursor: pointer; font-family: inherit; }
.ism-btn.ghost { background: transparent; border: 1px solid var(--ex-border-strong); color: var(--ex-text-secondary); }
.ism-btn.primary { border: none; background: var(--ex-grad-hero); color: #1a1206; box-shadow: 0 8px 22px -10px rgba(234, 88, 12, 0.7); }
.ism-btn.primary.off { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
.spin { animation: ex-spin-slow 0.8s linear infinite; }

@media (max-width: 680px) { .ism-grid { grid-template-columns: 1fr; } .ism-prev { order: -1; } .mode-grid { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { .ism-aura, .spin { animation: none; } .ism-form > * { animation: none; } }
</style>
