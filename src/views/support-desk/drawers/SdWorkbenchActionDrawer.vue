<template>
  <Teleport to="body">
    <Presence>
      <Motion
        v-if="open" class="wad-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 0.2 }"
        @mousedown.self="$emit('close')"
      >
        <Motion
          class="wad sd-grain" :style="{ '--ac': meta.accent }"
          :initial="{ x: '100%' }" :animate="{ x: 0 }" :exit="{ x: '100%' }"
          :transition="{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }"
        >
          <header class="wad-head">
            <span class="wad-ic"><component :is="meta.icon" :size="18" /></span>
            <div class="wad-titles"><p class="wad-eyebrow">{{ meta.eyebrow }}</p><h3>{{ meta.title }}</h3></div>
            <button class="wad-x" @click="$emit('close')"><X :size="18" /></button>
          </header>

          <div class="wad-body">
            <p v-if="scopeLabel" class="wad-scope"><Layers :size="13" /> {{ scopeLabel }}</p>

            <!-- RESOLVE -->
            <template v-if="mode === 'resolve'">
              <div class="f"><span class="fl">Resolution code <em>*</em></span>
                <SdSelect v-model="form.resolution_code" :options="RESOLUTION_CODES" /></div>
              <div class="f"><span class="fl">Root cause</span>
                <SdSelect v-model="form.resolution_category" :options="rootOpts" placeholder="Not categorized" /></div>
              <label class="f"><span class="fl">Resolution summary</span>
                <textarea v-model="form.resolution_summary" rows="4" class="fi" placeholder="What fixed it? (kept on the record)" /></label>
              <div class="f"><span class="fl">Time spent</span>
                <div class="time-row">
                  <button v-for="m in [15, 30, 60, 120]" :key="m" class="time-pill" :class="{ on: form.time_spent_minutes === m }" @click="form.time_spent_minutes = m">{{ m < 60 ? m + 'm' : (m / 60) + 'h' }}</button>
                  <input type="number" min="0" v-model.number="form.time_spent_minutes" class="time-in" placeholder="min" />
                </div>
              </div>
              <label class="f"><span class="fl">Reply to requester <i class="opt">optional, public</i></span>
                <textarea v-model="form.note" rows="2" class="fi" placeholder="Message sent to the requester…" /></label>
              <div class="toggles">
                <button class="tog" :class="{ on: form.notify_customer }" @click="form.notify_customer = !form.notify_customer"><span class="tk" /> Notify requester</button>
                <button class="tog" :class="{ on: form.close }" @click="form.close = !form.close"><span class="tk" /> Resolve &amp; close</button>
              </div>
            </template>

            <!-- ESCALATE -->
            <template v-else-if="mode === 'escalate'">
              <p class="wad-note">Escalation bumps the level and flags this ticket for a senior. Capture why + where it should go.</p>
              <label class="f"><span class="fl">Reason <em>*</em></span>
                <textarea v-model="form.reason" rows="3" class="fi" placeholder="Why is this being escalated?" /></label>
              <label class="f"><span class="fl">Route to team <i class="opt">optional</i></span>
                <input v-model="form.support_team" class="fi" type="text" placeholder="e.g. Infrastructure L2" /></label>
            </template>

            <!-- NOTE -->
            <template v-else-if="mode === 'note'">
              <p class="wad-note">Internal notes are visible to agents only — never to the requester.</p>
              <label class="f"><span class="fl">Note <em>*</em></span>
                <textarea v-model="form.body" rows="5" class="fi" placeholder="Add an internal note…" autofocus /></label>
            </template>

            <!-- BULK ASSIGN -->
            <template v-else-if="mode === 'bulk-assign'">
              <p class="wad-note">Assign the {{ ids.length }} selected ticket{{ ids.length === 1 ? '' : 's' }} to you.</p>
            </template>

            <!-- BULK STATUS -->
            <template v-else-if="mode === 'bulk-status'">
              <div class="f"><span class="fl">New status <em>*</em></span>
                <SdSelect v-model="form.status" :options="TICKET_STATUSES" placeholder="Choose status" /></div>
              <label class="f"><span class="fl">Note <i class="opt">optional</i></span>
                <textarea v-model="form.note" rows="3" class="fi" placeholder="Why the change?" /></label>
            </template>

            <!-- BULK PRIORITY -->
            <template v-else-if="mode === 'bulk-priority'">
              <div class="f"><span class="fl">New priority <em>*</em></span>
                <div class="chips">
                  <button v-for="p in PRIORITIES" :key="p.value" class="chip" :class="{ on: form.priority === p.value }"
                    :style="{ '--cc': priorityColor(p.value) }" @click="form.priority = p.value">{{ p.label }}</button>
                </div>
              </div>
            </template>

            <p v-if="error" class="wad-err"><AlertCircle :size="14" /> {{ error }}</p>
          </div>

          <footer class="wad-foot">
            <button class="wad-btn ghost" @click="$emit('close')">Cancel</button>
            <button class="wad-btn primary" :disabled="saving || !valid" @click="run">
              <component :is="saving ? LoaderCircle : meta.icon" :size="15" :class="{ spin: saving }" />
              {{ saving ? 'Working…' : meta.cta }}
            </button>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  X, Layers, AlertCircle, LoaderCircle, CircleCheck, Flame, StickyNote, UserCheck, RefreshCw, Flag,
} from 'lucide-vue-next'
import SdSelect from '../components/SdSelect.vue'
import {
  resolveTicket, escalateTicket, addTicketComment, updateTicket, bulkTickets,
  RESOLUTION_CODES, ROOT_CAUSES, PRIORITIES, TICKET_STATUSES, priorityColor,
} from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  mode: { type: String, default: 'resolve' },     // resolve|escalate|note|bulk-assign|bulk-status|bulk-priority
  ticket: { type: Object, default: null },
  ids: { type: Array, default: () => [] },
  me: { type: Object, default: () => ({}) },
})
const emit = defineEmits(['close', 'done'])

const saving = ref(false)
const error = ref('')
const blank = () => ({
  resolution_code: 'solved', resolution_category: '', resolution_summary: '', time_spent_minutes: 0,
  note: '', notify_customer: false, close: false, reason: '', support_team: '', body: '', status: '', priority: '',
})
const form = ref(blank())
watch(() => props.open, (v) => { if (v) { form.value = blank(); error.value = '' } })

const rootOpts = computed(() => [{ value: '', label: 'Not categorized' }, ...ROOT_CAUSES])

const META = {
  resolve: { eyebrow: 'CLOSE THE LOOP', title: 'Resolve ticket', cta: 'Resolve', icon: CircleCheck, accent: 'var(--sd-success)' },
  escalate: { eyebrow: 'RAISE A LEVEL', title: 'Escalate ticket', cta: 'Escalate', icon: Flame, accent: 'var(--sd-st-escalated)' },
  note: { eyebrow: 'AGENTS ONLY', title: 'Add internal note', cta: 'Add note', icon: StickyNote, accent: 'var(--sd-amber)' },
  'bulk-assign': { eyebrow: 'BULK ACTION', title: 'Assign to me', cta: 'Assign', icon: UserCheck, accent: 'var(--sd-amber)' },
  'bulk-status': { eyebrow: 'BULK ACTION', title: 'Update status', cta: 'Update', icon: RefreshCw, accent: 'var(--sd-st-progress)' },
  'bulk-priority': { eyebrow: 'BULK ACTION', title: 'Update priority', cta: 'Update', icon: Flag, accent: 'var(--sd-warning)' },
}
const meta = computed(() => META[props.mode] || META.resolve)
const scopeLabel = computed(() => {
  if (props.mode.startsWith('bulk')) return `${props.ids.length} ticket${props.ids.length === 1 ? '' : 's'} selected`
  return props.ticket ? `${props.ticket.ticket_number} · ${props.ticket.subject}` : ''
})
const valid = computed(() => {
  switch (props.mode) {
    case 'resolve': return !!form.value.resolution_code
    case 'escalate': return form.value.reason.trim().length > 0
    case 'note': return form.value.body.trim().length > 0
    case 'bulk-assign': return props.ids.length > 0
    case 'bulk-status': return !!form.value.status
    case 'bulk-priority': return !!form.value.priority
    default: return false
  }
})

const run = async () => {
  if (!valid.value) return
  saving.value = true; error.value = ''
  try {
    const id = props.ticket?.id
    if (props.mode === 'resolve') {
      await resolveTicket(id, {
        resolution_code: form.value.resolution_code,
        resolution_category: form.value.resolution_category || undefined,
        resolution_summary: form.value.resolution_summary || undefined,
        time_spent_minutes: form.value.time_spent_minutes || undefined,
        note: form.value.note || undefined,
        notify_customer: form.value.notify_customer,
        close: form.value.close,
      })
    } else if (props.mode === 'escalate') {
      if (form.value.support_team) await updateTicket(id, { support_team: form.value.support_team })
      await addTicketComment(id, { body: `[Escalation] ${form.value.reason}`, is_internal: true })
      await escalateTicket(id)
    } else if (props.mode === 'note') {
      await addTicketComment(id, { body: form.value.body.trim(), is_internal: true })
    } else if (props.mode === 'bulk-assign') {
      await bulkTickets({ ids: props.ids, action: 'assign', assigned_agent_id: props.me?.id })
    } else if (props.mode === 'bulk-status') {
      await bulkTickets({ ids: props.ids, action: 'set_status', status: form.value.status, note: form.value.note || undefined })
    } else if (props.mode === 'bulk-priority') {
      await bulkTickets({ ids: props.ids, action: 'set_priority', priority: form.value.priority })
    }
    emit('done', props.mode)
  } catch (e) {
    error.value = e?.response?.data?.detail || 'Action failed.'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.wad-overlay { position: fixed; inset: 0; z-index: 2400; display: flex; justify-content: flex-end; background: rgba(4,5,6,0.55); backdrop-filter: blur(6px); }
[data-theme="light"] .wad-overlay { background: rgba(40,25,10,0.3); }
.wad { position: relative; width: min(440px, 100vw); height: 100%; display: flex; flex-direction: column; background: var(--sd-surface-elevated); border-left: 1px solid var(--sd-border-strong); box-shadow: -20px 0 60px rgba(0,0,0,0.5); }
.wad::before { content: ""; position: absolute; inset: 0 0 auto 0; height: 3px; background: var(--ac); opacity: 0.85; }
.wad-head { display: flex; align-items: center; gap: 12px; padding: 19px 20px 15px; border-bottom: 1px solid var(--sd-border); }
.wad-ic { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px; color: var(--ac); background: color-mix(in srgb, var(--ac) 13%, transparent); border: 1px solid color-mix(in srgb, var(--ac) 28%, transparent); flex-shrink: 0; }
.wad-titles { flex: 1; min-width: 0; }
.wad-eyebrow { font-family: var(--sd-mono); font-size: 9.5px; font-weight: 700; letter-spacing: 0.14em; color: var(--ac); margin: 0 0 2px; }
.wad-head h3 { font-size: 17px; font-weight: 800; color: var(--sd-text); margin: 0; }
.wad-x { width: 32px; height: 32px; display: grid; place-items: center; border-radius: 9px; cursor: pointer; background: transparent; border: 1px solid var(--sd-border); color: var(--sd-text-muted); flex-shrink: 0; }
.wad-x:hover { color: var(--sd-text); border-color: var(--sd-border-strong); }
.wad-body { flex: 1; overflow-y: auto; padding: 18px 20px; display: flex; flex-direction: column; gap: 15px; }
.wad-scope { display: flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 600; color: var(--sd-text-secondary); padding: 9px 12px; border-radius: 10px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); margin: 0; overflow: hidden; }
.wad-note { font-size: 12.5px; color: var(--sd-text-muted); margin: 0; line-height: 1.5; }
.f { display: flex; flex-direction: column; gap: 7px; }
.fl { font-size: 12px; font-weight: 600; color: var(--sd-text-secondary); }
.fl em { color: var(--sd-danger); font-style: normal; }
.fl .opt { font-style: normal; font-weight: 500; color: var(--sd-text-dim); font-size: 11px; }
.fi { width: 100%; padding: 10px 12px; border-radius: 11px; font-size: 13.5px; font-family: inherit; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text); resize: vertical; }
.fi:focus { outline: none; border-color: var(--sd-amber-border); box-shadow: 0 0 0 3px var(--sd-amber-soft); }
.time-row { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.time-pill { padding: 7px 12px; border-radius: 9px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border); }
.time-pill.on { color: var(--sd-amber); background: var(--sd-amber-soft); border-color: var(--sd-amber-border); }
.time-in { width: 70px; padding: 7px 10px; border-radius: 9px; font-family: inherit; font-size: 13px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text); }
.toggles { display: flex; flex-direction: column; gap: 9px; }
.tog { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 11px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: inherit; color: var(--sd-text-secondary); background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); }
.tog .tk { width: 18px; height: 18px; border-radius: 6px; border: 1.5px solid var(--sd-border-strong); flex-shrink: 0; transition: all 0.18s; }
.tog.on { color: var(--sd-text); border-color: var(--ac); }
.tog.on .tk { background: var(--ac); border-color: transparent; }
.chips { display: flex; flex-wrap: wrap; gap: 7px; }
.chip { padding: 8px 14px; border-radius: 999px; font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit; color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border); }
.chip.on { color: var(--cc); background: color-mix(in srgb, var(--cc) 13%, transparent); border-color: color-mix(in srgb, var(--cc) 45%, transparent); }
.wad-err { display: flex; align-items: center; gap: 7px; color: var(--sd-danger); font-size: 12.5px; margin: 0; padding: 9px 12px; border-radius: 9px; background: var(--sd-danger-soft); }
.wad-foot { display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding: 14px 20px; border-top: 1px solid var(--sd-border); background: var(--sd-surface-glass); }
.wad-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 18px; border-radius: 11px; font-size: 13px; font-weight: 700; cursor: pointer; font-family: inherit; border: 1px solid transparent; }
.wad-btn.ghost { color: var(--sd-text-secondary); background: var(--sd-surface); border-color: var(--sd-border-strong); }
.wad-btn.primary { color: #1a1206; background: var(--sd-grad-hero); }
[data-theme="light"] .wad-btn.primary { color: #fff8ec; }
.wad-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.wad-btn .spin { animation: sd-spin-slow 1s linear infinite; }
@media (prefers-reduced-motion: reduce) { html:not([data-cinematic="on"]) .wad-btn .spin { animation: none; } }
</style>
