<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" as="div" class="rac-ov" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.24 }" @click.self="!busy && $emit('close')">
        <Motion as="div" class="rac" :class="`tone-${cfg.tone}`" :initial="{ opacity: 0, y: 26, scale: 0.96 }"
          :animate="{ opacity: 1, y: 0, scale: 1 }" :exit="{ opacity: 0, y: 16, scale: 0.97 }"
          :transition="{ duration: 0.42, ease: [0.16,1,0.3,1] }">
          <span class="rac-aura" aria-hidden="true" />
          <span class="rac-grid" aria-hidden="true" />

          <!-- header -->
          <header class="rac-head" :style="fT(0)">
            <span class="rac-medal"><span class="medal-ring" aria-hidden="true" /><component :is="cfg.icon" :size="22" /></span>
            <div class="rac-htext">
              <span class="rac-eyebrow"><AlertTriangle :size="11" /> {{ mode === 'delete' ? 'Irreversible action' : 'Confirm cancellation' }}</span>
              <h3>{{ cfg.title }}</h3>
            </div>
            <button class="rac-x" :disabled="busy" @click="$emit('close')"><X :size="18" /></button>
          </header>

          <!-- request chip -->
          <div v-if="req" class="rac-chip" :style="fT(1)">
            <span class="chip-spine" />
            <div class="chip-route">
              <span class="chip-ref trv-mono">{{ req.travel_reference_number }}</span>
              <span class="chip-path trv-mono">{{ code(req.from_location) }} <Plane :size="11" /> {{ code(req.to_location) }}</span>
            </div>
            <div class="chip-meta">
              <span>{{ req.employee_name || 'Traveller' }}</span>
              <TrvStatusPill :status="req.status" />
            </div>
          </div>

          <p class="rac-sub" :style="fT(2)">{{ cfg.sub }}</p>

          <!-- consequences -->
          <ul class="rac-cons">
            <li v-for="(c, i) in cfg.consequences" :key="i" :style="fT(3 + i * 0.5)">
              <component :is="c.icon" :size="14" /> {{ c.text }}
            </li>
          </ul>

          <!-- reason workflow -->
          <div class="rac-reason" :style="fT(6)">
            <label class="rac-label">{{ mode === 'delete' ? 'Why are you deleting it?' : 'Reason for cancellation' }} <span class="req">*</span></label>
            <div class="rac-chips">
              <Motion v-for="r in cfg.reasons" :key="r" as="button" type="button" class="rchip" :class="{ on: reason === r }"
                :whileHover="{ y: -2 }" :whileTap="{ scale: 0.95 }" @click="reason = r">{{ r }}</Motion>
            </div>
            <Presence>
              <Motion v-if="isOther" as="div" :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }"
                :exit="{ opacity: 0, height: 0 }" :transition="{ duration: 0.3, ease: [0.16,1,0.3,1] }" style="overflow:hidden">
                <textarea v-model="note" class="rac-note" rows="2" placeholder="Describe the reason…" />
              </Motion>
            </Presence>
          </div>

          <!-- irreversible type-to-confirm gate (delete only) -->
          <Presence>
            <Motion v-if="cfg.needsTyped && req" as="div" class="rac-gate" :style="fT(7)"
              :initial="{ opacity: 0 }" :animate="{ opacity: 1 }">
              <label class="rac-label">Type <b class="trv-mono">{{ req.travel_reference_number }}</b> to confirm</label>
              <input v-model="typed" class="rac-typed trv-mono" :class="{ ok: typedOk }" :placeholder="req.travel_reference_number" />
              <Check v-if="typedOk" :size="15" class="typed-tick" />
            </Motion>
          </Presence>

          <!-- footer -->
          <footer class="rac-foot" :style="fT(8)">
            <button class="btn ghost" :disabled="busy" @click="$emit('close')">Keep request</button>
            <Motion as="button" class="btn danger" :disabled="!canConfirm || busy"
              :whileHover="(canConfirm && !busy) ? { y: -2 } : {}" :whileTap="(canConfirm && !busy) ? { scale: 0.97 } : {}" @click="submit">
              <span class="btn-sheen" aria-hidden="true" />
              <Loader2 v-if="busy" :size="15" class="spin" /><component v-else :is="cfg.icon" :size="15" />
              {{ cfg.confirmLabel }}
            </Motion>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { X, Ban, Trash2, AlertTriangle, Plane, Check, Loader2, Users, Ticket, History, Undo2, Info } from 'lucide-vue-next'
import TrvStatusPill from '../components/TrvStatusPill.vue'
import { airportCode } from '@/composables/useTravel'

const props = defineProps({
  open: { type: Boolean, default: false },
  mode: { type: String, default: 'cancel' },   // 'cancel' | 'delete'
  req: { type: Object, default: null },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'confirm'])

const MODES = {
  cancel: {
    icon: Ban, tone: 'warn',
    title: 'Cancel this travel request?',
    sub: 'The trip won’t proceed. It leaves the approval queue and the traveller is notified — but the record is kept for audit.',
    confirmLabel: 'Cancel request',
    reasons: ['Trip postponed', 'Plans changed', 'Budget not cleared', 'Duplicate request', 'Travelling differently', 'Other'],
    consequences: [
      { icon: Users, text: 'The traveller is notified of the cancellation' },
      { icon: Undo2, text: 'Removed from the approval queue' },
      { icon: Ticket, text: 'Linked bookings & advances stay on record; the tour stops' },
      { icon: History, text: 'Logged with your reason in the audit trail' },
    ],
    needsTyped: false,
  },
  delete: {
    icon: Trash2, tone: 'danger',
    title: 'Delete this request permanently?',
    sub: 'This erases the request and its timeline from the workspace. It cannot be undone.',
    confirmLabel: 'Delete permanently',
    reasons: ['Created by mistake', 'Test / duplicate entry', 'Superseded by another request', 'Spam / invalid', 'Other'],
    consequences: [
      { icon: Trash2, text: 'Permanently removes the request and its timeline' },
      { icon: AlertTriangle, text: 'This action cannot be undone' },
      { icon: Info, text: 'Any linked references are detached' },
      { icon: History, text: 'Logged with your reason in the audit trail' },
    ],
    needsTyped: true,
  },
}
const cfg = computed(() => MODES[props.mode] || MODES.cancel)

const reason = ref('')
const note = ref('')
const typed = ref('')
const isOther = computed(() => reason.value === 'Other')
const typedOk = computed(() => !cfg.value.needsTyped || (props.req && typed.value.trim().toUpperCase() === String(props.req.travel_reference_number || '').toUpperCase()))
const resolvedReason = computed(() => (isOther.value ? note.value.trim() : reason.value))
const canConfirm = computed(() => !!resolvedReason.value && typedOk.value)

const code = (l) => airportCode(l)
const fT = (i) => ({ animation: `trv-fade-up 0.42s ${0.05 + i * 0.06}s var(--trv-spring) backwards` })

watch(() => props.open, (o) => { if (o) { reason.value = ''; note.value = ''; typed.value = '' } })

const submit = () => { if (!canConfirm.value || props.busy) return; emit('confirm', resolvedReason.value) }
</script>

<style scoped>
.rac-ov { position: fixed; inset: 0; z-index: 1480; display: grid; place-items: center; padding: 18px; background: rgba(6,5,4,0.66); backdrop-filter: blur(10px); }
.rac { position: relative; width: min(480px, 96vw); max-height: 94vh; overflow-y: auto; padding: 24px; border-radius: 24px; background: var(--trv-surface-elevated); border: 1px solid var(--trv-border-strong); box-shadow: var(--trv-shadow); --tc: var(--trv-st-returned); }
.rac.tone-danger { --tc: var(--trv-st-rejected); }
.rac.tone-warn { --tc: var(--trv-st-returned); }
.rac-aura { position: absolute; inset: -40% 30% 60% -10%; pointer-events: none; background: radial-gradient(55% 70% at 30% 0%, color-mix(in srgb, var(--tc) 22%, transparent), transparent 70%); animation: trv-aura-drift 9s ease-in-out infinite; }
.rac-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.4; border-radius: inherit; background-image: linear-gradient(var(--trv-border) 1px, transparent 1px), linear-gradient(90deg, var(--trv-border) 1px, transparent 1px); background-size: 30px 30px; mask-image: radial-gradient(70% 60% at 80% 10%, #000, transparent 70%); }

.rac-head { position: relative; display: flex; align-items: flex-start; gap: 13px; margin-bottom: 16px; }
.rac-medal { position: relative; display: grid; place-items: center; width: 46px; height: 46px; border-radius: 14px; flex-shrink: 0; color: var(--tc); background: color-mix(in srgb, var(--tc) 14%, transparent); border: 1px solid color-mix(in srgb, var(--tc) 32%, transparent); }
.medal-ring { position: absolute; inset: -4px; border-radius: 16px; border: 1.5px solid var(--tc); opacity: 0; animation: rac-pulse 2.4s ease-out infinite; }
@keyframes rac-pulse { 0% { opacity: 0.5; transform: scale(0.92); } 70% { opacity: 0; transform: scale(1.12); } 100% { opacity: 0; } }
.rac-htext { flex: 1; min-width: 0; padding-top: 1px; }
.rac-eyebrow { display: inline-flex; align-items: center; gap: 5px; font-size: 9.5px; font-weight: 750; letter-spacing: 0.12em; text-transform: uppercase; color: var(--tc); }
.rac-head h3 { font-size: 17px; font-weight: 850; margin: 4px 0 0; color: var(--trv-text); line-height: 1.25; }
.rac-x { background: var(--trv-panel); border: 1px solid var(--trv-border); border-radius: 9px; padding: 6px; color: var(--trv-text-dim); cursor: pointer; flex-shrink: 0; }
.rac-x:hover:not(:disabled) { color: var(--trv-text); }
.rac-x:disabled { opacity: 0.4; cursor: not-allowed; }

.rac-chip { position: relative; display: flex; flex-direction: column; gap: 8px; padding: 12px 14px 12px 16px; border-radius: 14px; background: var(--trv-panel); border: 1px solid var(--trv-border); margin-bottom: 14px; overflow: hidden; }
.chip-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: var(--tc); }
.chip-route { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.chip-ref { font-size: 13px; font-weight: 800; color: var(--trv-amber-bright); }
.chip-path { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 700; color: var(--trv-text-secondary); }
.chip-path svg { color: var(--trv-amber); }
.chip-meta { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.chip-meta > span { font-size: 11.5px; color: var(--trv-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.rac-sub { position: relative; font-size: 12.5px; color: var(--trv-text-secondary); line-height: 1.55; margin: 0 0 14px; }
.rac-cons { position: relative; list-style: none; margin: 0 0 16px; padding: 0; display: flex; flex-direction: column; gap: 9px; }
.rac-cons li { display: flex; align-items: center; gap: 9px; font-size: 12px; color: var(--trv-text-secondary); }
.rac-cons li svg { color: var(--tc); flex-shrink: 0; }

.rac-label { display: block; font-size: 11px; font-weight: 700; color: var(--trv-text-muted); margin-bottom: 8px; }
.rac-label b { color: var(--tc); }
.req { color: var(--trv-ember); }
.rac-reason { position: relative; margin-bottom: 14px; }
.rac-chips { display: flex; flex-wrap: wrap; gap: 7px; }
.rchip { padding: 7px 12px; border-radius: 999px; font-size: 12px; font-weight: 600; cursor: pointer; color: var(--trv-text-muted); background: var(--trv-panel); border: 1px solid var(--trv-border); transition: color 0.2s, border-color 0.2s, background 0.2s; }
.rchip:hover { color: var(--trv-text-secondary); }
.rchip.on { color: var(--tc); border-color: color-mix(in srgb, var(--tc) 45%, transparent); background: color-mix(in srgb, var(--tc) 13%, transparent); }
.rac-note { width: 100%; margin-top: 9px; padding: 9px 11px; border-radius: 10px; font-size: 13px; font-family: inherit; resize: vertical; background: rgba(0,0,0,0.3); border: 1px solid var(--trv-border); color: var(--trv-text); }
.rac-note:focus { outline: none; border-color: color-mix(in srgb, var(--tc) 45%, transparent); }

.rac-gate { position: relative; margin-bottom: 16px; }
.rac-typed { width: 100%; padding: 10px 12px; border-radius: 10px; font-size: 14px; font-weight: 700; letter-spacing: 0.04em; background: rgba(0,0,0,0.3); border: 1px solid var(--trv-border); color: var(--trv-text); transition: border-color 0.2s, box-shadow 0.2s; }
.rac-typed:focus { outline: none; border-color: color-mix(in srgb, var(--tc) 50%, transparent); }
.rac-typed.ok { border-color: var(--trv-st-approved); box-shadow: 0 0 0 3px rgba(52,211,153,0.12); }
.typed-tick { position: absolute; right: 12px; bottom: 11px; color: var(--trv-st-approved); }

.rac-foot { position: relative; display: flex; justify-content: flex-end; gap: 10px; }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 17px; border-radius: 11px; font-size: 13px; font-weight: 750; cursor: pointer; border: 1px solid transparent; position: relative; overflow: hidden; }
.btn.ghost { background: transparent; border-color: var(--trv-border-strong); color: var(--trv-text-secondary); }
.btn.ghost:hover:not(:disabled) { color: var(--trv-text); }
.btn.danger { background: color-mix(in srgb, var(--tc) 92%, #000); color: #1a0b08; box-shadow: 0 0 22px color-mix(in srgb, var(--tc) 30%, transparent); }
.rac.tone-warn .btn.danger { color: #1a1205; }
.btn:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
.btn-sheen { position: absolute; inset: 0; width: 40%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent); transform: translateX(-160%) skewX(-18deg); }
.btn.danger:not(:disabled):hover .btn-sheen { animation: trv-sheen-pass 0.7s ease; }
.spin { animation: trv-spin-slow 0.8s linear infinite; }

[data-theme="light"] .rac-ov { background: rgba(60,40,15,0.34); }
[data-theme="light"] .rac-note, [data-theme="light"] .rac-typed { background: rgba(255,250,240,0.72); }
@media (prefers-reduced-motion: reduce) {
  .rac-aura, .medal-ring, .btn-sheen, .spin { animation: none !important; }
  [style*="trv-fade-up"] { animation: none !important; }
}
</style>
