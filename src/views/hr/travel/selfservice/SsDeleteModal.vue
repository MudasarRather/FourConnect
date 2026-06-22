<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" as="div" class="ov" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.22 }" @click.self="$emit('close')">
        <Motion as="div" class="dl" :initial="{ opacity: 0, y: 20, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 12 }" :transition="{ duration: 0.38, ease: [0.16,1,0.3,1] }">
          <span class="dl-aura" aria-hidden="true" />
          <button class="dl-x" @click="$emit('close')"><X :size="17" /></button>

          <!-- shredding trash orb -->
          <div class="dl-orb">
            <span v-if="!reduced" class="orb-ring" aria-hidden="true" />
            <span class="orb-core"><Trash2 :size="23" /></span>
            <template v-if="!reduced">
              <i v-for="n in 5" :key="n" class="shred" :style="{ '--n': n, left: (12 + n * 8) + 'px' }" aria-hidden="true" />
            </template>
          </div>

          <span class="dl-eyebrow trv-mono">{{ copy.eyebrow }}</span>
          <h3>{{ copy.title }}</h3>
          <p class="dl-sub"><b class="trv-mono">{{ trip?.travel_reference_number }}</b> {{ copy.sub }}</p>

          <!-- reason workflow -->
          <div class="dl-reasons">
            <label class="dl-lab">Why are you deleting it? <span class="req">*</span></label>
            <div class="reason-grid">
              <Motion v-for="r in REASONS" :key="r.key" as="button" class="reason" :class="{ on: selected === r.key }"
                :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="selected = r.key">
                <component :is="r.icon" :size="14" /><span>{{ r.key }}</span>
              </Motion>
            </div>
            <Presence>
              <Motion v-if="selected" as="div" class="dl-note" :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :exit="{ opacity: 0, height: 0 }" :transition="{ duration: 0.3 }">
                <label class="dl-lab">{{ selected === 'Other' ? 'Tell us more' : 'Add a note' }} <span v-if="selected === 'Other'" class="req">*</span><em v-else>(optional)</em></label>
                <textarea v-model="note" class="inp" rows="2" :placeholder="selected === 'Other' ? 'Briefly explain why…' : 'Anything worth recording…'" />
              </Motion>
            </Presence>
          </div>

          <!-- consequence ledger -->
          <ul class="dl-consq">
            <li v-for="(c, i) in copy.consequences" :key="i" :class="c.tone"><component :is="c.icon" :size="14" /><span>{{ c.text }}</span></li>
          </ul>

          <div class="dl-foot">
            <button class="btn ghost" @click="$emit('close')">Keep it</button>
            <Motion as="button" class="btn danger" :disabled="!valid || busy" :whileHover="(valid && !busy) ? { y: -2 } : {}" :whileTap="(valid && !busy) ? { scale: 0.97 } : {}" @click="confirm">
              <Loader2 v-if="busy" :size="15" class="spin" /><Trash2 v-else :size="14" /> {{ copy.cta }}
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
import { X, Trash2, Loader2, Eraser, Copy, CalendarX, PenLine, ListX, SquarePen, BellOff, Sparkles, Undo2, ShieldX, Archive } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { errText, deleteMyRequest } from '@/composables/useTravel'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({ open: Boolean, trip: { type: Object, default: null } })
const emit = defineEmits(['close', 'saved'])
const toast = useToast()
const reduced = prefersReduced()

// Copy adapts to the trip's state: a draft is a clean delete, a live (pending/
// returned) request is withdrawn + removed (audited), a closed one is list cleanup.
const copy = computed(() => {
  const s = props.trip?.status
  if (s === 'PENDING_APPROVAL' || s === 'RETURNED') return {
    eyebrow: 'DELETE REQUEST', title: 'Delete this request?', cta: 'Delete request',
    sub: 'is in your approval chain. Deleting withdraws it from your approvers and removes it from your trips.',
    consequences: [
      { tone: 'bad', icon: ShieldX, text: 'It’s withdrawn from your approval chain and removed from your trips.' },
      { tone: '', icon: Archive, text: 'The cancellation is recorded in the audit log — nothing is hidden.' },
      { tone: 'ok', icon: Sparkles, text: 'You can raise a fresh travel request anytime.' },
    ],
  }
  if (s === 'REJECTED' || s === 'CANCELLED') return {
    eyebrow: 'DELETE TRIP', title: 'Delete this trip?', cta: 'Delete trip',
    sub: `is closed (${(s || '').toLowerCase()}). Deleting removes it from your trips.`,
    consequences: [
      { tone: 'bad', icon: Trash2, text: 'It’s removed from your trips list for good.' },
      { tone: '', icon: Archive, text: 'The record stays in the audit log for compliance.' },
      { tone: 'ok', icon: Sparkles, text: 'You can raise a fresh travel request anytime.' },
    ],
  }
  return {  // DRAFT
    eyebrow: 'DELETE DRAFT', title: 'Delete this draft?', cta: 'Delete draft',
    sub: 'was never submitted for approval. Deleting removes it for good.',
    consequences: [
      { tone: 'bad', icon: Trash2, text: 'This draft is permanently deleted — it can’t be recovered.' },
      { tone: '', icon: BellOff, text: 'It never reached approvers, so no one is notified.' },
      { tone: 'ok', icon: Sparkles, text: 'You can raise a fresh travel request anytime.' },
    ],
  }
})

const REASONS = [
  { key: 'Created by mistake', icon: Eraser },
  { key: 'Duplicate request', icon: Copy },
  { key: 'Plans changed', icon: CalendarX },
  { key: 'Wrong details', icon: PenLine },
  { key: 'No longer needed', icon: ListX },
  { key: 'Other', icon: SquarePen },
]

const selected = ref('')
const note = ref('')
const busy = ref(false)

const valid = computed(() => !!selected.value && (selected.value !== 'Other' || note.value.trim().length >= 3))
const finalReason = () => {
  if (selected.value === 'Other') return note.value.trim()
  const extra = note.value.trim()
  return extra ? `${selected.value} — ${extra}` : selected.value
}

watch(() => props.open, (v) => { if (v) { selected.value = ''; note.value = '' } })

const confirm = async () => {
  if (!props.trip || !valid.value) return
  busy.value = true
  try {
    await deleteMyRequest(props.trip.id, finalReason())   // remove=true → soft-deletes (cancels live ones first)
    toast.success('Trip deleted'); emit('saved'); emit('close')
  } catch (e) { toast.error(errText(e, 'Could not delete trip')) } finally { busy.value = false }
}
</script>

<style scoped>
.ov { position: fixed; inset: 0; z-index: 1470; display: grid; place-items: center; padding: 18px; background: rgba(6,5,4,0.64); backdrop-filter: blur(9px); }
.dl { position: relative; width: min(460px, 96vw); max-height: 94vh; overflow-y: auto; padding: 26px 24px 22px; border-radius: 22px; background: var(--trv-surface-elevated); border: 1px solid var(--trv-border-strong); box-shadow: var(--trv-shadow); text-align: center; }
.dl-aura { position: absolute; inset: -30% 20% 60% 20%; pointer-events: none; background: radial-gradient(60% 70% at 50% 0%, rgba(239,68,68,0.18), transparent 70%); }
.dl-x { position: absolute; top: 14px; right: 14px; background: var(--trv-panel); border: 1px solid var(--trv-border); border-radius: 9px; padding: 6px; color: var(--trv-text-dim); cursor: pointer; z-index: 2; }
.dl-x:hover { color: var(--trv-text); }

.dl-orb { position: relative; width: 64px; height: 64px; margin: 4px auto 14px; }
.orb-ring { position: absolute; inset: 0; border-radius: 50%; border: 1.5px solid var(--trv-st-rejected); opacity: 0; animation: orb-pulse 2.2s ease-out infinite; }
@keyframes orb-pulse { 0% { transform: scale(0.7); opacity: 0.6; } 100% { transform: scale(1.5); opacity: 0; } }
.orb-core { position: absolute; inset: 8px; display: grid; place-items: center; border-radius: 50%; color: var(--trv-st-rejected); background: var(--trv-st-rejected-soft); border: 1px solid color-mix(in srgb, var(--trv-st-rejected) 32%, transparent); z-index: 1; }
.shred { position: absolute; top: 46px; width: 2px; height: 7px; border-radius: 1px; background: var(--trv-st-rejected); opacity: 0; animation: shred-fall 1.8s ease-in infinite; animation-delay: calc(var(--n) * 0.18s); }
@keyframes shred-fall { 0% { transform: translateY(0) scaleY(1); opacity: 0.7; } 100% { transform: translateY(16px) scaleY(0.2); opacity: 0; } }

.dl-eyebrow { font-size: 9.5px; letter-spacing: 0.16em; color: var(--trv-text-dim); }
.dl h3 { font-size: 18px; font-weight: 850; margin: 5px 0 7px; color: var(--trv-text); }
.dl-sub { font-size: 12.5px; color: var(--trv-text-secondary); margin: 0 0 16px; line-height: 1.55; }
.dl-sub b { color: var(--trv-amber-bright); font-weight: 700; }

.dl-reasons { text-align: left; margin-bottom: 16px; }
.dl-lab { display: block; font-size: 11px; font-weight: 700; color: var(--trv-text-muted); margin-bottom: 8px; }
.dl-lab em { color: var(--trv-text-dim); font-style: normal; font-weight: 500; }
.req { color: var(--trv-st-rejected); }
.reason-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
.reason { display: inline-flex; align-items: center; gap: 7px; padding: 9px 11px; border-radius: 10px; cursor: pointer; font-size: 12px; font-weight: 600; text-align: left;
  background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-secondary); transition: border-color 0.2s, background 0.2s, color 0.2s; }
.reason svg { color: var(--trv-text-dim); flex-shrink: 0; transition: color 0.2s; }
.reason:hover { border-color: var(--trv-border-strong); }
.reason.on { color: var(--trv-st-rejected); border-color: color-mix(in srgb, var(--trv-st-rejected) 45%, transparent); background: var(--trv-st-rejected-soft); }
.reason.on svg { color: var(--trv-st-rejected); }
.dl-note { overflow: hidden; margin-top: 10px; }
.inp { width: 100%; padding: 9px 11px; border-radius: 9px; font-size: 13px; font-family: inherit; resize: vertical; background: rgba(0,0,0,0.3); border: 1px solid var(--trv-border); color: var(--trv-text); }
.inp:focus { outline: none; border-color: var(--trv-amber-border); }

.dl-consq { list-style: none; margin: 0 0 18px; padding: 12px 14px; border-radius: 13px; background: var(--trv-panel); border: 1px solid var(--trv-border); text-align: left; display: flex; flex-direction: column; gap: 9px; }
.dl-consq li { display: flex; align-items: flex-start; gap: 9px; font-size: 12px; line-height: 1.45; color: var(--trv-text-secondary); }
.dl-consq li svg { flex-shrink: 0; margin-top: 1px; color: var(--trv-text-dim); }
.dl-consq li.bad svg { color: var(--trv-st-rejected); }
.dl-consq li.ok svg { color: var(--trv-st-approved); }

.dl-foot { display: flex; gap: 10px; justify-content: center; }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; flex: 1; padding: 11px 18px; border-radius: 11px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
.btn.ghost { background: transparent; border-color: var(--trv-border-strong); color: var(--trv-text-secondary); }
.btn.ghost:hover { color: var(--trv-text); border-color: var(--trv-text-dim); }
.btn.danger { background: rgba(239,68,68,0.14); color: #f87171; border-color: rgba(239,68,68,0.32); }
.btn.danger:hover:not(:disabled) { background: rgba(239,68,68,0.2); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }
.spin { animation: trv-spin-slow 0.8s linear infinite; }

[data-theme="light"] .ov { background: rgba(60,40,15,0.32); }
[data-theme="light"] .inp { background: rgba(255,250,240,0.72); }
[data-theme="light"] .btn.danger { color: #c0392b; }
@media (max-width: 440px) { .reason-grid { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { .orb-ring, .shred, .spin { animation: none; } }
</style>
