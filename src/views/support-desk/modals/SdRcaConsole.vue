<template>
  <Teleport to="body">
    <Presence>
      <Motion
        v-if="open" class="rca-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 0.22 }"
        @mousedown.self="!busy && $emit('close')"
      >
        <Motion
          class="rca" role="dialog" aria-modal="true" aria-label="Root cause console"
          :initial="{ opacity: 0, y: 28, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 18, scale: 0.98 }" :transition="{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }"
        >
          <span class="rca-accent" aria-hidden="true" />
          <button class="rca-x" :disabled="busy" @click="$emit('close')"><X :size="17" /></button>

          <p class="rca-eyebrow sd-mono">{{ isBreach ? 'BREACH AUTOPSY · ROOT CAUSE' : 'POST-INCIDENT REVIEW · ROOT CAUSE' }}</p>
          <h2 class="rca-title">
            <template v-if="isBreach">Why did <em>{{ ticket?.ticket_number }}</em> miss its target?</template>
            <template v-else>Root cause for <em>{{ ticket?.ticket_number }}</em></template>
          </h2>

          <div class="rca-scroll">
            <!-- evidence: the SLA anatomy -->
            <Motion :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(0)">
              <SdSlaAnatomy v-if="ticket" :ticket="ticket" :now="now" />
            </Motion>

            <!-- coded reason -->
            <Motion as="section" class="rca-f" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(1)">
              <label class="rca-k">{{ isBreach ? 'Breach reason' : 'Failure reason' }} <em class="req">*</em> <i>coded — drives the breach-composition analytics</i></label>
              <div class="rca-chips">
                <button v-for="r in BREACH_REASONS" :key="r.value" type="button" class="rca-chip"
                  :class="{ on: form.breach_reason === r.value }"
                  @click="form.breach_reason = form.breach_reason === r.value ? '' : r.value">{{ r.label }}</button>
              </div>
            </Motion>

            <!-- narrative -->
            <Motion as="section" class="rca-f" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(2)">
              <label class="rca-k">What happened <em class="req">*</em></label>
              <textarea v-model="form.rca_summary" class="rca-ta" rows="3"
                placeholder="The sequence of events that led past the target — facts, not blame…" />
            </Motion>
            <Motion as="section" class="rca-f two" :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="fT(3)">
              <div>
                <label class="rca-k">Corrective action</label>
                <textarea v-model="form.rca_corrective" class="rca-ta" rows="3" placeholder="What was done to repair THIS ticket…" />
              </div>
              <div>
                <label class="rca-k">Preventive action</label>
                <textarea v-model="form.rca_preventive" class="rca-ta" rows="3" placeholder="What stops the NEXT one — rota, routing, monitoring…" />
              </div>
            </Motion>
          </div>

          <!-- footer: live stamp + actions -->
          <div class="rca-foot">
            <span class="rca-stamp" :class="{ ready: canFile }">
              <FileSearch v-if="!canFile" :size="13" /><Check v-else :size="13" />
              {{ canFile ? 'READY TO FILE' : 'UNEXAMINED' }}
            </span>
            <div class="rca-actions">
              <button class="rca-btn ghost" :disabled="busy" @click="$emit('close')">Cancel</button>
              <Motion as="button" class="rca-btn primary" :disabled="!canFile || busy"
                :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }" @click="save">
                <Loader v-if="busy" :size="14" class="rca-spin" /><FileCheck2 v-else :size="14" />
                File root cause
              </Motion>
            </div>
          </div>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
/* SdRcaConsole — the Breached desk's root-cause capture modal. Evidence header = the
   SLA anatomy; coded breach-reason taxonomy + the classic RCA triple (what happened /
   corrective / preventive) → POST /tickets/{id}/rca. Every breach owes a root cause —
   filing one clears the ticket from the missing-RCA lens and lifts RCA coverage. */
import { reactive, ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import { X, Check, Loader, FileSearch, FileCheck2 } from 'lucide-vue-next'
import SdSlaAnatomy from '../components/SdSlaAnatomy.vue'
import { setTicketRca, BREACH_REASONS } from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  ticket: { type: Object, default: null },
  now: { type: Number, default: () => Date.now() },
})
const emit = defineEmits(['close', 'saved'])
const toast = useToast()

const form = reactive({ breach_reason: '', rca_summary: '', rca_corrective: '', rca_preventive: '' })
watch(() => props.open, (v) => {
  if (!v || !props.ticket) return
  form.breach_reason = props.ticket.breach_reason || ''
  form.rca_summary = props.ticket.rca_summary || ''
  form.rca_corrective = props.ticket.rca_corrective || ''
  form.rca_preventive = props.ticket.rca_preventive || ''
})

const isBreach = computed(() => !!(props.ticket?.sla_response_breached || props.ticket?.sla_resolution_breached))
const canFile = computed(() => !!form.breach_reason && form.rca_summary.trim().length >= 8)
const busy = ref(false)
const save = async () => {
  if (!canFile.value || busy.value || !props.ticket) return
  busy.value = true
  try {
    await setTicketRca(props.ticket.id, {
      breach_reason: form.breach_reason,
      rca_summary: form.rca_summary.trim(),
      rca_corrective: form.rca_corrective.trim() || null,
      rca_preventive: form.rca_preventive.trim() || null,
    })
    toast.success(`${props.ticket.ticket_number} — root cause filed`)
    emit('saved')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not file the root cause')
  } finally { busy.value = false }
}

const fT = (i) => ({ duration: 0.4, delay: 0.05 + i * 0.06, ease: [0.16, 1, 0.3, 1] })
</script>

<style scoped>
.rca-overlay { position: fixed; inset: 0; z-index: 3000; display: grid; place-items: center; padding: 20px;
  background: rgba(8, 5, 4, 0.62); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
[data-theme="light"] .rca-overlay { background: rgba(60, 35, 20, 0.32); }

.rca { position: relative; width: min(660px, 100%); max-height: min(88vh, 780px); display: flex; flex-direction: column;
  border-radius: 20px; border: 1px solid var(--sd-brc-brd); background: var(--sd-surface);
  box-shadow: var(--sd-shadow), var(--sd-brc-glow); padding: 22px 24px 18px; overflow: hidden; }
.rca-accent { position: absolute; left: 0; right: 0; top: 0; height: 3px; background: var(--sd-brc-grad); }
.rca-x { position: absolute; right: 14px; top: 14px; display: grid; place-items: center; width: 30px; height: 30px;
  border-radius: 9px; border: 1px solid var(--sd-border-strong); background: var(--sd-surface-glass);
  color: var(--sd-text-muted); cursor: pointer; z-index: 2; }
.rca-x:hover { color: var(--sd-brc-core); border-color: var(--sd-brc-core); }

.rca-eyebrow { font-size: 10px; font-weight: 800; letter-spacing: 0.22em; color: var(--sd-brc-core); margin: 0 0 6px; }
.rca-title { margin: 0 0 14px; font-size: 20px; font-weight: 800; letter-spacing: -0.01em; color: var(--sd-text); }
.rca-title em { font-style: normal; background: var(--sd-brc-grad); -webkit-background-clip: text; background-clip: text; color: transparent; }

.rca-scroll { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; padding-right: 4px; }

.rca-f { display: flex; flex-direction: column; gap: 8px; }
.rca-f.two { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.rca-f.two > div { display: flex; flex-direction: column; gap: 8px; }
.rca-k { font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--sd-text-secondary); }
.rca-k i { font-weight: 600; text-transform: none; letter-spacing: 0; color: var(--sd-text-dim); font-style: normal; }
.rca-k .req { color: var(--sd-brc-core); font-style: normal; }

.rca-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.rca-chip { padding: 7px 12px; border-radius: 999px; font-size: 11.5px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface-glass); color: var(--sd-text-secondary);
  transition: border-color 0.18s, color 0.18s, background 0.18s, transform 0.12s; }
.rca-chip:hover { border-color: var(--sd-brc-core); color: var(--sd-text); transform: translateY(-1px); }
.rca-chip.on { border-color: var(--sd-brc-core); color: var(--sd-brc-core); background: var(--sd-brc-soft);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--sd-brc-core) 35%, transparent); }

.rca-ta { width: 100%; resize: vertical; min-height: 64px; padding: 10px 12px; border-radius: 11px;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface-glass); color: var(--sd-text);
  font-size: 13px; line-height: 1.5; font-family: inherit; }
.rca-ta:focus { outline: none; border-color: var(--sd-brc-core); box-shadow: 0 0 0 3px var(--sd-brc-soft); }
.rca-ta::placeholder { color: var(--sd-text-dim); }

.rca-foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 14px;
  margin-top: 14px; border-top: 1px solid var(--sd-border); }
.rca-stamp { display: inline-flex; align-items: center; gap: 6px; padding: 5px 11px; border-radius: 8px;
  font-size: 10px; font-weight: 800; letter-spacing: 0.12em; transform: rotate(-2deg);
  color: var(--sd-brc-core); border: 1.5px dashed color-mix(in srgb, var(--sd-brc-core) 55%, transparent);
  transition: color 0.25s, border-color 0.25s, transform 0.25s; }
.rca-stamp.ready { color: var(--sd-brc-repair); border-style: solid; border-color: color-mix(in srgb, var(--sd-brc-repair) 55%, transparent);
  transform: rotate(0deg); background: var(--sd-brc-repair-soft); }
.rca-actions { display: flex; gap: 9px; }
.rca-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 12px;
  font-size: 12.5px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); }
.rca-btn.ghost { background: transparent; }
.rca-btn.primary { border-color: transparent; color: #fff; background: var(--sd-brc-grad); box-shadow: 0 8px 22px -10px var(--sd-brc-core); }
.rca-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.rca-spin { animation: rca-rot 0.9s linear infinite; }
@keyframes rca-rot { to { transform: rotate(360deg); } }

@media (max-width: 620px) { .rca-f.two { grid-template-columns: 1fr; } }
</style>
