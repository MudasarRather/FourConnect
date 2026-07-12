<template>
  <SdModalShell :open="!!ticket" eyebrow="L3 WORKBENCH · PERMANENT FIX" title="Attach the fix to a change request"
    width="640px" @close="$emit('close')">
    <div v-if="ticket" class="chm">
      <div class="chm-ctx sd-mono">
        <span class="chm-no">{{ ticket.ticket_number }}</span>
        <span class="chm-subj">{{ ticket.subject }}</span>
        <span class="chm-mark"><GitPullRequest :size="11" /> CHANGE CONTROL</span>
      </div>
      <p class="chm-hint">A root cause without a change request is a fix that lives in somebody's head.
        Ride the permanent fix on a tracked, approvable change.</p>

      <div class="chm-tabs" role="tablist">
        <button class="chm-tab" :class="{ on: tab === 'link' }" role="tab" :aria-selected="tab === 'link'"
          @click="tab = 'link'"><Search :size="12" /> Link an existing change</button>
        <button class="chm-tab" :class="{ on: tab === 'new' }" role="tab" :aria-selected="tab === 'new'"
          @click="tab = 'new'"><Plus :size="12" /> Draft a new change</button>
      </div>

      <template v-if="tab === 'link'">
        <p v-if="loading" class="chm-dim sd-mono">READING THE CHANGE LOG…</p>
        <p v-else-if="!changes.length" class="chm-dim sd-mono">NO OPEN CHANGE REQUESTS — DRAFT ONE.</p>
        <div v-else class="chm-hits">
          <button v-for="c in changes" :key="c.id" class="chm-hit" :class="{ on: pick === String(c.id) }"
            @click="pick = pick === String(c.id) ? '' : String(c.id)">
            <span class="chm-hit-top sd-mono">
              <b>{{ c.change_number || 'CHANGE' }}</b>
              <i class="st" :class="c.status">{{ statusLabel(c.status) }}</i>
              <i class="rk" :class="c.risk_level">{{ (c.risk_level || '').toUpperCase() }} RISK</i>
              <em v-if="c.implementation_date">{{ fmtDate(c.implementation_date) }}</em>
            </span>
            <span class="chm-hit-title">{{ c.title }}</span>
          </button>
        </div>
      </template>

      <template v-else>
        <label class="chm-f"><span>Change title <i>· required</i></span>
          <input v-model.trim="form.title" class="chm-inp" placeholder="The permanent fix, named as a change" /></label>
        <label class="chm-f"><span>Why this change</span>
          <textarea v-model="form.reason" class="chm-inp" rows="2"
            placeholder="The root cause it eliminates…" /></label>
        <div class="chm-row">
          <div class="chm-f"><span>Risk</span>
            <div class="chm-seg">
              <button v-for="r in CHANGE_RISKS" :key="r.value" class="chm-seg-b" :class="[{ on: form.risk === r.value }, r.value]"
                @click="form.risk = r.value">{{ r.label }}</button>
            </div>
          </div>
          <div class="chm-f chm-date"><span>Planned implementation</span>
            <SdDatePicker v-model="form.when" placeholder="Pick a date" clearable />
          </div>
        </div>
        <label class="chm-f"><span>Rollback plan</span>
          <textarea v-model="form.rollback" class="chm-inp" rows="2" placeholder="How we back out if it goes wrong…" /></label>
        <label class="chm-f"><span>Testing plan</span>
          <textarea v-model="form.testing" class="chm-inp" rows="2" placeholder="How we prove it worked…" /></label>
      </template>
    </div>
    <template #footer>
      <button class="chm-btn" @click="$emit('close')">Cancel</button>
      <button class="chm-btn primary" :disabled="busy || !valid" @click="confirm">
        <Loader v-if="busy" :size="13" class="chm-spin" />
        {{ tab === 'link' ? 'Attach the change' : 'Draft & attach' }}
      </button>
    </template>
  </SdModalShell>
</template>

<script setup>
/* SdChangeLinkModal — rides the ticket's permanent fix on a change request: link an
   existing open change or draft a new one (risk + implementation date + rollback/testing
   plans, ITIL-style) and PATCH ticket.linked_change_id. The change lifecycle itself
   (review→approve→schedule→implement) lives on the change record. */
import { ref, computed, watch } from 'vue'
import { GitPullRequest, Search, Plus, Loader } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import SdModalShell from '../components/SdModalShell.vue'
import SdDatePicker from '../components/SdDatePicker.vue'
import {
  listChangeRequests, createChangeRequest, updateTicket, CHANGE_STATUSES, CHANGE_RISKS,
} from '@/composables/useSupportDesk'

const props = defineProps({ ticket: { type: Object, default: null } })
const emit = defineEmits(['close', 'done'])
const toast = useToast()

const tab = ref('link')
const changes = ref([])
const loading = ref(false)
const pick = ref('')
const busy = ref(false)
const form = ref({})

const statusLabel = (v) => CHANGE_STATUSES.find(s => s.value === v)?.label?.toUpperCase() || (v || '').toUpperCase()
const fmtDate = (v) => { try { return new Date(v).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) } catch { return '' } }

watch(() => props.ticket, async (t) => {
  if (!t) return
  busy.value = false
  tab.value = 'link'
  pick.value = t.linked_change_id ? String(t.linked_change_id) : ''
  form.value = { title: `Fix: ${t.subject || ''}`.slice(0, 240), reason: '', risk: 'medium', when: '', rollback: '', testing: '' }
  loading.value = true
  try {
    const r = await listChangeRequests()
    changes.value = (Array.isArray(r) ? r : (r?.items || [])).filter(c => !['closed', 'rejected'].includes(c.status))
  } catch { changes.value = [] } finally { loading.value = false }
})

const valid = computed(() => (tab.value === 'link' ? !!pick.value : (form.value.title || '').trim().length >= 4))

const confirm = async () => {
  if (!props.ticket || !valid.value) return
  busy.value = true
  try {
    let cid = pick.value
    let label = ''
    if (tab.value === 'new') {
      const f = form.value
      const c = await createChangeRequest({
        title: f.title.trim(), reason: f.reason || null, risk_level: f.risk,
        implementation_date: f.when ? new Date(f.when + 'T09:00:00').toISOString() : null,
        rollback_plan: f.rollback || null, testing_plan: f.testing || null,
      })
      cid = String(c.id)
      label = c.change_number || 'the new change'
    } else {
      label = changes.value.find(c => String(c.id) === cid)?.change_number || 'the change'
    }
    await updateTicket(props.ticket.id, { linked_change_id: cid })
    toast.success(`${props.ticket.ticket_number} now rides ${label}.`)
    emit('done')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not attach the change')
  } finally { busy.value = false }
}
</script>

<style scoped>
.chm { display: flex; flex-direction: column; gap: 12px; }
.chm-ctx { display: flex; align-items: center; gap: 9px; padding: 10px 12px; border-radius: 11px;
  border: 1px dashed var(--sd-border-strong); background: var(--sd-l3-soft); }
.chm-no { font-size: 11px; font-weight: 800; color: var(--sd-l3-core); }
.chm-subj { flex: 1; font-size: 12px; color: var(--sd-text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.chm-mark { display: inline-flex; align-items: center; gap: 5px; font-size: 8.5px; font-weight: 800;
  letter-spacing: 0.14em; color: var(--sd-l3-core); }
.chm-hint { margin: 0; font-size: 11.5px; line-height: 1.55; color: var(--sd-text-muted); }
.chm-tabs { display: flex; gap: 6px; }
.chm-tab { display: inline-flex; align-items: center; gap: 7px; padding: 8px 13px; border-radius: 10px;
  font-size: 11.5px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border); background: var(--sd-surface); color: var(--sd-text-muted); }
.chm-tab.on { border-color: var(--sd-l3-core); color: var(--sd-l3-core); background: var(--sd-l3-soft); }
.chm-dim { margin: 0; font-size: 9px; letter-spacing: 0.16em; color: var(--sd-text-dim); }
.chm-hits { display: flex; flex-direction: column; gap: 7px; max-height: 260px; overflow-y: auto; }
.chm-hit { display: flex; flex-direction: column; gap: 4px; padding: 10px 12px; border-radius: 11px; cursor: pointer;
  text-align: left; font-family: inherit; border: 1px solid var(--sd-border); background: var(--sd-surface); }
.chm-hit.on { border-color: var(--sd-l3-core); background: var(--sd-l3-soft);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--sd-l3-core) 18%, transparent); }
.chm-hit-top { display: flex; align-items: center; gap: 8px; font-size: 9px; flex-wrap: wrap; }
.chm-hit-top b { color: var(--sd-l3-core); letter-spacing: 0.08em; }
.chm-hit-top i { font-style: normal; padding: 1px 5px; border-radius: 4px; font-size: 7.5px; font-weight: 800;
  letter-spacing: 0.1em; border: 1px solid currentColor; color: var(--sd-text-muted); }
.chm-hit-top i.approved, .chm-hit-top i.implemented { color: var(--sd-l3-go); }
.chm-hit-top i.rk.high { color: var(--sd-l3-halt); }
.chm-hit-top i.rk.medium { color: var(--sd-l3-warn); }
.chm-hit-top em { font-style: normal; margin-left: auto; color: var(--sd-text-dim); }
.chm-hit-title { font-size: 12.5px; font-weight: 700; color: var(--sd-text); }
.chm-f { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 0; }
.chm-f span { font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em; color: var(--sd-text-muted); }
.chm-f span i { font-style: normal; color: var(--sd-l3-warn); }
.chm-inp { padding: 9px 11px; border-radius: 10px; resize: vertical; font-family: inherit; font-size: 12.5px;
  border: 1px solid var(--sd-border-strong); background: var(--sd-input-bg, var(--sd-surface)); color: var(--sd-text); }
.chm-inp:focus { outline: none; border-color: var(--sd-l3-core); }
.chm-row { display: flex; gap: 12px; flex-wrap: wrap; }
.chm-date { max-width: 220px; }
.chm-seg { display: flex; gap: 5px; flex-wrap: wrap; }
.chm-seg-b { padding: 7px 11px; border-radius: 9px; font-size: 11px; font-weight: 700; cursor: pointer;
  font-family: inherit; border: 1px solid var(--sd-border); background: var(--sd-surface); color: var(--sd-text-muted); }
.chm-seg-b.on { border-color: var(--sd-l3-core); color: var(--sd-l3-core); background: var(--sd-l3-soft); }
.chm-seg-b.on.high { border-color: var(--sd-l3-halt); color: var(--sd-l3-halt);
  background: color-mix(in srgb, var(--sd-l3-halt) 10%, transparent); }
.chm-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 15px; border-radius: 11px;
  font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit;
  border: 1px solid var(--sd-border-strong); background: transparent; color: var(--sd-text-secondary); }
.chm-btn.primary { border-color: transparent; color: #221604; background: var(--sd-l3-grad); }
.chm-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.chm-spin { animation: chm-rot 0.9s linear infinite; }
@keyframes chm-rot { to { transform: rotate(360deg); } }
</style>
