<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" class="irm-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 0.22 }"
        @mousedown.self="!busy && $emit('close')">
        <Motion class="irm" role="dialog" aria-modal="true" aria-label="Reclassify incident severity"
          :initial="{ opacity: 0, y: 26, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 16, scale: 0.98 }" :transition="{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }">
          <span class="irm-beam" aria-hidden="true" />
          <button class="irm-x" :disabled="busy" aria-label="Close" @click="$emit('close')"><X :size="16" /></button>

          <header class="irm-head">
            <p class="irm-eyebrow sd-mono"><ArrowUpDown :size="11" /> SEVERITY RECLASSIFICATION</p>
            <h2 class="irm-title">{{ isPromote ? 'Promote to' : 'De-escalate to' }} <em>{{ afterMeta.label }}</em></h2>
            <p v-if="ticket" class="irm-subj">{{ ticket.ticket_number }} — {{ ticket.subject }}</p>
          </header>

          <div class="irm-body">
            <!-- before → after -->
            <Motion class="irm-shift" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.4, delay: 0.06, ease: [0.16, 1, 0.3, 1] }">
              <span class="sev-chip" :style="{ '--c': beforeMeta.color }">
                <b class="sd-mono">{{ beforeMeta.label }}</b><i>{{ beforeMeta.title }}</i>
              </span>
              <span class="irm-arrow" :class="{ down: !isPromote }"><ArrowRight :size="15" /></span>
              <span class="sev-chip after" :style="{ '--c': afterMeta.color }">
                <b class="sd-mono">{{ afterMeta.label }}</b><i>{{ afterMeta.title }}</i>
              </span>
            </Motion>

            <!-- what this move means -->
            <Motion as="p" class="irm-wire" :class="{ warn: !isPromote }"
              :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
              :transition="{ duration: 0.4, delay: 0.12, ease: [0.16, 1, 0.3, 1] }">
              <component :is="isPromote ? TriangleAlert : ShieldCheck" :size="12" />
              <template v-if="isPromote">
                Raising the alarm puts this fault on the critical desk — SLA re-arms if no first
                response has landed, and the assignee + commander are notified.
              </template>
              <template v-else>
                De-escalating removes the critical desk's eyes — a <b>lead or admin</b> call.
                The reason below goes on the permanent activity record.
              </template>
            </Motion>

            <!-- required reason -->
            <Motion class="irm-f" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.4, delay: 0.18, ease: [0.16, 1, 0.3, 1] }">
              <label class="irm-k">Why this reclassification <em class="req">*</em></label>
              <textarea ref="taRef" v-model="note" class="irm-ta" rows="3" maxlength="500"
                :placeholder="isPromote
                  ? 'What changed — blast radius, growth rate, exposure that makes this critical…'
                  : 'Why this no longer needs the critical desk — impact contained, workaround live…'" />
              <div class="irm-inrow">
                <span class="hint sd-mono" :class="{ ok: noteOk }">{{ noteOk ? 'REASON COMPLETE' : 'MIN 10 CHARACTERS' }}</span>
                <span class="cnt sd-mono" :class="{ hot: note.length > 450 }">{{ note.length }}/500</span>
              </div>
            </Motion>
          </div>

          <footer class="irm-foot">
            <button class="irm-btn ghost" :disabled="busy" @click="$emit('close')">Cancel</button>
            <Motion as="button" class="irm-btn primary" :class="{ down: !isPromote }" :disabled="!noteOk || busy"
              :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }" @click="submit">
              <Loader v-if="busy" :size="14" class="irm-spin" /><ArrowUpDown v-else :size="14" />
              {{ isPromote ? 'Promote to SEV2' : 'De-escalate to SEV3' }}
            </Motion>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
/*
  SdIncReclassifyModal — the severity reclassification ceremony over the pinned
  POST /support-desk/tickets/{id}/sev contract: { target_sev: 2|3, note (min 10) }.
  Promote (→SEV2) is owner-tier — raising the alarm is safe to over-do; de-escalate
  (→SEV3) is lead/superuser only. The backend 409s on major incidents (SEV1 = the MI
  flag — use the major-incident verb), merged and terminal rows, and 422s when the
  ticket is already at the target — all surfaced verbatim as toasts. z2700 family:
  callable from the drawer (z2100) without stacking underneath it.
*/
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import { X, ArrowUpDown, ArrowRight, TriangleAlert, ShieldCheck, Loader } from 'lucide-vue-next'
import { changeSev, sevMeta, sevOf } from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  ticket: { type: Object, default: null },
  direction: { type: String, default: 'promote' },   // 'promote' | 'de_escalate'
})
const emit = defineEmits(['close', 'done'])
const toast = useToast()

const note = ref('')
const busy = ref(false)
const taRef = ref(null)

const isPromote = computed(() => props.direction === 'promote')
const targetSev = computed(() => (isPromote.value ? 2 : 3))
const beforeMeta = computed(() => sevMeta(props.ticket?.sev ?? sevOf(props.ticket)))
const afterMeta = computed(() => sevMeta(targetSev.value))
const noteOk = computed(() => note.value.trim().length >= 10)

const onKey = (e) => { if (e.key === 'Escape' && !busy.value) emit('close') }
watch(() => props.open, (v) => {
  if (v) {
    note.value = ''
    window.addEventListener('keydown', onKey)
    nextTick(() => setTimeout(() => taRef.value?.focus?.(), 360))
  } else {
    window.removeEventListener('keydown', onKey)
  }
})
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

const submit = async () => {
  if (!props.ticket || !noteOk.value || busy.value) return
  busy.value = true
  try {
    await changeSev(props.ticket.id, { target_sev: targetSev.value, note: note.value.trim() })
    toast.success(`${props.ticket.ticket_number} reclassified — now ${afterMeta.value.label}`)
    emit('done')
    emit('close')
  } catch (e) {
    // 403 (authority) / 409 (MI, terminal, merged) / 422 (already there, thin note)
    toast.error(e?.response?.data?.detail || 'Could not reclassify the incident')
  } finally { busy.value = false }
}
</script>

<style scoped>
/* z2700 family — drawer-launched modals must clear the drawer (z2100) */
.irm-overlay { position: fixed; inset: 0; z-index: 2700; display: grid; place-items: center;
  padding: 20px; background: rgba(5, 4, 2, 0.6); backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px); }
.irm { position: relative; width: min(480px, 94vw); max-height: 88vh; overflow: hidden auto;
  display: flex; flex-direction: column; border-radius: 20px;
  border: 1px solid var(--sd-inc-brd, var(--sd-border-strong)); box-shadow: var(--sd-shadow-hover);
  background:
    radial-gradient(420px 240px at 12% -10%, var(--sd-inc-soft, var(--sd-amber-soft)), transparent 70%),
    linear-gradient(180deg, var(--sd-surface-elevated), var(--sd-surface)); }

.irm-beam { position: absolute; inset: 0 0 auto 0; height: 3px; overflow: hidden;
  background: var(--sd-inc-grad, var(--sd-grad-rail)); z-index: 2; }
.irm-beam::after { content: ''; position: absolute; inset: 0; width: 38%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.85), transparent);
  animation: irm-beam-sweep 3.4s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
@keyframes irm-beam-sweep { from { transform: translateX(-110%); } to { transform: translateX(380%); } }

.irm-x { position: absolute; top: 13px; right: 13px; z-index: 3; display: grid; place-items: center;
  width: 29px; height: 29px; border-radius: 10px; cursor: pointer; background: var(--sd-surface);
  border: 1px solid var(--sd-border); color: var(--sd-text-muted);
  transition: color 0.2s, border-color 0.2s; }
.irm-x:hover { color: var(--sd-text); border-color: var(--sd-border-strong); }

.irm-head { padding: 20px 48px 13px 22px; border-bottom: 1px solid var(--sd-border); }
.irm-eyebrow { display: inline-flex; align-items: center; gap: 6px; margin: 0 0 7px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.18em;
  color: var(--sd-inc-core, var(--sd-amber)); }
.irm-title { margin: 0; font-size: 19px; font-weight: 800; letter-spacing: -0.01em; color: var(--sd-text); }
.irm-title em { font-style: normal; background: var(--sd-inc-grad, var(--sd-grad-rail));
  -webkit-background-clip: text; background-clip: text; color: transparent; }
.irm-subj { margin: 5px 0 0; font-size: 12px; font-weight: 600; color: var(--sd-text-secondary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.irm-body { display: flex; flex-direction: column; gap: 13px; padding: 16px 22px; }

/* before → after */
.irm-shift { display: flex; align-items: center; justify-content: center; gap: 14px; }
.sev-chip { display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 118px;
  padding: 10px 16px; border-radius: 13px; background: var(--sd-surface);
  border: 1px solid color-mix(in srgb, var(--c) 42%, var(--sd-border)); }
.sev-chip b { font-size: 15px; font-weight: 800; letter-spacing: 0.08em; color: var(--c); }
.sev-chip i { font-style: normal; font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--sd-text-muted); }
.sev-chip.after { background: color-mix(in srgb, var(--c) 8%, var(--sd-surface));
  box-shadow: 0 6px 18px color-mix(in srgb, var(--c) 20%, transparent); }
.irm-arrow { display: grid; place-items: center; color: var(--sd-inc-core, var(--sd-amber)); }
.irm-arrow.down { color: var(--sd-text-muted); }

.irm-wire { display: flex; align-items: flex-start; gap: 7px; margin: 0; padding: 0 2px;
  font-size: 11px; line-height: 1.5; color: var(--sd-text-muted); }
.irm-wire svg { flex: none; margin-top: 1px; color: var(--sd-inc-core, var(--sd-amber)); }
.irm-wire b { color: var(--sd-text-secondary); font-weight: 700; }
.irm-wire.warn svg { color: var(--sd-warning); }

.irm-f { display: flex; flex-direction: column; gap: 7px; }
.irm-k { font-size: 11.5px; font-weight: 800; letter-spacing: 0.03em; color: var(--sd-text); }
.req { color: var(--sd-danger); font-style: normal; }
.irm-ta { width: 100%; resize: vertical; min-height: 74px; padding: 10px 12px; border-radius: 12px;
  font: inherit; font-size: 12.5px; line-height: 1.5; color: var(--sd-text);
  background: var(--sd-surface); border: 1px solid var(--sd-border); outline: none;
  transition: border-color 0.2s, box-shadow 0.2s; }
.irm-ta:focus { border-color: var(--sd-inc-brd, var(--sd-amber-border));
  box-shadow: 0 0 0 3px var(--sd-inc-soft, var(--sd-amber-soft)); }
.irm-ta::placeholder { color: var(--sd-text-muted); }
.irm-inrow { display: flex; align-items: center; justify-content: space-between; margin-top: -2px; }
.hint { font-size: 8.5px; letter-spacing: 0.12em; color: var(--sd-text-muted); }
.hint.ok { color: var(--sd-success); }
.cnt { font-size: 9px; letter-spacing: 0.06em; color: var(--sd-text-muted); font-variant-numeric: tabular-nums; }
.cnt.hot { color: var(--sd-danger); }

.irm-foot { display: flex; align-items: center; justify-content: flex-end; gap: 9px;
  padding: 13px 22px; border-top: 1px solid var(--sd-border); }
.irm-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 15px; border-radius: 11px;
  cursor: pointer; font: inherit; font-size: 12.5px; font-weight: 800; border: 1px solid transparent; }
.irm-btn.ghost { color: var(--sd-text-secondary); background: var(--sd-surface); border-color: var(--sd-border); }
.irm-btn.primary { color: #1a1206; background: var(--sd-inc-grad, var(--sd-grad-rail));
  box-shadow: 0 8px 20px var(--sd-inc-soft, var(--sd-amber-soft)); }
.irm-btn.primary.down { background: linear-gradient(122deg, var(--sd-steel, #78716c), #57534e); color: #fff; }
.irm-btn:disabled { opacity: 0.55; cursor: default; }
.irm-spin { animation: sd-spin-slow 1s linear infinite; }

/* ═════ LIGHT THEME OVERRIDES ═════ */
[data-theme="light"] .irm { background:
  radial-gradient(420px 240px at 12% -10%, var(--sd-inc-soft, var(--sd-amber-soft)), transparent 70%),
  linear-gradient(180deg, rgba(255, 250, 240, 0.94), rgba(255, 250, 240, 0.86)); }
[data-theme="light"] .irm-overlay { background: rgba(40, 25, 10, 0.34); }
[data-theme="light"] .irm-btn.primary { color: #fff8ec; }

@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .irm-beam::after,
  html:not([data-cinematic="on"]) .irm-spin { animation: none !important; }
}
</style>
