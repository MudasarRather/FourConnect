<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" class="iwp-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 0.2 }"
        @mousedown.self="!busy && $emit('close')">
        <Motion class="iwp" role="dialog" aria-modal="true" aria-label="Stakeholder watchers"
          :initial="{ opacity: 0, y: 22, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 14, scale: 0.98 }" :transition="{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }">
          <button class="iwp-x" :disabled="busy" aria-label="Close" @click="$emit('close')"><X :size="15" /></button>
          <p class="iwp-eyebrow sd-mono"><Eye :size="11" /> STAKEHOLDER WATCHERS · <em>{{ total }}</em></p>
          <p v-if="ticket" class="iwp-subj">{{ ticket.ticket_number }} — {{ ticket.subject }}</p>

          <div class="iwp-list">
            <div v-if="loading && !watchers.length" class="iwp-empty sd-mono">LOADING THE AUDIENCE…</div>
            <div v-else-if="!watchers.length" class="iwp-empty sd-mono">
              NO WATCHERS YET — SUBSCRIBE STAKEHOLDERS BELOW.</div>
            <div v-for="w in watchers" :key="String(w.user_id)" class="iwp-row">
              <span class="iwp-ava sd-mono">{{ initials(w.user_name) }}</span>
              <span class="iwp-name">{{ w.user_name || '—' }}</span>
              <button class="iwp-del" :disabled="busy" :title="`Unsubscribe ${w.user_name || 'watcher'}`"
                @click="drop(w)"><X :size="11" /></button>
            </div>
          </div>

          <div class="iwp-q">
            <UserPlus :size="12" />
            <input v-model="q" type="text" maxlength="60"
              placeholder="Add a stakeholder — 2+ letters searches the directory…" />
          </div>
          <div v-if="suggestions.length" class="iwp-sugg">
            <button v-for="p in suggestions" :key="String(p.id)" class="iwp-add sd-mono" :disabled="busy"
              @click="add(p)"><Plus :size="10" /> {{ p.name }}</button>
          </div>
          <p class="iwp-hint sd-mono">WATCHERS RECEIVE EVERY STAKEHOLDER BROADCAST ON THIS INCIDENT</p>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
/*
  SdIncWatchersPop — compact watcher management for the oversight desk (the incident
  comms-hub audience). Reads GET /tickets/{id}/watchers (shared sealed read), adds via
  POST /tickets/{id}/watchers (owner-tier subscribe-another) and removes via DELETE.
  Directory search rides fetchRosterCandidates' 2+ char typeahead — no new endpoint.
  z2700 family. Emits `changed` so hosts can invalidate the row's peek cache.
*/
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import { X, Eye, UserPlus, Plus } from 'lucide-vue-next'
import {
  listTicketWatchers, addTicketWatcher, removeTicketWatcher, fetchRosterCandidates,
} from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  ticket: { type: Object, default: null },
})
const emit = defineEmits(['close', 'changed'])
const toast = useToast()

const watchers = ref([])
const total = ref(0)
const loading = ref(false)
const busy = ref(false)
const q = ref('')
const found = ref([])
let qTimer = null

const initials = (n) => String(n || '?').split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase()
const suggestions = computed(() => {
  const have = new Set(watchers.value.map((w) => String(w.user_id)))
  return found.value.filter((p) => !have.has(String(p.id))).slice(0, 5)
})

const load = async () => {
  if (!props.ticket?.id) return
  loading.value = true
  try {
    const res = await listTicketWatchers(props.ticket.id)
    watchers.value = res.items || []
    total.value = res.total || 0
  } catch { watchers.value = []; total.value = 0 } finally { loading.value = false }
}
watch(() => props.open, (v) => { if (v) { q.value = ''; found.value = []; load() } })
watch(q, (term) => {
  clearTimeout(qTimer)
  const t = term.trim()
  if (t.length < 2 || !props.ticket?.id) { found.value = []; return }
  qTimer = setTimeout(async () => {
    try { found.value = (await fetchRosterCandidates(props.ticket.id, { q: t })).candidates || [] }
    catch { found.value = [] }
  }, 300)
})
onBeforeUnmount(() => clearTimeout(qTimer))

const add = async (p) => {
  if (!props.ticket || busy.value) return
  busy.value = true
  try {
    await addTicketWatcher(props.ticket.id, p.id)
    toast.success(`${p.name || 'Stakeholder'} subscribed`)
    q.value = ''; found.value = []
    await load()
    emit('changed')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not subscribe the stakeholder') }
  finally { busy.value = false }
}
const drop = async (w) => {
  if (!props.ticket || busy.value) return
  busy.value = true
  try {
    await removeTicketWatcher(props.ticket.id, w.user_id)
    await load()
    emit('changed')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not unsubscribe the watcher') }
  finally { busy.value = false }
}
</script>

<style scoped>
.iwp-overlay { position: fixed; inset: 0; z-index: 2700; display: grid; place-items: center;
  padding: 20px; background: rgba(5, 4, 2, 0.58); backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px); }
.iwp { position: relative; width: min(400px, 94vw); max-height: 80vh; overflow: hidden auto;
  border-radius: 18px; padding: 18px 18px 14px;
  background: linear-gradient(180deg, var(--sd-surface-elevated), var(--sd-surface));
  border: 1px solid var(--sd-fun-brd); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), var(--sd-shadow-hover); }
.iwp-x { position: absolute; top: 12px; right: 12px; display: grid; place-items: center; width: 27px;
  height: 27px; border-radius: 9px; cursor: pointer; background: var(--sd-surface);
  border: 1px solid var(--sd-border); color: var(--sd-text-muted); }
.iwp-x:hover { color: var(--sd-text); border-color: var(--sd-border-strong); }
.iwp-eyebrow { display: inline-flex; align-items: center; gap: 6px; margin: 0 0 6px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.18em; color: var(--sd-fun-core); }
.iwp-eyebrow em { font-style: normal; color: var(--sd-text); }
.iwp-subj { margin: 0; font-size: 12.5px; font-weight: 700; color: var(--sd-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 26px; }
.iwp-list { display: flex; flex-direction: column; gap: 5px; margin-top: 12px; }
.iwp-row { display: flex; align-items: center; gap: 9px; padding: 7px 9px; border-radius: 11px;
  background: var(--sd-surface); border: 1px solid var(--sd-border); }
.iwp-ava { flex: none; display: grid; place-items: center; width: 25px; height: 25px; border-radius: 50%;
  font-size: 8.5px; font-weight: 800; color: var(--sd-text);
  background: linear-gradient(140deg, var(--sd-fun-soft), var(--sd-fun-deep-soft));
  border: 1px solid var(--sd-fun-brd); }
.iwp-name { flex: 1; min-width: 0; font-size: 12px; font-weight: 700; color: var(--sd-text);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.iwp-del { flex: none; display: grid; place-items: center; width: 22px; height: 22px; border-radius: 8px;
  cursor: pointer; background: transparent; border: 1px solid var(--sd-border);
  color: var(--sd-text-muted); transition: color 0.2s, border-color 0.2s; }
.iwp-del:hover:not(:disabled) { color: var(--sd-fun-esc);
  border-color: color-mix(in srgb, var(--sd-fun-esc) 40%, transparent); }
.iwp-empty { padding: 14px 6px; text-align: center; font-size: 9px; letter-spacing: 0.14em;
  color: var(--sd-text-muted); }
.iwp-q { display: flex; align-items: center; gap: 7px; margin-top: 11px; padding: 8px 11px;
  border-radius: 11px; background: var(--sd-surface); border: 1px solid var(--sd-border);
  color: var(--sd-text-muted); }
.iwp-q input { flex: 1; min-width: 0; border: 0; outline: none; background: transparent;
  font: inherit; font-size: 11.5px; color: var(--sd-text); }
.iwp-q input::placeholder { color: var(--sd-text-muted); }
.iwp-q:focus-within { border-color: var(--sd-fun-brd); }
.iwp-sugg { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.iwp-add { display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px; border-radius: 9px;
  cursor: pointer; font-size: 9px; font-weight: 800; letter-spacing: 0.08em;
  color: var(--sd-fun-core); background: var(--sd-fun-soft);
  border: 1px dashed var(--sd-fun-brd); transition: transform 0.2s var(--sd-spring); }
.iwp-add:hover:not(:disabled) { transform: translateY(-1px); border-style: solid; }
.iwp-hint { margin: 10px 0 0; font-size: 8px; letter-spacing: 0.12em; color: var(--sd-text-dim); }

/* ═════ LIGHT THEME OVERRIDES ═════ */
[data-theme="light"] .iwp { background: linear-gradient(180deg, rgba(255, 250, 240, 0.94), rgba(255, 250, 240, 0.86)); }
[data-theme="light"] .iwp-overlay { background: rgba(40, 25, 10, 0.32); }
[data-theme="light"] .iwp-q, [data-theme="light"] .iwp-row { background: rgba(255, 250, 240, 0.65); }
</style>
