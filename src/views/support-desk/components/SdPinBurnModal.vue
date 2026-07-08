<template>
  <!-- ═══ BURN MODAL — the Pin Rack's destructive ceremony ═══
       Workflow: pick WHY the pin leaves the rack → the burn button arms → the fuse
       rushes to the end and flashes over while the DELETE lands. The reminder is
       owner-private, so the reason shapes the farewell — it is not persisted. -->
  <Teleport to="body">
    <AnimatePresence>
      <Motion
        v-if="open" class="bm-veil"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.24 }"
        @mousedown.self="!burning && $emit('close')"
      >
        <Motion
          class="bm" role="alertdialog" aria-label="Burn this reminder"
          :initial="{ opacity: 0, y: 26, scale: 0.94 }"
          :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 14, scale: 0.97 }"
          :transition="{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }"
          @mousedown.stop @click.stop
        >
          <span class="bm-bar" aria-hidden="true"></span>
          <span class="bm-aura" aria-hidden="true"></span>

          <header class="bm-head">
            <div>
              <p class="bm-eyebrow sd-mono"><Flame :size="10" /> PIN RACK · BURN</p>
              <h3 class="bm-title">Burn this pin?</h3>
              <p class="bm-sub">Only the reminder leaves the rack — <b>{{ pin?.ticket_number }}</b> itself is untouched.</p>
            </div>
            <button class="bm-x" aria-label="Close" :disabled="burning" @click="$emit('close')"><X :size="15" /></button>
          </header>

          <!-- the condemned pin -->
          <div class="bm-pin" :class="{ burning }">
            <span class="bm-lamp" aria-hidden="true"></span>
            <div class="bm-pin-main">
              <div class="bm-pin-top">
                <b class="sd-mono">{{ pin?.ticket_number || 'PIN' }}</b>
                <span class="bm-pin-sub">{{ pin?.subject || '—' }}</span>
              </div>
              <p v-if="pin?.note" class="bm-pin-note">{{ pin.note }}</p>
              <div class="bm-fuse" aria-hidden="true">
                <i class="bm-fuse-burn"></i>
                <i class="bm-fuse-spark"></i>
              </div>
              <div class="bm-when sd-mono">
                <span>{{ dueLabel }}</span>
                <span class="bm-ash-lbl" aria-hidden="true">{{ burning ? 'BURNING…' : '' }}</span>
              </div>
            </div>
            <span v-for="n in 5" :key="n" class="bm-ash" :style="{ '--n': n }" aria-hidden="true"></span>
          </div>

          <!-- the WHY — burn stays disarmed until a reason is chosen -->
          <p class="bm-why sd-mono">WHY IS IT LEAVING THE RACK?</p>
          <div class="bm-reasons">
            <Motion
              v-for="rs in REASONS" :key="rs.key" as="button"
              class="bm-reason" :class="{ on: reason === rs.key }" :disabled="burning"
              :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }"
              @click="reason = rs.key"
            >
              <span class="bm-reason-ico"><component :is="rs.icon" :size="14" /></span>
              <b>{{ rs.label }}</b>
              <span class="bm-reason-desc">{{ rs.desc }}</span>
            </Motion>
          </div>

          <p v-if="error" class="bm-err">{{ error }}</p>

          <footer class="bm-foot">
            <button class="bm-btn ghost" :disabled="burning" @click="$emit('close')">Keep the pin</button>
            <Motion
              as="button" class="bm-btn burn" :disabled="!reason || burning"
              :whileHover="{ y: -1, scale: 1.02 }" :whileTap="{ scale: 0.96 }"
              @click="confirm"
            >
              <Loader v-if="burning" :size="14" class="bm-spin" />
              <Flame v-else :size="14" />
              {{ burning ? 'Burning…' : 'Burn pin' }}
            </Motion>
          </footer>
        </Motion>
      </Motion>
    </AnimatePresence>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Motion, AnimatePresence } from 'motion-v'
import { X, Flame, Loader, CheckCheck, CircleSlash2, Shuffle, CalendarClock } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import { deleteMyReminder } from '@/composables/useSupportDesk'

const props = defineProps({
  open: { type: Boolean, default: false },
  /** the reminder row {id, ticket_number, subject, note, remind_at, done} */
  pin: { type: Object, default: null },
})
const emit = defineEmits(['close', 'burned'])
const toast = useToast()

const reason = ref('')
const burning = ref(false)
const error = ref('')

const REASONS = [
  { key: 'handled', label: 'Handled early', desc: 'Follow-up already covered', icon: CheckCheck, bye: 'handled early' },
  { key: 'obsolete', label: 'No longer needed', desc: 'The pin lost its purpose', icon: CircleSlash2, bye: 'no longer needed' },
  { key: 'wrong', label: 'Wrong ticket', desc: 'Pinned on the wrong record', icon: Shuffle, bye: 'wrong ticket' },
  { key: 'replan', label: 'Re-planning', desc: 'A fresh pin will replace it', icon: CalendarClock, bye: 're-planned' },
]

watch(() => props.open, (v) => { if (v) { reason.value = ''; burning.value = false; error.value = '' } })

const dueLabel = computed(() => {
  if (!props.pin?.remind_at) return ''
  const d = new Date(props.pin.remind_at)
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
})

const confirm = async () => {
  if (!reason.value || burning.value || !props.pin) return
  burning.value = true
  error.value = ''
  try {
    // let the fuse rush play out while the DELETE is in flight
    await Promise.all([
      new Promise((r) => setTimeout(r, 680)),
      deleteMyReminder(props.pin.id),
    ])
    const rs = REASONS.find((x) => x.key === reason.value)
    toast.success(`Burned the pin on ${props.pin.ticket_number || 'ticket'} — ${rs?.bye || 'done'}.`)
    emit('burned', props.pin.id)
    emit('close')
  } catch {
    error.value = 'The pin would not burn — try again.'
  }
  burning.value = false
}

const onEsc = (e) => { if (e.key === 'Escape' && props.open && !burning.value) emit('close') }
onMounted(() => window.addEventListener('keydown', onEsc))
onBeforeUnmount(() => window.removeEventListener('keydown', onEsc))
</script>

<style scoped>
.bm-veil {
  position: fixed; inset: 0; z-index: 2150;
  display: grid; place-items: center; padding: 20px;
  background: rgba(8, 5, 3, 0.6);
  backdrop-filter: blur(9px); -webkit-backdrop-filter: blur(9px);
}
[data-theme="light"] .bm-veil { background: rgba(62, 40, 16, 0.34); }

.bm {
  position: relative; width: 470px; max-width: 96vw; max-height: calc(100vh - 40px);
  overflow: hidden auto; padding: 20px 22px 18px;
  border-radius: 22px;
  background: var(--sd-surface-elevated);
  border: 1px solid color-mix(in srgb, var(--sd-cal-storm) 38%, transparent);
  box-shadow: 0 30px 80px rgba(0, 0, 0, 0.5), 0 0 34px color-mix(in srgb, var(--sd-cal-storm) 22%, transparent);
}
.bm-bar {
  position: absolute; inset: 0 0 auto 0; height: 3px;
  background: linear-gradient(90deg, var(--sd-cal-ember), var(--sd-cal-storm), var(--sd-cal-ember));
  background-size: 220% 100%; animation: sd-rail-flow 4s linear infinite;
}
.bm-aura {
  position: absolute; top: -70px; right: -70px; width: 220px; height: 220px; pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--sd-cal-storm) 16%, transparent), transparent 68%);
}

/* head */
.bm-head { position: relative; display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 15px; }
.bm-eyebrow { display: inline-flex; align-items: center; gap: 6px; margin: 0 0 6px; font-size: 8.5px; font-weight: 700; letter-spacing: 0.26em; color: var(--sd-cal-storm); }
.bm-title { margin: 0; font-size: 19px; font-weight: 800; letter-spacing: -0.02em; color: var(--sd-text); }
.bm-sub { margin: 5px 0 0; font-size: 12px; color: var(--sd-text-secondary); }
.bm-sub b { color: var(--sd-cal-core); font-weight: 700; }
.bm-x {
  flex: none; width: 30px; height: 30px; display: grid; place-items: center; cursor: pointer;
  border-radius: 10px; background: transparent; border: 1px solid var(--sd-border); color: var(--sd-text-muted);
  transition: all 0.18s;
}
.bm-x:hover:not(:disabled) { color: var(--sd-text); transform: rotate(90deg); }
.bm-x:disabled { opacity: 0.4; cursor: default; }

/* the condemned pin */
.bm-pin {
  position: relative; display: flex; gap: 11px; overflow: hidden;
  padding: 12px 14px; border-radius: 14px;
  background: var(--sd-surface); border: 1px solid var(--sd-cal-brd);
  transition: border-color 0.3s, filter 0.3s;
}
.bm-lamp {
  flex: none; width: 9px; height: 9px; border-radius: 50%; margin-top: 5px;
  background: var(--sd-cal-core); box-shadow: 0 0 9px var(--sd-cal-core);
}
.bm-pin-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 7px; }
.bm-pin-top { display: flex; align-items: center; gap: 9px; min-width: 0; }
.bm-pin-top b { flex: none; font-size: 11.5px; color: var(--sd-cal-core); }
.bm-pin-sub { flex: 1; min-width: 0; font-size: 12.5px; font-weight: 600; color: var(--sd-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.bm-pin-note { margin: -2px 0 0; font-size: 11.5px; font-style: italic; color: var(--sd-text-secondary); }
.bm-fuse { position: relative; height: 4px; border-radius: 999px; background: color-mix(in srgb, var(--sd-text-dim) 22%, transparent); }
.bm-fuse-burn {
  position: absolute; inset: 0 auto 0 0; width: 34%;
  border-radius: 999px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--sd-cal-core) 30%, transparent), var(--sd-cal-core));
}
.bm-fuse-spark {
  position: absolute; top: 50%; left: 34%;
  width: 9px; height: 9px; border-radius: 50%; transform: translate(-50%, -50%);
  background: radial-gradient(circle, #fff8e6 0%, var(--sd-cal-core) 55%, transparent 75%);
  box-shadow: 0 0 10px var(--sd-cal-core);
  animation: bm-flicker 0.9s ease-in-out infinite;
}
.bm-when { display: flex; justify-content: space-between; font-size: 9px; font-weight: 700; letter-spacing: 0.12em; color: var(--sd-text-dim); }
.bm-ash-lbl { color: var(--sd-cal-storm); letter-spacing: 0.2em; }

/* burn ceremony */
.bm-pin.burning { border-color: var(--sd-cal-storm); }
.bm-pin.burning .bm-fuse-burn {
  background: linear-gradient(90deg, var(--sd-cal-ember), var(--sd-cal-storm));
  animation: bm-rush 0.6s ease-in forwards;
}
.bm-pin.burning .bm-fuse-spark { animation: bm-rush-spark 0.6s ease-in forwards; }
.bm-pin.burning .bm-ash {
  position: absolute; bottom: 6px; left: calc(var(--n) * 18%);
  width: 3px; height: 3px; border-radius: 50%; background: var(--sd-cal-ember);
  animation: bm-ash-rise 0.9s ease-out infinite;
  animation-delay: calc(var(--n) * 0.09s);
}
@keyframes bm-rush { to { width: 100%; } }
@keyframes bm-rush-spark { to { left: 100%; opacity: 0; } }
@keyframes bm-flicker { 0%, 100% { opacity: 1; } 50% { opacity: 0.65; } }
@keyframes bm-ash-rise {
  0% { opacity: 0; transform: translateY(0); }
  25% { opacity: 0.9; }
  100% { opacity: 0; transform: translateY(-26px) translateX(4px); }
}

/* reasons */
.bm-why { margin: 16px 0 9px; font-size: 8.5px; font-weight: 700; letter-spacing: 0.26em; color: var(--sd-text-dim); }
.bm-reasons { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.bm-reason {
  display: flex; flex-direction: column; align-items: flex-start; gap: 3px; cursor: pointer; text-align: left;
  padding: 11px 12px; border-radius: 13px;
  background: var(--sd-surface); border: 1px solid var(--sd-border); color: var(--sd-text-secondary);
  transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
}
.bm-reason b { font-size: 12px; font-weight: 700; color: var(--sd-text); }
.bm-reason-desc { font-size: 10.5px; color: var(--sd-text-muted); }
.bm-reason-ico {
  display: grid; place-items: center; width: 26px; height: 26px; margin-bottom: 3px;
  border-radius: 8px; background: var(--sd-cal-soft); color: var(--sd-cal-core);
  transition: all 0.2s;
}
.bm-reason:disabled { opacity: 0.55; cursor: default; }
.bm-reason.on {
  border-color: var(--sd-cal-storm);
  background: var(--sd-cal-storm-soft);
  box-shadow: 0 0 0 1px var(--sd-cal-storm), 0 0 18px color-mix(in srgb, var(--sd-cal-storm) 25%, transparent);
}
.bm-reason.on .bm-reason-ico { background: var(--sd-cal-storm); color: #fff; }
.bm-reason.on b { color: var(--sd-cal-storm); }

.bm-err { margin: 12px 0 0; font-size: 12px; color: var(--sd-cal-storm); }

/* foot */
.bm-foot { display: flex; justify-content: flex-end; gap: 9px; margin-top: 17px; }
.bm-btn {
  display: inline-flex; align-items: center; gap: 7px; cursor: pointer;
  padding: 9px 16px; border-radius: 11px; font-size: 12.5px; font-weight: 700;
  border: 1px solid transparent;
}
.bm-btn.ghost { background: transparent; border-color: var(--sd-border-strong); color: var(--sd-text-secondary); }
.bm-btn.burn {
  background: linear-gradient(122deg, var(--sd-cal-ember), var(--sd-cal-storm));
  color: #fff; box-shadow: 0 0 22px color-mix(in srgb, var(--sd-cal-storm) 35%, transparent);
}
.bm-btn:disabled { opacity: 0.5; cursor: default; }
.bm-spin { animation: sd-spin-slow 0.9s linear infinite; }

@media (prefers-reduced-motion: reduce) {
  .bm-bar, .bm-fuse-spark, .bm-pin.burning .bm-ash { animation: none; }
  .bm-pin.burning .bm-fuse-burn { animation-duration: 0.01s; }
  .bm-pin.burning .bm-fuse-spark { animation: none; opacity: 0; }
}
</style>
