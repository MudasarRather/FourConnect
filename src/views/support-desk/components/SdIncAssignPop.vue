<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" class="iap-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 0.2 }"
        @mousedown.self="!busy && $emit('close')">
        <Motion class="iap" role="dialog" aria-modal="true" aria-label="Assign responder"
          :initial="{ opacity: 0, y: 22, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 14, scale: 0.98 }" :transition="{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }">
          <button class="iap-x" :disabled="busy" aria-label="Close" @click="$emit('close')"><X :size="15" /></button>
          <p class="iap-eyebrow sd-mono"><UserPlus :size="11" /> ASSIGN / REASSIGN RESPONDER</p>
          <p v-if="ticket" class="iap-subj">{{ ticket.ticket_number }} — {{ ticket.subject }}</p>
          <p v-if="ticket?.assigned_agent_name" class="iap-cur sd-mono">
            CURRENT OWNER · <b>{{ ticket.assigned_agent_name }}</b></p>

          <div class="iap-q">
            <Search :size="12" />
            <input v-model="q" type="text" maxlength="60"
              placeholder="Filter the pool — 2+ letters searches the whole directory…" />
          </div>

          <div class="iap-list">
            <div v-if="loading && !people.length" class="iap-empty sd-mono">LOADING THE POOL…</div>
            <div v-else-if="!shown.length" class="iap-empty sd-mono">NO CANDIDATES — SEARCH THE DIRECTORY ABOVE.</div>
            <button v-for="p in shown" :key="p.id" class="iap-row" :disabled="busy"
              :class="{ cur: isCurrent(p) }" @click="pick(p)">
              <span class="iap-ava sd-mono">{{ initials(p.name) }}</span>
              <span class="iap-body">
                <b>{{ p.name || '—' }}</b>
                <i class="sd-mono">
                  <template v-if="isCurrent(p)">CURRENT OWNER</template>
                  <template v-else>{{ p.on_team ? 'ON TEAM' : 'DIRECTORY' }}<template v-if="p.is_lead"> · LEAD</template></template>
                </i>
              </span>
              <span v-if="p.command_load" class="iap-load sd-mono" :class="{ hot: p.command_load >= 2 }"
                :title="`Commanding ${p.command_load} live incident${p.command_load > 1 ? 's' : ''}`">
                <Flame :size="10" /> {{ p.command_load }}</span>
              <span class="iap-go sd-mono">{{ isCurrent(p) ? '—' : 'ASSIGN' }}</span>
            </button>
          </div>
          <p class="iap-hint sd-mono">ASSIGNMENT NOTIFIES THE NEW OWNER · THE SLA CLOCK KEEPS RUNNING</p>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
/*
  SdIncAssignPop — the oversight desk's compact assign/reassign picker.
  Pool comes from the sealed GET /tickets/{id}/roster-candidates read (team staffing
  pool + live command load; `q` 2+ chars typeahead-searches the whole directory).
  Picking a person POSTs /tickets/{id}/assign with payload key `assigned_agent_id`
  (the admin wrapper — this desk is the ADMIN panel). z2700 family: clears the
  ticket drawer (z2100) when launched alongside it.
*/
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import { X, UserPlus, Search, Flame } from 'lucide-vue-next'
import { assignTicket, fetchRosterCandidates } from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  ticket: { type: Object, default: null },
})
const emit = defineEmits(['close', 'done'])
const toast = useToast()

const q = ref('')
const people = ref([])
const loading = ref(false)
const busy = ref(false)
let qTimer = null

const initials = (n) => String(n || '?').split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
const isCurrent = (p) => props.ticket && String(props.ticket.assigned_agent_id || '') === String(p.id)

const shown = computed(() => {
  const term = q.value.trim().toLowerCase()
  let list = people.value
  if (term) list = list.filter((p) => String(p.name || '').toLowerCase().includes(term))
  // suggested order: on-team first, then the lightest command load
  return [...list].sort((a, b) => (b.on_team ? 1 : 0) - (a.on_team ? 1 : 0)
    || (a.command_load || 0) - (b.command_load || 0)).slice(0, 8)
})

const loadPool = async () => {
  if (!props.ticket?.id) return
  loading.value = true
  try {
    const res = await fetchRosterCandidates(props.ticket.id)
    people.value = res.candidates || []
  } catch { people.value = [] } finally { loading.value = false }
}
watch(() => props.open, (v) => {
  if (v) { q.value = ''; people.value = []; loadPool() }
})
// directory typeahead — merges results into the pool (never replaces it)
watch(q, (term) => {
  clearTimeout(qTimer)
  const t = term.trim()
  if (t.length < 2 || !props.ticket?.id) return
  qTimer = setTimeout(async () => {
    try {
      const res = await fetchRosterCandidates(props.ticket.id, { q: t })
      const have = new Set(people.value.map((p) => String(p.id)))
      people.value = [...people.value, ...(res.candidates || []).filter((p) => !have.has(String(p.id)))]
    } catch { /* keep pool */ }
  }, 300)
})
onBeforeUnmount(() => clearTimeout(qTimer))

const pick = async (p) => {
  if (!props.ticket || isCurrent(p) || busy.value) return
  busy.value = true
  try {
    await assignTicket(props.ticket.id, { assigned_agent_id: p.id })
    toast.success(`${props.ticket.ticket_number} assigned to ${p.name || 'the responder'}`)
    emit('done')
    emit('close')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not assign the responder')
  } finally { busy.value = false }
}
</script>

<style scoped>
.iap-overlay { position: fixed; inset: 0; z-index: 2700; display: grid; place-items: center;
  padding: 20px; background: rgba(5, 4, 2, 0.58); backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px); }
.iap { position: relative; width: min(430px, 94vw); max-height: 82vh; overflow: hidden auto;
  border-radius: 18px; padding: 18px 18px 14px;
  background: linear-gradient(180deg, var(--sd-surface-elevated), var(--sd-surface));
  border: 1px solid var(--sd-fun-brd); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), var(--sd-shadow-hover); }
.iap-x { position: absolute; top: 12px; right: 12px; display: grid; place-items: center; width: 27px;
  height: 27px; border-radius: 9px; cursor: pointer; background: var(--sd-surface);
  border: 1px solid var(--sd-border); color: var(--sd-text-muted); }
.iap-x:hover { color: var(--sd-text); border-color: var(--sd-border-strong); }
.iap-eyebrow { display: inline-flex; align-items: center; gap: 6px; margin: 0 0 6px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.18em; color: var(--sd-fun-core); }
.iap-subj { margin: 0; font-size: 12.5px; font-weight: 700; color: var(--sd-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 26px; }
.iap-cur { margin: 4px 0 0; font-size: 9px; letter-spacing: 0.12em; color: var(--sd-text-muted); }
.iap-cur b { color: var(--sd-text-secondary); }
.iap-q { display: flex; align-items: center; gap: 7px; margin-top: 12px; padding: 8px 11px;
  border-radius: 11px; background: var(--sd-surface); border: 1px solid var(--sd-border);
  color: var(--sd-text-muted); }
.iap-q input { flex: 1; min-width: 0; border: 0; outline: none; background: transparent;
  font: inherit; font-size: 11.5px; color: var(--sd-text); }
.iap-q input::placeholder { color: var(--sd-text-muted); }
.iap-q:focus-within { border-color: var(--sd-fun-brd); }
.iap-list { display: flex; flex-direction: column; gap: 5px; margin-top: 10px; }
.iap-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 12px;
  cursor: pointer; text-align: left; font: inherit; background: var(--sd-surface);
  border: 1px solid var(--sd-border); transition: border-color 0.2s, transform 0.25s var(--sd-spring); }
.iap-row:hover:not(:disabled):not(.cur) { transform: translateY(-1px); border-color: var(--sd-fun-brd); }
.iap-row.cur { opacity: 0.6; cursor: default; }
.iap-row:disabled { opacity: 0.5; cursor: wait; }
.iap-ava { flex: none; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 50%;
  font-size: 9px; font-weight: 800; color: var(--sd-text);
  background: linear-gradient(140deg, var(--sd-fun-soft), var(--sd-fun-deep-soft));
  border: 1px solid var(--sd-fun-brd); }
.iap-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.iap-body b { font-size: 12px; font-weight: 700; color: var(--sd-text); white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; }
.iap-body i { font-style: normal; font-size: 8px; font-weight: 700; letter-spacing: 0.14em;
  color: var(--sd-text-muted); }
.iap-load { display: inline-flex; align-items: center; gap: 3px; font-size: 9.5px; font-weight: 800;
  color: var(--sd-warning); }
.iap-load.hot { color: var(--sd-fun-esc); }
.iap-go { font-size: 8.5px; font-weight: 800; letter-spacing: 0.14em; color: var(--sd-fun-core); }
.iap-empty { padding: 18px 6px; text-align: center; font-size: 9px; letter-spacing: 0.14em;
  color: var(--sd-text-muted); }
.iap-hint { margin: 10px 0 0; font-size: 8px; letter-spacing: 0.12em; color: var(--sd-text-dim); }

/* ═════ LIGHT THEME OVERRIDES ═════ */
[data-theme="light"] .iap { background: linear-gradient(180deg, rgba(255, 250, 240, 0.94), rgba(255, 250, 240, 0.86)); }
[data-theme="light"] .iap-overlay { background: rgba(40, 25, 10, 0.32); }
[data-theme="light"] .iap-q, [data-theme="light"] .iap-row { background: rgba(255, 250, 240, 0.65); }
</style>
