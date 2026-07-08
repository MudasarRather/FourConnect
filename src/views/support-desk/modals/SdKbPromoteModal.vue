<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open && ticket" class="kp-veil" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.22 }" @mousedown.stop @click.self="$emit('close')">
        <Motion class="kp-card" :initial="{ opacity: 0, y: 26, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 14, scale: 0.97 }" :transition="{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }">
          <header class="kp-head">
            <span class="kp-ic"><BookMarked :size="17" /></span>
            <div class="kp-head-body">
              <span class="kp-eyebrow sd-mono">KNOWLEDGE HARVEST · KCS</span>
              <h3>Promote {{ ticket.ticket_number }}'s fix to the KB</h3>
            </div>
            <button class="kp-x" @click="$emit('close')"><X :size="15" /></button>
          </header>

          <div class="kp-cols">
            <!-- form -->
            <div class="kp-form">
              <label class="kp-lbl">Article title</label>
              <input v-model="title" class="kp-input" type="text" :placeholder="defaultTitle" />

              <label class="kp-lbl">Body <span class="kp-hint">(pre-templated from the record — polish before publishing)</span></label>
              <textarea v-model="body" class="kp-input area" rows="9" />

              <label class="kp-lbl">Visibility</label>
              <div class="kp-seg">
                <button v-for="v in VISIBILITIES" :key="v.value" class="kp-seg-b" :class="{ on: visibility === v.value }"
                  :title="v.hint" @click="visibility = v.value">
                  <component :is="v.icon" :size="12" /> {{ v.label }}
                </button>
              </div>
            </div>

            <!-- live article preview -->
            <div class="kp-preview">
              <div class="kp-pv-head">
                <span class="kp-draft sd-mono">DRAFT</span>
                <span class="kp-pv-vis sd-mono">{{ visibility.toUpperCase() }}</span>
              </div>
              <h4 class="kp-pv-title">{{ title || defaultTitle }}</h4>
              <p class="kp-pv-src sd-mono">Harvested from {{ ticket.ticket_number }}</p>
              <div class="kp-pv-body">{{ body }}</div>
            </div>
          </div>

          <div class="kp-note sd-mono">
            <Info :size="12" />
            Lands as a DRAFT under your name — you can polish it in Articles; publishing stays an editorial review.
            Promoting again later returns this same article (no duplicates).
          </div>

          <footer class="kp-foot">
            <Motion as="button" class="kp-btn primary" :disabled="busy || body.trim().length < 3"
              :while-hover="{ y: -2, scale: 1.02 }" :while-tap="{ scale: 0.97 }" @click="submit">
              <BookMarked :size="14" /> {{ busy ? 'Harvesting…' : 'Create draft article' }}
            </Motion>
            <button class="kp-btn ghost" @click="$emit('close')">Cancel</button>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
/* SdKbPromoteModal — KCS harvest: turn a sealed record's resolution into a DRAFT
   knowledge article, with a live preview of what the article will look like. The
   backend forces status=draft and is idempotent per ticket (links.kb_article_id). */
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { X, BookMarked, Info, Lock, Users, Globe } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { promoteTicketToKb } from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  ticket: { type: Object, default: null },
})
const emit = defineEmits(['close', 'done'])
const toast = useToast()

const VISIBILITIES = [
  { value: 'internal', label: 'Internal', icon: Lock, hint: 'Agents only — the safe default for fresh harvests' },
  { value: 'customer', label: 'Customers', icon: Users, hint: 'Visible to signed-in requesters' },
  { value: 'public', label: 'Public', icon: Globe, hint: 'Anyone with the portal link' },
]
const title = ref('')
const body = ref('')
const visibility = ref('internal')
const busy = ref(false)

const defaultTitle = computed(() => props.ticket
  ? `${props.ticket.subject} — ${(props.ticket.resolution_code || 'resolution').replace(/_/g, ' ')}`
  : '')

const template = () => {
  const t = props.ticket
  if (!t) return ''
  const parts = [
    '## Problem', t.subject || '', '', (t.description || '').trim(), '',
    '## Environment',
    `- Type: ${t.ticket_type || 'n/a'}${t.category_name ? ` / ${t.category_name}` : ''}`,
    `- Priority: ${t.priority || 'n/a'}`, '',
    `## Resolution (${t.resolution_code || 'solved'})`,
    (t.resolution_summary || '').trim(),
  ]
  if (t.resolution_category) parts.push('', '## Root cause', t.resolution_category)
  return parts.join('\n')
}

watch(() => props.open, (o) => {
  if (o && props.ticket) {
    title.value = ''
    body.value = template()
    visibility.value = 'internal'
  }
})

const submit = async () => {
  if (!props.ticket || body.value.trim().length < 3) return
  busy.value = true
  try {
    const article = await promoteTicketToKb(props.ticket.id, {
      title: title.value.trim() || undefined,
      body: body.value,
      visibility: visibility.value,
    })
    toast.success(`Draft article created — "${article.title}".`)
    emit('done', article)
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not create the article.')
  } finally { busy.value = false }
}
</script>

<style scoped>
.kp-veil { position: fixed; inset: 0; z-index: 2300; display: grid; place-items: center; padding: 4vh 16px;
  background: rgba(5, 6, 9, 0.66); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
[data-theme="light"] .kp-veil { background: rgba(30, 25, 15, 0.4); }
.kp-card { display: flex; flex-direction: column; gap: 13px; width: min(760px, 100%); max-height: 92vh; overflow-y: auto;
  padding: 18px 20px; border-radius: 18px; border: 1px solid var(--sd-cls-brd); background: var(--sd-panel); box-shadow: var(--sd-shadow); }

.kp-head { position: relative; display: flex; align-items: center; gap: 12px; }
.kp-ic { display: grid; place-items: center; width: 40px; height: 40px; border-radius: 12px;
  color: var(--sd-cls-seal); background: var(--sd-cls-seal-soft); border: 1px solid color-mix(in srgb, var(--sd-cls-seal) 40%, transparent); }
.kp-eyebrow { font-size: 9px; font-weight: 800; letter-spacing: 0.2em; color: var(--sd-cls-frost); }
.kp-head h3 { margin: 3px 0 0; font-size: 16px; font-weight: 800; color: var(--sd-text); }
.kp-x { position: absolute; top: 0; right: 0; display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px;
  border: 1px solid var(--sd-border); background: transparent; color: var(--sd-text-muted); cursor: pointer; }
.kp-x:hover { color: var(--sd-danger); border-color: var(--sd-danger); }

.kp-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.kp-form { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.kp-lbl { font-size: 10.5px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--sd-text-dim); }
.kp-hint { font-weight: 500; text-transform: none; letter-spacing: 0; }
.kp-input { padding: 10px 12px; border-radius: 11px; border: 1px solid var(--sd-border-strong); background: var(--sd-surface-glass);
  color: var(--sd-text); font-size: 12.5px; font-family: inherit; outline: none; transition: border-color 0.18s; }
.kp-input:focus { border-color: var(--sd-cls-seal); }
.kp-input.area { resize: vertical; min-height: 170px; line-height: 1.5; font-family: var(--sd-mono); font-size: 11.5px; }
.kp-seg { display: flex; gap: 5px; flex-wrap: wrap; }
.kp-seg-b { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; border-radius: 999px; font-size: 11px; font-weight: 700;
  cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border); background: transparent; color: var(--sd-text-muted); transition: all 0.16s; }
.kp-seg-b.on { border-color: var(--sd-cls-seal); color: var(--sd-cls-seal); background: var(--sd-cls-seal-soft); }

.kp-preview { display: flex; flex-direction: column; gap: 7px; padding: 14px 15px; border-radius: 13px; min-width: 0;
  border: 1px solid var(--sd-border); background: var(--sd-surface-glass); }
.kp-pv-head { display: flex; justify-content: space-between; }
.kp-draft { padding: 3px 9px; border-radius: 999px; font-size: 9px; font-weight: 800; letter-spacing: 0.14em;
  color: var(--sd-cls-seal); border: 1px dashed color-mix(in srgb, var(--sd-cls-seal) 55%, transparent); background: var(--sd-cls-seal-soft); }
.kp-pv-vis { font-size: 9px; font-weight: 800; letter-spacing: 0.14em; color: var(--sd-text-dim); align-self: center; }
.kp-pv-title { margin: 0; font-size: 14.5px; font-weight: 800; color: var(--sd-text); line-height: 1.3; }
.kp-pv-src { margin: 0; font-size: 9.5px; color: var(--sd-text-dim); }
.kp-pv-body { flex: 1; overflow-y: auto; max-height: 240px; white-space: pre-wrap; font-size: 11px; line-height: 1.55;
  color: var(--sd-text-muted); font-family: var(--sd-mono); }

.kp-note { display: flex; align-items: flex-start; gap: 8px; padding: 10px 12px; border-radius: 11px; font-size: 10px;
  line-height: 1.5; color: var(--sd-text-dim); border: 1px solid var(--sd-border); background: var(--sd-surface-glass); }
.kp-note svg { flex-shrink: 0; margin-top: 1px; color: var(--sd-cls-frost); }

.kp-foot { display: flex; gap: 9px; }
.kp-btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 16px; border-radius: 12px; font-size: 12.5px; font-weight: 700;
  cursor: pointer; font-family: inherit; border: 1px solid var(--sd-border-strong); background: var(--sd-surface); color: var(--sd-text); }
.kp-btn.primary { border-color: transparent; color: #241703; background: linear-gradient(135deg, #ecd9a8, var(--sd-cls-seal)); box-shadow: 0 8px 22px -10px var(--sd-cls-seal); }
.kp-btn.ghost { background: transparent; }
.kp-btn:disabled { opacity: 0.5; cursor: not-allowed; }

@media (max-width: 680px) { .kp-cols { grid-template-columns: 1fr; } }
</style>
