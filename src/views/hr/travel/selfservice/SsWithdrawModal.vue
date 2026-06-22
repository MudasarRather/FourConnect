<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" as="div" class="ov" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.22 }" @click.self="$emit('close')">
        <Motion as="div" class="wd" :class="{ draft: isDraft }" :initial="{ opacity: 0, y: 20, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 12 }" :transition="{ duration: 0.38, ease: [0.16,1,0.3,1] }">
          <span class="wd-aura" aria-hidden="true" />

          <button class="wd-x" @click="$emit('close')"><X :size="17" /></button>

          <!-- animated crucible icon -->
          <div class="wd-orb">
            <span v-if="!reduced" class="orb-ring r1" aria-hidden="true" />
            <span v-if="!reduced" class="orb-ring r2" aria-hidden="true" />
            <span class="orb-core"><component :is="isDraft ? Trash2 : Undo2" :size="24" /></span>
          </div>

          <span class="wd-eyebrow trv-mono">{{ isDraft ? 'DISCARD DRAFT' : 'WITHDRAW REQUEST' }}</span>
          <h3>{{ isDraft ? 'Discard this draft?' : 'Withdraw this trip?' }}</h3>
          <p class="wd-sub">
            <template v-if="isDraft">This draft <b class="trv-mono">{{ trip?.travel_reference_number }}</b> hasn't been submitted — it'll be permanently deleted.</template>
            <template v-else><b class="trv-mono">{{ trip?.travel_reference_number }}</b> is currently in approval. Withdrawing pulls it back to you.</template>
          </p>

          <!-- reason workflow (submitted requests) -->
          <div v-if="!isDraft" class="wd-reasons">
            <label class="wd-lab">Why are you withdrawing? <span class="req">*</span></label>
            <div class="reason-grid">
              <Motion v-for="r in REASONS" :key="r.key" as="button" class="reason" :class="{ on: selected === r.key }"
                :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="selected = r.key">
                <component :is="r.icon" :size="14" /><span>{{ r.key }}</span>
              </Motion>
            </div>
            <Presence>
              <Motion v-if="selected" as="div" class="wd-note" :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :exit="{ opacity: 0, height: 0 }" :transition="{ duration: 0.3 }">
                <label class="wd-lab">{{ selected === 'Other' ? 'Tell us more' : 'Add a note' }} <span v-if="selected === 'Other'" class="req">*</span><em v-else>(optional)</em></label>
                <textarea v-model="note" class="inp" rows="2" :placeholder="selected === 'Other' ? 'Briefly explain why…' : 'Anything your approver should know…'" />
              </Motion>
            </Presence>
          </div>

          <!-- consequence ledger -->
          <ul class="wd-consq">
            <li v-for="(c, i) in consequences" :key="i" :class="c.tone">
              <component :is="c.icon" :size="14" /><span>{{ c.text }}</span>
            </li>
          </ul>

          <div class="wd-foot">
            <button class="btn ghost" @click="$emit('close')">Keep it</button>
            <Motion as="button" class="btn danger" :disabled="!valid || busy" :whileHover="(valid && !busy) ? { y: -2 } : {}" :whileTap="(valid && !busy) ? { scale: 0.97 } : {}" @click="confirm">
              <Loader2 v-if="busy" :size="15" class="spin" /><component v-else :is="isDraft ? Trash2 : Undo2" :size="14" /> {{ isDraft ? 'Discard draft' : 'Withdraw request' }}
            </Motion>
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
  X, Undo2, Trash2, Loader2, RotateCcw, CalendarX, ListX, Route, Wallet, Copy, PenLine,
  Bell, BellOff, ShieldX, Send,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { errText, withdrawMyRequest } from '@/composables/useTravel'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({ open: Boolean, trip: { type: Object, default: null } })
const emit = defineEmits(['close', 'saved'])
const toast = useToast()
const reduced = prefersReduced()

const REASONS = [
  { key: 'Plans changed', icon: RotateCcw },
  { key: 'Trip postponed', icon: CalendarX },
  { key: 'No longer required', icon: ListX },
  { key: 'Arranged differently', icon: Route },
  { key: 'Budget not approved', icon: Wallet },
  { key: 'Duplicate request', icon: Copy },
  { key: 'Other', icon: PenLine },
]

const selected = ref('')
const note = ref('')
const busy = ref(false)
const isDraft = computed(() => props.trip?.status === 'DRAFT')

const consequences = computed(() => isDraft.value
  ? [
      { tone: 'bad', icon: Trash2, text: 'The draft is permanently deleted — this can’t be undone.' },
      { tone: '', icon: BellOff, text: 'Nothing has been sent to approvers, so no one is notified.' },
      { tone: 'ok', icon: Send, text: 'You can start a fresh request whenever you’re ready.' },
    ]
  : [
      { tone: '', icon: ShieldX, text: 'The request leaves the approval queue immediately.' },
      { tone: '', icon: Bell, text: 'Your approvers are notified that you withdrew it.' },
      { tone: 'ok', icon: RotateCcw, text: 'You can raise a new request for this trip anytime.' },
    ])

const valid = computed(() => isDraft.value || (!!selected.value && (selected.value !== 'Other' || note.value.trim().length >= 3)))

const finalReason = () => {
  if (isDraft.value) return note.value.trim() || 'Draft discarded'
  if (selected.value === 'Other') return note.value.trim()
  const extra = note.value.trim()
  return extra ? `${selected.value} — ${extra}` : selected.value
}

watch(() => props.open, (v) => { if (v) { selected.value = ''; note.value = '' } })

const confirm = async () => {
  if (!props.trip || !valid.value) return
  busy.value = true
  try {
    await withdrawMyRequest(props.trip.id, finalReason())
    toast.success(isDraft.value ? 'Draft discarded' : 'Request withdrawn'); emit('saved'); emit('close')
  } catch (e) { toast.error(errText(e, 'Could not withdraw')) } finally { busy.value = false }
}
</script>

<style scoped>
.ov { position: fixed; inset: 0; z-index: 1470; display: grid; place-items: center; padding: 18px; background: rgba(6,5,4,0.64); backdrop-filter: blur(9px); }
.wd { position: relative; width: min(460px, 96vw); max-height: 94vh; overflow-y: auto; padding: 26px 24px 22px; border-radius: 22px; background: var(--trv-surface-elevated); border: 1px solid var(--trv-border-strong); box-shadow: var(--trv-shadow); text-align: center; }
.wd-aura { position: absolute; inset: -30% 20% 60% 20%; pointer-events: none; background: radial-gradient(60% 70% at 50% 0%, rgba(239,68,68,0.16), transparent 70%); }
.wd.draft .wd-aura { background: radial-gradient(60% 70% at 50% 0%, rgba(245,158,11,0.16), transparent 70%); }
.wd-x { position: absolute; top: 14px; right: 14px; background: var(--trv-panel); border: 1px solid var(--trv-border); border-radius: 9px; padding: 6px; color: var(--trv-text-dim); cursor: pointer; z-index: 2; }
.wd-x:hover { color: var(--trv-text); }

.wd-orb { position: relative; width: 64px; height: 64px; margin: 4px auto 14px; }
.orb-ring { position: absolute; inset: 0; border-radius: 50%; border: 1.5px solid var(--trv-st-rejected); opacity: 0; }
.wd.draft .orb-ring { border-color: var(--trv-st-returned); }
.orb-ring.r1 { animation: orb-pulse 2.2s ease-out infinite; }
.orb-ring.r2 { animation: orb-pulse 2.2s ease-out infinite 1.1s; }
@keyframes orb-pulse { 0% { transform: scale(0.7); opacity: 0.7; } 100% { transform: scale(1.5); opacity: 0; } }
.orb-core { position: absolute; inset: 8px; display: grid; place-items: center; border-radius: 50%; color: var(--trv-st-rejected); background: var(--trv-st-rejected-soft); border: 1px solid color-mix(in srgb, var(--trv-st-rejected) 32%, transparent); }
.wd.draft .orb-core { color: var(--trv-st-returned); background: var(--trv-st-returned-soft); border-color: color-mix(in srgb, var(--trv-st-returned) 32%, transparent); }

.wd-eyebrow { font-size: 9.5px; letter-spacing: 0.16em; color: var(--trv-text-dim); }
.wd h3 { font-size: 18px; font-weight: 850; margin: 5px 0 7px; color: var(--trv-text); }
.wd-sub { font-size: 12.5px; color: var(--trv-text-secondary); margin: 0 0 16px; line-height: 1.55; }
.wd-sub b { color: var(--trv-amber-bright); font-weight: 700; }

.wd-reasons { text-align: left; margin-bottom: 16px; }
.wd-lab { display: block; font-size: 11px; font-weight: 700; color: var(--trv-text-muted); margin-bottom: 8px; }
.wd-lab em { color: var(--trv-text-dim); font-style: normal; font-weight: 500; }
.req { color: var(--trv-st-rejected); }
.reason-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
.reason { display: inline-flex; align-items: center; gap: 7px; padding: 9px 11px; border-radius: 10px; cursor: pointer; font-size: 12px; font-weight: 600; text-align: left;
  background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-secondary); transition: border-color 0.2s, background 0.2s, color 0.2s; }
.reason svg { color: var(--trv-text-dim); flex-shrink: 0; transition: color 0.2s; }
.reason:hover { border-color: var(--trv-border-strong); }
.reason.on { color: var(--trv-st-rejected); border-color: color-mix(in srgb, var(--trv-st-rejected) 45%, transparent); background: var(--trv-st-rejected-soft); }
.reason.on svg { color: var(--trv-st-rejected); }
.wd-note { overflow: hidden; margin-top: 10px; }
.inp { width: 100%; padding: 9px 11px; border-radius: 9px; font-size: 13px; font-family: inherit; resize: vertical; background: rgba(0,0,0,0.3); border: 1px solid var(--trv-border); color: var(--trv-text); }
.inp:focus { outline: none; border-color: var(--trv-amber-border); }

.wd-consq { list-style: none; margin: 0 0 18px; padding: 12px 14px; border-radius: 13px; background: var(--trv-panel); border: 1px solid var(--trv-border); text-align: left; display: flex; flex-direction: column; gap: 9px; }
.wd-consq li { display: flex; align-items: flex-start; gap: 9px; font-size: 12px; line-height: 1.45; color: var(--trv-text-secondary); }
.wd-consq li svg { flex-shrink: 0; margin-top: 1px; color: var(--trv-text-dim); }
.wd-consq li.bad svg { color: var(--trv-st-rejected); }
.wd-consq li.ok svg { color: var(--trv-st-approved); }

.wd-foot { display: flex; gap: 10px; justify-content: center; }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; flex: 1; padding: 11px 18px; border-radius: 11px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
.btn.ghost { background: transparent; border-color: var(--trv-border-strong); color: var(--trv-text-secondary); }
.btn.ghost:hover { color: var(--trv-text); border-color: var(--trv-text-dim); }
.btn.danger { background: rgba(239,68,68,0.14); color: #f87171; border-color: rgba(239,68,68,0.32); }
.btn.danger:hover:not(:disabled) { background: rgba(239,68,68,0.2); }
.wd.draft .btn.danger { background: rgba(245,158,11,0.14); color: #fbbf24; border-color: rgba(245,158,11,0.34); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
.spin { animation: trv-spin-slow 0.8s linear infinite; }

[data-theme="light"] .ov { background: rgba(60,40,15,0.32); }
[data-theme="light"] .inp { background: rgba(255,250,240,0.72); }
[data-theme="light"] .btn.danger { color: #c0392b; }
[data-theme="light"] .wd.draft .btn.danger { color: #b45309; }
@media (max-width: 440px) { .reason-grid { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { .orb-ring, .spin { animation: none; } }
</style>
