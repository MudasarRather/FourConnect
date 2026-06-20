<template>
  <AssetModal :open="open" :title="`Request return · ${alloc?.asset_code || ''}`"
    subtitle="Hand this asset back — HR will arrange collection" :icon="Undo2" :width="560" @close="$emit('close')">
    <div class="sr" v-if="alloc">
      <!-- ── live summary: what you're handing back + how long you've held it ── -->
      <Motion as="div" class="sr-sum" :data-tone="tone"
        :initial="secIn" :animate="secOn" :transition="secT(0)">
        <span class="sr-sum-grid" aria-hidden="true" />
        <span v-if="!reduced" class="sr-sum-sheen" aria-hidden="true" />
        <AssetTypeBadge :type="alloc.asset_type" medallion />
        <div class="sr-sum-id">
          <span class="sr-sum-code as-mono">{{ alloc.asset_code }}</span>
          <span class="sr-sum-meta">{{ brandModel || typeLabel }} · held {{ heldDays }}</span>
        </div>
        <div class="sr-sum-due">
          <span class="sr-sum-due-num as-mono">{{ countNum }}<span v-if="tone === 'over'" class="sr-sum-alert" aria-hidden="true" /></span>
          <span class="sr-sum-due-lab">{{ countLab }}</span>
        </div>
      </Motion>

      <!-- ── signature instrument: the return journey pipeline ── -->
      <Motion as="section" class="sr-sec" :initial="secIn" :animate="secOn" :transition="secT(1)">
        <header class="sr-sec-h"><span class="sr-sec-ic"><Route :size="13" /></span> What happens next</header>
        <div class="rj" :class="{ idle: reduced }">
          <div class="rj-rail" aria-hidden="true">
            <span class="rj-rail-base" />
            <span class="rj-rail-flow" />
            <span v-if="!reduced" class="rj-packet" />
          </div>
          <div class="rj-stations">
            <div v-for="(s, i) in JOURNEY" :key="s.key" class="rj-st" :class="{ active: i === 0, next: i === 1 }"
              :style="{ '--d': `${0.15 + i * 0.1}s` }">
              <span class="rj-med"><component :is="s.icon" :size="15" /></span>
              <span class="rj-lab">{{ s.label }}</span>
              <span class="rj-sub">{{ s.sub }}</span>
            </div>
          </div>
        </div>
        <p class="rj-caption"><span class="rj-step">Step 1 of 4</span> You raise the request — it lands in HR's Returns queue and they take it from there.</p>
      </Motion>

      <!-- ── reason quick-pick ── -->
      <Motion as="section" class="sr-sec" :initial="secIn" :animate="secOn" :transition="secT(2)">
        <header class="sr-sec-h"><span class="sr-sec-ic"><Tag :size="13" /></span> Reason <span class="sr-opt">· optional</span></header>
        <div class="sr-reasons">
          <Motion v-for="r in REASONS" :key="r.key" as="button" type="button" class="sr-reason" :class="{ on: reason === r.key }"
            :data-key="r.key" :whileHover="reduced ? {} : { y: -2 }" :whileTap="{ scale: 0.95 }"
            @click="reason = reason === r.key ? '' : r.key">
            <component :is="r.icon" :size="14" /> {{ r.label }}
          </Motion>
        </div>
        <Presence>
          <Motion v-if="reason === 'faulty'" as="p" class="sr-hint"
            :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :exit="{ opacity: 0, height: 0 }" :transition="{ duration: 0.3 }">
            <ShieldAlert :size="13" /> Physically damaged? Use <b>Report damage</b> instead — you can attach photos so HR sees the condition.
          </Motion>
        </Presence>
      </Motion>

      <!-- ── note ── -->
      <Motion as="section" class="sr-sec" :initial="secIn" :animate="secOn" :transition="secT(3)">
        <header class="sr-sec-h"><span class="sr-sec-ic"><MessageSquare :size="13" /></span> Note for HR <span class="sr-opt">· optional</span></header>
        <textarea v-model="note" class="sr-textarea" rows="3" maxlength="500"
          placeholder="Where/when can it be collected, condition, anything HR should know…" />
        <span class="sr-count as-mono">{{ note.length }}/500</span>
      </Motion>
    </div>

    <template #footer>
      <button class="as-btn as-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" type="button" class="as-btn as-btn-primary" :class="{ disabled: saving }"
        :whileHover="saving ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" :disabled="saving" @click="submit">
        <Loader v-if="saving" :size="14" class="spin" /><Undo2 v-else :size="14" /> Request return
      </Motion>
    </template>
  </AssetModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  Undo2, Loader, Route, Tag, MessageSquare, ShieldAlert,
  Send, ClipboardCheck, Truck, Warehouse, PackageX, Sparkles, LogOut,
} from 'lucide-vue-next'
import AssetModal from '../components/AssetModal.vue'
import AssetTypeBadge from '../components/AssetTypeBadge.vue'
import { requestMyReturn, typeMeta, errText } from '@/composables/useAssets'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  open: { type: Boolean, default: false },
  alloc: { type: Object, default: null },
})
const emit = defineEmits(['close', 'requested'])
const toast = useToast()
const reduced = prefersReduced()
const saving = ref(false)

const today = new Date().toISOString().slice(0, 10)

// section entrance choreography (mirrors the admin ReturnModal cadence)
const secIn = { opacity: 0, y: 14 }
const secOn = { opacity: 1, y: 0 }
const secT = (i) => ({ duration: 0.42, delay: 0.06 + i * 0.07, ease: [0.16, 1, 0.3, 1] })

const JOURNEY = [
  { key: 'request', label: 'Requested', sub: 'by you', icon: Send },
  { key: 'review', label: 'HR review', sub: 'approved', icon: ClipboardCheck },
  { key: 'collect', label: 'Collected', sub: 'handed over', icon: Truck },
  { key: 'bay', label: 'Back in bay', sub: 'recovered', icon: Warehouse },
]

const REASONS = [
  { key: 'no_longer', label: 'No longer needed', icon: PackageX },
  { key: 'upgrading', label: 'Upgrading device', icon: Sparkles },
  { key: 'offboarding', label: 'Leaving / offboarding', icon: LogOut },
  { key: 'faulty', label: 'Faulty / damaged', icon: ShieldAlert },
  { key: 'other', label: 'Other', icon: MessageSquare },
]
const reason = ref('')
const note = ref('')

const typeLabel = computed(() => typeMeta(props.alloc?.asset_type).label)
const brandModel = computed(() => [props.alloc?.brand, props.alloc?.model].filter(Boolean).join(' '))

const heldDays = computed(() => {
  if (!props.alloc?.allocated_date) return '—'
  const d = Math.max(0, Math.round((new Date(today) - new Date(props.alloc.allocated_date)) / 86400000))
  if (d === 0) return 'today'
  if (d < 30) return `${d}d`
  if (d < 365) return `${Math.round(d / 30)}mo`
  return `${(d / 365).toFixed(1)}y`
})

const daysToDue = computed(() => {
  if (!props.alloc?.expected_return_date) return null
  return Math.round((new Date(props.alloc.expected_return_date) - new Date(today)) / 86400000)
})
const tone = computed(() => {
  if (daysToDue.value === null) return 'open'
  if (daysToDue.value < 0) return 'over'
  if (daysToDue.value <= 3) return 'soon'
  return 'ok'
})
const countNum = computed(() => daysToDue.value === null ? '∞' : (daysToDue.value === 0 ? '0d' : `${Math.abs(daysToDue.value)}d`))
const countLab = computed(() => {
  if (daysToDue.value === null) return 'open-ended'
  if (daysToDue.value < 0) return 'overdue'
  if (daysToDue.value === 0) return 'due today'
  return 'to return'
})

// final note = reason label (unless "Other") + free text
const composedNote = computed(() => {
  const r = REASONS.find(x => x.key === reason.value)
  const label = r && r.key !== 'other' ? r.label : ''
  const txt = note.value.trim()
  if (label && txt) return `${label} — ${txt}`
  if (label) return label
  return txt || null
})

watch(() => props.open, (o) => { if (o) { reason.value = ''; note.value = '' } })

async function submit() {
  if (!props.alloc) return
  saving.value = true
  try {
    const r = await requestMyReturn(props.alloc.id, { note: composedNote.value })
    toast.success(r?.return_requested ? 'Return requested — HR notified' : 'Return requested')
    emit('requested')
    emit('close')
  } catch (e) {
    toast.error(errText(e, 'Failed to request return'))
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.sr { display: flex; flex-direction: column; gap: 16px; }

/* ── summary ── */
.sr-sum { position: relative; overflow: hidden; display: flex; align-items: center; gap: 13px; padding: 13px 15px; border-radius: 16px;
  background: var(--as-surf-card); border: 1px solid var(--as-border-soft); box-shadow: var(--as-card-shadow); }
.sr-sum[data-tone="over"] { border-color: color-mix(in srgb, var(--as-al-lost) 30%, transparent); }
.sr-sum-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(var(--as-blueprint) 1px, transparent 1px), linear-gradient(90deg, var(--as-blueprint) 1px, transparent 1px);
  background-size: 22px 22px; mask-image: radial-gradient(120% 100% at 92% 0%, #000, transparent 72%); -webkit-mask-image: radial-gradient(120% 100% at 92% 0%, #000, transparent 72%); }
.sr-sum-sheen { position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(115deg, transparent 36%, color-mix(in srgb, var(--as-amber) 16%, transparent) 50%, transparent 64%);
  background-size: 240% 100%; animation: sr-sheen 1.2s ease-out 1 both; }
.sr-sum-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.sr-sum-code { font-size: 15px; font-weight: 850; color: var(--as-text); letter-spacing: 0.02em; }
.sr-sum-meta { font-size: 12px; font-weight: 600; color: var(--as-text-secondary); }
.sr-sum-due { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; min-width: 54px; }
.sr-sum-due-num { position: relative; font-size: 18px; font-weight: 850; line-height: 1; color: var(--as-text); }
.sr-sum-alert { position: absolute; top: -3px; right: -11px; width: 7px; height: 7px; border-radius: 50%; background: var(--as-al-lost);
  box-shadow: 0 0 0 0 color-mix(in srgb, var(--as-al-lost) 55%, transparent); animation: sr-alert 1.6s ease-in-out infinite; }
.sr-sum[data-tone="over"] .sr-sum-due-num { color: var(--as-al-lost); }
.sr-sum[data-tone="soon"] .sr-sum-due-num { color: var(--as-st-reserved); }
.sr-sum-due-lab { font-size: 9px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--as-text-dim); margin-top: 3px; }

/* ── sections ── */
.sr-sec { display: flex; flex-direction: column; gap: 10px; }
.sr-sec-h { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--as-text-dim); }
.sr-sec-ic { display: grid; place-items: center; width: 23px; height: 23px; border-radius: 7px; color: var(--as-amber);
  background: color-mix(in srgb, var(--as-amber) 12%, transparent); border: 1px solid color-mix(in srgb, var(--as-amber) 24%, transparent); }
.sr-opt { font-weight: 600; letter-spacing: 0.04em; color: var(--as-text-dim); text-transform: none; opacity: 0.8; }

/* ── return journey pipeline (signature instrument) ── */
.rj { position: relative; padding: 6px 6px 2px; }
.rj-rail { position: absolute; left: 12.5%; right: 12.5%; top: 23px; height: 3px; transform: translateY(-50%); pointer-events: none; }
.rj-rail-base { position: absolute; inset: 0; border-radius: 3px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--as-st-allocated) 50%, transparent), var(--as-border-strong) 35%, var(--as-border-soft)); }
.rj-rail-flow { position: absolute; left: 0; width: 33.34%; top: 0; bottom: 0; border-radius: 3px; overflow: hidden;
  background: linear-gradient(90deg, var(--as-amber-strong), var(--as-amber-bright)); box-shadow: 0 0 10px 0 color-mix(in srgb, var(--as-amber) 60%, transparent); }
.rj-rail-flow::after { content: ''; position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent, color-mix(in srgb, #fff 55%, transparent), transparent); background-size: 200% 100%; animation: rj-flow 1.8s linear infinite; }
.rj-packet { position: absolute; top: 50%; left: 0; width: 9px; height: 9px; margin: -4.5px 0 0 -4.5px; border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fff, var(--as-amber-bright) 65%, transparent);
  box-shadow: 0 0 10px 2px color-mix(in srgb, var(--as-amber) 70%, transparent); animation: rj-ride 2.6s cubic-bezier(0.5, 0, 0.5, 1) infinite; }

.rj-stations { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(4, 1fr); }
.rj-st { display: flex; flex-direction: column; align-items: center; gap: 5px; text-align: center;
  animation: rj-pop 0.5s cubic-bezier(0.16, 1, 0.3, 1) both; animation-delay: var(--d); }
.rj-med { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 11px; flex-shrink: 0;
  color: var(--as-text-dim); background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: all 0.3s var(--as-spring); }
.rj-st.active .rj-med { color: var(--as-amber); background: color-mix(in srgb, var(--as-amber) 16%, transparent);
  border-color: color-mix(in srgb, var(--as-amber) 45%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--as-amber) 12%, transparent); }
.rj-st.active .rj-med { animation: rj-med-pulse 2.4s ease-in-out infinite; }
.rj-st.next .rj-med { color: var(--as-text-muted); border-color: var(--as-border-strong); }
.rj-lab { font-size: 11px; font-weight: 800; color: var(--as-text-muted); }
.rj-st.active .rj-lab { color: var(--as-text); }
.rj-sub { font-size: 9px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; color: var(--as-text-dim); }
.rj-st.active .rj-sub { color: var(--as-amber); }
.rj-caption { margin: 2px 0 0; font-size: 11.5px; line-height: 1.55; color: var(--as-text-muted); }
.rj-step { display: inline-block; font-size: 10px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--as-amber);
  padding: 2px 7px; border-radius: 999px; background: color-mix(in srgb, var(--as-amber) 12%, transparent); margin-right: 6px; }

/* ── reasons ── */
.sr-reasons { display: flex; flex-wrap: wrap; gap: 8px; }
.sr-reason { display: inline-flex; align-items: center; gap: 7px; padding: 8px 13px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 12px; font-weight: 600;
  color: var(--as-text-secondary); background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: color 0.2s, background 0.2s, border-color 0.2s; }
.sr-reason:hover { border-color: var(--as-border-strong); color: var(--as-text); }
.sr-reason.on { color: var(--as-amber); background: color-mix(in srgb, var(--as-amber) 13%, transparent); border-color: color-mix(in srgb, var(--as-amber) 38%, transparent); }
.sr-reason.on[data-key="faulty"] { color: var(--as-al-damaged); background: var(--as-al-damaged-soft); border-color: color-mix(in srgb, var(--as-al-damaged) 38%, transparent); }
.sr-hint { display: flex; align-items: flex-start; gap: 7px; margin: 0; padding: 9px 11px; border-radius: 10px; overflow: hidden;
  font-size: 11.5px; line-height: 1.5; color: var(--as-text-secondary); background: var(--as-al-damaged-soft); border: 1px dashed color-mix(in srgb, var(--as-al-damaged) 30%, transparent); }
.sr-hint :deep(svg) { color: var(--as-al-damaged); flex-shrink: 0; margin-top: 1px; }
.sr-hint b { color: var(--as-text); font-weight: 700; }

/* ── note ── */
.sr-textarea { width: 100%; box-sizing: border-box; font: inherit; font-size: 13.5px; color: var(--as-text); resize: vertical; min-height: 66px;
  background: var(--as-surface); border: 1px solid var(--as-border-soft); border-radius: 11px; padding: 10px 12px; transition: border-color 0.2s, box-shadow 0.2s; }
.sr-textarea::placeholder { color: var(--as-text-dim); }
.sr-textarea:focus { outline: none; border-color: color-mix(in srgb, var(--as-amber) 55%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--as-amber) 12%, transparent); }
.sr-count { align-self: flex-end; font-size: 10px; color: var(--as-text-dim); margin-top: -4px; }

.as-btn.disabled { opacity: 0.55; cursor: not-allowed; }
.spin { animation: as-spin 0.9s linear infinite; }

@keyframes sr-sheen { from { background-position: 180% 0; } to { background-position: -50% 0; } }
@keyframes sr-alert { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--as-al-lost) 55%, transparent); } 50% { box-shadow: 0 0 0 5px color-mix(in srgb, var(--as-al-lost) 0%, transparent); } }
@keyframes rj-flow { from { background-position: 200% 0; } to { background-position: -100% 0; } }
@keyframes rj-ride { 0% { left: 0; opacity: 0; } 12% { opacity: 1; } 78% { opacity: 1; } 100% { left: 33.34%; opacity: 0; } }
@keyframes rj-pop { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes rj-med-pulse { 0%, 100% { box-shadow: 0 0 0 3px color-mix(in srgb, var(--as-amber) 12%, transparent); } 50% { box-shadow: 0 0 0 6px color-mix(in srgb, var(--as-amber) 0%, transparent); } }

@media (prefers-reduced-motion: reduce) {
  .sr-sum-sheen, .sr-sum-alert, .rj-rail-flow::after, .rj-packet, .rj-st, .rj-st.active .rj-med, .spin { animation: none; }
  .rj-packet { display: none; }
}
</style>
