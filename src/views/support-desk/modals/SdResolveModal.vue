<template>
  <Teleport to="body">
    <Presence>
      <Motion
        v-if="open" class="rsm-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 0.22 }"
        @mousedown.self="!busy && $emit('close')"
      >
        <Motion
          class="rsm" role="dialog" aria-modal="true"
          :initial="{ opacity: 0, y: 28, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 18, scale: 0.98 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }"
        >
          <span class="rsm-grain" aria-hidden="true" />
          <button class="rsm-x" :disabled="busy" @click="$emit('close')"><X :size="17" /></button>

          <!-- morphing seal -->
          <div class="rsm-seal" :class="{ done }">
            <span class="seal-ring" /><span class="seal-ring r2" />
            <span class="seal-core"><component :is="done ? PartyPopper : CircleCheck" :size="26" /></span>
          </div>

          <p class="rsm-eyebrow sd-mono">{{ closeMode ? 'RESOLVE & CLOSE' : 'RESOLVE TICKET' }}</p>
          <h2 class="rsm-title">{{ done ? 'Resolution recorded' : 'Close the loop' }}</h2>
          <p v-if="!done" class="rsm-sub">Capture how it was fixed — the resolution is kept on the permanent record and the requester is notified.</p>
          <p v-else class="rsm-sub">{{ ticket?.ticket_number }} is now {{ form.close ? 'closed' : 'resolved' }}. The SLA clock has stopped.</p>

          <template v-if="!done">
            <div class="rsm-chip">
              <span class="rc-no sd-mono">{{ ticket?.ticket_number }}</span>
              <span class="rc-subj">{{ ticket?.subject }}</span>
            </div>

            <div class="rsm-scroll">
              <!-- resolution code -->
              <section class="rsm-f">
                <label class="rsm-k">Resolution code <em>*</em></label>
                <div class="code-grid">
                  <Motion as="button" v-for="(c, i) in RESOLUTION_CODES" :key="c.value" type="button"
                    class="code-chip" :class="{ on: form.resolution_code === c.value }"
                    :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.26, delay: 0.02 * i }"
                    :whileTap="{ scale: 0.96 }" @click="form.resolution_code = c.value">
                    <component :is="codeIcon(c.value)" :size="14" /> {{ c.label }}
                  </Motion>
                </div>
              </section>

              <!-- root cause -->
              <section class="rsm-f">
                <label class="rsm-k">Root cause <i>helps prevent repeats</i></label>
                <div class="cause-row">
                  <button v-for="r in ROOT_CAUSES" :key="r.value" type="button"
                    class="cause-pill" :class="{ on: form.resolution_category === r.value }"
                    @click="form.resolution_category = form.resolution_category === r.value ? '' : r.value">{{ r.label }}</button>
                </div>
              </section>

              <!-- summary -->
              <section class="rsm-f">
                <label class="rsm-k">Resolution summary <em>*</em></label>
                <textarea v-model="form.resolution_summary" rows="3" class="rsm-input"
                  placeholder="What was the root cause and the fix? (kept on the record)" />
              </section>

              <!-- time spent -->
              <section class="rsm-f">
                <label class="rsm-k">Time spent</label>
                <div class="time-row">
                  <button v-for="m in [15, 30, 60, 120, 240]" :key="m" type="button"
                    class="time-pill" :class="{ on: form.time_spent_minutes === m }" @click="form.time_spent_minutes = m">
                    {{ m < 60 ? m + 'm' : (m / 60) + 'h' }}
                  </button>
                  <input type="number" min="0" v-model.number="form.time_spent_minutes" class="time-in" placeholder="min" />
                </div>
              </section>

              <!-- proof -->
              <section class="rsm-f">
                <label class="rsm-k">Proof of resolution <i>screenshot / log · optional</i></label>
                <div class="dropzone" :class="{ busy: uploading }" @click="pickFiles">
                  <input ref="fileInput" type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.gif,.webp" class="dz-input" @change="onFiles" />
                  <component :is="uploading ? LoaderCircle : UploadCloud" :size="17" :class="{ spin: uploading }" />
                  <span>{{ uploading ? 'Uploading…' : 'Attach evidence (PDF / image · ≤5MB)' }}</span>
                </div>
                <div v-if="form.attachments.length" class="att-list">
                  <span v-for="(a, i) in form.attachments" :key="i" class="att">
                    <Paperclip :size="12" /> <i>{{ a.name }}</i>
                    <button type="button" @click.stop="form.attachments.splice(i, 1)"><X :size="11" /></button>
                  </span>
                </div>
                <p v-if="fileErr" class="rsm-fileerr"><AlertCircle :size="12" /> {{ fileErr }}</p>
              </section>

              <!-- public reply -->
              <section class="rsm-f">
                <label class="rsm-k">Message to requester <i>public reply · optional</i></label>
                <textarea v-model="form.note" rows="2" class="rsm-input"
                  placeholder="A note the requester will see with the resolution…" />
              </section>

              <!-- toggles -->
              <div class="rsm-toggles">
                <button class="tog" :class="{ on: form.notify_customer }" @click="form.notify_customer = !form.notify_customer">
                  <span class="tk"><Bell :size="11" /></span> Notify requester
                </button>
                <button v-if="!closeMode" class="tog" :class="{ on: form.close }" @click="form.close = !form.close">
                  <span class="tk"><Lock :size="11" /></span> Resolve &amp; close
                </button>
              </div>
            </div>

            <!-- workflow strip -->
            <ul class="rsm-flow">
              <li><span class="wf-dot" /> SLA clock <b>stops</b> on resolve</li>
              <li><span class="wf-dot" /> Logged with ITIL code <b>{{ resolutionLabel(form.resolution_code) }}</b></li>
              <li><span class="wf-dot" /> Requester {{ form.notify_customer ? 'notified' : 'sees it in their portal' }}</li>
              <li><span class="wf-dot" /> Moves to <b>{{ form.close ? 'Closed' : 'Resolved' }}</b></li>
            </ul>

            <p v-if="err" class="rsm-err"><AlertTriangle :size="13" /> {{ err }}</p>

            <div class="rsm-foot">
              <button class="rsm-btn ghost" :disabled="busy" @click="$emit('close')">Cancel</button>
              <button class="rsm-btn primary" :disabled="busy || !valid" @click="confirm">
                <component :is="busy ? LoaderCircle : CircleCheck" :size="15" :class="{ spin: busy }" />
                {{ busy ? 'Recording…' : (form.close ? 'Resolve & close' : 'Mark resolved') }}
              </button>
            </div>
          </template>
          <div v-else class="rsm-foot center">
            <button class="rsm-btn primary" @click="$emit('close')"><Check :size="15" /> Done</button>
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
  X, CircleCheck, Check, PartyPopper, LoaderCircle, AlertTriangle, AlertCircle, UploadCloud,
  Paperclip, Bell, Lock, Wrench, ShieldCheck, Copy, SearchX, Settings2, BookOpen, Ban, Lightbulb,
} from 'lucide-vue-next'
import {
  resolveTicket, resolveMyTicket, uploadSupportFile,
  RESOLUTION_CODES, ROOT_CAUSES, resolutionLabel,
} from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  ticket: { type: Object, default: null },
  agent: { type: Boolean, default: false },   // agent → admin resolve endpoint; else /me resolve
  closeMode: { type: Boolean, default: false }, // preset "resolve & close"
})
const emit = defineEmits(['close', 'done'])

const blank = () => ({
  resolution_code: 'solved', resolution_category: '', resolution_summary: '',
  time_spent_minutes: 0, note: '', attachments: [], notify_customer: true, close: false,
})
const form = ref(blank())
const busy = ref(false)
const done = ref(false)
const err = ref('')
const uploading = ref(false)
const fileErr = ref('')
const fileInput = ref(null)

watch(() => props.open, (v) => {
  if (v) { form.value = blank(); form.value.close = props.closeMode; busy.value = false; done.value = false; err.value = ''; fileErr.value = '' }
})

const CODE_ICONS = {
  solved: ShieldCheck, workaround: Wrench, no_fault_found: SearchX, duplicate: Copy,
  not_reproducible: SearchX, configuration: Settings2, known_error: BookOpen, cancelled: Ban,
}
const codeIcon = (v) => CODE_ICONS[v] || Lightbulb

const valid = computed(() => !!form.value.resolution_code && form.value.resolution_summary.trim().length >= 3)

const pickFiles = () => fileInput.value?.click()
const onFiles = async (e) => {
  const files = Array.from(e.target.files || [])
  if (!files.length) return
  uploading.value = true; fileErr.value = ''
  for (const f of files) {
    if (f.size > 5 * 1024 * 1024) { fileErr.value = `${f.name} exceeds 5MB`; continue }
    try { form.value.attachments.push(await uploadSupportFile(f)) }
    catch (er) { fileErr.value = er?.response?.data?.detail || `Could not upload ${f.name}` }
  }
  uploading.value = false
  if (fileInput.value) fileInput.value.value = ''
}

const confirm = async () => {
  if (!valid.value || !props.ticket?.id) return
  busy.value = true; err.value = ''
  const payload = {
    resolution_code: form.value.resolution_code,
    resolution_category: form.value.resolution_category || undefined,
    resolution_summary: form.value.resolution_summary.trim() || undefined,
    time_spent_minutes: form.value.time_spent_minutes || undefined,
    note: form.value.note.trim() || undefined,
    attachments: form.value.attachments.length ? form.value.attachments : undefined,
    notify_customer: form.value.notify_customer,
    close: form.value.close,
  }
  try {
    await (props.agent ? resolveTicket(props.ticket.id, payload) : resolveMyTicket(props.ticket.id, payload))
    done.value = true
    setTimeout(() => emit('done'), 950)
  } catch (e) {
    err.value = e?.response?.data?.detail || 'Could not resolve the ticket.'
  } finally { busy.value = false }
}
</script>

<style scoped>
.rsm-overlay { position: fixed; inset: 0; z-index: 2700; display: grid; place-items: center; padding: 24px; background: rgba(4,5,6,0.66); backdrop-filter: blur(12px) saturate(140%); }
[data-theme="light"] .rsm-overlay { background: rgba(40,25,10,0.4); }
.rsm { position: relative; width: min(500px, 95vw); max-height: 92vh; display: flex; flex-direction: column; overflow: hidden; padding: 28px 26px 22px; text-align: center;
  background: var(--sd-surface-elevated); border: 1px solid var(--sd-border-strong); border-radius: 24px; box-shadow: var(--sd-shadow-hover); }
/* overflow:hidden on .rsm clips this accent bar to the rounded corners (was bleeding past them) */
.rsm::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 3px; z-index: 2; background: linear-gradient(90deg, var(--sd-success), #059669); border-radius: 24px 24px 0 0; }
.rsm-grain { position: absolute; inset: 0; pointer-events: none; opacity: 0.4; border-radius: 24px; background-image: radial-gradient(rgba(52,211,153,0.05) 1px, transparent 1px); background-size: 18px 18px; }
.rsm-x { position: absolute; top: 16px; right: 16px; width: 32px; height: 32px; display: grid; place-items: center; border-radius: 9px; cursor: pointer; background: transparent; border: 1px solid var(--sd-border); color: var(--sd-text-muted); z-index: 2; }
.rsm-x:hover:not(:disabled) { color: var(--sd-text); border-color: var(--sd-border-strong); }
.rsm-x:disabled { opacity: 0.4; cursor: not-allowed; }

.rsm-seal { position: relative; width: 68px; height: 68px; margin: 4px auto 14px; display: grid; place-items: center; flex-shrink: 0; }
.seal-ring { position: absolute; inset: 0; border-radius: 50%; border: 1.5px solid color-mix(in srgb, var(--sd-success) 45%, transparent); animation: rsm-ping 2.4s ease-out infinite; }
.seal-ring.r2 { animation-delay: 1.2s; }
.seal-core { position: relative; width: 54px; height: 54px; border-radius: 50%; display: grid; place-items: center; color: #fff; background: linear-gradient(140deg, var(--sd-success), #059669); box-shadow: 0 0 26px color-mix(in srgb, var(--sd-success) 40%, transparent); }

.rsm-eyebrow { font-size: 10px; font-weight: 700; letter-spacing: 0.22em; color: var(--sd-success); margin: 0 0 6px; }
.rsm-title { font-size: 21px; font-weight: 800; color: var(--sd-text); margin: 0 0 8px; letter-spacing: -0.02em; }
.rsm-sub { font-size: 12.5px; line-height: 1.5; color: var(--sd-text-secondary); margin: 0 auto 16px; max-width: 40ch; }

.rsm-chip { display: flex; flex-direction: column; gap: 4px; text-align: left; padding: 11px 14px; border-radius: 13px; background: var(--sd-surface); border: 1px solid var(--sd-border); margin-bottom: 14px; flex-shrink: 0; }
.rc-no { font-size: 11px; font-weight: 700; color: var(--sd-amber); }
.rc-subj { font-size: 13.5px; font-weight: 650; color: var(--sd-text); line-height: 1.3; }

.rsm-scroll { overflow-y: auto; text-align: left; display: flex; flex-direction: column; gap: 14px; padding: 2px; margin: 0 -2px;
  scrollbar-width: thin; scrollbar-color: var(--sd-success) transparent; }
.rsm-scroll::-webkit-scrollbar { width: 8px; }
.rsm-scroll::-webkit-scrollbar-track { background: transparent; margin: 2px 0; }
.rsm-scroll::-webkit-scrollbar-thumb { border-radius: 999px; border: 2px solid transparent; background: color-mix(in srgb, var(--sd-success) 60%, transparent); background-clip: padding-box; transition: background 0.2s; }
.rsm-scroll::-webkit-scrollbar-thumb:hover { background: var(--sd-success); background-clip: padding-box; }
.rsm-f { display: flex; flex-direction: column; gap: 8px; }
.rsm-k { font-size: 12px; font-weight: 650; color: var(--sd-text-secondary); }
.rsm-k em { color: var(--sd-danger); font-style: normal; }
.rsm-k i { font-style: normal; font-weight: 500; color: var(--sd-text-dim); font-size: 11px; margin-left: 4px; }
.code-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 7px; }
.code-chip { display: inline-flex; align-items: center; gap: 7px; padding: 9px 12px; border-radius: 11px; font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit; color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border); transition: all 0.16s var(--sd-spring); }
.code-chip:hover { border-color: var(--sd-success); }
.code-chip.on { color: var(--sd-success); background: var(--sd-success-soft); border-color: color-mix(in srgb, var(--sd-success) 45%, transparent); }
.cause-row { display: flex; flex-wrap: wrap; gap: 6px; }
.cause-pill { padding: 7px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border); transition: all 0.16s; }
.cause-pill.on { color: var(--sd-amber); background: var(--sd-amber-soft); border-color: var(--sd-amber-border); }
.rsm-input { width: 100%; padding: 11px 13px; border-radius: 12px; font-size: 13.5px; font-family: inherit; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text); resize: vertical; }
.rsm-input:focus { outline: none; border-color: color-mix(in srgb, var(--sd-success) 45%, transparent); box-shadow: 0 0 0 3px var(--sd-success-soft); }
.time-row { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.time-pill { padding: 7px 12px; border-radius: 9px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border); }
.time-pill.on { color: var(--sd-amber); background: var(--sd-amber-soft); border-color: var(--sd-amber-border); }
.time-in { width: 72px; padding: 7px 10px; border-radius: 9px; font-family: inherit; font-size: 13px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); color: var(--sd-text); }
.dropzone { position: relative; display: flex; align-items: center; justify-content: center; gap: 9px; padding: 14px; border-radius: 12px; cursor: pointer; font-size: 12.5px; color: var(--sd-text-muted); background: var(--sd-surface-glass); border: 1.5px dashed var(--sd-border-strong); transition: all 0.2s var(--sd-spring); }
.dropzone:hover { border-color: color-mix(in srgb, var(--sd-success) 45%, transparent); color: var(--sd-text-secondary); background: var(--sd-success-soft); }
.dropzone.busy { pointer-events: none; opacity: 0.7; }
.dz-input { position: absolute; inset: 0; opacity: 0; cursor: pointer; }
.att-list { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.att { display: inline-flex; align-items: center; gap: 5px; padding: 5px 6px 5px 10px; border-radius: 9px; font-size: 11.5px; color: var(--sd-text-secondary); background: var(--sd-surface); border: 1px solid var(--sd-border); }
.att i { font-style: normal; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 150px; }
.att button { display: grid; place-items: center; width: 16px; height: 16px; border-radius: 50%; border: none; cursor: pointer; color: var(--sd-text-muted); background: var(--sd-border-strong); }
.att button:hover { color: var(--sd-danger); }
.rsm-fileerr { display: flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--sd-danger); margin: 0; }
.rsm-toggles { display: flex; flex-wrap: wrap; gap: 8px; }
.tog { display: inline-flex; align-items: center; gap: 9px; padding: 9px 13px; border-radius: 11px; font-size: 12.5px; font-weight: 600; cursor: pointer; font-family: inherit; color: var(--sd-text-secondary); background: var(--sd-surface-glass); border: 1px solid var(--sd-border-strong); }
.tog .tk { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 6px; color: var(--sd-text-dim); background: var(--sd-surface); transition: all 0.18s; }
.tog.on { color: var(--sd-text); border-color: color-mix(in srgb, var(--sd-success) 45%, transparent); }
.tog.on .tk { color: #fff; background: var(--sd-success); }

.rsm-flow { list-style: none; margin: 14px 0 0; padding: 13px 15px; border-radius: 13px; background: var(--sd-surface-glass); border: 1px solid var(--sd-border); text-align: left; display: flex; flex-direction: column; gap: 8px; flex-shrink: 0; }
.rsm-flow li { display: flex; align-items: center; gap: 9px; font-size: 12px; color: var(--sd-text-secondary); }
.rsm-flow b { color: var(--sd-text); font-weight: 700; }
.wf-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--sd-success); flex-shrink: 0; box-shadow: 0 0 8px var(--sd-success); }

.rsm-err { display: flex; align-items: center; justify-content: center; gap: 7px; margin: 12px 0 0; font-size: 12.5px; color: var(--sd-danger); }
.rsm-foot { display: flex; gap: 10px; margin-top: 18px; flex-shrink: 0; }
.rsm-foot.center { justify-content: center; }
.rsm-btn { flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 12px 18px; border-radius: 12px; font-size: 13.5px; font-weight: 700; cursor: pointer; font-family: inherit; border: 1px solid transparent; }
.rsm-foot.center .rsm-btn { flex: none; padding: 12px 32px; }
.rsm-btn.ghost { color: var(--sd-text-secondary); background: var(--sd-surface); border-color: var(--sd-border-strong); }
.rsm-btn.ghost:hover:not(:disabled) { color: var(--sd-text); }
.rsm-btn.primary { color: #fff; background: linear-gradient(135deg, var(--sd-success), #059669); box-shadow: 0 10px 24px color-mix(in srgb, var(--sd-success) 30%, transparent); }
.rsm-btn:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
.rsm-btn .spin, .dropzone .spin { animation: rsm-spin 1s linear infinite; }

@keyframes rsm-ping { 0% { transform: scale(0.8); opacity: 0.8; } 100% { transform: scale(1.5); opacity: 0; } }
@keyframes rsm-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  html:not([data-cinematic="on"]) .seal-ring,
  html:not([data-cinematic="on"]) .rsm-btn .spin,
  html:not([data-cinematic="on"]) .dropzone .spin { animation: none !important; }
}
</style>
