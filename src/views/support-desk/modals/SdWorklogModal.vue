<template>
  <SdModalShell :open="!!ticket" eyebrow="L2 WORKBENCH · TIME" title="Log time on this ticket" width="520px"
    @close="$emit('close')">
    <div v-if="ticket" class="wlm">
      <div class="wlm-ticket sd-mono">
        <span class="wlm-no">{{ ticket.ticket_number }}</span>
        <span class="wlm-subj">{{ ticket.subject }}</span>
        <span class="wlm-total" title="Total time logged on this ticket">Σ {{ totalLabel }}</span>
      </div>

      <!-- kind of work -->
      <div class="wlm-kinds">
        <Motion v-for="(k, i) in WORK_TYPES" :key="k.value" as="button" class="wlm-k" :class="{ on: workType === k.value }"
          :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.3, delay: 0.04 + i * 0.04, ease: [0.16, 1, 0.3, 1] }"
          :while-hover="{ y: -2 }" :while-tap="{ scale: 0.97 }" @click="workType = k.value">
          {{ k.label }}
        </Motion>
      </div>

      <!-- minutes -->
      <div class="wlm-mins">
        <button v-for="m in QUICK" :key="m" class="wlm-m sd-mono" :class="{ on: minutes === m }" @click="minutes = m">{{ m }}m</button>
        <label class="wlm-custom sd-mono">
          <input v-model.number="minutes" type="number" min="1" max="1440" />
          <span>min</span>
        </label>
      </div>

      <label class="wlm-f">
        <span>Work note</span>
        <textarea v-model="note" class="wlm-inp" rows="2" placeholder="What did this time go into?" />
      </label>

      <!-- the ledger -->
      <div class="wlm-ledger">
        <p class="wlm-lt sd-mono">RECENT ENTRIES</p>
        <p v-if="!entries.length" class="wlm-none">Nothing logged yet — this ticket's effort record starts with you.</p>
        <ul v-else>
          <li v-for="w in entries" :key="w.id" class="sd-mono">
            <b>{{ w.minutes }}m</b>
            <span class="wlm-e-kind">{{ kindLabel(w.work_type) }}</span>
            <span class="wlm-e-who">{{ w.user_name }}</span>
            <span class="wlm-e-note" :title="w.note || ''">{{ w.note || '' }}</span>
            <button v-if="canDelete(w)" class="wlm-e-x" title="Remove this entry (adjusts the total)" @click="remove(w)">
              <Trash2 :size="11" />
            </button>
          </li>
        </ul>
      </div>
    </div>
    <template #footer>
      <button class="wlm-btn" @click="$emit('close')">Close</button>
      <button class="wlm-btn primary" :disabled="busy || !valid" @click="confirm">
        <Loader v-if="busy" :size="13" class="wlm-spin" /> Log {{ minutes || 0 }}m
      </button>
    </template>
  </SdModalShell>
</template>

<script setup>
/* SdWorklogModal — per-entry effort record (ServiceNow work notes). Logging keeps the
   ticket's cumulative counter in sync server-side; deleting an entry adjusts it back. */
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { Loader, Trash2 } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import SdModalShell from '../components/SdModalShell.vue'
import { listWorklogs, addWorklog, deleteWorklog, WORK_TYPES } from '@/composables/useSupportDesk'

const props = defineProps({
  ticket: { type: Object, default: null },
  me: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['close', 'done'])
const toast = useToast()

const QUICK = [15, 25, 45, 60]
const workType = ref('work')
const minutes = ref(25)
const note = ref('')
const busy = ref(false)
const entries = ref([])
const totalMinutes = ref(0)

const totalLabel = computed(() => {
  const m = totalMinutes.value
  const h = Math.floor(m / 60)
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`
})
const kindLabel = (v) => WORK_TYPES.find(k => k.value === v)?.label || v
const canDelete = (w) => props.me?.is_superuser || String(w.user_id) === String(props.me?.id)
const valid = computed(() => Number.isFinite(minutes.value) && minutes.value >= 1 && minutes.value <= 1440)

const load = async () => {
  if (!props.ticket) return
  try {
    const r = await listWorklogs(props.ticket.id, { page: 1, limit: 8 })
    entries.value = r.items || []
    totalMinutes.value = r.total_minutes || 0
  } catch { entries.value = []; totalMinutes.value = 0 }
}
watch(() => props.ticket, (t) => {
  workType.value = 'work'; minutes.value = 25; note.value = ''; busy.value = false
  if (t) load()
})

const confirm = async () => {
  if (!props.ticket || !valid.value) return
  busy.value = true
  try {
    await addWorklog(props.ticket.id, {
      minutes: minutes.value, work_type: workType.value, note: note.value.trim() || null,
    })
    toast.success(`${minutes.value}m logged on ${props.ticket.ticket_number}`)
    note.value = ''
    await load()
    emit('done', totalMinutes.value)
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not log time')
  } finally { busy.value = false }
}
const remove = async (w) => {
  try {
    const r = await deleteWorklog(props.ticket.id, w.id)
    entries.value = r.items || []
    totalMinutes.value = r.total_minutes || 0
    emit('done', totalMinutes.value)
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not remove the entry') }
}
</script>

<style scoped>
.wlm { display: flex; flex-direction: column; gap: 13px; }
.wlm-ticket { display: flex; align-items: baseline; gap: 9px; padding: 10px 12px; border-radius: 11px;
  border: 1px dashed var(--sd-border-strong); background: var(--sd-l2-soft); }
.wlm-no { font-size: 11px; font-weight: 800; color: var(--sd-l2-core); }
.wlm-subj { flex: 1; font-size: 12px; color: var(--sd-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.wlm-total { font-size: 10px; font-weight: 800; color: var(--sd-l2-core); }

.wlm-kinds { display: flex; flex-wrap: wrap; gap: 7px; }
.wlm-k { padding: 8px 12px; border-radius: 11px; font-size: 11.5px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border); background: var(--sd-surface); color: var(--sd-text-secondary); }
.wlm-k.on { border-color: var(--sd-l2-core); color: var(--sd-l2-core); background: var(--sd-l2-soft); }

.wlm-mins { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.wlm-m { padding: 8px 13px; border-radius: 11px; font-size: 12px; font-weight: 800; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border); background: var(--sd-surface); color: var(--sd-text-secondary);
  font-variant-numeric: tabular-nums; }
.wlm-m.on { border-color: var(--sd-l2-core); color: var(--sd-l2-core); background: var(--sd-l2-soft); }
.wlm-custom { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 11px;
  border: 1px solid var(--sd-border-strong); color: var(--sd-text-dim); font-size: 11px; }
.wlm-custom input { width: 58px; border: none; background: none; outline: none; font-family: inherit;
  font-size: 13px; font-weight: 800; color: var(--sd-text); font-variant-numeric: tabular-nums; }

.wlm-f { display: flex; flex-direction: column; gap: 5px; }
.wlm-f span { font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em; color: var(--sd-text-muted); }
.wlm-inp { padding: 9px 11px; border-radius: 10px; resize: vertical; font-family: inherit; font-size: 12.5px;
  border: 1px solid var(--sd-border-strong); background: var(--sd-input-bg, var(--sd-surface)); color: var(--sd-text); }
.wlm-inp:focus { outline: none; border-color: var(--sd-l2-core); }

.wlm-ledger { border-top: 1px dashed var(--sd-border); padding-top: 10px; }
.wlm-lt { margin: 0 0 7px; font-size: 8.5px; font-weight: 800; letter-spacing: 0.18em; color: var(--sd-text-dim); }
.wlm-none { margin: 0; font-size: 11px; color: var(--sd-text-dim); }
.wlm-ledger ul { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 5px; }
.wlm-ledger li { display: flex; align-items: center; gap: 9px; font-size: 10.5px; color: var(--sd-text-secondary); }
.wlm-ledger li b { min-width: 34px; color: var(--sd-l2-core); font-variant-numeric: tabular-nums; }
.wlm-e-kind { color: var(--sd-text-dim); }
.wlm-e-who { font-weight: 700; }
.wlm-e-note { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--sd-text-dim); }
.wlm-e-x { display: grid; place-items: center; border: none; background: none; cursor: pointer; color: var(--sd-text-dim); }
.wlm-e-x:hover { color: var(--sd-l2-halt); }

.wlm-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 15px; border-radius: 11px;
  font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border-strong); background: transparent; color: var(--sd-text-secondary); }
.wlm-btn.primary { border-color: transparent; color: #26120a; background: var(--sd-l2-grad); }
.wlm-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.wlm-spin { animation: wlm-rot 0.9s linear infinite; }
@keyframes wlm-rot { to { transform: rotate(360deg); } }
</style>
