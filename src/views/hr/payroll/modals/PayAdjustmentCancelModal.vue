<template>
  <Teleport to="body">
    <transition name="paym-fade">
      <div v-if="open" class="paym-overlay cnl-overlay" @mousedown.self="$emit('close')">
        <Motion class="paym-modal confirm" as="div"
          :initial="{ opacity: 0, y: 30, scale: 0.95 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ duration: 0.5, ease: [0.16,1,0.3,1] }">
          <span class="paym-foil" />
          <button class="paym-x" @click="$emit('close')"><X :size="18" /></button>

          <header class="paym-hero">
            <div class="undock-coin">
              <span class="undock-ticket" aria-hidden="true"><Scissors :size="20" /></span>
              <span class="undock-flow" aria-hidden="true" />
              <span class="void-band" aria-hidden="true">VOID</span>
            </div>
            <div class="paym-hero-txt">
              <p class="paym-eyebrow"><Undo2 :size="11" /> Recall · {{ kindLabel }}</p>
              <h2 class="paym-title">Pull this ticket off the pay run?</h2>
              <p class="paym-sub">This {{ kindLabel.toLowerCase() }} is pulled back before it posts. It stays in the ledger as <b>cancelled</b> — it won't appear on any payslip.</p>
            </div>
          </header>

          <div v-if="item?.status === 'APPROVED'" class="armed-note">
            <Anchor :size="14" />
            <span>Currently <b>armed</b> for <b>{{ runLabel }}</b>. Pulling it off removes it from that run before posting.<template v-if="item?.payroll_ref"> · ref {{ item.payroll_ref }}</template></span>
          </div>

          <!-- mini flight strip -->
          <div class="strip">
            <span class="sn done"><span class="sd" /><span class="sl">Armed</span></span>
            <span class="slink" />
            <span class="sn now"><span class="sd"><Scissors :size="10" /></span><span class="sl">Pull</span></span>
            <span class="slink" />
            <span class="sn end"><span class="sd" /><span class="sl">Cancelled</span></span>
          </div>

          <div class="paym-body">
            <div class="cnl-field">
              <span class="paym-label">Why pull it off the run? <b class="paym-req">*</b></span>
              <div class="cnl-reasons">
                <Motion v-for="(r, i) in REASONS" :key="r.key" as="button" type="button" class="cnl-r"
                  :class="{ on: sel === r.key }"
                  :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
                  :transition="{ duration: 0.32, delay: 0.08 + i*0.04, ease: [0.16,1,0.3,1] }"
                  :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="sel = r.key">
                  <span class="cnl-r-ico"><component :is="r.icon" :size="15" /></span>
                  <span class="cnl-r-lbl">{{ r.label }}</span>
                  <span class="cnl-r-check"><Check :size="13" /></span>
                </Motion>
              </div>
            </div>

            <label class="paym-field" :style="{'--i':6}">
              <span>{{ sel === 'OTHER' ? 'Describe the reason' : 'Additional notes' }}
                <b v-if="sel === 'OTHER'" class="paym-req">*</b><em v-else class="cnl-opt">optional</em></span>
              <textarea v-model="details" rows="2"
                :placeholder="sel === 'OTHER' ? 'Explain why this is being recalled…' : 'Add context for the audit log…'" />
            </label>

            <div class="paym-note">
              <Info :size="15" />
              <span>Status becomes <b>cancelled</b> (terminal) — it will not post or show on the payslip. <b>Paid</b> adjustments are locked and can't be pulled. Your reason is written to the audit log.</span>
            </div>
          </div>

          <footer class="paym-foot">
            <button class="paym-btn ghost" @click="$emit('close')">Keep queued</button>
            <button class="paym-btn primary" :disabled="!valid || busy" @click="submit">
              <Scissors :size="14" style="margin-right:6px;vertical-align:-2px" />{{ busy ? 'Pulling…' : 'Pull off run' }}
            </button>
          </footer>
        </Motion>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  X, Scissors, Undo2, Anchor, Info, Check,
  AlertTriangle, Calculator, Clock, UserX, RefreshCw, MoreHorizontal,
} from 'lucide-vue-next'

const props = defineProps({
  open: Boolean,
  item: { type: Object, default: null },
  kindLabel: { type: String, default: 'Adjustment' },
  runLabel: { type: String, default: '' },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['close', 'confirm'])

const REASONS = [
  { key: 'ERROR',     label: 'Approved in error',           icon: AlertTriangle },
  { key: 'REVIEW',    label: 'Amount under review',         icon: Calculator },
  { key: 'POSTPONE',  label: 'Postpone to a later run',     icon: Clock },
  { key: 'DISPUTE',   label: 'Employee dispute',            icon: UserX },
  { key: 'REPLACED',  label: 'Replaced by another',         icon: RefreshCw },
  { key: 'OTHER',     label: 'Other',                       icon: MoreHorizontal },
]
const LABEL = Object.fromEntries(REASONS.map(r => [r.key, r.label]))

const sel = ref(''); const details = ref('')
watch(() => props.open, (o) => { if (o) { sel.value = ''; details.value = '' } })

const valid = computed(() => !!sel.value && (sel.value !== 'OTHER' || details.value.trim().length >= 3))
const submit = () => {
  if (!valid.value) return
  const note = details.value.trim()
  const reason = sel.value === 'OTHER' ? note : LABEL[sel.value]
  emit('confirm', { reason, note: sel.value === 'OTHER' ? undefined : (note || undefined) })
}
</script>

<style scoped>
.cnl-overlay { z-index: 4200; }
.cnl-opt { font-style: normal; font-weight: 600; text-transform: none; letter-spacing: 0; color: var(--pay-text-muted); margin-left: 4px; }

/* un-dock hero — ticket reverses out of dock, flow retracts, VOID sweeps */
.undock-coin { position: relative; flex-shrink: 0; width: 54px; height: 54px; border-radius: 16px; display: grid; place-items: center; }
.undock-ticket { width: 54px; height: 54px; border-radius: 16px; display: grid; place-items: center; color: #1a1206;
  background: linear-gradient(135deg, #fde68a, #fbbf24, #f59e0b);
  box-shadow: 0 12px 32px -8px rgba(245,158,11,0.5), inset 0 1px 0 rgba(255,255,255,0.45);
  animation: ud-reverse 1.8s var(--pay-ease) infinite; }
.undock-flow { position: absolute; left: -22px; top: 50%; width: 22px; height: 2px;
  background: linear-gradient(90deg, transparent, var(--pay-amber)); animation: ud-retract 1.8s var(--pay-ease) infinite; }
.void-band { position: absolute; inset: 0; border-radius: 16px; display: grid; place-items: center;
  font-family: var(--pay-mono); font-size: 11px; font-weight: 800; letter-spacing: 0.18em; color: #fff;
  background: rgba(194,65,12,0.55); opacity: 0; animation: ud-void 1.8s ease-in-out infinite; }
@keyframes ud-reverse { 0%,100% { transform: translateX(0) rotate(0); } 50% { transform: translateX(-5px) rotate(3deg); } }
@keyframes ud-retract { 0% { opacity: 0; transform: scaleX(1); transform-origin: left; }
  40% { opacity: 1; } 100% { opacity: 0; transform: scaleX(0); transform-origin: right; } }
@keyframes ud-void { 0%,60% { opacity: 0; } 72% { opacity: 1; } 100% { opacity: 0; } }

/* armed note */
.armed-note { display: flex; align-items: flex-start; gap: 9px; margin: 0 24px 2px; padding: 10px 13px; border-radius: 11px;
  background: rgba(245,158,11,0.1); border: 1px solid var(--pay-border); font-size: 12px; line-height: 1.45; color: var(--pay-text-2);
  animation: pay-rise 0.5s var(--pay-ease) both; animation-delay: 0.16s; }
.armed-note svg { color: var(--pay-amber); flex: none; margin-top: 1px; }
.armed-note b { color: var(--pay-text); }

/* mini flight strip */
.strip { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 6px 24px 2px; }
.sn { display: flex; flex-direction: column; align-items: center; gap: 5px; }
.sd { width: 22px; height: 22px; border-radius: 50%; display: grid; place-items: center; background: var(--pay-surface);
  border: 2px solid var(--pay-text-muted); color: var(--pay-text-muted); }
.sl { font-size: 9.5px; font-family: var(--pay-mono); color: var(--pay-text-muted); }
.sn.done .sd { background: var(--pay-amber); border-color: var(--pay-amber); }
.sn.done .sl { color: var(--pay-text-2); }
.sn.now .sd { background: var(--pay-grad-cta); border-color: transparent; color: #1a1206; animation: pay-node-halo 1.8s ease-in-out infinite; }
.sn.now .sl { color: var(--pay-treasury); font-weight: 700; }
.sn.end .sd { border-style: dashed; }
.slink { width: 26px; height: 2px; background: var(--pay-border-soft); margin-bottom: 14px; }

.cnl-field { display: flex; flex-direction: column; gap: 8px; animation: pay-rise 0.5s var(--pay-ease) both; animation-delay: 0.12s; }
.cnl-reasons { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
@media (max-width: 480px) { .cnl-reasons { grid-template-columns: 1fr; } }
.cnl-r { position: relative; display: flex; align-items: center; gap: 10px; text-align: left; padding: 11px 13px;
  border-radius: 12px; cursor: pointer; overflow: hidden; border: 1px solid var(--pay-border-soft);
  background: var(--hr-input-bg); color: var(--pay-text-2);
  transition: border-color 0.18s var(--pay-ease), background 0.18s var(--pay-ease), color 0.18s var(--pay-ease); }
.cnl-r:hover { border-color: var(--pay-border); color: var(--pay-text); }
.cnl-r-ico { flex-shrink: 0; width: 28px; height: 28px; border-radius: 9px; display: grid; place-items: center;
  background: rgba(245,158,11,0.14); color: var(--pay-amber); transition: background 0.18s, color 0.18s; }
.cnl-r-lbl { flex: 1; font-size: 12.5px; font-weight: 600; line-height: 1.25; }
.cnl-r-check { flex-shrink: 0; opacity: 0; transform: scale(0.4); color: var(--pay-amber);
  transition: opacity 0.22s var(--pay-spring), transform 0.22s var(--pay-spring); }
.cnl-r.on { border-color: var(--pay-amber); color: var(--pay-text); background: rgba(245,158,11,0.1);
  box-shadow: 0 8px 22px -14px rgba(245,158,11,0.6); }
.cnl-r.on .cnl-r-ico { background: var(--pay-grad-cta); color: #1a1206; }
.cnl-r.on .cnl-r-check { opacity: 1; transform: scale(1); }

[data-theme="light"] .cnl-r.on .cnl-r-ico { color: #2a1a06; }
[data-theme="light"] .void-band { color: #fff; }
@media (prefers-reduced-motion: reduce) {
  .cnl-field, .cnl-r-check, .undock-ticket, .undock-flow, .void-band, .sn.now .sd, .armed-note { animation: none !important; transition: none !important; }
}
</style>
