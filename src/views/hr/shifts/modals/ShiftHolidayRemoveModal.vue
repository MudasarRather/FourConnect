<template>
  <Teleport to="body">
    <transition name="hrm-modal" appear>
      <div v-if="open" class="hrm-scrim" @click.self="onCancel" @mousedown.self.stop>
        <div class="hrm-motes" aria-hidden="true">
          <span v-for="n in 14" :key="n" class="hrm-mote" :style="moteStyle(n)" />
        </div>

        <Motion as="div" class="hrm-modal" role="dialog" aria-modal="true"
          :initial="{ opacity: 0, y: 30, scale: 0.9, rotateX: -8 }"
          :animate="{ opacity: 1, y: 0, scale: 1, rotateX: 0 }"
          :transition="{ duration: 0.52, ease: [0.16, 1, 0.3, 1] }">

          <div class="hrm-aurora" aria-hidden="true"><span class="orb a1" /><span class="orb a2" /></div>
          <div class="hrm-grid" aria-hidden="true" />
          <div class="hrm-scan" aria-hidden="true" />

          <div class="hrm-body" v-if="assignment">
            <!-- HERO -->
            <header class="hrm-hero">
              <button class="hrm-close" @click="onCancel" aria-label="Close"><X :size="15" /></button>
              <Motion as="div" class="hrm-hero-row"
                :initial="{ y: -10, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
                :transition="{ duration: 0.5, delay: 0.08, ease: [0.16,1,0.3,1] }">
                <div class="hrm-hero-icon">
                  <UserMinus :size="22" />
                  <span class="ic-ring" /><span class="ic-pulse" /><span class="ic-glow" />
                </div>
                <div class="hrm-hero-text">
                  <span class="hrm-eyebrow"><span class="eye-dot" /> STAND-DOWN · HOLIDAY ROSTER</span>
                  <h2 class="hrm-title">Remove from this holiday?</h2>
                  <p class="hrm-sub">Frees the on-duty slot for <b>{{ holidayName }}</b>. Reversible — you can re-assign them at any time.</p>
                </div>
              </Motion>
            </header>

            <!-- ASSIGNMENT PREVIEW -->
            <Motion as="div" class="hrm-preview"
              :initial="{ y: 14, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
              :transition="{ duration: 0.45, delay: 0.16, ease: [0.16,1,0.3,1] }">
              <div class="pv-av" :style="{ '--c': comp.color }">{{ initials(assignment.employee_name) }}</div>
              <div class="pv-info">
                <div class="pv-row">
                  <span class="pv-name">{{ assignment.employee_name || 'Employee' }}</span>
                  <span class="pv-unlink" aria-hidden="true"><Unlink :size="13" /></span>
                  <span class="pv-shift">{{ assignment.shift_name || assignment.shift_code || 'Any shift' }}</span>
                </div>
                <div class="pv-meta">
                  <span class="pv-comp" :data-tone="comp.tone"><component :is="comp.icon" :size="11" /> {{ comp.label }}</span>
                  <span class="pv-hol"><Palmtree :size="11" /> {{ holidayName }}</span>
                  <span class="pv-date mono">{{ longDate }}</span>
                </div>
              </div>
              <span class="pv-dial" :style="{ '--c': comp.color, '--frac': Math.min(1, (Number(assignment.pay_multiplier) || 1) / 3) }">
                <span class="pv-dial-num">{{ Number(assignment.pay_multiplier || 1).toFixed(assignment.pay_multiplier % 1 ? 2 : 1) }}×</span>
              </span>
            </Motion>

            <!-- REASON -->
            <Motion as="section" class="hrm-section"
              :initial="{ y: 14, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
              :transition="{ duration: 0.45, delay: 0.24, ease: [0.16,1,0.3,1] }">
              <div class="hrm-shead"><ScrollText :size="11" /> <span>Reason for stand-down</span> <span class="req">required</span></div>
              <div class="reason-grid">
                <Motion as="button" type="button" v-for="(r, i) in REASONS" :key="r.key"
                  class="reason" :class="{ on: picked === r.key }"
                  :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
                  :transition="{ duration: 0.3, delay: 0.3 + i * 0.04, ease: [0.16,1,0.3,1] }"
                  :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }" @click="pick(r.key)">
                  <span class="r-ic"><component :is="r.icon" :size="14" /></span>
                  <span class="r-meta"><b>{{ r.label }}</b><small>{{ r.hint }}</small></span>
                  <span class="r-tick"><Check v-if="picked === r.key" :size="12" /></span>
                </Motion>
              </div>
            </Motion>

            <!-- NOTE -->
            <Motion as="section" class="hrm-section"
              :initial="{ y: 14, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
              :transition="{ duration: 0.45, delay: 0.36, ease: [0.16,1,0.3,1] }">
              <div class="hrm-shead"><NotebookPen :size="11" /> <span>{{ picked === 'OTHER' ? 'Describe the reason' : 'Note' }}</span>
                <span v-if="picked === 'OTHER'" class="req">required</span><span v-else class="opt">optional</span></div>
              <div class="notes-wrap">
                <textarea v-model.trim="notes" class="hrm-textarea" :maxlength="500" rows="2"
                  :placeholder="picked === 'OTHER' ? 'Explain why this employee is standing down…' : 'Add context for the roster log…'" />
                <span class="notes-count mono">{{ notes.length }}/500</span>
              </div>
            </Motion>

            <!-- WHAT HAPPENS -->
            <Motion as="section" class="hrm-section"
              :initial="{ y: 14, opacity: 0 }" :animate="{ y: 0, opacity: 1 }"
              :transition="{ duration: 0.45, delay: 0.46, ease: [0.16,1,0.3,1] }">
              <div class="hrm-shead"><ShieldQuestion :size="11" /> <span>What happens</span></div>
              <ul class="conseq">
                <li><span class="cq" /><span>Removed from the <b>{{ holidayName }}</b> on-duty roster &amp; the compensation mix.</span></li>
                <li><span class="cq" /><span v-if="isCash">No more <b>{{ comp.label.toLowerCase() }}</b> premium for this holiday — payroll re-derives it each run, so the next payslip won't include it.</span>
                  <span v-else>The <b>{{ comp.label.toLowerCase() }}</b> credit for this holiday is withdrawn.</span></li>
                <li><span class="cq ok" /><span><b>Reversible &amp; audited</b> — the reason is logged, and you can re-assign them anytime.</span></li>
              </ul>
            </Motion>
          </div>

          <!-- FOOTER -->
          <footer class="hrm-foot">
            <button type="button" class="hrm-btn ghost" :disabled="busy" @click="onCancel">Cancel</button>
            <div class="foot-gap" />
            <Motion as="button" type="button" class="hrm-btn danger" :class="{ armed: canConfirm }"
              :disabled="!canConfirm || busy" :whileHover="canConfirm ? { y: -2 } : {}" :whileTap="canConfirm ? { scale: 0.96 } : {}"
              @click="onConfirm">
              <Loader2 v-if="busy" :size="14" class="spin" /><UserMinus v-else :size="14" />
              <span>{{ busy ? 'Standing down…' : 'Confirm removal' }}</span>
              <span v-if="canConfirm && !busy" class="flare" aria-hidden="true" />
            </Motion>
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
  X, UserMinus, Unlink, ScrollText, NotebookPen, ShieldQuestion, Check, Loader2,
  Palmtree, Repeat, XCircle, CalendarOff, Copy, CalendarCheck2, Coins, Timer, Gift,
} from 'lucide-vue-next'

const props = defineProps({
  open: { type: Boolean, default: false },
  assignment: { type: Object, default: null }, // holiday-shift row (employee_name, compensation, pay_multiplier, shift_name…)
  holiday: { type: Object, default: null },     // { name, date } — falls back to assignment fields
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['cancel', 'confirm'])

const REASONS = [
  { key: 'NOT_REQUIRED',  label: 'Not required',    hint: 'Coverage no longer needed', icon: XCircle },
  { key: 'REASSIGNED',    label: 'Reassigned',      hint: 'Working a different shift',  icon: Repeat },
  { key: 'ON_LEAVE',      label: 'On leave',        hint: 'Off that day',               icon: CalendarOff },
  { key: 'RESTING',       label: 'Resting instead', hint: 'Comp-off / day off granted', icon: CalendarCheck2 },
  { key: 'DUPLICATE',     label: 'Duplicate',       hint: 'Added by mistake',           icon: Copy },
  { key: 'OTHER',         label: 'Other',           hint: 'Explain in the note',        icon: NotebookPen },
]

const COMP = {
  DOUBLE_PAY:        { label: 'Double pay',        color: 'var(--shift-amber)',     icon: Coins, tone: 'gold',    cash: true },
  OVERTIME:          { label: 'Overtime',          color: 'var(--shift-ember)',     icon: Timer, tone: 'ember',   cash: true },
  HOLIDAY_ALLOWANCE: { label: 'Holiday allowance', color: 'var(--shift-ok)',        icon: Gift,  tone: 'ok',      cash: true },
  COMP_OFF:          { label: 'Comp-off',          color: 'var(--shift-text-muted)',icon: CalendarOff, tone: 'neutral', cash: false },
}

const picked = ref(null)
const notes = ref('')

const comp = computed(() => COMP[props.assignment?.compensation] || COMP.DOUBLE_PAY)
const isCash = computed(() => comp.value.cash)
const holidayName = computed(() => props.holiday?.name || props.assignment?.holiday_name || 'this holiday')
const holDate = computed(() => props.holiday?.date || props.assignment?.holiday_date || '')
const longDate = computed(() => {
  const s = holDate.value
  if (!s) return ''
  const d = new Date(s + 'T00:00:00')
  return isNaN(d) ? s : d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
})

const initials = (n) => (n || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'
const pick = (k) => { picked.value = picked.value === k ? null : k }

const canConfirm = computed(() => {
  if (!picked.value) return false
  if (picked.value === 'OTHER' && !notes.value.trim()) return false
  return true
})

const composedReason = computed(() => {
  if (!picked.value) return ''
  const r = REASONS.find(x => x.key === picked.value)
  const label = r?.label || picked.value
  const t = notes.value.trim()
  if (picked.value === 'OTHER') return t || label
  return t ? `${label} — ${t}` : label
})

const reset = () => { picked.value = null; notes.value = '' }
watch(() => props.open, (v) => { if (v) reset() })

const onCancel = () => { if (!props.busy) emit('cancel') }
const onConfirm = () => {
  if (!canConfirm.value || props.busy) return
  emit('confirm', { reason: composedReason.value, reason_category: picked.value })
}

const moteStyle = (n) => {
  const x = (n * 53) % 100, y = (n * 71) % 100
  const dur = 6 + ((n * 3) % 7), delay = (n % 5) * 0.45, size = 2 + (n % 3)
  return { left: `${x}%`, top: `${y}%`, width: `${size}px`, height: `${size}px`, animationDuration: `${dur}s`, animationDelay: `${delay}s` }
}
</script>

<style scoped>
.hrm-scrim {
  position: fixed; inset: 0; z-index: 1210; display: flex; align-items: center; justify-content: center; padding: 24px;
  background:
    radial-gradient(60% 60% at 50% 36%, rgba(234, 88, 12, 0.22), transparent 65%),
    radial-gradient(90% 90% at 50% 50%, rgba(8, 7, 6, 0.6), rgba(3, 3, 4, 0.78));
  backdrop-filter: blur(15px) saturate(150%); -webkit-backdrop-filter: blur(15px) saturate(150%);
  perspective: 1400px; overflow-y: auto;
}
.hrm-motes { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
.hrm-mote { position: absolute; border-radius: 50%; background: radial-gradient(circle, rgba(253, 230, 138, 0.9), rgba(251, 146, 60, 0)); box-shadow: 0 0 10px rgba(251, 146, 60, 0.5); opacity: 0.6; animation: hrm-float linear infinite; }
@keyframes hrm-float { 0% { transform: translate3d(0, 18vh, 0) scale(0.6); opacity: 0; } 15% { opacity: 0.65; } 85% { opacity: 0.65; } 100% { transform: translate3d(26px, -116vh, 0) scale(1.2); opacity: 0; } }

.hrm-modal {
  position: relative; width: 552px; max-width: calc(100vw - 32px); max-height: calc(100vh - 48px);
  display: flex; flex-direction: column; border-radius: 24px; overflow: hidden; isolation: isolate;
  background:
    linear-gradient(180deg, #fde68a 0%, #fbbf24 22%, #f59e0b 50%, #ea580c 100%) left top / 5px 100% no-repeat,
    radial-gradient(70% 110% at 0% 50%, rgba(251, 146, 60, 0.16), transparent 55%),
    radial-gradient(90% 60% at 100% 100%, rgba(234, 88, 12, 0.12), transparent 60%),
    linear-gradient(180deg, rgba(18, 18, 20, 0.96), rgba(13, 13, 15, 0.96));
  border: 1px solid var(--shift-border); border-left: none;
  box-shadow: 0 60px 120px -40px rgba(0,0,0,0.92), inset 12px 0 30px -14px rgba(251, 146, 60, 0.4), inset 5px 0 0 -4px rgba(251, 191, 36, 0.8);
}
.hrm-aurora { position: absolute; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }
.hrm-aurora .orb { position: absolute; border-radius: 50%; filter: blur(68px); opacity: 0.5; }
.hrm-aurora .a1 { width: 300px; height: 300px; top: -120px; right: -100px; background: radial-gradient(circle, rgba(251, 146, 60, 0.5), transparent 70%); animation: hrm-orb-a 18s ease-in-out infinite; }
.hrm-aurora .a2 { width: 240px; height: 240px; bottom: -90px; left: -70px; background: radial-gradient(circle, rgba(245, 158, 11, 0.4), transparent 70%); animation: hrm-orb-b 22s ease-in-out infinite; }
@keyframes hrm-orb-a { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-26px,34px) scale(1.08); } }
@keyframes hrm-orb-b { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px,-22px) scale(1.1); } }
.hrm-grid { position: absolute; inset: 0; pointer-events: none; z-index: 0; background-image: radial-gradient(rgba(251, 191, 36, 0.08) 1px, transparent 1px); background-size: 22px 22px; opacity: 0.55; mask-image: linear-gradient(180deg, rgba(0,0,0,0.4), transparent 80%); }
.hrm-scan { position: absolute; inset: 0; pointer-events: none; z-index: 1; overflow: hidden; }
.hrm-scan::after { content: ''; position: absolute; left: 0; right: 0; height: 80px; background: linear-gradient(180deg, transparent, rgba(251, 191, 36, 0.16), transparent); filter: blur(6px); transform: translateY(-100%); animation: hrm-sweep 1.6s 0.2s cubic-bezier(0.16,1,0.3,1) forwards; }
@keyframes hrm-sweep { to { transform: translateY(100vh); opacity: 0; } }

.hrm-body { flex: 1; min-height: 0; display: flex; flex-direction: column; gap: 16px; padding: 26px 26px 18px 36px; overflow-y: auto; position: relative; z-index: 2;
  scrollbar-width: thin; scrollbar-color: rgba(251,191,36,0.3) transparent; }
.hrm-body::-webkit-scrollbar { width: 5px; }
.hrm-body::-webkit-scrollbar-thumb { background: linear-gradient(180deg, rgba(251,191,36,0.3), rgba(234,88,12,0.45)); border-radius: 3px; }

/* hero */
.hrm-hero { position: relative; padding-right: 32px; }
.hrm-close { position: absolute; top: -4px; right: -4px; display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; cursor: pointer;
  background: rgba(255,255,255,0.05); border: 1px solid var(--shift-border); color: var(--shift-amber); transition: transform .35s cubic-bezier(0.16,1,0.3,1), background .25s; }
.hrm-close:hover { transform: rotate(90deg); background: rgba(251,146,60,0.18); }
.hrm-hero-row { display: flex; align-items: flex-start; gap: 14px; }
.hrm-hero-icon { position: relative; display: grid; place-items: center; width: 52px; height: 52px; border-radius: 16px; flex-shrink: 0;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.24), rgba(234, 88, 12, 0.2)); border: 1px solid var(--shift-border); color: var(--shift-amber); box-shadow: 0 10px 28px -10px rgba(251, 146, 60, 0.6); }
.ic-ring { position: absolute; inset: -5px; border-radius: 19px; pointer-events: none;
  background: conic-gradient(from 0deg, transparent, var(--shift-amber), transparent 25%, transparent 50%, var(--shift-ember), transparent 75%);
  -webkit-mask: radial-gradient(transparent 56%, #000 58%); mask: radial-gradient(transparent 56%, #000 58%); animation: hrm-ring 6s linear infinite; opacity: 0.85; }
@keyframes hrm-ring { to { transform: rotate(360deg); } }
.ic-pulse { position: absolute; inset: 0; border-radius: 16px; pointer-events: none; animation: hrm-pulse 2.2s ease-out infinite; }
@keyframes hrm-pulse { 0% { box-shadow: 0 0 0 0 rgba(251, 146, 60, 0.55); } 70% { box-shadow: 0 0 0 14px rgba(251, 146, 60, 0); } 100% { box-shadow: 0 0 0 0 rgba(251, 146, 60, 0); } }
.ic-glow { position: absolute; inset: -16px; border-radius: 28px; pointer-events: none; z-index: -1; background: radial-gradient(circle, rgba(251, 146, 60, 0.3), transparent 65%); animation: hrm-glow 3.6s ease-in-out infinite; }
@keyframes hrm-glow { 0%,100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.12); } }
.hrm-hero-text { display: flex; flex-direction: column; gap: 5px; min-width: 0; flex: 1; }
.hrm-eyebrow { display: inline-flex; align-items: center; gap: 7px; font-family: var(--shift-mono); font-size: 9px; font-weight: 800; letter-spacing: 0.16em; color: var(--shift-amber-strong); width: max-content; }
.eye-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--shift-ember); box-shadow: 0 0 8px var(--shift-ember); animation: hrm-eye 1.6s ease-in-out infinite; }
@keyframes hrm-eye { 0%,100% { opacity: 0.7; transform: scale(1); } 50% { opacity: 1; transform: scale(1.4); } }
.hrm-title { margin: 0; font-size: 21px; font-weight: 800; letter-spacing: -0.018em; line-height: 1.15; color: var(--shift-text); }
.hrm-sub { margin: 2px 0 0; font-size: 12.5px; line-height: 1.5; color: var(--shift-text-muted); }
.hrm-sub b { color: var(--shift-text-2); font-weight: 700; }

/* preview */
.hrm-preview { position: relative; display: flex; align-items: center; gap: 13px; padding: 13px 14px; border-radius: 14px;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); }
.pv-av { width: 44px; height: 44px; border-radius: 50%; flex-shrink: 0; display: grid; place-items: center; font-size: 14px; font-weight: 800; font-family: var(--shift-mono);
  color: #1f1408; background: linear-gradient(135deg, color-mix(in srgb, var(--c) 88%, white), var(--c)); box-shadow: 0 0 14px -3px var(--c); }
.pv-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 7px; }
.pv-row { display: flex; align-items: center; gap: 9px; }
.pv-name { font-size: 13.5px; font-weight: 700; color: var(--shift-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pv-unlink { color: var(--shift-ember); display: inline-grid; place-items: center; flex-shrink: 0; }
.pv-shift { font-family: var(--shift-mono); font-size: 10.5px; font-weight: 700; padding: 2px 8px; border-radius: 6px; color: var(--shift-text-2); background: rgba(255,255,255,0.05); border: 1px solid var(--shift-border-soft); margin-left: auto; white-space: nowrap; }
.pv-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 8px; }
.pv-comp { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 700; padding: 3px 9px; border-radius: 999px; background: rgba(255,255,255,0.04); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); }
.pv-comp[data-tone="gold"] { color: var(--shift-amber); } .pv-comp[data-tone="ember"] { color: var(--shift-ember-strong); } .pv-comp[data-tone="ok"] { color: var(--shift-ok); }
.pv-hol { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--shift-text-muted); }
.pv-hol svg { color: var(--shift-amber); }
.pv-date { font-size: 10.5px; color: var(--shift-text-dim); }
.mono { font-family: var(--shift-mono); }
.pv-dial { position: relative; width: 46px; height: 46px; border-radius: 50%; flex-shrink: 0; display: grid; place-items: center;
  background: conic-gradient(var(--c) calc(var(--frac) * 360deg), var(--shift-border-soft) 0); }
.pv-dial::before { content: ''; position: absolute; inset: 4px; border-radius: 50%; background: var(--shift-surface-2); }
.pv-dial-num { position: relative; font-family: var(--shift-mono); font-size: 12px; font-weight: 800; color: var(--shift-text); }

/* sections */
.hrm-section { display: flex; flex-direction: column; gap: 9px; }
.hrm-shead { display: flex; align-items: center; gap: 6px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--shift-text-muted); }
.hrm-shead > svg { color: var(--shift-amber); }
.req { margin-left: auto; font-size: 9px; font-weight: 800; letter-spacing: 0.06em; color: var(--shift-ember-strong); padding: 2px 7px; border-radius: 999px; background: var(--shift-warn-soft); border: 1px solid color-mix(in srgb, var(--shift-ember) 30%, transparent); }
.opt { margin-left: auto; font-size: 10px; font-weight: 600; letter-spacing: 0; text-transform: none; color: var(--shift-text-dim); }

.reason-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.reason { position: relative; display: flex; align-items: center; gap: 10px; padding: 10px 11px; border-radius: 12px; cursor: pointer; text-align: left;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); transition: border-color .2s, background .2s, box-shadow .2s; }
.reason:hover { border-color: var(--shift-border); }
.reason.on { border-color: var(--shift-amber); background: rgba(251,191,36,0.1); box-shadow: 0 8px 22px -12px rgba(251, 146, 60, 0.6); }
.r-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0; background: rgba(251,191,36,0.12); color: var(--shift-amber); }
.reason.on .r-ic { background: var(--shift-grad-cta); color: #1f1408; }
.r-meta { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.r-meta b { font-size: 12px; font-weight: 700; color: var(--shift-text); line-height: 1.2; }
.r-meta small { font-size: 10px; color: var(--shift-text-muted); }
.r-tick { display: grid; place-items: center; width: 18px; height: 18px; border-radius: 6px; flex-shrink: 0; background: transparent; border: 1px solid var(--shift-border-soft); color: var(--shift-amber); transition: 0.2s; }
.reason.on .r-tick { background: var(--shift-grad-cta); border-color: transparent; color: #1f1408; }

.notes-wrap { position: relative; }
.hrm-textarea { width: 100%; resize: vertical; min-height: 56px; padding: 10px 12px 22px; border-radius: 12px;
  background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); color: var(--shift-text); font: inherit; font-size: 12.5px; line-height: 1.5; outline: none; transition: border-color .2s, box-shadow .2s; }
.hrm-textarea:focus { border-color: var(--shift-amber); box-shadow: 0 0 0 3px rgba(251,191,36,0.1); }
.hrm-textarea::placeholder { color: var(--shift-text-dim); }
.notes-count { position: absolute; right: 10px; bottom: 8px; font-size: 9.5px; color: var(--shift-text-dim); pointer-events: none; }

.conseq { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
.conseq li { display: flex; gap: 9px; align-items: flex-start; font-size: 12px; line-height: 1.5; color: var(--shift-text-2); padding: 9px 11px; border-radius: 10px; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); }
.conseq li b { color: var(--shift-text); font-weight: 700; }
.cq { width: 6px; height: 6px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; background: var(--shift-ember); box-shadow: 0 0 8px rgba(251, 146, 60, 0.5); }
.cq.ok { background: var(--shift-ok); box-shadow: 0 0 8px rgba(52, 211, 153, 0.5); }

/* footer */
.hrm-foot { position: relative; z-index: 2; display: flex; align-items: center; gap: 10px; padding: 13px 22px 14px 36px; border-top: 1px solid var(--shift-border-soft); background: rgba(13,13,15,0.5); }
.foot-gap { flex: 1; }
.hrm-btn { position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 40px; padding: 0 18px; border-radius: 12px; cursor: pointer; font-size: 12.5px; font-weight: 700; overflow: hidden; transition: background .25s, border-color .25s, color .25s, box-shadow .25s, transform .2s; }
.hrm-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.hrm-btn.ghost { background: rgba(255,255,255,0.04); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); }
.hrm-btn.ghost:hover:not(:disabled) { background: rgba(255,255,255,0.08); color: var(--shift-text); }
.hrm-btn.danger { background: var(--shift-surface-2); border: 1px solid var(--shift-border); color: var(--shift-amber); }
.hrm-btn.danger.armed { background: var(--shift-grad-cta); border-color: transparent; color: #1f1408; box-shadow: 0 12px 30px -10px rgba(251, 146, 60, 0.7); animation: hrm-armed 2s ease-in-out infinite; }
@keyframes hrm-armed { 0%,100% { box-shadow: 0 12px 30px -10px rgba(251, 146, 60, 0.6); } 50% { box-shadow: 0 14px 36px -8px rgba(251, 146, 60, 0.85); } }
.flare { position: absolute; inset: 0; background: linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%); transform: translateX(-120%); animation: hrm-flare 2.5s linear infinite; pointer-events: none; }
@keyframes hrm-flare { 0% { transform: translateX(-120%); } 55%,100% { transform: translateX(160%); } }
.spin :deep(svg), .spin { animation: shift-spin 0.9s linear infinite; }

/* transitions */
.hrm-modal-enter-active { transition: opacity .4s cubic-bezier(0.16,1,0.3,1); }
.hrm-modal-leave-active { transition: opacity .28s ease; }
.hrm-modal-enter-from, .hrm-modal-leave-to { opacity: 0; }
.hrm-modal-leave-active .hrm-modal { transition: transform .28s cubic-bezier(0.16,1,0.3,1), opacity .28s; }
.hrm-modal-leave-to .hrm-modal { transform: translateY(12px) scale(0.97); opacity: 0; }

@media (max-width: 560px) { .reason-grid { grid-template-columns: 1fr; } .hrm-body { padding-left: 28px; } .pv-dial { display: none; } }
@media (prefers-reduced-motion: reduce) {
  .hrm-mote, .hrm-aurora .orb, .hrm-scan::after, .ic-ring, .ic-pulse, .ic-glow, .flare, .hrm-btn.danger.armed { animation: none; }
}

/* ═══════════ LIGHT THEME ═══════════ */
[data-theme="light"] .hrm-scrim {
  background:
    radial-gradient(60% 60% at 50% 36%, rgba(234, 88, 12, 0.16), transparent 65%),
    radial-gradient(90% 90% at 50% 50%, rgba(40, 30, 18, 0.22), rgba(30, 22, 14, 0.32));
}
[data-theme="light"] .hrm-modal {
  background:
    linear-gradient(180deg, #fbbf24 0%, #f59e0b 45%, #ea580c 100%) left top / 5px 100% no-repeat,
    radial-gradient(70% 110% at 0% 50%, rgba(251, 146, 60, 0.12), transparent 55%),
    radial-gradient(90% 60% at 100% 100%, rgba(234, 88, 12, 0.08), transparent 60%),
    rgba(255, 251, 245, 0.97);
  border-color: var(--shift-border); border-left: none;
  box-shadow: 0 60px 120px -40px rgba(40, 25, 10, 0.34), inset 12px 0 26px -14px rgba(234, 88, 12, 0.28), inset 5px 0 0 -4px rgba(245, 158, 11, 0.7);
}
[data-theme="light"] .hrm-aurora .orb { opacity: 0.3; }
[data-theme="light"] .hrm-grid { opacity: 0.35; }
[data-theme="light"] .hrm-close { background: rgba(40,25,10,0.05); }
[data-theme="light"] .hrm-close:hover { background: rgba(234,88,12,0.14); }
[data-theme="light"] .pv-shift,
[data-theme="light"] .pv-comp { background: rgba(40,32,20,0.05); }
[data-theme="light"] .hrm-foot { background: rgba(252, 245, 232, 0.62); }
[data-theme="light"] .hrm-btn.ghost { background: rgba(40,25,10,0.04); color: var(--shift-text-2); }
[data-theme="light"] .hrm-btn.ghost:hover:not(:disabled) { background: rgba(40,25,10,0.09); color: var(--shift-text); }
[data-theme="light"] .hrm-textarea:focus { box-shadow: 0 0 0 3px rgba(217,119,6,0.12); }
</style>
