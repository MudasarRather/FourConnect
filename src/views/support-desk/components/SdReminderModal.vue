<template>
  <SdModalShell :open="open" eyebrow="CHRONO · PIN" title="Remind me" width="480px" @close="$emit('close')">
    <div class="rm">
      <!-- ticket -->
      <div class="rm-field">
        <label class="rm-lbl sd-mono">TICKET</label>
        <div v-if="picked" class="rm-picked">
          <b class="sd-mono">{{ picked.ticket_number }}</b>
          <span class="rm-picked-sub">{{ picked.subject }}</span>
          <button v-if="!lockTicket" class="rm-clear" aria-label="Change ticket" @click="picked = null"><X :size="13" /></button>
        </div>
        <div v-else class="rm-search">
          <Search :size="14" class="rm-search-ico" />
          <input
            v-model="q" class="rm-input" type="text"
            placeholder="Search by number or subject…"
            @input="onSearch"
          />
          <div v-if="results.length" class="rm-results sd-scroll">
            <button v-for="t in results" :key="t.id" class="rm-result" @click="pick(t)">
              <b class="sd-mono">{{ t.ticket_number }}</b>
              <span>{{ t.subject }}</span>
            </button>
          </div>
          <p v-else-if="q && searched && !searching" class="rm-none sd-mono">NO MATCHES ON YOUR DESK.</p>
        </div>
      </div>

      <!-- when -->
      <div class="rm-field">
        <label class="rm-lbl sd-mono">WHEN</label>
        <SdDateTimePicker v-model="when" :min="minWhen" placeholder="Pick date & time" />
        <div class="rm-quick">
          <button v-for="qk in QUICKS" :key="qk.label" class="rm-chip" @click="applyQuick(qk)">{{ qk.label }}</button>
        </div>
      </div>

      <!-- note -->
      <div class="rm-field">
        <label class="rm-lbl sd-mono">NOTE <span class="rm-opt">(optional)</span></label>
        <textarea v-model="note" class="rm-note" rows="2" maxlength="300"
                  placeholder="What should future-you check?"></textarea>
      </div>

      <p v-if="error" class="rm-err">{{ error }}</p>
    </div>

    <template #footer>
      <button class="rm-btn ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" class="rm-btn primary" :whileHover="{ y: -1, scale: 1.02 }" :whileTap="{ scale: 0.97 }"
              :disabled="!canSave || saving" @click="save">
        <Loader v-if="saving" :size="14" class="rm-spin" />
        <BellPlus v-else :size="14" />
        {{ saving ? 'Pinning…' : 'Pin reminder' }}
      </Motion>
    </template>
  </SdModalShell>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import { X, Search, BellPlus, Loader } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import SdModalShell from './SdModalShell.vue'
import SdDateTimePicker from './SdDateTimePicker.vue'
import { listCommandCenter, createMyReminder } from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  /** preselected ticket {id, ticket_number, subject} (from an event / the drawer) */
  ticket: { type: Object, default: null },
  /** preset local date "YYYY-MM-DD" (from a day peek) */
  presetDate: { type: String, default: '' },
})
const emit = defineEmits(['close', 'created'])
const toast = useToast()

const picked = ref(null)
const lockTicket = computed(() => !!props.ticket)
const q = ref('')
const results = ref([])
const searching = ref(false)
const searched = ref(false)
const when = ref('')
const note = ref('')
const saving = ref(false)
const error = ref('')

const pad = (n) => String(n).padStart(2, '0')
const toLocalInput = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
const minWhen = computed(() => toLocalInput(new Date()))

watch(() => props.open, (v) => {
  if (!v) return
  picked.value = props.ticket ? { ...props.ticket } : null
  q.value = ''; results.value = []; searched.value = false; note.value = ''; error.value = ''
  if (props.presetDate) {
    when.value = `${props.presetDate}T09:00`
  } else {
    const d = new Date(Date.now() + 60 * 60 * 1000)
    d.setMinutes(0, 0, 0)
    when.value = toLocalInput(d)
  }
})

let searchTimer = null
const onSearch = () => {
  clearTimeout(searchTimer)
  const term = q.value.trim()
  if (!term) { results.value = []; searched.value = false; return }
  searchTimer = setTimeout(async () => {
    searching.value = true
    try {
      const res = await listCommandCenter({ q: term, limit: 8, page: 1 })
      // Merged tombstones are read-only pointers at their master — never pinnable.
      results.value = (res.items || []).filter((t) => !t.merged_into_id)
    } catch { results.value = [] }
    searching.value = false
    searched.value = true
  }, 280)
}
const pick = (t) => { picked.value = t; results.value = []; q.value = '' }

const canSave = computed(() => !!picked.value && !!when.value)

const QUICKS = [
  { label: 'In 1 hour', h: 1 },
  { label: 'Tomorrow 9:00', tomorrow: true },
  { label: 'In 3 days', d: 3 },
  { label: 'Next week', d: 7 },
]
const applyQuick = (qk) => {
  const d = new Date()
  if (qk.h) d.setHours(d.getHours() + qk.h)
  if (qk.d) { d.setDate(d.getDate() + qk.d); d.setHours(9, 0, 0, 0) }
  if (qk.tomorrow) { d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0) }
  when.value = toLocalInput(d)
}

const save = async () => {
  if (!canSave.value || saving.value) return
  error.value = ''
  const at = new Date(when.value)
  if (Number.isNaN(at.getTime()) || at <= new Date()) {
    error.value = 'Pick a time in the future.'
    return
  }
  saving.value = true
  try {
    const r = await createMyReminder({
      ticket_id: picked.value.id,
      remind_at: at.toISOString(),
      note: note.value.trim() || null,
    })
    toast.success(`Pinned ${r.ticket_number || 'reminder'} for ${at.toLocaleString()}`)
    emit('created', r)
    emit('close')
  } catch (e) {
    error.value = e?.response?.data?.detail || 'Could not pin the reminder — try again.'
  }
  saving.value = false
}
</script>

<style scoped>
.rm { display: flex; flex-direction: column; gap: 16px; }
.rm-field { display: flex; flex-direction: column; gap: 7px; position: relative; }
.rm-lbl { font-size: 9px; font-weight: 700; letter-spacing: 0.22em; color: var(--sd-cal-core); }
.rm-opt { color: var(--sd-text-dim); letter-spacing: 0.1em; }

.rm-picked {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 12px;
  background: var(--sd-cal-soft); border: 1px solid var(--sd-cal-brd);
}
.rm-picked b { font-size: 12px; color: var(--sd-cal-core); }
.rm-picked-sub { flex: 1; min-width: 0; font-size: 12px; color: var(--sd-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rm-clear { flex: none; display: grid; place-items: center; width: 24px; height: 24px; border-radius: 8px; cursor: pointer; background: transparent; border: 1px solid var(--sd-border); color: var(--sd-text-muted); }

.rm-search { position: relative; }
.rm-search-ico { position: absolute; left: 12px; top: 12px; color: var(--sd-text-dim); }
.rm-input {
  width: 100%; padding: 10px 12px 10px 34px; border-radius: 12px; font-size: 13px;
  background: var(--sd-surface); border: 1px solid var(--sd-border); color: var(--sd-text);
}
.rm-input:focus { outline: none; border-color: var(--sd-cal-core); }
.rm-results {
  position: absolute; top: calc(100% + 6px); left: 0; right: 0; z-index: 5;
  max-height: 210px; overflow-y: auto; border-radius: 12px;
  background: var(--sd-surface-elevated); border: 1px solid var(--sd-border-strong);
  box-shadow: var(--sd-shadow);
}
.rm-result {
  display: flex; align-items: center; gap: 10px; width: 100%; min-width: 0; text-align: left; cursor: pointer;
  padding: 9px 12px; background: transparent; border: none; border-bottom: 1px solid var(--sd-border);
}
.rm-result:last-child { border-bottom: none; }
.rm-result:hover { background: var(--sd-cal-soft); }
.rm-result b { font-size: 11px; color: var(--sd-cal-core); flex: none; }
.rm-result span { flex: 1; min-width: 0; font-size: 12px; color: var(--sd-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rm-none { margin: 6px 2px 0; font-size: 9px; letter-spacing: 0.2em; color: var(--sd-text-dim); }

.rm-quick { display: flex; flex-wrap: wrap; gap: 7px; }
.rm-chip {
  padding: 5px 11px; border-radius: 999px; cursor: pointer; font-size: 10.5px; font-weight: 700;
  background: transparent; border: 1px solid var(--sd-cal-brd); color: var(--sd-cal-core);
}
.rm-chip:hover { background: var(--sd-cal-soft); }

.rm-note {
  width: 100%; resize: vertical; padding: 10px 12px; border-radius: 12px; font-size: 13px;
  background: var(--sd-surface); border: 1px solid var(--sd-border); color: var(--sd-text);
  font-family: inherit;
}
.rm-note:focus { outline: none; border-color: var(--sd-cal-core); }
.rm-err { margin: 0; font-size: 12px; color: var(--sd-cal-storm); }

.rm-btn {
  display: inline-flex; align-items: center; gap: 8px; cursor: pointer;
  padding: 9px 16px; border-radius: 11px; font-size: 12.5px; font-weight: 700;
  border: 1px solid transparent;
}
.rm-btn.ghost { background: transparent; border-color: var(--sd-border-strong); color: var(--sd-text-secondary); }
.rm-btn.primary { background: var(--sd-cal-grad); color: #1a1206; box-shadow: var(--sd-cal-glow); }
.rm-btn.primary:disabled { opacity: 0.55; cursor: default; }
[data-theme="light"] .rm-btn.primary { color: #fffaf0; }
.rm-spin { animation: sd-spin-slow 0.9s linear infinite; }
</style>
