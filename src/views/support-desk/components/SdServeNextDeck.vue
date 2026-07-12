<template>
  <Presence>
    <Motion v-if="ticket" as="section" class="pbx" :style="{ '--tc': accent }"
      :initial="{ opacity: 0, y: -12, scale: 0.99 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
      :exit="{ opacity: 0, y: -10 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
      <!-- checkered pit gantry across the top -->
      <span class="pbx-gantry" aria-hidden="true"><span class="pbx-gantry-run" /></span>

      <!-- top-right small controls -->
      <div class="pbx-corner">
        <button class="pbx-mini" :disabled="serving" :title="remaining > 0 ? `Serve the next ticket — ${remaining} more waiting` : 'Serve the next ticket'" @click="$emit('next')">
          <FastForward :size="13" /> Next <b v-if="remaining > 0" class="sd-mono">{{ remaining }}</b>
        </button>
        <button class="pbx-mini x" title="Stop play mode" @click="$emit('stop')"><X :size="13" /></button>
      </div>

      <div class="pbx-grid">
        <!-- ── stationary-time panel ── -->
        <div class="pbx-side">
          <span class="pbx-side-lb sd-mono">TIME ON TICKET</span>
          <span class="pbx-watch sd-mono">{{ watchMain }}<em>.{{ watchHundredths }}</em></span>
          <span class="pbx-stint sd-mono">
            Today: served <b class="ok">{{ stint.served ?? 0 }}</b> ·
            resolved <b class="ok">{{ stint.resolved ?? 0 }}</b> ·<br />
            skips <b :class="{ warn: (stint.skips ?? 0) > 3 }">{{ stint.skips ?? 0 }}</b>
          </span>
        </div>

        <!-- ── the car in the box ── -->
        <div class="pbx-main">
          <span class="pbx-eyebrow sd-mono">NOW SERVING · DEALT BY SERVE ORDER</span>

          <div class="pbx-line1">
            <button class="pbx-no sd-mono" :title="'Open ' + ticket.ticket_number" @click="$emit('open', ticket)">{{ ticket.ticket_number }}</button>
            <SdPill kind="priority" :value="ticket.priority" />
            <span v-if="lane" class="pbx-lane sd-mono">{{ lane }}</span>
            <SdPill kind="status" :value="ticket.status" />
            <span class="pbx-sla sd-mono" :class="slaTone">{{ slaDelta }} <i>SLA</i></span>
          </div>

          <button class="pbx-subject" @click="$emit('open', ticket)">{{ ticket.subject }}</button>
          <p class="pbx-meta sd-mono">
            for {{ ticket.requester_name || ticket.contact_name || 'Unknown requester' }}
            <template v-if="ticket.category_name"> · {{ ticket.category_name }}</template>
            · raised {{ age }} ago
          </p>

          <!-- setup sheet: the lane's required skills vs your toolkit -->
          <div v-if="skills.length" class="pbx-skills" aria-label="Setup sheet — lane skills vs yours">
            <span v-for="s in skills" :key="s.id" class="pbx-skill sd-mono" :class="{ miss: !s.mine }">
              {{ s.name }} {{ s.mine ? '✓' : '✗' }}
            </span>
          </div>

          <!-- crew tasks -->
          <div class="pbx-crew">
            <button class="pbx-task" title="Open the console on the reply composer" @click="$emit('crew', 'reply')">
              <MessageSquareText :size="12" /> Reply to requester
            </button>
            <button class="pbx-task" title="Ask for info — moves the ticket to Pending customer (clock stops)" @click="$emit('crew', 'pending')">
              <CircleHelp :size="12" /> Request info
            </button>
            <button class="pbx-task" title="Open the full resolution console" @click="$emit('open', ticket)">
              <PanelRightOpen :size="12" /> Open console
            </button>
          </div>

          <!-- verbs -->
          <div class="pbx-actions">
            <Motion as="button" class="pbx-btn primary" :disabled="serving" :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }"
              title="Mark resolved and serve the next ticket" @click="$emit('resolve', ticket)">
              RESOLVE &amp; NEXT <kbd>R</kbd>
            </Motion>
            <Motion as="button" class="pbx-btn" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }"
              title="Skip with a reason — out of your rotation for today" @click="$emit('skip', ticket)">
              SKIP — REASON <kbd>S</kbd>
            </Motion>
            <Motion v-if="tier < 3" as="button" class="pbx-btn" :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }"
              :title="`Send it up to L${tier + 1} with a record`" @click="$emit('escalate', ticket)">
              ESCALATE L{{ tier + 1 }} <kbd>E</kbd>
            </Motion>
          </div>
        </div>
      </div>
    </Motion>
  </Presence>
</template>

<script setup>
/* SdServeNextDeck — PIT BOX, artifact layout: checkered gantry over a two-panel
   block — left the tinted STATIONARY TIME panel (hundredths stopwatch + stint),
   right the car in the box (big number, lane, live SLA delta, setup sheet ✓/✗,
   crew tasks, and the three big verbs with key hints). Same emit contract:
   open / skip / escalate / next / stop / resolve / crew. */
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { FastForward, X, MessageSquareText, CircleHelp, PanelRightOpen } from 'lucide-vue-next'
import SdPill from './SdPill.vue'

const props = defineProps({
  ticket: { type: Object, default: null },
  remaining: { type: Number, default: 0 },
  serving: { type: Boolean, default: false },
  now: { type: Number, default: () => Date.now() },
  accent: { type: String, default: 'var(--sd-qs-core)' },
  stint: { type: Object, default: () => ({}) },
  skills: { type: Array, default: () => [] },
  lane: { type: String, default: '' },
  tier: { type: Number, default: 1 },
})
defineEmits(['open', 'skip', 'escalate', 'next', 'stop', 'resolve', 'crew'])

const age = computed(() => {
  const at = props.ticket?.created_at ? new Date(props.ticket.created_at).getTime() : 0
  if (!at) return '—'
  const m = Math.max(0, Math.floor((props.now - at) / 60000))
  return m < 60 ? `${m} m` : m < 1440 ? `${Math.floor(m / 60)} h ${m % 60} m` : `${Math.floor(m / 1440)} d`
})

/* live SLA delta (to resolution due) */
const slaDelta = computed(() => {
  const due = props.ticket?.resolution_due_at ? new Date(props.ticket.resolution_due_at).getTime() : 0
  if (!due) return '· · ·'
  const s = Math.round((due - props.now) / 1000), a = Math.abs(s)
  const h = Math.floor(a / 3600), m = Math.floor((a % 3600) / 60), ss = a % 60
  const core = h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${m}:${String(ss).padStart(2, '0')}`
  return (s < 0 ? '−' : '+') + core
})
const slaTone = computed(() => {
  const due = props.ticket?.resolution_due_at ? new Date(props.ticket.resolution_due_at).getTime() : 0
  if (!due) return ''
  const s = due - props.now
  return s < 0 ? 'bad' : s < 4 * 3600e3 ? 'warn' : 'ok'
})

/* ── pit stopwatch: restarts when a new car rolls in ── */
const boxSince = ref(Date.now())
const watchNow = ref(Date.now())
let raf = 0
const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  && document.documentElement.dataset.cinematic !== 'on'
const tickWatch = () => { watchNow.value = Date.now(); raf = requestAnimationFrame(tickWatch) }
watch(() => props.ticket?.id, (id) => {
  cancelAnimationFrame(raf)
  if (id) {
    boxSince.value = Date.now()
    if (!reduced) raf = requestAnimationFrame(tickWatch)
  }
}, { immediate: true })
onBeforeUnmount(() => cancelAnimationFrame(raf))
const watchMain = computed(() => {
  const total = Math.max(0, (reduced ? props.now : watchNow.value) - boxSince.value)
  const m = Math.floor(total / 60000), s = Math.floor((total % 60000) / 1000)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})
const watchHundredths = computed(() => {
  if (reduced) return '00'
  return String(Math.floor((Math.max(0, watchNow.value - boxSince.value) % 1000) / 10)).padStart(2, '0')
})
</script>

<style scoped>
.pbx { position: relative; overflow: hidden; border-radius: 16px;
  border: 1px solid color-mix(in srgb, var(--tc) 40%, var(--sd-border));
  background: var(--sd-surface); }

/* checkered pit gantry */
.pbx-gantry { position: absolute; left: 0; right: 0; top: 0; height: 10px; z-index: 1;
  background: repeating-linear-gradient(-55deg, var(--sd-qs-core) 0 14px, transparent 14px 28px); opacity: 0.85; }
.pbx-gantry-run { position: absolute; top: 0; bottom: 0; width: 110px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.55), transparent);
  animation: pbx-run 2.4s linear infinite; }

.pbx-corner { position: absolute; top: 20px; right: 16px; z-index: 2; display: flex; gap: 6px; }
.pbx-mini { display: inline-flex; align-items: center; gap: 5px; padding: 6px 10px; border-radius: 9px;
  font-size: 10.5px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px dashed var(--sd-border-strong); background: transparent; color: var(--sd-text-secondary); }
.pbx-mini:hover { border-style: solid; border-color: var(--tc); color: var(--sd-text); }
.pbx-mini b { color: var(--tc); }
.pbx-mini.x:hover { color: var(--sd-qs-halt); border-color: color-mix(in srgb, var(--sd-qs-halt) 45%, transparent); }
.pbx-mini:disabled { opacity: 0.5; cursor: wait; }

.pbx-grid { display: grid; grid-template-columns: minmax(220px, 300px) 1fr; margin-top: 10px; }

/* stationary-time panel — tinted, full height (artifact left panel) */
.pbx-side { display: flex; flex-direction: column; justify-content: center; gap: 12px; padding: 26px 24px;
  background: color-mix(in srgb, var(--sd-qs-core) 7%, var(--sd-surface));
  border-right: 1px solid var(--sd-border); }
.pbx-side-lb { font-size: 9px; font-weight: 800; letter-spacing: 0.26em; color: var(--sd-text-dim); }
.pbx-watch { font-size: clamp(34px, 4vw, 46px); font-weight: 800; line-height: 1; color: var(--sd-qs-core);
  font-variant-numeric: tabular-nums; letter-spacing: -0.03em; }
.pbx-watch em { font-style: normal; font-size: 0.5em; font-weight: 800; color: color-mix(in srgb, var(--sd-qs-core) 55%, transparent); }
.pbx-stint { font-size: 10.5px; line-height: 1.7; color: var(--sd-text-muted); }
.pbx-stint b { font-weight: 800; color: var(--sd-text); }
.pbx-stint b.ok { color: var(--sd-qs-go); }
.pbx-stint b.warn { color: var(--sd-qs-warn); }

/* main */
.pbx-main { display: flex; flex-direction: column; gap: 7px; padding: 22px 24px 20px; min-width: 0; }
.pbx-eyebrow { font-size: 9px; font-weight: 800; letter-spacing: 0.24em; color: var(--tc); }
.pbx-line1 { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; margin-top: 2px; }
.pbx-no { padding: 0; border: none; background: none; cursor: pointer; font-size: clamp(22px, 2.4vw, 30px);
  font-weight: 800; letter-spacing: 0.01em; color: var(--sd-text); font-family: inherit; line-height: 1; }
.pbx-no:hover { color: var(--tc); }
.pbx-lane { padding: 3px 9px; border-radius: 7px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.08em;
  color: var(--sd-text-secondary); border: 1px solid var(--sd-border-strong); }
.pbx-sla { margin-left: auto; font-size: clamp(15px, 1.7vw, 19px); font-weight: 800; font-variant-numeric: tabular-nums; }
.pbx-sla i { font-style: normal; font-size: 9px; font-weight: 800; letter-spacing: 0.16em; color: var(--sd-text-dim); }
.pbx-sla.ok { color: var(--sd-text-secondary); }
.pbx-sla.warn { color: var(--sd-qs-warn); }
.pbx-sla.bad { color: var(--sd-qs-halt); animation: pbx-flag 1.1s ease-in-out infinite; }
.pbx-subject { padding: 0; border: none; background: none; cursor: pointer; text-align: left; font-family: inherit;
  font-size: clamp(15px, 1.8vw, 19px); font-weight: 800; color: var(--sd-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pbx-subject:hover { color: var(--tc); }
.pbx-meta { margin: 0; font-size: 10.5px; color: var(--sd-text-dim); }

.pbx-skills { display: flex; gap: 7px; flex-wrap: wrap; margin-top: 4px; }
.pbx-skill { padding: 4px 10px; border-radius: 8px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.04em;
  color: var(--sd-qs-go); border: 1px solid color-mix(in srgb, var(--sd-qs-go) 45%, transparent); }
.pbx-skill.miss { color: var(--sd-qs-halt); border-color: color-mix(in srgb, var(--sd-qs-halt) 45%, transparent); }

.pbx-crew { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 5px; }
.pbx-task { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 9px;
  font-size: 11px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px dashed var(--sd-border-strong); background: transparent; color: var(--sd-text-secondary);
  transition: border-color 0.2s, color 0.2s; }
.pbx-task:hover { border-color: var(--tc); border-style: solid; color: var(--sd-text); }

.pbx-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 12px; }
.pbx-btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; padding: 13px 22px;
  border-radius: 12px; font-size: 12.5px; font-weight: 800; letter-spacing: 0.08em; cursor: pointer;
  font-family: inherit; border: 1px solid var(--sd-border-strong); background: var(--sd-surface);
  color: var(--sd-text-secondary); }
.pbx-btn:hover { border-color: color-mix(in srgb, var(--tc) 50%, transparent); color: var(--sd-text); }
.pbx-btn.primary { border-color: transparent; color: #052e1f; background: linear-gradient(135deg, #6ee7b7, var(--sd-qs-go));
  box-shadow: 0 10px 24px -12px var(--sd-qs-go); }
.pbx-btn:disabled { opacity: 0.5; cursor: wait; }
.pbx-btn kbd { display: inline-grid; place-items: center; min-width: 17px; padding: 2px 5px; border-radius: 5px;
  font-family: var(--sd-font-mono, ui-monospace); font-size: 9px; font-weight: 800;
  border: 1px solid currentColor; opacity: 0.6; }

@keyframes pbx-run { 0% { left: -110px; } 100% { left: 100%; } }
@keyframes pbx-flag { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

@media (max-width: 880px) {
  .pbx-grid { grid-template-columns: 1fr; }
  .pbx-side { flex-direction: row; align-items: baseline; gap: 16px; padding: 18px 20px 14px;
    border-right: none; border-bottom: 1px solid var(--sd-border); }
  .pbx-corner { top: 16px; }
}
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .pbx-gantry-run,
  html:not([data-cinematic="on"]) .pbx-sla.bad { animation: none; }
}
</style>
