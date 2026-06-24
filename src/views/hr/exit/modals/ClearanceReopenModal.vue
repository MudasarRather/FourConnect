<template>
  <Teleport to="body">
    <Presence>
      <div v-if="open" class="exm-overlay" @mousedown.self="$emit('close')">
        <Motion as="div" class="exm ex-grain"
          :initial="{ opacity: 0, y: 26, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 18, scale: 0.97 }" :transition="{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }">
          <span class="exm-aura" aria-hidden="true" />

          <header class="exm-head">
            <span class="exm-ico"><RotateCcw :size="18" /></span>
            <div class="exm-htxt">
              <h3 class="exm-title">Reopen clearance</h3>
              <p class="exm-sub">{{ item?.title || 'Clearance item' }}</p>
            </div>
            <button class="exm-x" type="button" @click="$emit('close')"><X :size="17" /></button>
          </header>

          <div class="exm-body">
            <div class="warn">
              <AlertTriangle :size="15" />
              <span>This resets the item to <b>Pending</b> and clears the existing sign-off. The reason is written to the audit log.</span>
            </div>

            <div class="fld">
              <label>Reason <i>required</i></label>
              <div class="chips">
                <button v-for="r in PRESETS" :key="r" type="button" class="chip" :class="{ on: reason === r }" @click="reason = r">{{ r }}</button>
              </div>
              <textarea v-model="reason" rows="3" placeholder="Why is this clearance being reopened?" />
            </div>
          </div>

          <footer class="exm-foot">
            <button class="exm-btn ghost" type="button" @click="$emit('close')">Cancel</button>
            <Motion as="button" type="button" class="exm-btn danger" :disabled="busy || !reason.trim()"
              :whileHover="busy || !reason.trim() ? {} : { y: -1 }" :whileTap="{ scale: 0.97 }" @click="$emit('submit', reason.trim())">
              <Loader2 v-if="busy" :size="15" class="spin" /><RotateCcw v-else :size="15" /> Reopen item
            </Motion>
          </footer>
        </Motion>
      </div>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { X, RotateCcw, AlertTriangle, Loader2 } from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  item: { type: Object, default: null },
  busy: { type: Boolean, default: false },
})
defineEmits(['close', 'submit'])

const PRESETS = ['Asset not returned', 'Dues still outstanding', 'Signed off in error', 'Needs re-verification']
const reason = ref('')
watch(() => props.open, (o) => { if (o) reason.value = '' })
</script>

<style scoped>
.exm-overlay { position: fixed; inset: 0; z-index: 1440; display: grid; place-items: center; padding: 20px; background: rgba(6,5,10,0.66); backdrop-filter: blur(8px); }
.exm { position: relative; overflow: hidden; width: min(440px, 96vw); border-radius: 22px; background: var(--ex-surface-elevated); border: 1px solid color-mix(in srgb, var(--ex-blocked) 26%, transparent); box-shadow: var(--ex-shadow); }
.exm-aura { position: absolute; inset: -50% 30% 60% -10%; pointer-events: none; background: radial-gradient(60% 80% at 30% 0%, rgba(239,68,68,0.13), transparent 70%); }
.exm-head { position: relative; display: flex; align-items: flex-start; gap: 12px; padding: 18px 20px 12px; }
.exm-ico { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; color: var(--ex-blocked); background: var(--ex-blocked-soft); border: 1px solid color-mix(in srgb, var(--ex-blocked) 30%, transparent); flex-shrink: 0; }
.exm-htxt { flex: 1; min-width: 0; }
.exm-title { font-size: 15px; font-weight: 820; margin: 0; color: var(--ex-text); }
.exm-sub { font-size: 12px; color: var(--ex-text-muted); margin: 2px 0 0; }
.exm-x { margin-left: auto; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; cursor: pointer; background: transparent; border: 1px solid var(--ex-border); color: var(--ex-text-muted); flex-shrink: 0; }

.exm-body { position: relative; padding: 4px 20px 14px; display: flex; flex-direction: column; gap: 13px; }
.warn { display: flex; align-items: flex-start; gap: 9px; padding: 11px 13px; border-radius: 12px; font-size: 12px; line-height: 1.45;
  color: var(--ex-text-secondary); background: var(--ex-blocked-soft); border: 1px solid color-mix(in srgb, var(--ex-blocked) 24%, transparent); }
.warn svg { color: var(--ex-blocked); flex-shrink: 0; margin-top: 1px; }
.warn b { color: var(--ex-text); }
.fld { display: flex; flex-direction: column; gap: 7px; }
.fld label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ex-text-muted); }
.fld label i { font-style: normal; text-transform: none; letter-spacing: 0; font-weight: 600; color: var(--ex-blocked); margin-left: 4px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { padding: 6px 11px; border-radius: 999px; cursor: pointer; font-size: 11px; font-weight: 700; font-family: inherit;
  background: var(--ex-surface); border: 1px solid var(--ex-border); color: var(--ex-text-secondary); transition: all 0.2s; }
.chip:hover { border-color: var(--ex-border-strong); }
.chip.on { border-color: color-mix(in srgb, var(--ex-blocked) 40%, transparent); background: var(--ex-blocked-soft); color: var(--ex-blocked); }
.fld textarea { width: 100%; padding: 10px 12px; border-radius: 10px; font-size: 13px; font-family: inherit; background: rgba(0,0,0,0.3); border: 1px solid var(--ex-border); color: var(--ex-text); resize: vertical; }
.fld textarea::placeholder { color: var(--ex-text-dim); }
[data-theme="light"] .fld textarea { background: rgba(255,250,242,0.72); }

.exm-foot { position: relative; display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px 18px; }
.exm-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px; border-radius: 11px; font-size: 13px; font-weight: 750; cursor: pointer; font-family: inherit; }
.exm-btn.ghost { background: transparent; border: 1px solid var(--ex-border-strong); color: var(--ex-text-secondary); }
.exm-btn.danger { border: none; background: linear-gradient(135deg, #fca5a5, #ef4444 55%, #dc2626); color: #fff; }
.exm-btn.danger:disabled { opacity: 0.5; cursor: not-allowed; }
.spin { animation: ex-spin-slow 0.8s linear infinite; }
@media (prefers-reduced-motion: reduce) { .spin { animation: none; } }
</style>
