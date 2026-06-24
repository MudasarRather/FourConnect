<template>
  <Teleport to="body">
    <Presence>
      <div v-if="open" class="exrm-overlay" @mousedown.self="close">
        <Motion as="div" class="exrm ex-grain"
          :initial="reduced ? false : { opacity: 0, y: 26, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 18, scale: 0.97 }" :transition="{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }">
          <span class="exrm-aura" aria-hidden="true" />
          <span class="exrm-edge" aria-hidden="true" />

          <header class="exrm-head">
            <span class="exrm-ico">
              <span class="exrm-pulse" aria-hidden="true" />
              <Trash2 :size="20" />
            </span>
            <div class="exrm-htxt">
              <h3 class="exrm-title">Expunge case</h3>
              <p class="exrm-sub">{{ cfg.sub }}</p>
            </div>
            <button class="exrm-x" @click="close" type="button" aria-label="Close"><X :size="17" /></button>
          </header>

          <div class="exrm-body">
            <!-- subject of the action — shreds on confirm -->
            <div class="exrm-subject" :class="{ shredding }">
              <span class="exrm-avatar">{{ init }}</span>
              <div class="exrm-sid">
                <span class="exrm-name">{{ caseInfo?.employee_name || caseInfo?.employee_code || 'This case' }}</span>
                <span class="exrm-code ex-mono">{{ caseInfo?.case_number || '—' }}</span>
              </div>
              <ExStatusPill v-if="caseInfo?.status" :status="caseInfo.status" />
              <!-- shred strips overlay -->
              <div v-if="shredding" class="exrm-shred" aria-hidden="true">
                <span v-for="n in 9" :key="n" class="exrm-strip" :style="{ '--s': n }" />
              </div>
            </div>

            <!-- eligibility / distinction note -->
            <div class="exrm-note">
              <Info :size="14" class="nt-ic" />
              <p>{{ cfg.eligibility }}</p>
            </div>

            <!-- what happens -->
            <div class="exrm-conseq">
              <span class="cq-h"><AlertTriangle :size="13" /> What happens</span>
              <ul>
                <li v-for="(c, i) in cfg.consequences" :key="i"><span class="cq-dot" /> {{ c }}</li>
              </ul>
            </div>

            <!-- preset reasons -->
            <div class="exrm-fld">
              <label>Reason for deletion <i>*</i></label>
              <div class="reason-grid">
                <Motion v-for="(r, i) in presets" :key="r" as="button" type="button"
                  class="reason-chip" :class="{ on: picked === r }" @click="pick(r)"
                  :initial="reduced ? false : { opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
                  :transition="{ duration: 0.3, delay: 0.04 + i * 0.035, ease: [0.16, 1, 0.3, 1] }"
                  :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }">
                  <span class="rc-tick"><Check :size="11" /></span>
                  <span>{{ r }}</span>
                </Motion>
              </div>
            </div>

            <!-- elaboration -->
            <div class="exrm-fld">
              <label>{{ picked === 'Other' ? 'Specify the reason' : 'Add a note' }} <i v-if="picked === 'Other'">*</i><span v-else class="opt">optional</span></label>
              <textarea v-model="note" rows="2" :placeholder="cfg.placeholder" />
            </div>

            <!-- acknowledgment gate -->
            <button class="exrm-ack" :class="{ on: acknowledged }" type="button" @click="acknowledged = !acknowledged">
              <span class="ack-box"><Check :size="12" /></span>
              <span class="ack-txt">I understand this permanently removes the case from the registry.</span>
            </button>
          </div>

          <footer class="exrm-foot">
            <button class="exrm-btn ghost" @click="close" type="button">Keep case</button>
            <Motion as="button" class="exrm-btn danger" :class="{ off: !canSubmit }" type="button"
              @click="submit" :whileHover="canSubmit ? { y: -2 } : {}" :whileTap="canSubmit ? { scale: 0.96 } : {}">
              <Loader2 v-if="busy" :size="15" class="spin" />
              <Trash2 v-else :size="15" />
              {{ busy ? 'Expunging…' : 'Expunge case' }}
            </Motion>
          </footer>
        </Motion>
      </div>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { X, Check, Loader2, Trash2, AlertTriangle, Info } from 'lucide-vue-next'
import ExStatusPill from '../components/ExStatusPill.vue'
import { initials, isPreAccept } from '@/composables/useExit'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  open: { type: Boolean, default: false },
  caseInfo: { type: Object, default: null },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'submit'])
const reduced = prefersReduced()

const preAccept = computed(() => isPreAccept(props.caseInfo?.status))

const cfg = computed(() => preAccept.value ? {
  sub: 'Remove this not-yet-accepted request from the registry',
  eligibility: 'This request has not been accepted, so nothing downstream exists yet — deleting it leaves no loose ends. Prefer Reject or Cancel if you want to keep a visible trail.',
  placeholder: 'Context for the audit log…',
  consequences: [
    'The case is removed from the resignation registry and every list.',
    'No clearance, settlement, or letters exist yet — nothing downstream is affected.',
    'The employee’s lifecycle stays ACTIVE; they can file again later.',
    'This deletion is logged in the audit trail and cannot be undone here.',
  ],
} : {
  sub: 'Remove this closed case from the registry',
  eligibility: 'This case is already closed. Deleting it only tidies the registry — Cancel/Reject already recorded the outcome and that trail is kept.',
  placeholder: 'Context for the audit log…',
  consequences: [
    'The case is removed from the resignation registry and every list.',
    'The original outcome remains in the audit trail.',
    'No settlement or lifecycle change is triggered.',
    'This deletion is logged and cannot be undone here.',
  ],
})

const PRESETS = computed(() => preAccept.value
  ? ['Filed in error', 'Duplicate request', 'Wrong employee selected', 'Test / sample record', 'Employee retracted', 'Other']
  : ['Data cleanup', 'Duplicate record', 'Created in error', 'Superseded by another case', 'Retention elapsed', 'Other'])
const presets = computed(() => PRESETS.value)

const picked = ref('')
const note = ref('')
const acknowledged = ref(false)
const shredding = ref(false)
const pick = (r) => { picked.value = picked.value === r ? '' : r }

watch(() => props.open, (o) => { if (o) { picked.value = ''; note.value = ''; acknowledged.value = false; shredding.value = false } })
// If the action fails the parent flips busy back off while still open — un-shred so the user can retry.
watch(() => props.busy, (b, prev) => { if (prev && !b && props.open) shredding.value = false })

const init = computed(() => initials(props.caseInfo?.employee_name || props.caseInfo?.employee_code))
const reason = computed(() => {
  const preset = picked.value && picked.value !== 'Other' ? picked.value : ''
  const n = note.value.trim()
  if (preset && n) return `${preset} — ${n}`
  return preset || n
})
const valid = computed(() => (picked.value === 'Other' ? !!note.value.trim() : !!reason.value))
const canSubmit = computed(() => valid.value && acknowledged.value && !props.busy)

const close = () => { if (!props.busy) emit('close') }
const submit = () => {
  if (!canSubmit.value) return
  shredding.value = true
  emit('submit', { reason: reason.value })
}
</script>

<style scoped>
.exrm-overlay { position: fixed; inset: 0; z-index: 1460; display: grid; place-items: center; padding: 20px;
  background: rgba(8, 4, 4, 0.72); backdrop-filter: blur(9px); -webkit-backdrop-filter: blur(9px); }
[data-theme="light"] .exrm-overlay { background: rgba(50, 20, 12, 0.42); }
.exrm { position: relative; overflow: hidden; width: min(468px, 96vw); max-height: 92vh; overflow-y: auto;
  border-radius: 22px; background: var(--ex-surface-elevated); border: 1px solid var(--ex-border-strong); box-shadow: var(--ex-shadow);
  --tone-c: #ef4444; --tone-soft: rgba(239, 68, 68, 0.14); --tone-bd: rgba(239, 68, 68, 0.34); }
.exrm-aura { position: absolute; inset: -45% 25% 55% -10%; pointer-events: none; animation: ex-aura-drift 11s ease-in-out infinite;
  background: radial-gradient(60% 80% at 22% 0%, var(--tone-soft), transparent 72%); }
.exrm-edge { position: absolute; top: 0; left: 0; right: 0; height: 2px; pointer-events: none;
  background: linear-gradient(90deg, transparent, var(--tone-c), transparent); opacity: 0.85; }

.exrm-head { position: relative; display: flex; align-items: flex-start; gap: 12px; padding: 18px 20px 12px; }
.exrm-ico { position: relative; display: grid; place-items: center; width: 42px; height: 42px; border-radius: 13px; flex-shrink: 0;
  color: var(--tone-c); background: var(--tone-soft); border: 1px solid var(--tone-bd); }
.exrm-pulse { position: absolute; inset: 0; border-radius: inherit; border: 1px solid var(--tone-c); animation: exrm-pulse 2.4s ease-out infinite; }
.exrm-htxt { flex: 1; min-width: 0; }
.exrm-title { font-size: 17px; font-weight: 850; color: var(--ex-text); margin: 0; }
.exrm-sub { font-size: 12px; color: var(--ex-text-muted); margin: 2px 0 0; }
.exrm-x { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; cursor: pointer; flex-shrink: 0;
  background: transparent; border: 1px solid var(--ex-border); color: var(--ex-text-muted); transition: all 0.2s; }
.exrm-x:hover { color: var(--ex-text); border-color: var(--ex-border-strong); transform: rotate(90deg); }

.exrm-body { position: relative; padding: 4px 20px 14px; display: flex; flex-direction: column; gap: 13px; }

/* subject card + shred */
.exrm-subject { position: relative; display: flex; align-items: center; gap: 11px; padding: 12px 13px; border-radius: 14px;
  background: var(--ex-surface); border: 1px solid var(--ex-border); overflow: hidden; }
.exrm-subject.shredding > :not(.exrm-shred) { opacity: 0; transition: opacity 0.18s ease; }
.exrm-avatar { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0;
  font-size: 13px; font-weight: 850; color: var(--tone-c); background: var(--tone-soft); border: 1px solid var(--tone-bd); }
.exrm-sid { min-width: 0; flex: 1; }
.exrm-name { display: block; font-size: 14px; font-weight: 820; color: var(--ex-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.exrm-code { display: block; font-size: 11px; color: var(--ex-text-muted); }
.exrm-shred { position: absolute; inset: 0; display: flex; gap: 1px; pointer-events: none; }
.exrm-strip { flex: 1; background: var(--ex-surface); border-top: 2px solid var(--tone-c);
  animation: exrm-shred 0.7s cubic-bezier(0.5, 0, 0.75, 0) forwards; animation-delay: calc((var(--s) - 1) * 0.045s); transform-origin: top center; }

/* eligibility note */
.exrm-note { display: flex; gap: 9px; padding: 10px 12px; border-radius: 12px; background: var(--ex-steel-soft); border: 1px solid var(--ex-border); }
.exrm-note .nt-ic { color: var(--ex-text-muted); flex-shrink: 0; margin-top: 1px; }
.exrm-note p { font-size: 12px; line-height: 1.5; color: var(--ex-text-secondary); margin: 0; }

/* consequence */
.exrm-conseq { padding: 11px 13px; border-radius: 12px; background: var(--tone-soft); border: 1px solid var(--tone-bd); }
.cq-h { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; letter-spacing: 0.04em; text-transform: uppercase; color: var(--tone-c); }
.exrm-conseq ul { list-style: none; margin: 8px 0 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.exrm-conseq li { display: flex; align-items: flex-start; gap: 8px; font-size: 12.5px; line-height: 1.45; color: var(--ex-text-secondary); }
.cq-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--tone-c); flex-shrink: 0; margin-top: 6px; }

/* fields */
.exrm-fld { display: flex; flex-direction: column; gap: 7px; }
.exrm-fld label { font-size: 11px; font-weight: 750; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ex-text-muted); }
.exrm-fld label i { color: var(--tone-c); font-style: normal; }
.exrm-fld label .opt { font-size: 10px; font-weight: 600; text-transform: none; letter-spacing: 0; color: var(--ex-text-dim); margin-left: 5px; }
.reason-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
.reason-chip { display: inline-flex; align-items: center; gap: 8px; padding: 9px 11px; border-radius: 11px; cursor: pointer; text-align: left;
  background: var(--ex-surface); border: 1px solid var(--ex-border); color: var(--ex-text-secondary); font-size: 12px; font-weight: 650; font-family: inherit; }
.rc-tick { display: grid; place-items: center; width: 17px; height: 17px; border-radius: 6px; flex-shrink: 0;
  border: 1px solid var(--ex-border-strong); color: transparent; transition: all 0.2s; }
.reason-chip.on { border-color: var(--tone-bd); background: var(--tone-soft); color: var(--ex-text); }
.reason-chip.on .rc-tick { background: var(--tone-c); border-color: var(--tone-c); color: #fff; }
.exrm-fld textarea { width: 100%; padding: 10px 12px; border-radius: 10px; font-size: 13px; font-family: inherit; resize: vertical;
  background: rgba(0, 0, 0, 0.3); border: 1px solid var(--ex-border); color: var(--ex-text); transition: border-color 0.2s, box-shadow 0.2s; }
.exrm-fld textarea:focus { outline: none; border-color: var(--tone-bd); box-shadow: 0 0 0 3px var(--tone-soft); }
[data-theme="light"] .exrm-fld textarea { background: rgba(255, 250, 242, 0.72); }

/* acknowledgment */
.exrm-ack { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 12px; cursor: pointer; text-align: left;
  background: var(--ex-surface); border: 1px solid var(--ex-border); transition: border-color 0.2s, background 0.2s; font-family: inherit; }
.exrm-ack:hover { border-color: var(--ex-border-strong); }
.exrm-ack.on { border-color: var(--tone-bd); background: var(--tone-soft); }
.ack-box { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 7px; flex-shrink: 0;
  border: 1.5px solid var(--ex-border-strong); color: transparent; transition: all 0.2s; }
.exrm-ack.on .ack-box { background: var(--tone-c); border-color: var(--tone-c); color: #fff; }
.ack-txt { font-size: 12.5px; font-weight: 650; color: var(--ex-text-secondary); }
.exrm-ack.on .ack-txt { color: var(--ex-text); }

.exrm-foot { position: relative; display: flex; justify-content: flex-end; gap: 8px; padding: 12px 20px 18px; }
.exrm-btn { display: inline-flex; align-items: center; gap: 6px; padding: 10px 17px; border-radius: 12px; font-size: 13px; font-weight: 800; cursor: pointer; font-family: inherit; }
.exrm-btn.ghost { background: transparent; border: 1px solid var(--ex-border-strong); color: var(--ex-text-secondary); }
.exrm-btn.danger { border: none; color: #fff; background: linear-gradient(135deg, var(--tone-c), color-mix(in srgb, var(--tone-c) 60%, #000));
  box-shadow: 0 8px 22px -10px var(--tone-c); }
.exrm-btn.danger.off { opacity: 0.5; cursor: not-allowed; box-shadow: none; }
.spin { animation: ex-spin-slow 0.8s linear infinite; }

@keyframes exrm-pulse { 0% { transform: scale(1); opacity: 0.7; } 100% { transform: scale(1.4); opacity: 0; } }
@keyframes exrm-shred {
  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(120%) rotate(calc((var(--s) - 5) * 3deg)); opacity: 0; }
}

@media (max-width: 480px) { .reason-grid { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) {
  .exrm-aura, .exrm-pulse, .spin { animation: none; }
  .exrm-strip { animation-duration: 0.3s; }
}
</style>
