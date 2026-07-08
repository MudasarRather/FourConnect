<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open && superuser" class="pgm-veil" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.22 }" @mousedown.stop @click.self="!busy && $emit('close')">
        <Motion class="pgm-card" :initial="{ opacity: 0, y: 22, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 12, scale: 0.97 }" :transition="{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }">
          <div class="pgm-h sd-mono"><Flame :size="13" />
            PURGE {{ eligible.length === 1 ? eligible[0].ticket_number : `${eligible.length} RECORDS` }}
          </div>
          <p class="pgm-sub">
            This is the only destructive act on the desk. The record, its conversation and its
            timeline are destroyed — <b>there is no undo</b>. The audit tombstone is the only trace
            that survives.
          </p>

          <div v-if="blocked.length" class="pgm-blocked">
            <div class="pgm-blk-h sd-mono"><ShieldAlert :size="11" /> EXCLUDED FROM THIS PURGE</div>
            <div v-for="b in blocked" :key="b.t.id" class="pgm-blk-row sd-mono">
              <span>{{ b.t.ticket_number }}</span><em>{{ b.why }}</em>
            </div>
          </div>

          <div v-if="eligible.length" class="pgm-list sd-mono">
            <span v-for="t in eligible.slice(0, 6)" :key="t.id" class="pgm-chip">{{ t.ticket_number }}</span>
            <span v-if="eligible.length > 6" class="pgm-chip more">+{{ eligible.length - 6 }} more</span>
          </div>
          <p v-else class="pgm-none">Nothing in this selection can be purged — every record is either
            still inside its retention window or under legal hold.</p>

          <template v-if="eligible.length">
            <label class="pgm-lb sd-mono">WHY IS THIS BEING DESTROYED? (AUDITED)</label>
            <input v-model="reason" class="pgm-note" type="text" maxlength="200"
              placeholder="e.g. GDPR erasure request · retention end-of-life…" />
            <label class="pgm-lb sd-mono">TYPE <b>PURGE</b> TO ARM</label>
            <input v-model="armText" class="pgm-note arm" :class="{ armed }" type="text"
              autocomplete="off" spellcheck="false" placeholder="PURGE" />
          </template>

          <div class="pgm-actions">
            <button v-if="eligible.length" class="pgm-btn danger" :disabled="!armed || !reason.trim() || busy" @click="confirm">
              <Flame :size="13" /> {{ busy ? `Destroying… ${done}/${eligible.length}` : `Destroy ${eligible.length === 1 ? 'the record' : eligible.length + ' records'} forever` }}
            </button>
            <button class="pgm-btn ghost" :disabled="busy" @click="$emit('close')">Keep {{ eligible.length === 1 ? 'it' : 'them' }}</button>
          </div>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
/* SdPurgeModal — superuser-only permanent destruction, typed-confirmation armed.
   Splits the selection into eligible vs blocked (legal hold / retention still running)
   BEFORE calling the server, then purges eligible rows one by one (per-row 409s are
   surfaced by ticket number, never a generic toast). Emits done(purgedCount). */
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import { Flame, ShieldAlert } from 'lucide-vue-next'
import { purgeTicket, PURGE_RETENTION_DAYS } from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  tickets: { type: Array, default: () => [] },
  superuser: { type: Boolean, default: false },
  now: { type: Number, default: () => Date.now() },
})
const emit = defineEmits(['close', 'done'])
const toast = useToast()

const reason = ref('')
const armText = ref('')
const busy = ref(false)
const done = ref(0)
const armed = computed(() => armText.value.trim() === 'PURGE')
watch(() => props.open, (v) => { if (v) { reason.value = ''; armText.value = ''; busy.value = false; done.value = 0 } })

const ep = (v) => (v ? new Date(v).getTime() : 0)
const purgeEpoch = (t) => ep(t.purge_eligible_at) || (ep(t.archived_at) ? ep(t.archived_at) + PURGE_RETENTION_DAYS * 86400000 : 0)
const split = computed(() => {
  const elig = [], blk = []
  for (const t of props.tickets) {
    if (!t.is_deleted && !t.archived_at) blk.push({ t, why: 'not archived' })
    else if (t.legal_hold) blk.push({ t, why: 'under legal hold — release it first' })
    else if (!purgeEpoch(t) || props.now < purgeEpoch(t)) blk.push({ t, why: 'retention window still running' })
    else elig.push(t)
  }
  return { elig, blk }
})
const eligible = computed(() => split.value.elig)
const blocked = computed(() => split.value.blk)

const confirm = async () => {
  if (!armed.value || !reason.value.trim() || busy.value) return
  busy.value = true; done.value = 0
  let ok = 0
  for (const t of eligible.value) {
    try {
      await purgeTicket(t.id, reason.value.trim())
      ok += 1
    } catch (e) {
      const msg = e?.response?.data?.detail || 'could not be purged'
      toast.error(`${t.ticket_number}: ${msg}`)
    } finally {
      done.value += 1
    }
  }
  emit('done', ok)
}
</script>

<style scoped>
.pgm-veil { position: fixed; inset: 0; z-index: 2700; display: grid; place-items: center; padding: 4vh 16px;
  background: rgba(10, 4, 2, 0.72); backdrop-filter: blur(11px); -webkit-backdrop-filter: blur(11px); }
[data-theme="light"] .pgm-veil { background: rgba(40, 18, 8, 0.45); }
.pgm-card { display: flex; flex-direction: column; gap: 11px; width: min(480px, 100%); padding: 18px 20px; border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--sd-danger) 50%, transparent); background: var(--sd-panel); box-shadow: var(--sd-shadow); }
.pgm-h { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 800; letter-spacing: 0.16em;
  color: var(--sd-danger); }
.pgm-sub { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--sd-text-muted); }
.pgm-sub b { color: var(--sd-danger); }
.pgm-blocked { display: flex; flex-direction: column; gap: 6px; padding: 9px 12px; border-radius: 10px;
  border: 1px dashed color-mix(in srgb, var(--sd-arc-hold) 55%, transparent); background: var(--sd-arc-hold-soft); }
.pgm-blk-h { display: inline-flex; align-items: center; gap: 6px; font-size: 9px; font-weight: 800;
  letter-spacing: 0.16em; color: var(--sd-arc-hold); }
.pgm-blk-row { display: flex; justify-content: space-between; gap: 10px; font-size: 10px; color: var(--sd-text-muted); }
.pgm-blk-row em { font-style: normal; color: var(--sd-arc-hold); }
.pgm-list { display: flex; flex-wrap: wrap; gap: 6px; }
.pgm-chip { padding: 4px 9px; border-radius: 7px; font-size: 10px; font-weight: 800; letter-spacing: 0.05em;
  color: var(--sd-danger); background: color-mix(in srgb, var(--sd-danger) 11%, transparent);
  border: 1px solid color-mix(in srgb, var(--sd-danger) 45%, transparent); }
.pgm-chip.more { color: var(--sd-text-dim); border-color: var(--sd-border-strong); background: transparent; }
.pgm-none { margin: 0; font-size: 12px; color: var(--sd-text-dim); }
.pgm-lb { font-size: 9px; font-weight: 800; letter-spacing: 0.16em; color: var(--sd-text-dim); }
.pgm-lb b { color: var(--sd-danger); }
.pgm-note { padding: 9px 12px; border-radius: 11px; border: 1px solid var(--sd-border-strong); background: var(--sd-surface-glass);
  color: var(--sd-text); font-size: 12.5px; font-family: inherit; outline: none; }
.pgm-note:focus { border-color: var(--sd-danger); }
.pgm-note.arm { font-family: var(--sd-mono); font-weight: 800; letter-spacing: 0.28em; text-transform: uppercase; }
.pgm-note.arm.armed { border-color: var(--sd-danger); color: var(--sd-danger);
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--sd-danger) 25%, transparent); }
.pgm-actions { display: flex; gap: 8px; }
.pgm-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 11px; font-size: 12px; font-weight: 700;
  cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); }
.pgm-btn.danger { border-color: transparent; color: #fff; background: linear-gradient(135deg, #f87171, #dc2626); }
.pgm-btn.ghost { background: transparent; }
.pgm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
