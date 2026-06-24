<template>
  <Teleport to="body">
    <Presence>
      <div v-if="open" class="rt-overlay" @mousedown.self="$emit('close')">
        <Motion as="div" class="rt ex-grain" :class="{ breaking }"
          :initial="reduced ? false : { opacity: 0, y: 28, scale: 0.95 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 18, scale: 0.97 }" :transition="{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }">
          <span class="rt-aura" aria-hidden="true" />
          <span class="rt-sheen" aria-hidden="true" />

          <button class="rt-x" type="button" @click="$emit('close')"><X :size="17" /></button>

          <!-- seal-break hero -->
          <div class="rt-hero">
            <div class="seal" :class="{ breaking }">
              <span class="sh sh-l" aria-hidden="true" />
              <span class="sh sh-r" aria-hidden="true" />
              <span class="crack" aria-hidden="true" />
              <span class="seal-ic"><Stamp :size="26" /></span>
              <span class="seal-flash" aria-hidden="true" />
            </div>
            <span class="rt-eyebrow"><ShieldOff :size="11" /> Retire charter</span>
            <h3 class="rt-title">Retire “{{ policy?.policy_name }}”?</h3>
            <p class="rt-scope">{{ policy?.grade_id ? policy.grade_name : 'Organisation default' }} · {{ policy?.is_active ? 'currently active' : 'inactive' }}</p>
          </div>

          <div class="rt-body">
            <!-- consequence panel -->
            <ul class="conseq">
              <li><span class="cq-ic ok"><Archive :size="13" /></span><span>Soft-deleted — the record is <b>kept for audit</b>; in-flight cases keep the terms they were created with.</span></li>
              <li><span class="cq-ic warn"><Ban :size="13" /></span><span>New separations will <b>no longer resolve</b> to this charter.</span></li>
              <li v-if="isDefault"><span class="cq-ic danger"><AlertTriangle :size="13" /></span><span>This is the <b>organisation-default</b> in force. Without another default, new cases fall back to the <b>built-in defaults</b>.</span></li>
            </ul>

            <!-- reason -->
            <div class="rt-fld">
              <label>Reason for retiring <i>required · written to the audit log</i></label>
              <div class="chips">
                <Motion v-for="(r, i) in PRESETS" :key="r" as="button" type="button" class="chip" :class="{ on: reason === r }"
                  :initial="reduced ? false : { opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.3, delay: 0.05 + i * 0.04, ease: [0.16,1,0.3,1] }"
                  @click="reason = r">{{ r }}</Motion>
              </div>
              <textarea v-model="reason" rows="2" placeholder="Why is this charter being retired?" />
            </div>

            <!-- reversible alternative -->
            <div v-if="policy?.is_active" class="alt">
              <span class="alt-ic"><RotateCcw :size="14" /></span>
              <div class="alt-txt"><b>Prefer to keep it on record?</b><span>Deactivate instead — reversible, nothing is removed, and it stops resolving for new cases.</span></div>
              <Motion as="button" type="button" class="alt-btn" :disabled="busy" :whileHover="busy ? {} : { y: -1 }" :whileTap="busy ? {} : { scale: 0.96 }" @click="$emit('deactivate')">
                <Ban :size="13" /> Deactivate
              </Motion>
            </div>
          </div>

          <footer class="rt-foot">
            <button class="rt-btn ghost" type="button" @click="$emit('close')">Cancel</button>
            <span class="rt-spacer" />
            <span v-if="!reason.trim()" class="rt-hint"><AlertTriangle :size="12" /> A reason is required</span>
            <Motion as="button" type="button" class="rt-btn danger" :disabled="busy || !reason.trim()"
              :whileHover="(busy || !reason.trim()) ? {} : { y: -1 }" :whileTap="(busy || !reason.trim()) ? {} : { scale: 0.96 }" @click="confirm">
              <Loader2 v-if="busy" :size="15" class="spin" /><Trash2 v-else :size="15" /> Delete charter
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
import { X, Stamp, ShieldOff, Archive, Ban, AlertTriangle, RotateCcw, Trash2, Loader2 } from 'lucide-vue-next'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  open: { type: Boolean, default: false },
  policy: { type: Object, default: null },
  isDefault: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'delete', 'deactivate'])
const reduced = prefersReduced()

const PRESETS = ['Superseded by a new policy', 'Created in error', 'Grade no longer in use', 'Consolidating duplicates', 'Terms are obsolete']
const reason = ref('')
const breaking = ref(false)

watch(() => props.open, (o) => { if (o) { reason.value = ''; breaking.value = false } })
// reset the seal once an async delete settles while still open (e.g. an error)
watch(() => props.busy, (b, prev) => { if (prev && !b) breaking.value = false })

const confirm = () => {
  if (props.busy || !reason.value.trim()) return
  breaking.value = true
  emit('delete', reason.value.trim())
}
</script>

<style scoped>
.rt-overlay { position: fixed; inset: 0; z-index: 1460; display: grid; place-items: center; padding: 20px; background: rgba(10,4,4,0.7); backdrop-filter: blur(9px); -webkit-backdrop-filter: blur(9px); }
[data-theme="light"] .rt-overlay { background: rgba(60,20,20,0.34); }
.rt { position: relative; overflow: hidden; width: min(470px, 96vw); max-height: 92vh; display: flex; flex-direction: column; border-radius: 22px;
  background: var(--ex-surface-elevated); border: 1px solid color-mix(in srgb, var(--ex-blocked) 30%, transparent); box-shadow: var(--ex-shadow); transition: border-color 0.4s; }
.rt.breaking { border-color: color-mix(in srgb, var(--ex-blocked) 55%, transparent); }
.rt-aura { position: absolute; inset: -50% 20% 50% 20%; pointer-events: none; animation: rt-pulse 3.4s ease-in-out infinite;
  background: radial-gradient(60% 80% at 50% 0%, rgba(239,68,68,0.2), transparent 72%); }
.rt-sheen { position: absolute; inset: 0 0 auto; height: 2px; pointer-events: none; background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--ex-blocked) 75%, transparent), transparent); }
.rt-x { position: absolute; top: 14px; right: 14px; z-index: 4; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 8px; cursor: pointer; background: transparent; border: 1px solid var(--ex-border); color: var(--ex-text-muted); }
.rt-x:hover { color: var(--ex-text); border-color: var(--ex-border-strong); }
@keyframes rt-pulse { 0%,100% { opacity: 0.55; transform: scale(0.98); } 50% { opacity: 0.9; transform: scale(1.04); } }

/* hero + seal */
.rt-hero { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; text-align: center; gap: 7px; padding: 26px 22px 12px; }
.seal { position: relative; width: 72px; height: 72px; margin-bottom: 6px; }
.sh { position: absolute; inset: 0; border-radius: 50%; background: radial-gradient(circle at 38% 32%, color-mix(in srgb, var(--ex-blocked) 36%, transparent), color-mix(in srgb, var(--ex-blocked) 16%, transparent));
  border: 2px solid color-mix(in srgb, var(--ex-blocked) 45%, transparent); transition: transform 0.6s var(--ex-spring), opacity 0.6s ease; }
.sh-l { clip-path: inset(0 50% 0 0); } .sh-r { clip-path: inset(0 0 0 50%); }
.crack { position: absolute; left: 50%; top: 6px; bottom: 6px; width: 2px; margin-left: -1px; background: linear-gradient(180deg, transparent, var(--ex-blocked), transparent); opacity: 0; }
.seal-ic { position: absolute; inset: 0; display: grid; place-items: center; color: #fff; transition: opacity 0.4s, transform 0.4s; filter: drop-shadow(0 0 6px color-mix(in srgb, var(--ex-blocked) 60%, transparent)); }
.seal-flash { position: absolute; inset: -20%; border-radius: 50%; background: radial-gradient(circle, rgba(255,255,255,0.7), transparent 60%); opacity: 0; }
.seal:not(.breaking) { animation: seal-breathe 3s ease-in-out infinite; }
@keyframes seal-breathe { 0%,100% { transform: scale(1); filter: drop-shadow(0 0 0 transparent); } 50% { transform: scale(1.04); filter: drop-shadow(0 0 10px color-mix(in srgb, var(--ex-blocked) 40%, transparent)); } }
.seal.breaking .sh-l { transform: translateX(-15px) rotate(-20deg); opacity: 0; }
.seal.breaking .sh-r { transform: translateX(15px) rotate(20deg); opacity: 0; }
.seal.breaking .crack { animation: crack-flash 0.5s ease forwards; }
.seal.breaking .seal-ic { opacity: 0; transform: scale(0.7); }
.seal.breaking .seal-flash { animation: flash-pop 0.6s ease forwards; }
@keyframes crack-flash { 0% { opacity: 0; } 40% { opacity: 1; } 100% { opacity: 0; } }
@keyframes flash-pop { 0% { opacity: 0; transform: scale(0.5); } 35% { opacity: 1; } 100% { opacity: 0; transform: scale(1.4); } }

.rt-eyebrow { display: inline-flex; align-items: center; gap: 5px; font-size: 9.5px; font-weight: 850; letter-spacing: 0.1em; text-transform: uppercase; color: var(--ex-blocked); background: var(--ex-blocked-soft); border: 1px solid color-mix(in srgb, var(--ex-blocked) 30%, transparent); padding: 3px 10px; border-radius: 999px; }
.rt-title { font-size: 18px; font-weight: 850; margin: 4px 0 0; color: var(--ex-text); }
.rt-scope { font-size: 11.5px; color: var(--ex-text-muted); margin: 0; }

.rt-body { position: relative; z-index: 2; flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 6px 22px 14px; display: flex; flex-direction: column; gap: 14px; }
.rt-body > * { flex-shrink: 0; }
.conseq { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.conseq li { display: flex; align-items: flex-start; gap: 9px; font-size: 12px; line-height: 1.45; color: var(--ex-text-secondary); }
.conseq b { color: var(--ex-text); font-weight: 750; }
.cq-ic { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 7px; flex-shrink: 0; }
.cq-ic.ok { color: var(--ex-steel); background: var(--ex-steel-soft); }
.cq-ic.warn { color: var(--ex-amber-strong); background: var(--ex-amber-soft); }
.cq-ic.danger { color: var(--ex-blocked); background: var(--ex-blocked-soft); }

.rt-fld { display: flex; flex-direction: column; gap: 8px; }
.rt-fld label { font-size: 11px; font-weight: 750; text-transform: uppercase; letter-spacing: 0.04em; color: var(--ex-text-muted); }
.rt-fld label i { font-style: normal; text-transform: none; letter-spacing: 0; font-weight: 600; color: var(--ex-blocked); margin-left: 4px; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { padding: 6px 11px; border-radius: 999px; cursor: pointer; font-size: 11px; font-weight: 700; font-family: inherit; background: var(--ex-surface); border: 1px solid var(--ex-border); color: var(--ex-text-secondary); transition: border-color 0.2s, color 0.2s, background 0.2s; }
.chip:hover { border-color: var(--ex-border-strong); }
.chip.on { border-color: color-mix(in srgb, var(--ex-blocked) 42%, transparent); background: var(--ex-blocked-soft); color: var(--ex-blocked); }
.rt-fld textarea { width: 100%; padding: 10px 12px; border-radius: 11px; font-size: 13px; font-family: inherit; background: rgba(0,0,0,0.3); border: 1px solid var(--ex-border); color: var(--ex-text); resize: vertical; }
.rt-fld textarea:focus { outline: none; border-color: color-mix(in srgb, var(--ex-blocked) 40%, transparent); box-shadow: 0 0 0 3px rgba(239,68,68,0.12); }
.rt-fld textarea::placeholder { color: var(--ex-text-dim); }
[data-theme="light"] .rt-fld textarea { background: rgba(255,250,242,0.74); }

.alt { display: flex; align-items: center; gap: 11px; padding: 12px; border-radius: 13px; background: var(--ex-surface); border: 1px solid var(--ex-border); }
.alt-ic { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0; color: var(--ex-amber-strong); background: var(--ex-amber-soft); border: 1px solid var(--ex-amber-border); }
.alt-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.alt-txt b { font-size: 12.5px; font-weight: 800; color: var(--ex-text); }
.alt-txt span { font-size: 11px; line-height: 1.4; color: var(--ex-text-muted); }
.alt-btn { display: inline-flex; align-items: center; gap: 5px; flex-shrink: 0; padding: 8px 12px; border-radius: 10px; cursor: pointer; font-family: inherit; font-size: 12px; font-weight: 750;
  background: var(--ex-amber-soft); border: 1px solid var(--ex-amber-border); color: var(--ex-amber-strong); }
.alt-btn:disabled { opacity: 0.55; cursor: not-allowed; }

.rt-foot { position: relative; z-index: 2; flex-shrink: 0; display: flex; align-items: center; gap: 8px; padding: 12px 22px 18px; border-top: 1px solid var(--ex-border); }
.rt-spacer { flex: 1; }
.rt-hint { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 700; color: var(--ex-blocked); }
.rt-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 16px; border-radius: 11px; font-size: 13px; font-weight: 760; cursor: pointer; font-family: inherit; }
.rt-btn.ghost { background: transparent; border: 1px solid var(--ex-border-strong); color: var(--ex-text-secondary); }
.rt-btn.danger { border: none; background: linear-gradient(135deg, #fca5a5, #ef4444 55%, #dc2626); color: #fff; box-shadow: 0 8px 24px -10px rgba(239,68,68,0.6); }
.rt-btn.danger:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
.spin { animation: ex-spin-slow 0.8s linear infinite; }

@media (prefers-reduced-motion: reduce) {
  .rt-aura, .seal, .spin { animation: none; }
  .sh, .seal-ic { transition: none; }
}
</style>
