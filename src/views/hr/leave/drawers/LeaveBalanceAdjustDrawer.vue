<template>
  <Teleport to="body">
    <transition name="ba">
      <div v-if="open && employee" class="ba-scrim" @click.self="$emit('close')">
        <aside class="ba-drawer" :data-sign="sign">
          <!-- ── Ambient depth: drifting orbs + dot texture + edge rail ── -->
          <span class="ba-orb ba-orb-a" aria-hidden="true" />
          <span class="ba-orb ba-orb-b" aria-hidden="true" />
          <span class="ba-tex" aria-hidden="true" />
          <span class="ba-rail" aria-hidden="true" />

          <!-- ════════ HEADER ════════ -->
          <Motion as="header" class="ba-head"
            :initial="{ opacity: 0, y: -14 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }"
          >
            <Motion as="button" class="ba-close" @click="$emit('close')"
              :whileHover="{ rotate: 90, scale: 1.08 }" :whileTap="{ scale: 0.9 }"
              aria-label="Close"
            ><X :size="15" /></Motion>

            <div class="ba-head-main">
              <Motion as="div" class="ba-icon"
                :initial="{ scale: 0.4, rotate: -30, opacity: 0 }"
                :animate="{ scale: 1, rotate: 0, opacity: 1 }"
                :transition="{ duration: 0.6, delay: 0.08, ease: [0.34, 1.56, 0.64, 1] }"
              >
                <PencilLine :size="20" />
                <span class="ba-icon-ring" />
                <span class="ba-icon-spark" />
              </Motion>
              <div class="ba-head-text">
                <span class="ba-eye leave-mono">
                  <span class="ba-eye-led" /> LEDGER&nbsp;ADJUSTMENT
                </span>
                <h3 class="ba-title">Adjust balance</h3>
                <div class="ba-emp">
                  <span class="ba-emp-av">{{ initials(employee.name) }}</span>
                  <span class="ba-emp-meta">
                    <b>{{ employee.name }}</b>
                    <span class="leave-mono">{{ employee.code }}</span>
                  </span>
                </div>
              </div>
            </div>
          </Motion>

          <!-- ════════ BODY ════════ -->
          <div class="ba-body">
            <!-- Lifecycle gate banner — credit is blocked for leaving/separated staff -->
            <transition name="ba-badge">
              <div v-if="!employable" class="ba-gate">
                <ShieldAlert :size="15" />
                <span>
                  This employee <b>is {{ stateLabel || 'leaving' }}</b> — new leave can’t be
                  <b>credited</b>. Only debit corrections are allowed until their record is settled.
                </span>
              </div>
            </transition>

            <!-- ─── 01 · Leave type picker ─── -->
            <Motion as="section" class="ba-block"
              :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.5, delay: 0.16, ease: [0.16, 1, 0.3, 1] }"
            >
              <span class="ba-label leave-mono">01 · Leave type</span>
              <div class="ba-types">
                <Motion v-for="(t, i) in TYPES" :key="t.key" as="button" type="button"
                  class="ba-type" :class="{ active: form.leave_type === t.key }"
                  :style="{ '--ty-c': t.hexWarm }"
                  :initial="{ opacity: 0, scale: 0.82 }"
                  :animate="{ opacity: 1, scale: 1 }"
                  :transition="{ duration: 0.34, delay: 0.2 + i * 0.03, ease: [0.34, 1.56, 0.64, 1] }"
                  :whileHover="{ y: -3, scale: 1.04 }"
                  :whileTap="{ scale: 0.95 }"
                  @click="form.leave_type = t.key"
                >
                  <LeaveTypeIcon :type="t.key" :size="15" />
                  <span class="ba-type-lbl">{{ t.label }}</span>
                  <span v-if="form.leave_type === t.key" class="ba-type-tick"><Check :size="11" /></span>
                </Motion>
              </div>
            </Motion>

            <!-- ─── 02 · Live projection gauge (the centrepiece) ─── -->
            <Motion as="section" class="ba-proj" :data-sign="sign"
              :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.5, delay: 0.24, ease: [0.16, 1, 0.3, 1] }"
            >
              <header class="ba-proj-head">
                <span class="ba-label leave-mono">02 · Projection</span>
                <transition name="ba-badge" mode="out-in">
                  <span class="ba-sign-badge" :key="sign">
                    <component :is="signIcon" :size="12" />
                    {{ sign === 'pos' ? 'CREDIT' : sign === 'neg' ? 'DEBIT' : 'NO CHANGE' }}
                  </span>
                </transition>
              </header>

              <!-- NOW row -->
              <div class="ba-meter">
                <div class="ba-meter-top">
                  <span class="ba-meter-tag leave-mono">NOW</span>
                  <span class="ba-meter-num leave-mono">
                    {{ fmt(currentAvail) }}<span class="ba-meter-q">/ {{ fmtQuota(currentQuota) }}</span>
                  </span>
                </div>
                <div class="ba-meter-track">
                  <span class="ba-meter-fill is-now" :style="{ width: curPct + '%' }" />
                </div>
              </div>

              <!-- transform arrow + floating delta -->
              <div class="ba-proj-mid">
                <span class="ba-proj-line" />
                <span class="ba-proj-delta" :data-sign="sign">
                  {{ sign === 'neg' ? '−' : sign === 'pos' ? '+' : '±' }}{{ fmt(Math.abs(deltaNum)) }} d
                </span>
                <span class="ba-proj-line" />
              </div>

              <!-- AFTER row -->
              <div class="ba-meter">
                <div class="ba-meter-top">
                  <span class="ba-meter-tag leave-mono is-after">AFTER</span>
                  <span class="ba-meter-num leave-mono is-after">
                    {{ fmt(tAfter) }}<span class="ba-meter-q">/ {{ fmtQuota(currentQuota) }}</span>
                  </span>
                </div>
                <div class="ba-meter-track" :class="{ 'is-over': overCap }">
                  <span class="ba-meter-fill is-after" :style="{ width: projPct + '%' }">
                    <span class="ba-meter-shine" />
                  </span>
                  <!-- ghost marker showing where 'now' sat -->
                  <span class="ba-meter-ghost" :style="{ left: curPct + '%' }" />
                </div>
              </div>

              <!-- policy-cap breach warning -->
              <transition name="ba-badge">
                <div v-if="overCap" class="ba-cap-warn">
                  <AlertTriangle :size="13" />
                  <span>
                    Exceeds the <b>{{ tmetaLabel }}</b> policy cap of <b>{{ fmt(capMax) }}</b> day(s).
                    You can credit at most <b>{{ fmt(capRoom) }}</b> more.
                  </span>
                </div>
              </transition>
            </Motion>

            <!-- ─── 03 · Delta stepper ─── -->
            <Motion as="section" class="ba-block"
              :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.5, delay: 0.32, ease: [0.16, 1, 0.3, 1] }"
            >
              <span class="ba-label leave-mono">03 · Delta &nbsp;<i>positive credits · negative debits</i></span>
              <div class="ba-stepper" :data-sign="sign">
                <Motion as="button" type="button" class="ba-step ba-step-minus"
                  :whileHover="{ scale: 1.08 }" :whileTap="{ scale: 0.88 }"
                  @click="bump(-0.5)" aria-label="Decrease"
                ><Minus :size="16" /></Motion>

                <div class="ba-step-val">
                  <input v-model.number="form.delta" type="number" step="0.5"
                    class="ba-step-input leave-mono" aria-label="Delta days" />
                  <span class="ba-step-unit leave-mono">days</span>
                </div>

                <Motion as="button" type="button" class="ba-step ba-step-plus"
                  :whileHover="{ scale: 1.08 }" :whileTap="{ scale: 0.88 }"
                  @click="bump(0.5)" aria-label="Increase"
                ><Plus :size="16" /></Motion>
              </div>

              <div class="ba-presets">
                <Motion v-for="p in PRESETS" :key="p" as="button" type="button"
                  class="ba-preset" :class="p < 0 ? 'neg' : 'pos'"
                  :whileHover="{ y: -2 }" :whileTap="{ scale: 0.93 }"
                  @click="form.delta = p"
                >{{ p > 0 ? '+' : '' }}{{ p }}</Motion>
                <Motion as="button" type="button" class="ba-preset reset"
                  :whileHover="{ y: -2 }" :whileTap="{ scale: 0.93 }"
                  @click="form.delta = 0"
                ><RotateCcw :size="11" /></Motion>
              </div>
            </Motion>

            <!-- ─── 04 · Reason ─── -->
            <Motion as="section" class="ba-block"
              :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }"
            >
              <span class="ba-label leave-mono">
                04 · Reason
                <i class="ba-count" :class="{ ok: form.reason.trim().length >= 4 }">
                  {{ form.reason.length }}/400
                </i>
              </span>
              <div class="ba-textwrap" :class="{ filled: form.reason.trim().length >= 4 }">
                <textarea v-model.trim="form.reason" rows="3" maxlength="400"
                  class="ba-textarea" placeholder="Why is this adjustment necessary? (audit trail)" />
                <span class="ba-text-glow" />
              </div>
            </Motion>
          </div>

          <!-- ════════ FOOTER ════════ -->
          <Motion as="footer" class="ba-foot"
            :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.5, delay: 0.46, ease: [0.16, 1, 0.3, 1] }"
          >
            <transition name="ba-badge">
              <span v-if="!canSave && disabledHint" class="ba-hint">
                <Info :size="12" /> {{ disabledHint }}
              </span>
            </transition>
            <button class="leave-btn leave-btn-sm" @click="$emit('close')">Cancel</button>
            <Motion as="button" type="button" class="ba-save"
              :class="{ ready: canSave }"
              :whileHover="canSave ? { y: -2, scale: 1.015 } : {}"
              :whileTap="canSave ? { scale: 0.97 } : {}"
              :disabled="!canSave || saving"
              @click="save"
            >
              <span class="ba-save-sweep" />
              <component :is="saving ? Loader2 : Save" :size="14" :class="{ 'ba-spin': saving }" />
              {{ saving ? 'Saving…' : 'Save adjustment' }}
            </Motion>
          </Motion>
        </aside>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import { X, PencilLine, Save, Check, Plus, Minus, RotateCcw, Loader2, ArrowUp, ArrowDown, Equal, AlertTriangle, ShieldAlert, Info } from 'lucide-vue-next'
import LeaveTypeIcon from '../components/LeaveTypeIcon.vue'
import { LEAVE_TYPES, adjustLeaveBalance } from '@/composables/useLeaves'
import { useToast } from 'vue-toastification'

const props = defineProps({
  open: { type: Boolean, default: false },
  employee: { type: Object, default: null },
})
const emit = defineEmits(['close', 'saved'])
const toast = useToast()

// Warm-only per-type accent (mirrors the balances grid — legacy hexes are
// blue/pink which the leave module forbids).
const TYPE_HEX = {
  CASUAL: '#fde047', SICK: '#e34a0a', EARNED: '#f59e0b', MATERNITY: '#fdba74',
  PATERNITY: '#b45309', BEREAVEMENT: '#854d0e', COMP_OFF: '#f97316', LWP: '#ea580c',
  STUDY: '#ca8a04', SPECIAL: '#fb923c',
}
const TYPES = LEAVE_TYPES.map(t => ({ ...t, hexWarm: TYPE_HEX[t.key] || '#fbbf24' }))
const PRESETS = [-2, -1, -0.5, 0.5, 1, 2]

const form = ref({ leave_type: 'CASUAL', delta: 0, reason: '' })
const saving = ref(false)

// ── Reset + smart default type whenever the drawer opens ──
watch(() => props.open, (v) => {
  if (!v) return
  const first = props.employee?.balances?.[0]?.leave_type || 'CASUAL'
  form.value = { leave_type: first, delta: 0, reason: '' }
})

// ── Number helpers ──
const num = (v) => Number(v) || 0
const fmt = (v) => { const n = num(v); return Number.isInteger(n) ? String(n) : n.toFixed(1) }
const fmtQuota = (v) => { const n = num(v); return n <= 0 ? '∞' : fmt(n) }
const initials = (name) => {
  if (!name) return '?'
  const p = String(name).trim().split(/\s+/).filter(Boolean)
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase()
}

// ── Selected-type balance context ──
const selectedBalance = computed(() =>
  props.employee?.balances?.find(b => b.leave_type === form.value.leave_type) || null,
)
const currentAvail = computed(() => num(selectedBalance.value?.available))
const currentQuota = computed(() => num(selectedBalance.value?.quota))
const carryForward = computed(() => num(selectedBalance.value?.carry_forward_in))
const deltaNum = computed(() => num(form.value.delta))
const projectedAvail = computed(() => currentAvail.value + deltaNum.value)

// Policy cap: a capped type (quota > 0) can hold at most quota + carried-forward.
// quota == 0 means unlimited (Comp-Off / LWP / Study / Special) → no ceiling.
// Mirrors the backend guard in admin_adjust_balance so we block the request
// before it round-trips and show why.
const capMax = computed(() =>
  currentQuota.value > 0 ? currentQuota.value + carryForward.value : Infinity,
)
const overCap = computed(() => deltaNum.value > 0 && projectedAvail.value > capMax.value)
const capRoom = computed(() => Math.max(0, capMax.value - currentAvail.value))
const tmetaLabel = computed(() =>
  (TYPES.find(t => t.key === form.value.leave_type) || {}).label || form.value.leave_type,
)

// Reference scale — quota when capped, else the larger of now/after so both
// bars stay comparable for "infinite" types (Comp-Off, LWP).
const scaleMax = computed(() => {
  if (currentQuota.value > 0) return currentQuota.value
  return Math.max(currentAvail.value, projectedAvail.value, 1)
})
const pct = (v) => Math.max(0, Math.min(100, (v / scaleMax.value) * 100))
const curPct = computed(() => pct(currentAvail.value))
const projPct = computed(() => pct(projectedAvail.value))

const sign = computed(() => deltaNum.value > 0 ? 'pos' : deltaNum.value < 0 ? 'neg' : 'zero')
const signIcon = computed(() => sign.value === 'pos' ? ArrowUp : sign.value === 'neg' ? ArrowDown : Equal)

// ── Lifecycle eligibility — you can't CREDIT new leave to someone who is leaving
// or has left (only ACTIVE / ON_PROBATION may receive new entitlement). Debit
// corrections stay allowed while ON_NOTICE. Mirrors the backend guard so the UI
// blocks it up-front instead of round-tripping a 409.
const lifecycle = computed(() => props.employee?.lifecycle_state || null)
const employable = computed(() => !lifecycle.value || ['ACTIVE', 'ON_PROBATION'].includes(lifecycle.value))
const stateLabel = computed(() => (lifecycle.value || '').replace(/_/g, ' ').toLowerCase())
const creditBlocked = computed(() => !employable.value && deltaNum.value > 0)

const canSave = computed(() =>
  form.value.reason.trim().length >= 4 && deltaNum.value !== 0 && !overCap.value && !creditBlocked.value,
)
// Plain-language reason the Save button is disabled (the "why can't I save" hint).
const disabledHint = computed(() => {
  if (creditBlocked.value) return `Can't credit — this employee ${stateLabel.value ? 'is ' + stateLabel.value : 'is leaving'}. Only debit corrections are allowed.`
  if (deltaNum.value === 0) return 'Set a non-zero delta — use the stepper or a preset.'
  if (overCap.value) return `Exceeds the policy cap — credit at most ${fmt(capRoom.value)} more.`
  if (form.value.reason.trim().length < 4) return 'Add a reason (min 4 characters) for the audit trail.'
  return ''
})

// ── Tween the "after" number so it counts up/down on every change ──
function useTween(getter, { duration = 520 } = {}) {
  const out = ref(0)
  let raf = null
  const run = (to) => {
    if (raf) cancelAnimationFrame(raf)
    const from = out.value
    const start = performance.now()
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const e = 1 - Math.pow(1 - t, 3)
      out.value = from + (to - from) * e
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
  }
  watch(getter, (v) => run(Number(v) || 0), { immediate: true })
  onBeforeUnmount(() => { if (raf) cancelAnimationFrame(raf) })
  return out
}
const tAfter = useTween(projectedAvail)

// ── Stepper ──
const bump = (by) => {
  const next = Math.round((deltaNum.value + by) * 2) / 2  // snap to .5
  form.value.delta = next
}

// ── Esc to close ──
const onKey = (e) => { if (e.key === 'Escape' && props.open) emit('close') }
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

// ── Persist ──
const save = async () => {
  if (!canSave.value || saving.value) return
  saving.value = true
  try {
    await adjustLeaveBalance(props.employee.id, form.value)
    toast.success('Balance adjusted')
    emit('saved')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to adjust')
  } finally { saving.value = false }
}
</script>

<style scoped>
@import '@/styles/leave-theme.css';

/* ════════════════════════════════════════════════════════════════════════
   SCRIM
   ════════════════════════════════════════════════════════════════════════ */
.ba-scrim {
  position: fixed; inset: 0; z-index: 1090;
  display: flex; justify-content: flex-end;
  background:
    radial-gradient(70% 90% at 100% 50%, rgba(251, 191, 36, 0.26), transparent 60%),
    rgba(6, 5, 8, 0.58);
  backdrop-filter: blur(12px) saturate(120%);
  -webkit-backdrop-filter: blur(12px) saturate(120%);
}

/* ════════════════════════════════════════════════════════════════════════
   DRAWER SHELL
   ════════════════════════════════════════════════════════════════════════ */
.ba-drawer {
  position: relative; overflow: hidden;
  width: 480px; max-width: 96vw; height: 100%;
  display: flex; flex-direction: column;
  background:
    radial-gradient(120% 50% at 100% 0%, rgba(251, 191, 36, 0.14), transparent 55%),
    radial-gradient(90% 40% at 0% 100%, rgba(234, 88, 12, 0.12), transparent 60%),
    linear-gradient(180deg, rgba(16, 11, 6, 0.97), rgba(10, 7, 4, 0.98));
  border-left: 1px solid var(--leave-border-strong);
  box-shadow: -40px 0 90px -40px rgba(0, 0, 0, 0.9);
  isolation: isolate;
}
[data-theme="light"] .ba-drawer {
  background:
    radial-gradient(120% 50% at 100% 0%, rgba(251, 191, 36, 0.20), transparent 55%),
    radial-gradient(90% 40% at 0% 100%, rgba(234, 88, 12, 0.10), transparent 60%),
    linear-gradient(180deg, rgba(255, 251, 243, 0.98), rgba(255, 246, 232, 0.98));
}

/* coloured edge rail reacts to credit / debit */
.ba-rail {
  position: absolute; left: 0; top: 0; bottom: 0; width: 3px; z-index: 5;
  background: var(--leave-grad-cta);
  box-shadow: 0 0 22px rgba(251, 191, 36, 0.6);
  transition: background .4s ease, box-shadow .4s ease;
}
.ba-drawer[data-sign="neg"] .ba-rail { background: var(--leave-grad-ember); box-shadow: 0 0 22px rgba(234, 88, 12, 0.6); }
.ba-drawer[data-sign="zero"] .ba-rail { background: linear-gradient(180deg, var(--leave-text-muted), transparent); box-shadow: none; opacity: 0.5; }

/* drifting ambient orbs */
.ba-orb {
  position: absolute; border-radius: 50%; filter: blur(48px);
  pointer-events: none; z-index: 0; opacity: 0.55;
}
.ba-orb-a {
  width: 280px; height: 280px; top: -80px; right: -80px;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.34), transparent 65%);
  animation: ba-drift-a 11s ease-in-out infinite;
}
.ba-orb-b {
  width: 240px; height: 240px; bottom: 40px; left: -90px;
  background: radial-gradient(circle, rgba(234, 88, 12, 0.30), transparent 65%);
  animation: ba-drift-b 13s ease-in-out infinite;
}
@keyframes ba-drift-a { 0%,100% { transform: translate(0,0) scale(1);} 50% { transform: translate(-26px,30px) scale(1.12);} }
@keyframes ba-drift-b { 0%,100% { transform: translate(0,0) scale(1);} 50% { transform: translate(24px,-26px) scale(1.1);} }
.ba-tex {
  position: absolute; inset: 0; z-index: 0; pointer-events: none;
  background-image: radial-gradient(rgba(251, 191, 36, 0.06) 1px, transparent 1px);
  background-size: 18px 18px;
  mask-image: linear-gradient(180deg, rgba(0,0,0,0.5), transparent 65%);
  opacity: 0.6;
}
[data-theme="light"] .ba-tex { background-image: radial-gradient(rgba(180, 83, 9, 0.10) 1px, transparent 1px); }

/* ════════════════════════════════════════════════════════════════════════
   HEADER
   ════════════════════════════════════════════════════════════════════════ */
.ba-head {
  position: relative; z-index: 3;
  padding: 24px 24px 18px;
  border-bottom: 1px solid var(--leave-border);
}
.ba-close {
  position: absolute; top: 16px; right: 16px;
  display: grid; place-items: center; width: 30px; height: 30px;
  border-radius: 9px; border: 1px solid var(--leave-border-strong);
  background: rgba(20, 14, 8, 0.5); color: var(--leave-text-muted);
  cursor: pointer;
}
[data-theme="light"] .ba-close { background: rgba(255, 250, 240, 0.7); }
.ba-close:hover { color: var(--leave-text); border-color: var(--leave-brand); }

.ba-head-main { display: flex; gap: 14px; align-items: flex-start; }
.ba-icon {
  position: relative; flex-shrink: 0;
  display: inline-grid; place-items: center;
  width: 46px; height: 46px; border-radius: 14px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.34), rgba(234, 88, 12, 0.22));
  border: 1px solid rgba(251, 191, 36, 0.5); color: #fff3c4;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 10px 24px -12px rgba(234, 88, 12, 0.7);
}
[data-theme="light"] .ba-icon { color: #7c2d12; }
.ba-icon-ring {
  position: absolute; inset: -5px; border-radius: 18px;
  border: 1px solid rgba(251, 191, 36, 0.45);
  animation: leave-orb-spin 16s linear infinite;
}
.ba-icon-spark {
  position: absolute; inset: -2px; border-radius: 16px;
  box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.5);
  animation: ba-spark 2.6s ease-out infinite;
}
@keyframes ba-spark {
  0% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.45); }
  70%,100% { box-shadow: 0 0 0 14px rgba(251, 191, 36, 0); }
}

.ba-head-text { min-width: 0; }
.ba-eye {
  display: inline-flex; align-items: center; gap: 7px;
  font-size: 9px; font-weight: 800; letter-spacing: 0.18em;
  color: var(--leave-text-muted);
}
.ba-eye-led {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--leave-brand); box-shadow: 0 0 8px var(--leave-brand);
  animation: leave-eyebrow-pulse 1.6s ease-in-out infinite;
}
.ba-title {
  margin: 6px 0 0; font-size: 20px; font-weight: 900; letter-spacing: -0.02em;
  color: var(--leave-text);
}
.ba-emp { display: flex; align-items: center; gap: 9px; margin-top: 10px; }
.ba-emp-av {
  display: inline-grid; place-items: center;
  width: 30px; height: 30px; border-radius: 9px;
  background: linear-gradient(135deg, var(--leave-approved), var(--leave-compoff));
  color: #2a1100; font-weight: 800; font-size: 11px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4);
}
.ba-emp-meta { display: flex; flex-direction: column; line-height: 1.2; min-width: 0; }
.ba-emp-meta b { font-size: 12.5px; font-weight: 800; color: var(--leave-text); }
.ba-emp-meta span { font-size: 10px; color: var(--leave-text-muted); }

/* ════════════════════════════════════════════════════════════════════════
   BODY
   ════════════════════════════════════════════════════════════════════════ */
.ba-body {
  position: relative; z-index: 2;
  flex: 1; overflow-y: auto;
  padding: 20px 24px;
  display: flex; flex-direction: column; gap: 22px;
  scrollbar-width: thin; scrollbar-color: rgba(251, 191, 36, 0.4) transparent;
}
.ba-body::-webkit-scrollbar { width: 6px; }
.ba-body::-webkit-scrollbar-thumb { background: rgba(251, 191, 36, 0.4); border-radius: 999px; }

/* lifecycle gate banner */
.ba-gate {
  display: flex; align-items: flex-start; gap: 9px;
  padding: 11px 13px; border-radius: 12px;
  background: var(--leave-rejected-soft);
  border: 1px solid var(--leave-border-ember);
  color: var(--w-ember-200);
  font-size: 11.5px; line-height: 1.5; font-weight: 600;
}
[data-theme="light"] .ba-gate { color: var(--w-ember-700); }
.ba-gate svg { flex-shrink: 0; margin-top: 1px; color: var(--w-ember-400); }
[data-theme="light"] .ba-gate svg { color: var(--w-ember-600); }
.ba-gate b { font-weight: 800; }

/* disabled-save hint (the "why can't I save" nudge) */
.ba-hint {
  display: inline-flex; align-items: center; gap: 6px;
  margin-right: auto; max-width: 60%;
  font-size: 10.5px; line-height: 1.35; font-weight: 600;
  color: var(--leave-text-muted);
}
.ba-hint svg { flex-shrink: 0; color: var(--leave-brand); }

.ba-block { display: flex; flex-direction: column; gap: 11px; }
.ba-label {
  display: flex; align-items: center; gap: 6px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--leave-text-secondary);
}
.ba-label i { font-style: normal; font-weight: 600; letter-spacing: 0.08em; color: var(--leave-text-muted); text-transform: none; }
.ba-count { margin-left: auto; font-size: 9px; color: var(--leave-text-muted); }
.ba-count.ok { color: var(--leave-approved); }

/* ─── Type picker ─── */
.ba-types { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
.ba-type {
  --ty-c: var(--leave-brand);
  position: relative; overflow: hidden;
  display: flex; align-items: center; gap: 9px;
  padding: 11px 12px; border-radius: 12px;
  background: rgba(28, 18, 10, 0.5);
  border: 1px solid var(--leave-border);
  color: var(--leave-text-secondary); cursor: pointer;
  font: inherit; text-align: left;
  transition: border-color .22s, background .22s, color .22s, box-shadow .22s;
}
[data-theme="light"] .ba-type { background: rgba(255, 250, 240, 0.7); }
.ba-type:hover { border-color: color-mix(in srgb, var(--ty-c) 55%, transparent); color: var(--leave-text); }
.ba-type-lbl { font-size: 12px; font-weight: 700; flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ba-type.active {
  border-color: color-mix(in srgb, var(--ty-c) 75%, transparent);
  background: color-mix(in srgb, var(--ty-c) 16%, rgba(28, 18, 10, 0.6));
  color: var(--leave-text);
  box-shadow: 0 8px 22px -12px color-mix(in srgb, var(--ty-c) 80%, transparent),
              inset 0 0 0 1px color-mix(in srgb, var(--ty-c) 30%, transparent);
}
[data-theme="light"] .ba-type.active { background: color-mix(in srgb, var(--ty-c) 22%, rgba(255, 250, 240, 0.85)); }
.ba-type-tick {
  display: grid; place-items: center;
  width: 18px; height: 18px; border-radius: 50%;
  background: var(--ty-c); color: #1f1408; flex-shrink: 0;
  box-shadow: 0 0 12px color-mix(in srgb, var(--ty-c) 70%, transparent);
}

/* ─── Projection gauge ─── */
.ba-proj {
  position: relative;
  padding: 16px; border-radius: 16px;
  background:
    radial-gradient(90% 70% at 100% 0%, rgba(251, 191, 36, 0.10), transparent 60%),
    rgba(20, 13, 7, 0.6);
  border: 1px solid var(--leave-border);
  transition: border-color .35s ease, box-shadow .35s ease;
}
[data-theme="light"] .ba-proj { background: rgba(255, 248, 230, 0.75); }
.ba-proj[data-sign="pos"] { border-color: color-mix(in srgb, var(--leave-approved) 45%, transparent); box-shadow: 0 0 30px -16px var(--leave-approved); }
.ba-proj[data-sign="neg"] { border-color: var(--leave-border-ember); box-shadow: 0 0 30px -16px var(--w-ember-500); }
.ba-proj-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.ba-sign-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 4px 10px; border-radius: 999px;
  font-size: 9px; font-weight: 900; letter-spacing: 0.12em;
  background: rgba(251, 191, 36, 0.16); color: var(--leave-approved);
  border: 1px solid color-mix(in srgb, var(--leave-approved) 40%, transparent);
}
.ba-proj[data-sign="neg"] .ba-sign-badge { background: var(--leave-rejected-soft); color: var(--leave-rejected); border-color: var(--leave-border-ember); }
.ba-proj[data-sign="zero"] .ba-sign-badge { background: rgba(255,255,255,0.05); color: var(--leave-text-muted); border-color: var(--leave-border); }

.ba-meter { display: flex; flex-direction: column; gap: 6px; }
.ba-meter-top { display: flex; align-items: baseline; justify-content: space-between; }
.ba-meter-tag { font-size: 8.5px; font-weight: 800; letter-spacing: 0.16em; color: var(--leave-text-muted); }
.ba-meter-tag.is-after { color: var(--leave-text-secondary); }
.ba-meter-num { font-size: 15px; font-weight: 900; color: var(--leave-text); font-variant-numeric: tabular-nums; }
.ba-meter-num.is-after {
  background: var(--leave-grad-cta); background-clip: text; -webkit-background-clip: text; color: transparent;
}
.ba-proj[data-sign="neg"] .ba-meter-num.is-after { background: var(--leave-grad-ember); background-clip: text; -webkit-background-clip: text; color: transparent; }
.ba-proj[data-sign="zero"] .ba-meter-num.is-after { background: none; color: var(--leave-text-muted); -webkit-text-fill-color: var(--leave-text-muted); }
.ba-meter-q { font-size: 10px; font-weight: 700; color: var(--leave-text-muted); -webkit-text-fill-color: var(--leave-text-muted); margin-left: 3px; }
.ba-meter-track {
  position: relative; height: 10px; border-radius: 7px; overflow: hidden;
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid var(--leave-border);
}
.ba-meter-fill {
  position: relative; display: block; height: 100%; border-radius: 7px;
  transition: width 0.75s cubic-bezier(0.16, 1, 0.3, 1);
}
.ba-meter-fill.is-now {
  background: linear-gradient(90deg, var(--w-gold-600), var(--leave-brand));
  opacity: 0.7;
}
.ba-meter-fill.is-after {
  overflow: hidden;
  background: var(--leave-grad-cta);
  box-shadow: 0 0 14px color-mix(in srgb, var(--leave-approved) 55%, transparent);
}
.ba-proj[data-sign="neg"] .ba-meter-fill.is-after { background: var(--leave-grad-ember); box-shadow: 0 0 14px rgba(234, 88, 12, 0.5); }
.ba-meter-shine {
  position: absolute; inset: 0;
  background: linear-gradient(100deg, transparent, rgba(255,255,255,0.5), transparent);
  background-size: 220% 100%;
  animation: leave-gradient-pan 2.8s linear infinite;
  mix-blend-mode: overlay;
}
.ba-meter-ghost {
  position: absolute; top: -2px; bottom: -2px; width: 2px;
  background: var(--leave-text); opacity: 0.5; border-radius: 2px;
  transition: left 0.75s cubic-bezier(0.16, 1, 0.3, 1);
}
/* over-cap: the AFTER track flashes a danger ring */
.ba-meter-track.is-over { box-shadow: 0 0 0 1.5px var(--w-ember-500), 0 0 14px -4px var(--w-ember-500); }
.ba-meter-track.is-over .ba-meter-fill.is-after { background: var(--leave-grad-ember) !important; }

.ba-cap-warn {
  display: flex; align-items: center; gap: 8px;
  margin-top: 12px; padding: 9px 11px; border-radius: 11px;
  background: var(--leave-rejected-soft);
  border: 1px solid var(--leave-border-ember);
  color: var(--w-ember-200);
  font-size: 11px; line-height: 1.45; font-weight: 600;
}
[data-theme="light"] .ba-cap-warn { color: var(--w-ember-700); }
.ba-cap-warn svg { flex-shrink: 0; color: var(--w-ember-400); }
[data-theme="light"] .ba-cap-warn svg { color: var(--w-ember-600); }
.ba-cap-warn b { font-weight: 800; }

.ba-proj-mid { display: flex; align-items: center; gap: 10px; padding: 9px 0; }
.ba-proj-line { flex: 1; height: 1px; background: linear-gradient(90deg, transparent, var(--leave-border-strong), transparent); }
.ba-proj-delta {
  flex-shrink: 0; padding: 3px 11px; border-radius: 999px;
  font-size: 11px; font-weight: 900; font-variant-numeric: tabular-nums;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  background: rgba(251, 191, 36, 0.14); color: var(--leave-approved);
  border: 1px solid color-mix(in srgb, var(--leave-approved) 40%, transparent);
  transition: background .3s, color .3s, border-color .3s;
}
.ba-proj-delta[data-sign="neg"] { background: var(--leave-rejected-soft); color: var(--leave-rejected); border-color: var(--leave-border-ember); }
.ba-proj-delta[data-sign="zero"] { background: rgba(255,255,255,0.05); color: var(--leave-text-muted); border-color: var(--leave-border); }

/* ─── Stepper ─── */
.ba-stepper {
  --st-c: var(--leave-approved);
  display: flex; align-items: stretch; gap: 10px;
}
.ba-stepper[data-sign="neg"] { --st-c: var(--leave-rejected); }
.ba-stepper[data-sign="zero"] { --st-c: var(--leave-text-muted); }
.ba-step {
  display: grid; place-items: center;
  width: 48px; flex-shrink: 0; border-radius: 12px;
  background: rgba(28, 18, 10, 0.55);
  border: 1px solid var(--leave-border-strong);
  color: var(--leave-text); cursor: pointer;
}
[data-theme="light"] .ba-step { background: rgba(255, 250, 240, 0.7); }
.ba-step-minus:hover { border-color: var(--leave-rejected); color: var(--leave-rejected); background: var(--leave-rejected-soft); }
.ba-step-plus:hover { border-color: var(--leave-approved); color: var(--leave-approved); background: rgba(251, 191, 36, 0.12); }
.ba-step-val {
  flex: 1; position: relative;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  border-radius: 12px;
  background: rgba(20, 13, 7, 0.7);
  border: 1px solid color-mix(in srgb, var(--st-c) 40%, transparent);
  box-shadow: inset 0 0 24px -12px color-mix(in srgb, var(--st-c) 80%, transparent);
  transition: border-color .3s, box-shadow .3s;
}
[data-theme="light"] .ba-step-val { background: rgba(255, 248, 230, 0.85); }
.ba-step-input {
  width: 100%; text-align: center; border: 0; outline: 0; background: transparent;
  font-size: 28px; font-weight: 900; line-height: 1; padding: 10px 8px 0;
  color: var(--st-c); font-variant-numeric: tabular-nums;
  transition: color .3s;
}
.ba-step-input::-webkit-outer-spin-button, .ba-step-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.ba-step-input { -moz-appearance: textfield; }
.ba-step-unit { font-size: 8.5px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; color: var(--leave-text-muted); padding-bottom: 7px; }

.ba-presets { display: flex; flex-wrap: wrap; gap: 6px; }
.ba-preset {
  display: inline-grid; place-items: center;
  min-width: 42px; height: 28px; padding: 0 10px; border-radius: 8px;
  font: inherit; font-size: 11.5px; font-weight: 800; font-variant-numeric: tabular-nums;
  background: rgba(28, 18, 10, 0.5); border: 1px solid var(--leave-border);
  cursor: pointer; transition: border-color .2s, background .2s, color .2s, transform .2s;
}
[data-theme="light"] .ba-preset { background: rgba(255, 250, 240, 0.7); }
.ba-preset.pos { color: var(--leave-approved); }
.ba-preset.neg { color: var(--leave-rejected); }
.ba-preset.reset { color: var(--leave-text-muted); min-width: 34px; }
.ba-preset.pos:hover { border-color: var(--leave-approved); background: rgba(251, 191, 36, 0.12); }
.ba-preset.neg:hover { border-color: var(--leave-rejected); background: var(--leave-rejected-soft); }
.ba-preset.reset:hover { border-color: var(--leave-brand); color: var(--leave-text); }

/* ─── Reason ─── */
.ba-textwrap {
  position: relative; border-radius: 12px;
  border: 1px solid var(--leave-border-strong);
  background: rgba(28, 18, 10, 0.5);
  transition: border-color .25s, box-shadow .25s;
  overflow: hidden;
}
[data-theme="light"] .ba-textwrap { background: rgba(255, 250, 240, 0.75); }
.ba-textwrap:focus-within { border-color: var(--leave-brand); box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.14); }
.ba-textwrap.filled { border-color: color-mix(in srgb, var(--leave-approved) 50%, transparent); }
.ba-textarea {
  display: block; width: 100%; resize: vertical; min-height: 78px;
  padding: 11px 12px; border: 0; outline: 0; background: transparent;
  font: inherit; font-size: 13px; line-height: 1.55; color: var(--leave-text);
}
.ba-textarea::placeholder { color: var(--leave-text-placeholder); }
.ba-text-glow {
  position: absolute; left: 0; right: 0; bottom: 0; height: 2px;
  background: var(--leave-grad-cta); transform: scaleX(0); transform-origin: left;
  transition: transform .35s cubic-bezier(0.16, 1, 0.3, 1);
}
.ba-textwrap:focus-within .ba-text-glow { transform: scaleX(1); }

/* ════════════════════════════════════════════════════════════════════════
   FOOTER
   ════════════════════════════════════════════════════════════════════════ */
.ba-foot {
  position: relative; z-index: 3;
  display: flex; gap: 10px; justify-content: flex-end; align-items: center;
  padding: 16px 24px 20px;
  border-top: 1px solid var(--leave-border);
  background: linear-gradient(0deg, rgba(10, 7, 4, 0.6), transparent);
}
[data-theme="light"] .ba-foot { background: linear-gradient(0deg, rgba(255, 246, 232, 0.7), transparent); }
.ba-save {
  position: relative; overflow: hidden;
  display: inline-flex; align-items: center; gap: 8px;
  height: 40px; padding: 0 20px; border-radius: 11px;
  font: inherit; font-size: 13px; font-weight: 800;
  color: var(--leave-text-muted);
  background: rgba(28, 18, 10, 0.6);
  border: 1px solid var(--leave-border-strong);
  cursor: not-allowed;
  transition: color .3s, background .3s, border-color .3s, box-shadow .3s;
}
.ba-save.ready {
  cursor: pointer; color: #2a1100;
  background: var(--leave-grad-cta); background-size: 200% 100%;
  border-color: rgba(251, 146, 60, 0.6);
  box-shadow: 0 14px 34px -12px rgba(234, 88, 12, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.45);
}
.ba-drawer[data-sign="neg"] .ba-save.ready { background: var(--leave-grad-ember); color: #fff3ec; }
.ba-save-sweep {
  position: absolute; inset: 0;
  background: linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%);
  background-size: 220% 100%; background-position: 200% 0;
  opacity: 0; pointer-events: none;
}
.ba-save.ready:hover .ba-save-sweep { animation: ba-sweep 0.9s ease forwards; opacity: 1; }
@keyframes ba-sweep { to { background-position: -120% 0; } }
.ba-spin { animation: ba-rot 0.8s linear infinite; }
@keyframes ba-rot { to { transform: rotate(360deg); } }

/* badge swap transition */
.ba-badge-enter-active, .ba-badge-leave-active { transition: opacity .2s, transform .2s; }
.ba-badge-enter-from { opacity: 0; transform: translateY(-4px) scale(0.9); }
.ba-badge-leave-to { opacity: 0; transform: translateY(4px) scale(0.9); }

/* ════════════════════════════════════════════════════════════════════════
   ENTER / LEAVE
   ════════════════════════════════════════════════════════════════════════ */
.ba-enter-active, .ba-leave-active { transition: opacity .32s ease; }
.ba-enter-from, .ba-leave-to { opacity: 0; }
.ba-enter-active .ba-drawer, .ba-leave-active .ba-drawer {
  transition: transform .46s cubic-bezier(0.16, 1, 0.3, 1);
}
.ba-enter-from .ba-drawer, .ba-leave-to .ba-drawer {
  transform: translateX(100%) rotateY(8deg) scale(0.97);
}

@media (prefers-reduced-motion: reduce) {
  .ba-orb-a, .ba-orb-b, .ba-icon-ring, .ba-icon-spark, .ba-eye-led, .ba-meter-shine, .ba-spin { animation: none !important; }
}
</style>
