<template>
  <div class="ic-shell" :style="{ '--i': index }">
    <article ref="cardEl" class="ic ex-grain" :class="`iv-${tone}`">
      <span class="ic-glare" aria-hidden="true" />
      <span class="ic-spine" :style="{ '--c': statusHex }" />

      <header class="ic-head">
        <span class="ic-av">{{ init }}<span class="ic-mode" :title="modeMeta.label"><component :is="modeMeta.icon" :size="10" /></span></span>
        <div class="ic-id">
          <span class="ic-name">{{ c.employee_name || c.employee_code || '—' }}</span>
          <span class="ic-meta ex-mono">{{ c.case_number }} · {{ c.designation_name || c.department_name || '—' }}</span>
        </div>
        <ExStatusPill :status="iv.status" kind="interview" />
      </header>

      <!-- COMPLETED — feedback is captured; the details live in the modal, NOT on the card -->
      <button v-if="done" class="ic-captured" @click="$emit('view', c)" type="button">
        <span class="cap-eq" aria-hidden="true"><i v-for="n in 9" :key="n" :style="{ '--d': (n % 5) * 0.11 + 's' }" /></span>
        <div class="cap-t">
          <span class="cap-h"><ShieldCheck :size="12" /> Feedback captured</span>
          <span class="cap-s">{{ modeMeta.label }} · {{ conductedWhen }}<template v-if="iv.conducted_by_name"> · {{ iv.conducted_by_name }}</template></span>
        </div>
        <span class="cap-go">View <ArrowRight :size="13" /></span>
      </button>

      <!-- SCHEDULED / IN_PROGRESS — the cinematic appointment readout -->
      <InterviewAppointment v-else-if="scheduled" :iv="iv" />

      <!-- PENDING — slot reserved, awaiting HR to schedule -->
      <div v-else class="ic-await">
        <span class="aw-wave" aria-hidden="true"><i v-for="n in 22" :key="n" :style="{ '--d': (n % 7) * 0.13 + 's' }" /></span>
        <span class="aw-cap"><CalendarPlus :size="12" /> Awaiting scheduling — set the format, date &amp; invite the employee.</span>
      </div>

      <footer class="ic-foot">
        <button class="ic-link" @click="$emit('go', { tab: 'resignation' })" type="button">View case <ArrowRight :size="12" /></button>
        <div class="ic-acts">
          <!-- PENDING → Schedule is the primary next step; Conduct is the walk-in fallback -->
          <template v-if="pending">
            <button class="ic-btn ghost" @click="$emit('conduct', c)" type="button"><Mic :size="13" /> Conduct</button>
            <Motion as="button" class="ic-btn primary" @click="$emit('schedule', c)" type="button" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }">
              <CalendarPlus :size="13" /> Schedule
            </Motion>
          </template>
          <!-- SCHEDULED → Conduct is primary, Reschedule secondary -->
          <template v-else-if="scheduled">
            <button class="ic-btn ghost" @click="$emit('schedule', c)" type="button"><CalendarClock :size="13" /> Reschedule</button>
            <Motion as="button" class="ic-btn primary" @click="$emit('conduct', c)" type="button" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }">
              <Mic :size="13" /> Conduct
            </Motion>
          </template>
          <!-- COMPLETED → view the feedback (modal); edit is secondary -->
          <template v-else>
            <button class="ic-btn ghost" @click="$emit('conduct', c)" type="button"><Pencil :size="13" /> Edit</button>
            <Motion as="button" class="ic-btn primary" @click="$emit('view', c)" type="button" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }">
              <AudioLines :size="13" /> View feedback
            </Motion>
          </template>
        </div>
      </footer>
    </article>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { Motion } from 'motion-v'
import { Mic, Pencil, ArrowRight, CalendarClock, CalendarPlus, AudioLines, ShieldCheck, Video, Users, Captions, CircleDashed } from 'lucide-vue-next'
import ExStatusPill from './ExStatusPill.vue'
import InterviewAppointment from './InterviewAppointment.vue'
import { interviewStatusMeta, initials, fmtDate } from '@/composables/useExit'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const props = defineProps({ c: { type: Object, required: true }, index: { type: Number, default: 0 } })
defineEmits(['conduct', 'schedule', 'go', 'view'])

const cardEl = ref(null)
usePointerSpotlight(cardEl)

const iv = computed(() => props.c.interview || {})
const status = computed(() => iv.value.status || 'PENDING')
const done = computed(() => status.value === 'COMPLETED')
const scheduled = computed(() => ['SCHEDULED', 'IN_PROGRESS'].includes(status.value))
const pending = computed(() => !done.value && !scheduled.value)   // PENDING / no slot yet
const statusMeta = computed(() => interviewStatusMeta(status.value))
const tone = computed(() => status.value.toLowerCase())
const statusHex = computed(() => statusMeta.value.hex)
const init = computed(() => initials(props.c.employee_name))
// Completed-card recap: when/who, not the feedback itself (that lives in the modal).
const conductedWhen = computed(() => {
  const at = iv.value.conducted_at || iv.value.scheduled_at
  return at ? fmtDate(at) : 'recently'
})

const MODE = {
  IN_PERSON: { label: 'In person', icon: Users }, VIDEO: { label: 'Video call', icon: Video }, FORM: { label: 'Form', icon: Captions },
}
// No mode chosen yet (PENDING) → a neutral "to be decided" glyph, not a misleading Form icon.
const UNDECIDED = { label: 'Format to be set', icon: CircleDashed }
const modeMeta = computed(() => MODE[iv.value.mode] || (iv.value.mode ? MODE.FORM : UNDECIDED))
</script>

<style scoped>
.ic-shell { animation: ex-deal 0.5s var(--ex-spring) backwards; animation-delay: calc(var(--i) * 0.05s); }
.ic { position: relative; overflow: hidden; padding: 15px 16px 13px 19px; border-radius: 18px;
  background: var(--ex-surface); border: 1px solid var(--ex-border); box-shadow: var(--ex-card-shadow);
  transition: transform 0.3s var(--ex-spring), border-color 0.3s, box-shadow 0.3s; }
.ic:hover { transform: perspective(1100px) rotateX(calc((var(--my, .5) - .5) * -5deg)) rotateY(calc((var(--mx, .5) - .5) * 7deg)) translateY(-3px);
  border-color: var(--ex-violet-border); box-shadow: var(--ex-shadow-hover); }
.ic-glare { position: absolute; inset: 0; pointer-events: none; opacity: var(--spot, 0); transition: opacity 0.3s;
  background: radial-gradient(320px 220px at calc(var(--mx, .5) * 100%) calc(var(--my, .5) * 100%), rgba(251, 146, 60, 0.13), transparent 60%); }
.ic-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--c); box-shadow: 0 0 13px -1px var(--c); }

.ic-head { display: flex; align-items: center; gap: 11px; margin-bottom: 13px; }
.ic-av { position: relative; display: grid; place-items: center; width: 38px; height: 38px; border-radius: 12px; flex-shrink: 0;
  font-size: 13px; font-weight: 850; color: var(--ex-violet); background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.ic-mode { position: absolute; right: -5px; bottom: -5px; display: grid; place-items: center; width: 17px; height: 17px; border-radius: 6px;
  color: var(--ex-text); background: var(--ex-surface-elevated); border: 1px solid var(--ex-border-strong); }
.ic-id { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.ic-name { font-size: 14px; font-weight: 800; color: var(--ex-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ic-meta { font-size: 10.5px; color: var(--ex-text-muted); }

/* completed — feedback-captured recap strip (clickable → opens the modal) */
.ic-captured { position: relative; overflow: hidden; display: flex; align-items: center; gap: 11px; width: 100%; margin-bottom: 11px;
  padding: 11px 13px; border-radius: 13px; cursor: pointer; text-align: left; font-family: inherit;
  background: var(--ex-cleared-soft); border: 1px solid color-mix(in srgb, var(--ex-cleared) 26%, transparent); transition: border-color 0.25s, transform 0.25s var(--ex-spring); }
.ic-captured:hover { border-color: color-mix(in srgb, var(--ex-cleared) 50%, transparent); transform: translateY(-2px); }
.ic-captured:hover .cap-go { gap: 6px; color: var(--ex-cleared); }
.cap-eq { display: flex; align-items: center; gap: 2.5px; height: 26px; flex-shrink: 0; }
.cap-eq i { width: 3px; border-radius: 999px; background: var(--ex-cleared); opacity: 0.85; height: 40%; transform-origin: center; animation: ic-eq 1.5s ease-in-out infinite; animation-delay: var(--d); }
.cap-t { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.cap-h { display: inline-flex; align-items: center; gap: 5px; font-size: 12.5px; font-weight: 800; color: var(--ex-cleared); }
.cap-s { font-size: 10.5px; color: var(--ex-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cap-go { display: inline-flex; align-items: center; gap: 3px; flex-shrink: 0; font-size: 11px; font-weight: 750; color: var(--ex-text-muted); transition: gap 0.2s, color 0.2s; }

/* awaiting */
.ic-await { display: flex; flex-direction: column; gap: 9px; padding: 10px 12px; border-radius: 13px; margin-bottom: 11px;
  background: var(--ex-panel); border: 1px dashed var(--ex-border-strong); }
.aw-wave { display: flex; align-items: center; gap: 3px; height: 26px; }
.aw-wave i { flex: 1; border-radius: 999px; background: var(--ex-steel-dim); height: 30%; transform-origin: center; animation: ic-idle 1.8s ease-in-out infinite; animation-delay: var(--d); }
.aw-cap { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 600; color: var(--ex-text-muted); }

.ic-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-top: 11px; border-top: 1px dashed var(--ex-border); }
.ic-link { display: inline-flex; align-items: center; gap: 4px; font-size: 11.5px; font-weight: 700; color: var(--ex-text-muted); background: none; border: none; cursor: pointer; transition: color 0.2s, gap 0.2s; }
.ic-link:hover { color: var(--ex-violet); gap: 7px; }
.ic-acts { display: flex; gap: 7px; }
.ic-btn { display: inline-flex; align-items: center; gap: 5px; padding: 8px 13px; border-radius: 10px; font-size: 12.5px; font-weight: 750; cursor: pointer; font-family: inherit; border: 1px solid transparent; }
.ic-btn.ghost { background: var(--ex-surface-elevated); border-color: var(--ex-border-strong); color: var(--ex-text-secondary); }
.ic-btn.primary { border: none; background: var(--ex-grad-hero); color: #1a1206; }

@keyframes ic-idle { 0%, 100% { transform: scaleY(0.5); opacity: 0.5; } 50% { transform: scaleY(1.5); opacity: 1; } }
@keyframes ic-eq { 0%, 100% { transform: scaleY(0.45); opacity: 0.6; } 50% { transform: scaleY(1.5); opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .ic-shell { animation: none; } .ic:hover { transform: translateY(-2px); }
  .aw-wave i, .cap-eq i { animation: none; height: 50%; } .ic-captured:hover { transform: none; }
}
</style>
