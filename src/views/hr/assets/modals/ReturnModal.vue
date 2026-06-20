<template>
  <AssetModal :open="open" :title="`Return ${alloc?.asset_code || 'asset'}`"
    subtitle="Recover this asset and route it back into the lifecycle" :icon="Undo2" :width="560" @close="$emit('close')">
    <div class="ro" v-if="alloc">
      <!-- live summary: who has it + how long it's been out -->
      <Motion as="div" class="ro-summary" :data-tone="tone"
        :initial="secIn" :animate="secOn" :transition="secT(0)">
        <span class="ro-sum-grid" aria-hidden="true" />
        <span v-if="!reduced" class="ro-sum-sheen" aria-hidden="true" />
        <AssetTypeBadge :type="alloc.asset_type" medallion />
        <div class="ro-sum-id">
          <span class="ro-sum-code as-mono">{{ alloc.asset_code }}</span>
          <span class="ro-sum-holder"><span class="ro-sum-av">{{ initials(alloc.employee_name) }}</span>{{ alloc.employee_name || 'Unassigned' }}</span>
        </div>
        <div class="ro-sum-due">
          <span class="ro-sum-due-num as-mono">{{ countNum }}<span v-if="tone === 'over'" class="ro-sum-alert" aria-hidden="true" /></span>
          <span class="ro-sum-due-lab">{{ countLab }}</span>
        </div>
      </Motion>

      <!-- OUTCOME -->
      <Motion as="section" class="ro-sec" :initial="secIn" :animate="secOn" :transition="secT(1)">
        <header class="ro-sec-h"><span class="ro-sec-ic"><Flag :size="13" /></span> Outcome</header>
        <div class="ro-seg" :style="{ '--idx': outcomeIdx, '--ind-c': toneVar }">
          <span class="ro-seg-ind" aria-hidden="true" />
          <Motion v-for="o in OUTCOMES" :key="o.value" as="button" type="button" class="ro-seg-btn" :class="{ on: form.status === o.value }"
            :whileTap="{ scale: 0.94 }" @click="form.status = o.value">
            <component :is="o.icon" :size="15" /> {{ o.label }}
          </Motion>
        </div>

        <Presence>
          <Motion :key="form.status" as="div" class="ro-dest" :data-tone="dest.tone"
            :initial="{ opacity: 0, x: -6 }" :animate="{ opacity: 1, x: 0 }" :exit="{ opacity: 0, x: 6 }" :transition="{ duration: 0.28 }">
            <span class="ro-dest-lab">Asset routes to</span>
            <ArrowRight :size="14" class="ro-dest-arrow" :class="{ glide: !reduced }" />
            <span class="ro-dest-chip"><component :is="dest.icon" :size="13" /> {{ dest.label }}</span>
          </Motion>
        </Presence>
      </Motion>

      <!-- DETAILS -->
      <Motion as="section" class="ro-sec" :initial="secIn" :animate="secOn" :transition="secT(2)">
        <header class="ro-sec-h"><span class="ro-sec-ic"><ClipboardCheck :size="13" /></span> Recovery details</header>
        <div class="ro-grid2">
          <div class="ro-field">
            <span class="ro-lab">Returned date</span>
            <HrDatePicker v-model="form.returned_date" :max="today" :min="alloc.allocated_date || ''" placeholder="dd / mm / yyyy" />
          </div>
          <div class="ro-field">
            <span class="ro-lab">Condition on return</span>
            <AsSelect v-model="form.condition_on_return" :options="conditionOptions" placeholder="Select condition…" />
          </div>
        </div>

        <!-- condition delta -->
        <Presence>
          <Motion v-if="form.condition_on_return" :key="form.condition_on_return" as="div" class="ro-delta"
            :initial="{ opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0 }" :transition="{ duration: 0.3 }">
            <span class="ro-delta-chip"><span class="ro-delta-dot" :style="{ background: condDot(issuedCondition) }" />issued · {{ condLabel(issuedCondition) }}</span>
            <ArrowRight :size="13" class="ro-delta-arrow" :data-dir="condDir" />
            <span class="ro-delta-chip"><span class="ro-delta-dot" :style="{ background: condDot(form.condition_on_return) }" />return · {{ condLabel(form.condition_on_return) }}</span>
          </Motion>
        </Presence>

        <Presence>
          <Motion v-if="willOpenDamage" as="p" class="ro-warn"
            :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :exit="{ opacity: 0, height: 0 }" :transition="{ duration: 0.3 }">
            <ShieldAlert :size="14" /> A damage ticket will be opened automatically and the asset routed to maintenance.
          </Motion>
        </Presence>
      </Motion>

      <!-- NOTES -->
      <Motion as="section" class="ro-sec" :initial="secIn" :animate="secOn" :transition="secT(3)">
        <header class="ro-sec-h"><span class="ro-sec-ic"><StickyNote :size="13" /></span> Handover notes</header>
        <textarea v-model="form.notes" class="ro-textarea" rows="3" placeholder="Condition notes, accessories returned, remarks…" />
      </Motion>
    </div>

    <template #footer>
      <button class="as-btn as-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" type="button" class="as-btn as-btn-primary" :class="{ disabled: saving }"
        :whileHover="saving ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }" :disabled="saving" @click="submit">
        <Loader v-if="saving" :size="14" class="spin" /><Check v-else :size="14" /> Confirm return
      </Motion>
    </template>
  </AssetModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  Undo2, Check, Loader, Flag, ClipboardCheck, StickyNote, ArrowRight,
  PackageCheck, ShieldAlert, SearchX, Wrench, Archive,
} from 'lucide-vue-next'
import AssetModal from '../components/AssetModal.vue'
import AssetTypeBadge from '../components/AssetTypeBadge.vue'
import AsSelect from '../components/AsSelect.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import { returnAllocation, conditionMeta, errText } from '@/composables/useAssets'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  open: { type: Boolean, default: false },
  alloc: { type: Object, default: null },
})
const emit = defineEmits(['close', 'returned'])
const toast = useToast()
const saving = ref(false)
const reduced = prefersReduced()

const today = new Date().toISOString().slice(0, 10)

// section entrance choreography
const secIn = { opacity: 0, y: 14 }
const secOn = { opacity: 1, y: 0 }
const secT = (i) => ({ duration: 0.42, delay: 0.06 + i * 0.07, ease: [0.16, 1, 0.3, 1] })

const OUTCOMES = [
  { value: 'RETURNED', label: 'Returned', icon: PackageCheck },
  { value: 'DAMAGED', label: 'Damaged', icon: ShieldAlert },
  { value: 'LOST', label: 'Lost', icon: SearchX },
]
const outcomeIdx = computed(() => Math.max(0, OUTCOMES.findIndex(o => o.value === form.value.status)))
const TONE_VAR = { RETURNED: 'var(--as-al-returned)', DAMAGED: 'var(--as-al-damaged)', LOST: 'var(--as-al-lost)' }
const toneVar = computed(() => TONE_VAR[form.value.status] || TONE_VAR.RETURNED)

// where the asset goes — mirrors next_status_on_return on the backend
const DEST = {
  RETURNED: { label: 'Available bay', icon: PackageCheck, tone: 'ok' },
  DAMAGED: { label: 'Maintenance', icon: Wrench, tone: 'warn' },
  LOST: { label: 'Retired', icon: Archive, tone: 'danger' },
}
const dest = computed(() => DEST[form.value.status] || DEST.RETURNED)

const CONDITIONS = ['NEW', 'GOOD', 'FAIR', 'POOR']
const COND_DOT = { NEW: 'var(--as-cond-new)', GOOD: 'var(--as-cond-good)', FAIR: 'var(--as-cond-fair)', POOR: 'var(--as-cond-poor)', RETIRED: 'var(--as-cond-retired)' }
const conditionOptions = CONDITIONS.map(c => ({ value: c, label: conditionMeta(c).label, dot: COND_DOT[c] }))
const condDot = (c) => COND_DOT[c] || 'var(--as-steel-dim)'
const condLabel = (c) => conditionMeta(c).label
const issuedCondition = computed(() => props.alloc?.condition_on_issue || 'GOOD')
const condDir = computed(() => {
  const a = conditionMeta(issuedCondition.value).level, b = conditionMeta(form.value.condition_on_return).level
  return b < a ? 'down' : b > a ? 'up' : 'flat'
})

const willOpenDamage = computed(() => form.value.status === 'DAMAGED' || form.value.condition_on_return === 'POOR')

// out-since countdown for the summary
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

const blank = () => ({ status: 'RETURNED', returned_date: today, condition_on_return: '', notes: '' })
const form = ref(blank())
watch(() => props.open, (o) => {
  if (o) {
    form.value = blank()
    // pre-fill condition with what it went out as, so a clean return is one click
    form.value.condition_on_return = props.alloc?.condition_on_issue || ''
  }
})

const initials = (n) => (n || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

async function submit() {
  if (!props.alloc) return
  saving.value = true
  try {
    await returnAllocation(props.alloc.id, {
      returned_date: form.value.returned_date || today,
      condition_on_return: form.value.condition_on_return || null,
      status: form.value.status,
      notes: form.value.notes || null,
    })
    const msg = form.value.status === 'RETURNED' ? 'Asset recovered to the bay'
      : form.value.status === 'DAMAGED' ? 'Returned damaged — maintenance ticket opened'
      : 'Marked lost — asset retired'
    toast.success(msg)
    emit('returned')
    emit('close')
  } catch (e) {
    toast.error(errText(e, 'Failed to process return'))
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.ro { display: flex; flex-direction: column; gap: 16px; }

/* summary */
.ro-summary { position: relative; overflow: hidden; display: flex; align-items: center; gap: 13px; padding: 13px 15px; border-radius: 16px;
  background: var(--as-surf-card); border: 1px solid var(--as-border-soft); box-shadow: var(--as-card-shadow); }
.ro-summary[data-tone="over"] { border-color: color-mix(in srgb, var(--as-al-lost) 30%, transparent); }
.ro-sum-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(var(--as-blueprint) 1px, transparent 1px), linear-gradient(90deg, var(--as-blueprint) 1px, transparent 1px);
  background-size: 22px 22px; mask-image: radial-gradient(120% 100% at 92% 0%, #000, transparent 72%); -webkit-mask-image: radial-gradient(120% 100% at 92% 0%, #000, transparent 72%); }
.ro-sum-sheen { position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(115deg, transparent 36%, color-mix(in srgb, var(--as-amber) 16%, transparent) 50%, transparent 64%);
  background-size: 240% 100%; animation: ro-sum-sheen 1.2s ease-out 1 both; }
.ro-sum-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.ro-sum-code { font-size: 15px; font-weight: 850; color: var(--as-text); letter-spacing: 0.02em; }
.ro-sum-holder { display: inline-flex; align-items: center; gap: 7px; font-size: 12.5px; font-weight: 600; color: var(--as-text-secondary); }
.ro-sum-av { display: inline-grid; place-items: center; width: 21px; height: 21px; border-radius: 7px; font-size: 9.5px; font-weight: 700;
  color: var(--as-amber); background: color-mix(in srgb, var(--as-amber) 14%, transparent); }
.ro-sum-due { display: flex; flex-direction: column; align-items: center; flex-shrink: 0; min-width: 54px; }
.ro-sum-due-num { position: relative; font-size: 18px; font-weight: 850; line-height: 1; color: var(--as-text); }
.ro-sum-alert { position: absolute; top: -3px; right: -11px; width: 7px; height: 7px; border-radius: 50%; background: var(--as-al-lost);
  box-shadow: 0 0 0 0 color-mix(in srgb, var(--as-al-lost) 55%, transparent); animation: ro-alert 1.6s ease-in-out infinite; }
.ro-summary[data-tone="over"] .ro-sum-due-num { color: var(--as-al-lost); }
.ro-summary[data-tone="soon"] .ro-sum-due-num { color: var(--as-st-reserved); }
.ro-sum-due-lab { font-size: 9px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--as-text-dim); margin-top: 3px; }

/* sections */
.ro-sec { display: flex; flex-direction: column; gap: 10px; }
.ro-sec-h { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--as-text-dim); }
.ro-sec-ic { display: grid; place-items: center; width: 23px; height: 23px; border-radius: 7px; color: var(--as-amber);
  background: color-mix(in srgb, var(--as-amber) 12%, transparent); border: 1px solid color-mix(in srgb, var(--as-amber) 24%, transparent); }

/* outcome segmented control */
.ro-seg { position: relative; display: grid; grid-template-columns: repeat(3, 1fr); padding: 4px; border-radius: 13px;
  background: var(--as-surface); border: 1px solid var(--as-border-soft); }
.ro-seg-ind { position: absolute; top: 4px; bottom: 4px; left: 4px; width: calc((100% - 8px) / 3); border-radius: 10px;
  background: color-mix(in srgb, var(--ind-c) 16%, transparent); border: 1px solid color-mix(in srgb, var(--ind-c) 40%, transparent);
  transform: translateX(calc(var(--idx) * 100%)); transition: transform 0.4s var(--as-spring), background 0.3s, border-color 0.3s; }
.ro-seg-btn { position: relative; z-index: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 9px 4px; border: none; background: none;
  font: inherit; font-size: 12.5px; font-weight: 700; color: var(--as-text-muted); cursor: pointer; transition: color 0.25s; }
.ro-seg-btn.on { color: var(--ind-c); }

/* destination preview */
.ro-dest { display: inline-flex; align-items: center; gap: 9px; align-self: flex-start; padding: 7px 12px; border-radius: 999px;
  background: var(--as-surface); border: 1px solid var(--as-border-soft); }
.ro-dest-lab { font-size: 11px; font-weight: 600; color: var(--as-text-muted); }
.ro-dest-arrow { color: var(--as-text-dim); }
.ro-dest-arrow.glide { animation: ro-arrow 1.6s ease-in-out infinite; }
.ro-dest-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 700; }
.ro-dest[data-tone="ok"] .ro-dest-chip { color: var(--as-st-available); }
.ro-dest[data-tone="warn"] .ro-dest-chip { color: var(--as-st-maintenance); }
.ro-dest[data-tone="danger"] .ro-dest-chip { color: var(--as-al-lost); }

.ro-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
@media (max-width: 520px) { .ro-grid2 { grid-template-columns: 1fr; } }
.ro-field { display: flex; flex-direction: column; gap: 6px; }
.ro-lab { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--as-text-dim); }

/* condition delta */
.ro-delta { display: inline-flex; align-items: center; gap: 9px; align-self: flex-start; }
.ro-delta-chip { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 600; color: var(--as-text-secondary);
  padding: 5px 10px; border-radius: 999px; background: var(--as-surface); border: 1px solid var(--as-border-soft); }
.ro-delta-dot { width: 8px; height: 8px; border-radius: 50%; box-shadow: 0 0 6px currentColor; }
.ro-delta-arrow { color: var(--as-text-dim); }
.ro-delta-arrow[data-dir="down"] { color: var(--as-cond-poor); transform: rotate(35deg); }
.ro-delta-arrow[data-dir="up"] { color: var(--as-cond-new); transform: rotate(-35deg); }

.ro-warn { display: flex; align-items: center; gap: 7px; margin: 0; font-size: 12px; font-weight: 600; color: var(--as-al-damaged); overflow: hidden; }

.ro-textarea { width: 100%; box-sizing: border-box; font: inherit; font-size: 13.5px; color: var(--as-text); resize: vertical; min-height: 66px;
  background: var(--as-surface); border: 1px solid var(--as-border-soft); border-radius: 11px; padding: 10px 12px; transition: border-color 0.2s, box-shadow 0.2s; }
.ro-textarea::placeholder { color: var(--as-text-dim); }
.ro-textarea:focus { outline: none; border-color: color-mix(in srgb, var(--as-amber) 55%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--as-amber) 12%, transparent); }

.as-btn.disabled { opacity: 0.55; cursor: not-allowed; }
.spin { animation: as-spin 0.9s linear infinite; }

@keyframes ro-sum-sheen { from { background-position: 180% 0; } to { background-position: -50% 0; } }
@keyframes ro-alert { 0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--as-al-lost) 55%, transparent); } 50% { box-shadow: 0 0 0 5px color-mix(in srgb, var(--as-al-lost) 0%, transparent); } }
@keyframes ro-arrow { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(3px); } }
@media (prefers-reduced-motion: reduce) {
  .ro-seg-ind { transition: none; } .spin { animation: none; }
  .ro-sum-sheen, .ro-sum-alert, .ro-dest-arrow.glide { animation: none; }
}
</style>
