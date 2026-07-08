<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" as="div" class="dem-overlay" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
        :exit="{ opacity: 0 }" :transition="{ duration: 0.22 }" @mousedown.self="$emit('close')">
        <Motion as="section" class="dem" role="dialog" aria-modal="true" aria-label="De-escalate"
          :initial="{ opacity: 0, y: 22, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 14, scale: 0.98 }" :transition="{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }">
          <!-- seal -->
          <header class="dem-head">
            <span class="dem-seal" :class="{ done }"><component :is="done ? Check : TrendingDown" :size="19" /></span>
            <div class="dem-head-tx">
              <span class="dem-eyebrow sd-mono">STAND DOWN · DE-ESCALATION</span>
              <h3>{{ bulk ? `De-escalate ${tickets.length} tickets` : 'Bring it back down' }}</h3>
            </div>
            <button class="dem-x" aria-label="Close" @click="$emit('close')"><X :size="15" /></button>
          </header>

          <!-- ticket chip(s) + tier transition -->
          <div class="dem-body sd-scroll">
            <div v-if="!bulk && one" class="dem-ticket">
              <span class="dt-num sd-mono">{{ one.ticket_number }}</span>
              <span class="dt-sub">{{ one.subject }}</span>
            </div>
            <div v-else class="dem-ticket bulkrow">
              <span class="dt-num sd-mono">{{ tickets.length }} SELECTED</span>
              <span class="dt-sub">Each drops one tier; tickets that aren't escalated are skipped with a reason.</span>
            </div>

            <div v-if="!bulk && one" class="dem-tiers" aria-hidden="true">
              <span class="tier from">L{{ one.escalation_level || 1 }}</span>
              <span class="tier-arrow"><MoveRight :size="15" /></span>
              <span class="tier to">L{{ Math.max(0, (one.escalation_level || 1) - 1) }}</span>
              <span v-if="(one.escalation_level || 1) <= 1" class="tier-note">leaves the escalated desk</span>
            </div>

            <!-- reason (REQUIRED — backend 422s without one) -->
            <label class="dem-f">
              <span class="dem-fl">Why is it safe to stand down? <em>*</em></span>
              <textarea v-model="reason" rows="3" class="dem-fi"
                placeholder="Recorded on the timeline and sent to the owner — be specific." />
              <div class="dem-chips">
                <button v-for="c in CHIPS" :key="c" type="button" class="dem-chip" @click="addChip(c)">{{ c }}</button>
              </div>
            </label>

            <!-- consequences -->
            <ul class="dem-flow">
              <li><MessageSquare :size="13" /> Reason lands as an internal <b>[De-escalation]</b> note + timeline entry</li>
              <li v-if="!bulk && one && (one.escalation_level || 1) <= 1">
                <CircleArrowDown :size="13" /> Level 0 — returns to
                <b>{{ one.assigned_agent_id ? 'In Progress' : 'Open' }}</b>; tier ack + response clock cleared
              </li>
              <li v-else><CircleArrowDown :size="13" /> Drops one tier; the standing escalation keeps its ack state</li>
              <li><BellRing :size="13" /> The ticket owner is notified</li>
            </ul>

            <p v-if="error" class="dem-err">{{ error }}</p>
          </div>

          <footer class="dem-foot">
            <button class="dem-btn ghost" @click="$emit('close')">Cancel</button>
            <Motion as="button" class="dem-btn primary" :disabled="!valid || busy"
              :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }" @click="run">
              <Loader v-if="busy" :size="14" class="dem-spin" /><TrendingDown v-else :size="14" />
              {{ bulk ? 'De-escalate selected' : 'Stand down one tier' }}
            </Motion>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
/* SdDeEscalateModal — reasoned stand-down (single or bulk). The backend REQUIRES the
   reason (422 otherwise), posts the [De-escalation] internal note itself, clears the
   live escalation state at level 0 and notifies the owner. */
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import { TrendingDown, MoveRight, X, Check, Loader, MessageSquare, CircleArrowDown, BellRing } from 'lucide-vue-next'
import { deEscalateTicket, bulkDeEscalate } from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  tickets: { type: Array, default: () => [] },   // one or many ticket objects
})
const emit = defineEmits(['close', 'done'])
const toast = useToast()

const CHIPS = ['Stabilized — fix in progress', 'Root cause identified', 'Customer confirmed workaround', 'Escalated in error', 'Specialist review complete']
const reason = ref('')
const busy = ref(false)
const done = ref(false)
const error = ref('')

const bulk = computed(() => props.tickets.length > 1)
const one = computed(() => props.tickets[0] || null)
const valid = computed(() => reason.value.trim().length >= 3 && props.tickets.length > 0)
const addChip = (c) => { reason.value = reason.value.trim() ? `${reason.value.trim()} — ${c}` : c }

watch(() => props.open, (o) => { if (o) { reason.value = ''; busy.value = false; done.value = false; error.value = '' } })

const run = async () => {
  if (!valid.value || busy.value) return
  busy.value = true; error.value = ''
  try {
    if (bulk.value) {
      const r = await bulkDeEscalate(props.tickets.map(t => String(t.id)), reason.value.trim())
      if (r.updated) toast.success(`${r.updated} de-escalated`)
      if (r.skipped) toast.info(`${r.skipped} skipped (not escalated)`)
    } else {
      await deEscalateTicket(one.value.id, { reason: reason.value.trim() })
      toast.success(`${one.value.ticket_number} stood down a tier`)
    }
    done.value = true
    setTimeout(() => emit('done'), 560)
  } catch (e) {
    error.value = e?.response?.data?.detail || 'Could not de-escalate.'
  } finally { busy.value = false }
}
</script>

<style scoped>
.dem-overlay { position: fixed; inset: 0; z-index: 2500; display: grid; place-items: center;
  background: rgba(5, 5, 6, 0.6); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); padding: 20px; }
[data-theme="light"] .dem-overlay { background: rgba(44, 28, 12, 0.34); }
.dem { width: min(520px, 100%); max-height: min(86vh, 640px); display: flex; flex-direction: column; overflow: hidden;
  border-radius: 20px; border: 1px solid var(--sd-esc-brd); background: var(--sd-surface-elevated);
  box-shadow: 0 40px 110px -30px rgba(0, 0, 0, 0.7), var(--sd-esc-glow); }

.dem-head { display: flex; align-items: center; gap: 12px; padding: 16px 18px; border-bottom: 1px solid var(--sd-border); }
.dem-seal { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 13px; flex-shrink: 0;
  color: var(--sd-esc-core); background: var(--sd-esc-soft); border: 1px solid color-mix(in srgb, var(--sd-esc-core) 40%, transparent);
  transition: all 0.35s var(--sd-spring); }
.dem-seal.done { color: #052e1f; background: linear-gradient(135deg, #6ee7b7, var(--sd-esc-ack)); border-color: transparent; }
.dem-head-tx { min-width: 0; }
.dem-eyebrow { font-size: 9.5px; font-weight: 800; letter-spacing: 0.22em; color: var(--sd-esc-core); }
.dem-head-tx h3 { margin: 3px 0 0; font-size: 17px; font-weight: 800; letter-spacing: -0.01em; color: var(--sd-text); }
.dem-x { margin-left: auto; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; cursor: pointer;
  border: 1px solid var(--sd-border); background: transparent; color: var(--sd-text-muted); }
.dem-x:hover { color: var(--sd-danger); border-color: var(--sd-danger); }

.dem-body { padding: 16px 18px; display: flex; flex-direction: column; gap: 14px; overflow-y: auto; }
.dem-ticket { display: flex; flex-direction: column; gap: 3px; padding: 11px 13px; border-radius: 12px;
  border: 1px solid var(--sd-border); background: var(--sd-surface-glass); }
.dt-num { font-size: 11px; font-weight: 800; letter-spacing: 0.08em; color: var(--sd-esc-core); }
.dt-sub { font-size: 13px; font-weight: 600; color: var(--sd-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dem-ticket.bulkrow .dt-sub { white-space: normal; font-weight: 500; color: var(--sd-text-secondary); font-size: 12px; }

.dem-tiers { display: flex; align-items: center; gap: 10px; }
.tier { display: grid; place-items: center; min-width: 46px; height: 34px; border-radius: 10px; font-size: 14px; font-weight: 800; }
.tier.from { color: var(--sd-esc-deep); background: var(--sd-esc-deep-soft); border: 1px solid color-mix(in srgb, var(--sd-esc-deep) 45%, transparent); }
.tier.to { color: var(--sd-esc-ack); background: var(--sd-esc-ack-soft); border: 1px solid color-mix(in srgb, var(--sd-esc-ack) 45%, transparent); }
.tier-arrow { color: var(--sd-text-dim); display: grid; }
.tier-note { font-size: 11px; color: var(--sd-text-muted); font-style: italic; }

.dem-f { display: flex; flex-direction: column; gap: 7px; }
.dem-fl { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--sd-text-dim); }
.dem-fl em { color: var(--sd-esc-core); font-style: normal; }
.dem-fi { padding: 11px 13px; border-radius: 12px; border: 1px solid var(--sd-border-strong); background: var(--sd-surface-glass);
  color: var(--sd-text); font-size: 13px; font-family: inherit; resize: vertical; outline: none; }
.dem-fi:focus { border-color: var(--sd-esc-core); box-shadow: 0 0 0 3px color-mix(in srgb, var(--sd-esc-core) 16%, transparent); }
.dem-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.dem-chip { padding: 5px 11px; border-radius: 999px; font-size: 11px; font-weight: 600; cursor: pointer; font-family: inherit;
  color: var(--sd-text-muted); background: var(--sd-surface); border: 1px dashed var(--sd-border-strong); transition: all 0.16s; }
.dem-chip:hover { color: var(--sd-esc-core); border-color: color-mix(in srgb, var(--sd-esc-core) 45%, transparent); border-style: solid; background: var(--sd-esc-soft); }

.dem-flow { margin: 0; padding: 12px 13px; list-style: none; display: flex; flex-direction: column; gap: 8px;
  border-radius: 12px; border: 1px dashed var(--sd-border-strong); background: var(--sd-surface-glass); }
.dem-flow li { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--sd-text-secondary); }
.dem-flow li svg { color: var(--sd-esc-core); flex-shrink: 0; }
.dem-flow b { color: var(--sd-text); }
.dem-err { margin: 0; font-size: 12.5px; font-weight: 600; color: var(--sd-danger); }

.dem-foot { display: flex; justify-content: flex-end; gap: 9px; padding: 14px 18px; border-top: 1px solid var(--sd-border); }
.dem-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 12px; font-size: 13px;
  font-weight: 700; cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); }
.dem-btn.ghost { background: transparent; }
.dem-btn.primary { border-color: transparent; color: #2b1305; background: linear-gradient(135deg, var(--sd-esc-hi), var(--sd-esc-core));
  box-shadow: 0 10px 26px -12px var(--sd-esc-core); }
[data-theme="light"] .dem-btn.primary { color: #fff7ed; }
.dem-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.dem-spin { animation: dem-rot 0.9s linear infinite; }
@keyframes dem-rot { to { transform: rotate(360deg); } }
</style>
