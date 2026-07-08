<template>
  <Teleport to="body">
    <Presence>
      <Motion
        v-if="open" class="vdm-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 0.22 }"
        @mousedown.self="!busy && $emit('close')"
      >
        <Motion
          class="vdm" role="dialog" aria-modal="true"
          :initial="{ opacity: 0, y: 28, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 18, scale: 0.98 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }"
        >
          <span class="vdm-grain" aria-hidden="true" />
          <button class="vdm-x" :disabled="busy" @click="$emit('close')"><X :size="17" /></button>

          <!-- relay emblem -->
          <div class="vdm-emblem" :class="{ done }">
            <span class="em-ring" /><span class="em-ring r2" />
            <span class="em-core"><component :is="done ? Check : modeMeta.icon" :size="24" /></span>
          </div>

          <p class="vdm-eyebrow sd-mono">{{ modeMeta.eyebrow }}</p>
          <h2 class="vdm-title">{{ done ? modeMeta.doneTitle : modeMeta.title }}</h2>
          <p class="vdm-sub">{{ done ? modeMeta.doneSub : modeMeta.sub }}</p>

          <template v-if="!done">
            <div class="vdm-chip">
              <span class="vc-no sd-mono">{{ ticket?.ticket_number }}</span>
              <span class="vc-subj">{{ ticket?.subject }}</span>
            </div>

            <div class="vdm-scroll">
              <!-- ── DISPATCH ── -->
              <template v-if="mode === 'dispatch'">
                <div class="vdm-two">
                  <section class="vdm-f">
                    <label class="vdm-k">Vendor <em>*</em></label>
                    <input v-model="form.vendor_name" class="vdm-input" placeholder="e.g. Acme Networks" />
                  </section>
                  <section class="vdm-f">
                    <label class="vdm-k">External ref</label>
                    <input v-model="form.vendor_ticket_ref" class="vdm-input" placeholder="Vendor case #" />
                  </section>
                </div>
                <section class="vdm-f">
                  <label class="vdm-k">Waiting on <i>hold reason</i></label>
                  <SdSelect v-model="form.vendor_wait_reason" :options="reasonOpts" placeholder="Why is it blocked?" />
                </section>
                <div class="vdm-two">
                  <section class="vdm-f">
                    <label class="vdm-k">Expected back <i>vendor ETA</i></label>
                    <SdDateTimePicker v-model="form.vendor_due_at" placeholder="Set an ETA" />
                  </section>
                  <section class="vdm-f">
                    <label class="vdm-k">PO / cost ref</label>
                    <input v-model="form.vendor_po_ref" class="vdm-input" placeholder="Optional" />
                  </section>
                </div>
                <section v-if="assignees.length" class="vdm-f">
                  <label class="vdm-k">Vendor coordinator <i>internal owner</i></label>
                  <SdSelect v-model="form.assigned_engineer_id" :options="coordOpts" placeholder="Who owns this relationship?" />
                </section>
                <section class="vdm-f">
                  <label class="vdm-k">Internal note <i>logged on the hand-off</i></label>
                  <textarea v-model="form.note" rows="2" class="vdm-input" placeholder="Context for the desk (never shown to the client)…" />
                </section>
              </template>

              <!-- ── CHASE ── -->
              <template v-else-if="mode === 'chase'">
                <section class="vdm-f">
                  <label class="vdm-k">Chase note <i>internal · not sent to the client</i></label>
                  <textarea v-model="form.message" rows="3" class="vdm-input" placeholder="What are we following up on?" />
                </section>
                <section class="vdm-f">
                  <label class="vdm-k">Revised ETA <i>optional — push the promise date</i></label>
                  <SdDateTimePicker v-model="form.vendor_due_at" placeholder="Leave blank to keep current ETA" />
                </section>
                <p class="vdm-hint"><Info :size="12" /> This bumps the chase counter and re-arms the overdue watch. The customer SLA stays paused.</p>
              </template>

              <!-- ── REPLY / BRING BACK ── -->
              <template v-else>
                <section class="vdm-f">
                  <label class="vdm-k">Vendor's response <em>*</em></label>
                  <textarea v-model="form.body" rows="3" class="vdm-input" placeholder="Paste / summarise what the vendor said…" />
                </section>
                <section class="vdm-f">
                  <label class="vdm-k">Update external status</label>
                  <input v-model="form.vendor_status" class="vdm-input" placeholder="e.g. Fix shipped / RMA approved" />
                </section>
                <section class="vdm-f">
                  <label class="vdm-k">Attach vendor docs <i>quote / RMA · optional</i></label>
                  <div class="dropzone" :class="{ busy: uploading }" @click="pickFiles">
                    <input ref="fileInput" type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.gif,.webp" class="dz-input" @change="onFiles" />
                    <component :is="uploading ? LoaderCircle : UploadCloud" :size="16" :class="{ spin: uploading }" />
                    <span>{{ uploading ? 'Uploading…' : 'Attach (PDF / image · ≤5MB)' }}</span>
                  </div>
                  <div v-if="form.attachments.length" class="att-list">
                    <span v-for="(a, i) in form.attachments" :key="i" class="att">
                      <Paperclip :size="12" /> <i>{{ a.name }}</i>
                      <button type="button" @click.stop="form.attachments.splice(i, 1)"><X :size="11" /></button>
                    </span>
                  </div>
                </section>
                <button class="vdm-tog" :class="{ on: form.resume }" @click="form.resume = !form.resume">
                  <span class="tk"><CornerUpLeft :size="11" /></span> Bring back to In Progress <i>resumes the customer SLA</i>
                </button>
              </template>
            </div>

            <!-- workflow strip -->
            <ul class="vdm-flow">
              <li v-for="(s, i) in modeMeta.flow" :key="i"><span class="wf-dot" /> <span v-html="s" /></li>
            </ul>

            <p v-if="err" class="vdm-err"><AlertTriangle :size="13" /> {{ err }}</p>
            <div class="vdm-foot">
              <button class="vdm-btn ghost" :disabled="busy" @click="$emit('close')">Cancel</button>
              <button class="vdm-btn primary" :disabled="busy || !valid" @click="confirm">
                <component :is="busy ? LoaderCircle : modeMeta.cta.icon" :size="15" :class="{ spin: busy }" />
                {{ busy ? modeMeta.cta.busy : modeMeta.cta.label }}
              </button>
            </div>
          </template>
          <div v-else class="vdm-foot center">
            <button class="vdm-btn primary" @click="$emit('close')"><Check :size="15" /> Done</button>
          </div>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  X, Check, Satellite, Send, CornerUpLeft, LoaderCircle, AlertTriangle, UploadCloud, Paperclip, Info,
} from 'lucide-vue-next'
import SdSelect from '../components/SdSelect.vue'
import SdDateTimePicker from '../components/SdDateTimePicker.vue'
import {
  vendorDispatch, vendorChase, vendorReply, uploadSupportFile,
  VENDOR_WAIT_REASONS,
} from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  ticket: { type: Object, default: null },
  mode: { type: String, default: 'dispatch' },  // dispatch | chase | reply
  assignees: { type: Array, default: () => [] },
})
const emit = defineEmits(['close', 'done'])

const blank = () => ({
  vendor_name: '', vendor_ticket_ref: '', vendor_wait_reason: '', vendor_due_at: '',
  vendor_po_ref: '', assigned_engineer_id: '', note: '',
  message: '', body: '', vendor_status: '', attachments: [], resume: true,
})
const form = ref(blank())
const busy = ref(false)
const done = ref(false)
const err = ref('')
const uploading = ref(false)
const fileInput = ref(null)

watch(() => [props.open, props.mode], () => {
  if (props.open) {
    form.value = blank()
    // prefill dispatch from any existing memo fields on the ticket
    const t = props.ticket || {}
    form.value.vendor_name = t.vendor_name || ''
    form.value.vendor_ticket_ref = t.vendor_ticket_ref || ''
    form.value.vendor_wait_reason = t.vendor_wait_reason || ''
    form.value.vendor_po_ref = t.vendor_po_ref || ''
    form.value.vendor_status = t.vendor_status || ''
    busy.value = false; done.value = false; err.value = ''
  }
})

const reasonOpts = VENDOR_WAIT_REASONS
const coordOpts = computed(() => [{ value: '', label: 'Unassigned' }, ...props.assignees])

const MODE_META = {
  dispatch: {
    icon: Satellite, eyebrow: 'DISPATCH TO VENDOR', title: 'Hand off to a third party',
    sub: 'Record who you’re waiting on and when you expect them back. The customer SLA pauses the moment you dispatch.',
    doneTitle: 'Dispatched off-network', doneSub: 'The hand-off is logged and the customer SLA is paused. Chase it if the vendor goes quiet.',
    cta: { icon: Satellite, label: 'Dispatch to vendor', busy: 'Dispatching…' },
    flow: [
      'Moves to <b>Pending Vendor</b> — customer SLA <b>pauses</b>',
      'Vendor identity + ETA stay <b>internal</b> (never on the client portal)',
      'Overdue watch arms at the <b>expected-return</b> date',
    ],
  },
  chase: {
    icon: Send, eyebrow: 'CHASE THE VENDOR', title: 'Follow up off-network',
    sub: 'Nudge the vendor and track the chase. This is internal only — the client never sees it.',
    doneTitle: 'Chase logged', doneSub: 'The chase counter ticked up and the overdue watch re-armed.',
    cta: { icon: Send, label: 'Log chase', busy: 'Logging…' },
    flow: [
      'Bumps the <b>chase counter</b> + stamps last-chased',
      'Optional revised ETA re-arms the <b>overdue</b> watch',
      'Customer SLA <b>stays paused</b>',
    ],
  },
  reply: {
    icon: CornerUpLeft, eyebrow: 'VENDOR REPLIED', title: 'Log the vendor’s response',
    sub: 'Capture what the vendor said (kept as an internal note) and bring the ticket back to the desk.',
    doneTitle: 'Response logged', doneSub: 'The vendor reply is on the record. If you brought it back, the customer SLA has resumed.',
    cta: { icon: CornerUpLeft, label: 'Log & bring back', busy: 'Saving…' },
    flow: [
      'Saved as an <b>internal</b> vendor note (hidden from the client)',
      'Bringing back moves to <b>In Progress</b> — SLA <b>resumes</b>',
      'Deadlines extend by the <b>banked</b> paused time',
    ],
  },
}
const modeMeta = computed(() => MODE_META[props.mode] || MODE_META.dispatch)

const valid = computed(() => {
  if (props.mode === 'dispatch') return form.value.vendor_name.trim().length >= 2
  if (props.mode === 'reply') return form.value.body.trim().length >= 2
  return true // chase
})

const pickFiles = () => fileInput.value?.click()
const onFiles = async (e) => {
  const files = Array.from(e.target.files || [])
  if (!files.length) return
  uploading.value = true
  for (const f of files) {
    if (f.size > 5 * 1024 * 1024) { err.value = `${f.name} exceeds 5MB`; continue }
    try { form.value.attachments.push(await uploadSupportFile(f)) }
    catch { err.value = `Could not upload ${f.name}` }
  }
  uploading.value = false
  if (fileInput.value) fileInput.value.value = ''
}

const confirm = async () => {
  if (!valid.value || !props.ticket?.id) return
  busy.value = true; err.value = ''
  const id = props.ticket.id
  try {
    if (props.mode === 'dispatch') {
      await vendorDispatch(id, {
        vendor_name: form.value.vendor_name.trim(),
        vendor_ticket_ref: form.value.vendor_ticket_ref.trim() || undefined,
        vendor_wait_reason: form.value.vendor_wait_reason || undefined,
        vendor_due_at: form.value.vendor_due_at || undefined,
        vendor_po_ref: form.value.vendor_po_ref.trim() || undefined,
        assigned_engineer_id: form.value.assigned_engineer_id || undefined,
        note: form.value.note.trim() || undefined,
      })
    } else if (props.mode === 'chase') {
      await vendorChase(id, {
        message: form.value.message.trim() || undefined,
        vendor_due_at: form.value.vendor_due_at || undefined,
      })
    } else {
      await vendorReply(id, {
        body: form.value.body.trim(),
        attachments: form.value.attachments.length ? form.value.attachments : undefined,
        resume: form.value.resume,
        vendor_status: form.value.vendor_status.trim() || undefined,
      })
    }
    done.value = true
    setTimeout(() => emit('done'), 900)
  } catch (e) {
    err.value = e?.response?.data?.detail || 'Could not complete the action.'
  } finally { busy.value = false }
}
</script>

<style scoped>
.vdm-overlay { position: fixed; inset: 0; z-index: 2700; display: grid; place-items: center; padding: 24px; background: rgba(4,5,6,0.66); backdrop-filter: blur(12px) saturate(140%); }
[data-theme="light"] .vdm-overlay { background: rgba(40,25,10,0.4); }
.vdm { position: relative; width: min(520px, 95vw); max-height: 92vh; display: flex; flex-direction: column; overflow: hidden; padding: 28px 26px 22px; text-align: center;
  background: var(--sd-surface-elevated); border: 1px solid var(--sd-border-strong); border-radius: 24px; box-shadow: var(--sd-shadow-hover); }
.vdm::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 3px; z-index: 2; background: var(--sd-vendor-grad); border-radius: 24px 24px 0 0; }
.vdm-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.4; border-radius: 24px; background-image: radial-gradient(rgba(154,163,172,0.05) 1px, transparent 1px); background-size: 18px 18px; }
.vdm-x { position: absolute; top: 16px; right: 16px; width: 32px; height: 32px; display: grid; place-items: center; border-radius: 9px; cursor: pointer; background: transparent; border: 1px solid var(--sd-border); color: var(--sd-text-muted); z-index: 2; }
.vdm-x:hover:not(:disabled) { color: var(--sd-text); border-color: var(--sd-border-strong); }
.vdm-x:disabled { opacity: 0.4; cursor: not-allowed; }

.vdm-emblem { position: relative; width: 66px; height: 66px; margin: 4px auto 14px; display: grid; place-items: center; flex-shrink: 0; }
.em-ring { position: absolute; inset: 0; border-radius: 50%; border: 1.5px solid var(--sd-vendor-signal-soft); animation: vdm-ping 2.4s ease-out infinite; }
.em-ring.r2 { animation-delay: 1.2s; }
.em-core { position: relative; width: 52px; height: 52px; border-radius: 50%; display: grid; place-items: center; color: #22160a; background: var(--sd-vendor-grad); box-shadow: 0 0 26px var(--sd-vendor-signal-soft); }

.vdm-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 0.22em; color: var(--sd-vendor-signal); margin: 0 0 6px; }
.vdm-title { font-size: 21px; font-weight: 800; color: var(--sd-text); margin: 0 0 8px; letter-spacing: -0.02em; }
.vdm-sub { font-size: 12.5px; line-height: 1.5; color: var(--sd-text-secondary); margin: 0 auto 16px; max-width: 44ch; }

.vdm-chip { display: flex; flex-direction: column; gap: 4px; text-align: left; padding: 11px 14px; border-radius: 13px; background: var(--sd-surface); border: 1px solid var(--sd-border); margin-bottom: 14px; flex-shrink: 0; }
.vc-no { font-size: 11px; font-weight: 700; color: var(--sd-vendor-signal); }
.vc-subj { font-size: 13.5px; font-weight: 650; color: var(--sd-text); line-height: 1.3; }

.vdm-scroll { overflow-y: auto; text-align: left; display: flex; flex-direction: column; gap: 13px; padding: 2px; margin: 0 -2px;
  scrollbar-width: thin; scrollbar-color: var(--sd-vendor-steel) transparent; }
.vdm-scroll::-webkit-scrollbar { width: 8px; }
.vdm-scroll::-webkit-scrollbar-thumb { border-radius: 999px; border: 2px solid transparent; background: var(--sd-vendor-steel-soft); background-clip: padding-box; }
.vdm-two { display: grid; grid-template-columns: 1fr 1fr; gap: 11px; }
.vdm-f { display: flex; flex-direction: column; gap: 7px; }
.vdm-k { font-size: 12px; font-weight: 650; color: var(--sd-text-secondary); }
.vdm-k em { color: var(--sd-vendor-overdue); font-style: normal; }
.vdm-k i { font-style: normal; font-weight: 500; color: var(--sd-text-dim); font-size: 11px; margin-left: 4px; }
.vdm-input { width: 100%; padding: 11px 13px; border-radius: 12px; font-size: 13.5px; font-family: inherit; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text); resize: vertical; }
.vdm-input:focus { outline: none; border-color: var(--sd-vendor-steel-brd); box-shadow: 0 0 0 3px var(--sd-vendor-signal-soft); }
.vdm-hint { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--sd-text-muted); margin: 0; }

.dropzone { position: relative; display: flex; align-items: center; justify-content: center; gap: 9px; padding: 13px; border-radius: 12px; cursor: pointer; font-size: 12.5px; color: var(--sd-text-muted); background: var(--sd-surface-glass); border: 1.5px dashed var(--sd-border-strong); transition: all 0.2s; }
.dropzone:hover { border-color: var(--sd-vendor-steel-brd); color: var(--sd-text-secondary); }
.dz-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.att-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.att { display: inline-flex; align-items: center; gap: 5px; padding: 5px 6px 5px 10px; border-radius: 9px; font-size: 11.5px; color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border); }
.att i { font-style: normal; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 150px; }
.att button { display: grid; place-items: center; width: 16px; height: 16px; border-radius: 50%; border: none; cursor: pointer; color: var(--sd-text-muted); background: var(--sd-border-strong); }
.att button:hover { color: var(--sd-vendor-overdue); }

.vdm-tog { display: inline-flex; align-items: center; gap: 9px; padding: 10px 13px; border-radius: 11px; font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit; color: var(--sd-text-secondary); background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); width: fit-content; }
.vdm-tog i { font-style: normal; font-weight: 500; color: var(--sd-text-dim); font-size: 11px; }
.vdm-tog .tk { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 6px; color: var(--sd-text-dim); background: var(--sd-surface); }
.vdm-tog.on { color: var(--sd-text); border-color: var(--sd-vendor-steel-brd); }
.vdm-tog.on .tk { color: #22160a; background: var(--sd-vendor-return); }

.vdm-flow { list-style: none; margin: 14px 0 0; padding: 13px 15px; border-radius: 13px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); text-align: left; display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; }
.vdm-flow li { display: flex; align-items: center; gap: 9px; font-size: 12px; color: var(--sd-text-secondary); }
.vdm-flow :deep(b) { color: var(--sd-text); font-weight: 700; }
.wf-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--sd-vendor-signal); flex-shrink: 0; box-shadow: 0 0 8px var(--sd-vendor-signal); }

.vdm-err { display: flex; align-items: center; justify-content: center; gap: 7px; margin: 12px 0 0; font-size: 12.5px; color: var(--sd-vendor-overdue); }
.vdm-foot { display: flex; gap: 10px; margin-top: 16px; flex-shrink: 0; }
.vdm-foot.center { justify-content: center; }
.vdm-btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 12px 18px; border-radius: 12px; font-size: 13.5px; font-weight: 700; cursor: pointer; font-family: inherit; border: 1px solid transparent; }
.vdm-foot.center .vdm-btn { flex: none; padding: 12px 32px; }
.vdm-btn.ghost { color: var(--sd-text-secondary); background: var(--sd-surface); border-color: var(--sd-border-strong); }
.vdm-btn.ghost:hover:not(:disabled) { color: var(--sd-text); }
.vdm-btn.primary { color: #22160a; background: var(--sd-vendor-grad); box-shadow: 0 10px 24px var(--sd-vendor-signal-soft); }
.vdm-btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
.vdm-btn .spin, .dropzone .spin { animation: vdm-spin 1s linear infinite; }

@keyframes vdm-ping { 0% { transform: scale(0.8); opacity: 0.8; } 100% { transform: scale(1.5); opacity: 0; } }
@keyframes vdm-spin { to { transform: rotate(360deg); } }
@media (max-width: 560px) { .vdm-two { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .em-ring,
  html:not([data-cinematic="on"]) .vdm-btn .spin { animation: none !important; }
}
</style>
