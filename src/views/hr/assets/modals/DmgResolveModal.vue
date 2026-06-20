<template>
  <AssetModal :open="open" :title="writeOff ? 'Write off asset' : 'Resolve incident'"
    :subtitle="writeOff ? 'Close the ticket and retire the asset for good' : 'Confirm the repair and clear the asset back to service'"
    :icon="writeOff ? Archive : ShieldCheck" :width="480" @close="$emit('close')">
    <div class="rs" v-if="ticket" :data-mode="writeOff ? 'off' : 'ok'">
      <!-- ticket summary -->
      <Motion as="div" class="rs-sum" :initial="secIn" :animate="secOn" :transition="secT(0)">
        <span v-if="!reduced" class="rs-sum-sheen" aria-hidden="true" />
        <span class="rs-sum-medal"><component :is="sev.icon" :size="16" /></span>
        <div class="rs-sum-id">
          <span class="rs-sum-code as-mono">{{ ticket.asset_code }}</span>
          <span class="rs-sum-meta">{{ ticket.title || ticket.description }}</span>
        </div>
        <AsStamp :value="ticket.severity" />
      </Motion>

      <!-- outcome routing -->
      <Motion as="div" class="rs-dest" :initial="secIn" :animate="secOn" :transition="secT(1)">
        <span class="rs-dest-lab">Asset routes to</span>
        <ArrowRight :size="14" class="rs-dest-arrow" :class="{ glide: !reduced }" />
        <span class="rs-dest-chip"><component :is="dest.icon" :size="13" /> {{ dest.label }}</span>
      </Motion>

      <!-- write-off danger banner -->
      <Presence>
        <Motion v-if="writeOff" as="div" class="rs-warn"
          :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :exit="{ opacity: 0, height: 0 }" :transition="{ duration: 0.32 }">
          <span class="rs-warn-ic"><TriangleAlert :size="15" /><span v-if="!reduced" class="rs-warn-pulse" /></span>
          <span>This permanently <b>RETIRES</b> the asset and unassigns its holder. This can't be undone.</span>
        </Motion>
      </Presence>

      <!-- resolution notes -->
      <Motion as="section" class="rs-sec" :initial="secIn" :animate="secOn" :transition="secT(2)">
        <header class="rs-sec-h"><span class="rs-sec-ic"><MessageSquareText :size="13" /></span> {{ writeOff ? 'Write-off note' : 'Resolution notes' }}</header>
        <textarea v-model="notes" class="rs-textarea" rows="3"
          :placeholder="writeOff ? 'Reason for write-off, salvage details…' : 'What was repaired / replaced, parts, cost…'" />
      </Motion>
    </div>

    <template #footer>
      <button class="as-btn as-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" type="button" class="as-btn" :class="[writeOff ? 'as-btn-danger' : 'rs-confirm-ok', { disabled: saving }]"
        :whileHover="saving ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.96 }" :disabled="saving" @click="submit">
        <Loader v-if="saving" :size="14" class="spin" /><component v-else :is="writeOff ? Archive : ShieldCheck" :size="14" />
        {{ writeOff ? 'Write off' : 'Resolve incident' }}
      </Motion>
    </template>
  </AssetModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import { ShieldCheck, Archive, ArrowRight, TriangleAlert, MessageSquareText, Loader, PackageCheck, Wrench } from 'lucide-vue-next'
import AssetModal from '../components/AssetModal.vue'
import AsStamp from '../components/AsStamp.vue'
import { damageAction, errText } from '@/composables/useAssets'
import { sevMeta } from '../components/dmgMeta.js'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  open: { type: Boolean, default: false },
  ticket: { type: Object, default: null },
  writeOff: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'done'])
const toast = useToast()
const reduced = prefersReduced()

const saving = ref(false)
const notes = ref('')
watch(() => props.open, (o) => { if (o) notes.value = '' })

const secIn = { opacity: 0, y: 12 }
const secOn = { opacity: 1, y: 0 }
const secT = (i) => ({ duration: 0.4, delay: 0.05 + i * 0.07, ease: [0.16, 1, 0.3, 1] })

const sev = computed(() => sevMeta(props.ticket?.severity))
const dest = computed(() => props.writeOff
  ? { label: 'Retired', icon: Archive }
  : { label: 'Back to service', icon: PackageCheck })

async function submit() {
  if (!props.ticket) return
  saving.value = true
  try {
    await damageAction(props.ticket.id, 'resolve', { resolution_notes: notes.value || null, write_off: props.writeOff })
    toast.success(props.writeOff ? 'Asset written off & retired' : 'Incident resolved')
    emit('done')
    emit('close')
  } catch (e) {
    toast.error(errText(e, 'Failed to close incident'))
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.rs { display: flex; flex-direction: column; gap: 14px; --acc: var(--as-st-available); }
.rs[data-mode="off"] { --acc: var(--as-al-lost); }

.rs-sum { position: relative; overflow: hidden; display: flex; align-items: center; gap: 12px; padding: 13px 15px; border-radius: 15px;
  background: var(--as-surf-card); border: 1px solid var(--as-border-soft); box-shadow: var(--as-card-shadow); }
.rs-sum-sheen { position: absolute; inset: 0; pointer-events: none; background: linear-gradient(115deg, transparent 36%, color-mix(in srgb, var(--acc) 16%, transparent) 50%, transparent 64%); background-size: 240% 100%; animation: rs-sheen 1.2s ease-out 1 both; }
.rs-sum-medal { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 11px; flex-shrink: 0; color: var(--c, var(--as-al-damaged));
  background: color-mix(in srgb, var(--as-al-damaged) 14%, transparent); border: 1px solid color-mix(in srgb, var(--as-al-damaged) 32%, transparent); }
.rs-sum-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.rs-sum-code { font-size: 14px; font-weight: 850; color: var(--as-text); }
.rs-sum-meta { font-size: 12px; color: var(--as-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.rs-dest { display: inline-flex; align-items: center; gap: 9px; align-self: flex-start; padding: 7px 12px; border-radius: 999px; background: var(--as-surface); border: 1px solid var(--as-border-soft); }
.rs-dest-lab { font-size: 11px; font-weight: 600; color: var(--as-text-muted); }
.rs-dest-arrow { color: var(--as-text-dim); }
.rs-dest-arrow.glide { animation: rs-arrow 1.6s ease-in-out infinite; }
.rs-dest-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 700; color: var(--acc); }

.rs-warn { display: flex; align-items: center; gap: 10px; overflow: hidden; padding: 11px 13px; border-radius: 13px; font-size: 12.5px; line-height: 1.5; color: var(--as-text-secondary);
  background: color-mix(in srgb, var(--as-al-lost) 9%, transparent); border: 1px solid color-mix(in srgb, var(--as-al-lost) 30%, transparent); }
.rs-warn b { color: var(--as-al-lost); }
.rs-warn-ic { position: relative; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0; color: var(--as-al-lost); background: color-mix(in srgb, var(--as-al-lost) 14%, transparent); }
.rs-warn-pulse { position: absolute; inset: -3px; border-radius: 12px; border: 1.5px solid color-mix(in srgb, var(--as-al-lost) 50%, transparent); animation: rs-pulse 1.8s ease-out infinite; }

.rs-sec { display: flex; flex-direction: column; gap: 8px; }
.rs-sec-h { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--as-text-dim); }
.rs-sec-ic { display: grid; place-items: center; width: 23px; height: 23px; border-radius: 7px; color: var(--acc); background: color-mix(in srgb, var(--acc) 13%, transparent); border: 1px solid color-mix(in srgb, var(--acc) 26%, transparent); }
.rs-textarea { width: 100%; box-sizing: border-box; font: inherit; font-size: 13.5px; color: var(--as-text); resize: vertical; min-height: 66px; line-height: 1.5;
  background: var(--as-surface); border: 1px solid var(--as-border-soft); border-radius: 11px; padding: 10px 12px; transition: border-color 0.2s, box-shadow 0.2s; }
.rs-textarea::placeholder { color: var(--as-text-dim); }
.rs-textarea:focus { outline: none; border-color: color-mix(in srgb, var(--acc) 50%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--acc) 12%, transparent); }

.rs-confirm-ok { color: #08130d; background: linear-gradient(135deg, #34d399, #059669); border: none; box-shadow: 0 8px 22px -10px color-mix(in srgb, var(--as-st-available) 70%, transparent); }
.rs-confirm-ok:hover { box-shadow: 0 12px 28px -10px color-mix(in srgb, var(--as-st-available) 80%, transparent); }
[data-theme="light"] .rs-confirm-ok { color: #052e1c; }
.as-btn.disabled { opacity: 0.55; cursor: not-allowed; }
.spin { animation: as-spin 0.9s linear infinite; }

@keyframes rs-sheen { from { background-position: 180% 0; } to { background-position: -50% 0; } }
@keyframes rs-arrow { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(3px); } }
@keyframes rs-pulse { 0% { transform: scale(1); opacity: 0.7; } 100% { transform: scale(1.5); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .rs-sum-sheen, .rs-dest-arrow.glide, .rs-warn-pulse, .spin { animation: none; } }
</style>
