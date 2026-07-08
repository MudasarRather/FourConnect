<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open && ticket" class="fu-veil" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.22 }" @mousedown.stop @click.self="$emit('close')">
        <Motion class="fu-card" :initial="{ opacity: 0, y: 26, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 14, scale: 0.97 }" :transition="{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }">
          <header class="fu-head">
            <span class="fu-ic"><Link2 :size="17" /></span>
            <div class="fu-head-body">
              <span class="fu-eyebrow sd-mono">FOLLOW-UP · CONTINUE THE STORY</span>
              <h3>New case linked to {{ ticket.ticket_number }}</h3>
            </div>
            <button class="fu-x" @click="$emit('close')"><X :size="15" /></button>
          </header>

          <!-- inherited context — the requester keeps their story -->
          <div class="fu-inherit sd-mono">
            <span class="fu-in"><i>REQUESTER</i><b>{{ ticket.raised_by_name || ticket.contact_name || 'Internal' }}</b></span>
            <span v-if="ticket.organization_name" class="fu-in"><i>ORG</i><b>{{ ticket.organization_name }}</b></span>
            <span v-if="ticket.category_name" class="fu-in"><i>CATEGORY</i><b>{{ ticket.category_name }}</b></span>
            <span class="fu-in"><i>ORIGINAL</i><b>{{ (ticket.resolution_code || 'closed').replace(/_/g, ' ') }}</b></span>
          </div>

          <div class="fu-form">
            <label class="fu-lbl">Subject</label>
            <input v-model="subject" class="fu-input" type="text" :placeholder="`Follow-up: ${ticket.subject}`" />

            <label class="fu-lbl">What's happening now? <em>*</em></label>
            <textarea v-model="description" class="fu-input area" rows="4"
              placeholder="Describe the continuation — what came back, what changed, what still hurts…" />

            <label class="fu-lbl">Priority</label>
            <div class="fu-seg">
              <button v-for="p in PRIORITIES" :key="p" class="fu-seg-b" :class="[{ on: priority === p }, 'pri-' + p]"
                @click="priority = p">{{ p }}</button>
            </div>

            <label class="fu-check">
              <input v-model="assignMe" type="checkbox" /> <UserCheck :size="13" /> Assign the new case to me
            </label>
          </div>

          <div class="fu-consequence sd-mono">
            <Info :size="12" />
            The sealed record stays sealed. A fresh ticket opens with a fresh SLA, linked both ways,
            and rides normal routing{{ assignMe ? ' (owned by you)' : '' }}.
          </div>

          <footer class="fu-foot">
            <Motion as="button" class="fu-btn primary" :disabled="busy || description.trim().length < 3"
              :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }" @click="submit">
              <Link2 :size="14" /> {{ busy ? 'Opening…' : 'Open follow-up' }}
            </Motion>
            <button class="fu-btn ghost" @click="$emit('close')">Cancel</button>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
/* SdFollowUpModal — spawn a linked continuation case from a sealed record (the Zendesk
   pattern). Context (requester/org/category) is inherited server-side; the modal only
   asks for the new story. On 201 emits done(child) so the section can deep-link into it. */
import { ref, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { X, Link2, Info, UserCheck } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { createFollowUpTicket } from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  ticket: { type: Object, default: null },
})
const emit = defineEmits(['close', 'done'])
const toast = useToast()

const PRIORITIES = ['low', 'medium', 'high', 'urgent', 'critical']
const subject = ref('')
const description = ref('')
const priority = ref('medium')
const assignMe = ref(true)
const busy = ref(false)

watch(() => props.open, (o) => {
  if (o && props.ticket) {
    subject.value = ''
    description.value = ''
    priority.value = props.ticket.priority || 'medium'
    assignMe.value = true
  }
})

const submit = async () => {
  if (!props.ticket || description.value.trim().length < 3) return
  busy.value = true
  try {
    const child = await createFollowUpTicket(props.ticket.id, {
      subject: subject.value.trim() || undefined,
      description: description.value.trim(),
      priority: priority.value,
      assign_me: assignMe.value,
    })
    toast.success(`${child.ticket_number} opened — linked to ${props.ticket.ticket_number}.`)
    emit('done', child)
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not open the follow-up.')
  } finally { busy.value = false }
}
</script>

<style scoped>
.fu-veil { position: fixed; inset: 0; z-index: 2300; display: grid; place-items: center; padding: 4vh 16px;
  background: rgba(5, 6, 9, 0.66); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
[data-theme="light"] .fu-veil { background: rgba(30, 25, 15, 0.4); }
.fu-card { display: flex; flex-direction: column; gap: 13px; width: min(500px, 100%); max-height: 92vh; overflow-y: auto;
  padding: 18px 20px; border-radius: 18px; border: 1px solid var(--sd-cls-brd); background: var(--sd-panel); box-shadow: var(--sd-shadow); }

.fu-head { position: relative; display: flex; align-items: center; gap: 12px; }
.fu-ic { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px;
  color: var(--sd-cls-seal); background: var(--sd-cls-seal-soft); border: 1px solid color-mix(in srgb, var(--sd-cls-seal) 40%, transparent); }
.fu-eyebrow { font-size: 9px; font-weight: 800; letter-spacing: 0.2em; color: var(--sd-cls-frost); }
.fu-head h3 { margin: 3px 0 0; font-size: 16px; font-weight: 800; color: var(--sd-text); }
.fu-x { position: absolute; top: 0; right: 0; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px;
  border: 1px solid var(--sd-border); background: transparent; color: var(--sd-text-muted); cursor: pointer; }
.fu-x:hover { color: var(--sd-danger); border-color: var(--sd-danger); }

.fu-inherit { display: flex; flex-wrap: wrap; gap: 12px; padding: 10px 12px; border-radius: 12px;
  border: 1px dashed var(--sd-border-strong); background: var(--sd-surface-glass); }
.fu-in { display: flex; flex-direction: column; gap: 2px; }
.fu-in i { font-style: normal; font-size: 8px; font-weight: 800; letter-spacing: 0.16em; color: var(--sd-text-dim); }
.fu-in b { font-size: 11px; font-weight: 700; color: var(--sd-text-muted); }

.fu-form { display: flex; flex-direction: column; gap: 8px; }
.fu-lbl { font-size: 10.5px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--sd-text-dim); }
.fu-lbl em { color: var(--sd-cls-risk); font-style: normal; }
.fu-input { padding: 10px 12px; border-radius: 11px; border: 1px solid var(--sd-border-strong); background: var(--sd-surface-glass);
  color: var(--sd-text); font-size: 13px; font-family: inherit; outline: none; transition: border-color 0.18s; }
.fu-input:focus { border-color: var(--sd-cls-seal); }
.fu-input.area { resize: vertical; min-height: 88px; line-height: 1.5; }
.fu-seg { display: flex; gap: 5px; flex-wrap: wrap; }
.fu-seg-b { padding: 6px 12px; border-radius: 999px; font-size: 11px; font-weight: 700; text-transform: capitalize; cursor: pointer;
  font-family: inherit; border: 1px solid var(--sd-border); background: transparent; color: var(--sd-text-muted); transition: all 0.16s; }
.fu-seg-b.on { border-color: var(--sd-cls-seal); color: var(--sd-cls-seal); background: var(--sd-cls-seal-soft); }
.fu-check { display: inline-flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--sd-text-muted); cursor: pointer; }
.fu-check input { accent-color: var(--sd-cls-seal); }

.fu-consequence { display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; border-radius: 11px; font-size: 10px;
  line-height: 1.5; color: var(--sd-text-dim); border: 1px solid var(--sd-border); background: var(--sd-surface-glass); }
.fu-consequence svg { flex-shrink: 0; margin-top: 1px; color: var(--sd-cls-frost); }

.fu-foot { display: flex; gap: 9px; }
.fu-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 12px; font-size: 12.5px; font-weight: 700;
  cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); }
.fu-btn.primary { border-color: transparent; color: #241703; background: linear-gradient(135deg, #ecd9a8, var(--sd-cls-seal)); box-shadow: 0 8px 22px -10px var(--sd-cls-seal); }
.fu-btn.ghost { background: transparent; }
.fu-btn:disabled { opacity: 0.5; cursor: not-allowed; }
</style>
