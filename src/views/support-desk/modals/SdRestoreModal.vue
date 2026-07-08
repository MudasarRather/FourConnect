<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" class="rsm-veil" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.22 }" @mousedown.stop @click.self="$emit('close')">
        <Motion class="rsm-card" :initial="{ opacity: 0, y: 22, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 12, scale: 0.97 }" :transition="{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }">
          <div class="rsm-h sd-mono"><ArchiveRestore :size="13" />
            RESTORE {{ many ? `${tickets.length} RECORDS` : tickets[0]?.ticket_number }}
          </div>
          <p class="rsm-sub">
            <template v-if="many">Pull {{ tickets.length }} records out of deep storage and back into circulation.</template>
            <template v-else>Pull <b>{{ tickets[0]?.subject }}</b> out of deep storage and back into circulation.</template>
          </p>

          <div v-if="heldRows.length" class="rsm-held sd-mono">
            <Scale :size="11" /> {{ heldRows.length }} of these {{ heldRows.length === 1 ? 'is' : 'are' }} under legal hold —
            the server will skip {{ heldRows.length === 1 ? 'it' : 'them' }} unless you are a superuser.
          </div>

          <ul class="rsm-flow">
            <li><Undo2 :size="12" /> Returns in the status it was shelved in{{ many ? '' : ` — ${(tickets[0]?.status || '').replace(/_/g, ' ')}` }}</li>
            <li><Eye :size="12" /> Visible on the active desks, queues and reports again</li>
            <li><TimerReset :size="12" /> The retention clock and provenance stamps are cleared</li>
            <li><ScrollText :size="12" /> The prior stamps survive on the timeline — the trail stays honest</li>
          </ul>

          <input v-model="note" class="rsm-note" type="text" maxlength="200"
            placeholder="One line for the record (optional)…" @keyup.enter="confirm" />

          <div class="rsm-actions">
            <button class="rsm-btn primary" :disabled="busy" @click="confirm">
              <ArchiveRestore :size="13" /> {{ busy ? 'Restoring…' : (many ? `Restore ${tickets.length}` : 'Restore the record') }}
            </button>
            <button class="rsm-btn ghost" :disabled="busy" @click="$emit('close')">Leave it shelved</button>
          </div>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
/* SdRestoreModal — the Deep Storage desk's signature positive act. Single + bulk:
   one ticket calls restoreTicket (with the optional note), many run the server bulk
   restore (per-row guards; legal-held rows are skipped for non-superusers). Emits
   done(restoredCount) — the section toasts + refreshes. */
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import { ArchiveRestore, Scale, Undo2, Eye, TimerReset, ScrollText } from 'lucide-vue-next'
import { restoreTicket, bulkRestoreTickets } from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  tickets: { type: Array, default: () => [] },
})
const emit = defineEmits(['close', 'done'])
const toast = useToast()

const note = ref('')
const busy = ref(false)
const many = computed(() => props.tickets.length > 1)
const heldRows = computed(() => props.tickets.filter(t => t.legal_hold))
watch(() => props.open, (v) => { if (v) { note.value = ''; busy.value = false } })

const confirm = async () => {
  if (busy.value || !props.tickets.length) return
  busy.value = true
  try {
    if (many.value) {
      const r = await bulkRestoreTickets(props.tickets.map(t => t.id), note.value)
      const skipped = (r.results || []).filter(x => x.skipped || !x.ok).length
      if (skipped) toast.info(`${skipped} record${skipped === 1 ? '' : 's'} skipped (not archived or legal-held).`)
      emit('done', r.updated ?? props.tickets.length - skipped)
    } else {
      await restoreTicket(props.tickets[0].id, note.value ? { note: note.value } : {})
      emit('done', 1)
    }
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not restore — the record may be under legal hold.')
    busy.value = false
  }
}
</script>

<style scoped>
.rsm-veil { position: fixed; inset: 0; z-index: 2500; display: grid; place-items: center; padding: 4vh 16px;
  background: rgba(6, 8, 6, 0.66); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
[data-theme="light"] .rsm-veil { background: rgba(25, 30, 22, 0.4); }
.rsm-card { display: flex; flex-direction: column; gap: 11px; width: min(460px, 100%); padding: 18px 20px; border-radius: 18px;
  border: 1px solid color-mix(in srgb, var(--sd-arc-restore) 45%, transparent); background: var(--sd-panel); box-shadow: var(--sd-shadow); }
.rsm-h { display: inline-flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 800; letter-spacing: 0.16em;
  color: var(--sd-arc-restore); }
.rsm-sub { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--sd-text-muted); }
.rsm-sub b { color: var(--sd-text); }
.rsm-held { display: flex; align-items: center; gap: 7px; padding: 8px 11px; border-radius: 10px;
  font-size: 10px; letter-spacing: 0.04em; color: var(--sd-arc-hold);
  border: 1px dashed color-mix(in srgb, var(--sd-arc-hold) 55%, transparent); background: var(--sd-arc-hold-soft); }
.rsm-flow { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 7px; }
.rsm-flow li { display: flex; align-items: center; gap: 9px; font-size: 12px; color: var(--sd-text-muted); }
.rsm-flow li svg { color: var(--sd-arc-restore); flex: none; }
.rsm-note { padding: 9px 12px; border-radius: 11px; border: 1px solid var(--sd-border-strong); background: var(--sd-surface-glass);
  color: var(--sd-text); font-size: 12.5px; font-family: inherit; outline: none; }
.rsm-note:focus { border-color: var(--sd-arc-restore); }
.rsm-actions { display: flex; gap: 8px; }
.rsm-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 11px; font-size: 12px; font-weight: 700;
  cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); }
.rsm-btn.primary { border-color: transparent; color: #04231a; background: linear-gradient(135deg, #9df0cd, var(--sd-arc-restore)); }
.rsm-btn.ghost { background: transparent; }
.rsm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
