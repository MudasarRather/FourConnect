<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open && r" as="div" class="dd-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.25 }" @click.self="$emit('close')">
        <Motion as="div" class="dd" role="dialog" aria-label="Daily allowance detail"
          :initial="{ opacity: 0, y: 26, scale: 0.965 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 18, scale: 0.97 }" :transition="{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }">
          <span class="dd-aura" :style="{ '--c': meta.hex }" aria-hidden="true" />
          <span class="dd-spine" :style="{ background: meta.hex }" aria-hidden="true" />

          <!-- ══ header ══ -->
          <header class="dd-head">
            <div class="dd-htext">
              <span class="dd-eyebrow"><Calculator :size="12" /> Per-diem · allowance record</span>
              <h3 class="dd-name">{{ r.employee_name || '—' }}</h3>
              <div class="dd-subrow">
                <button class="dd-ref trv-mono" title="Open source tour"
                  @click="go({ tab: 'requests', filter: { q: r.travel_reference_number } })">
                  {{ r.travel_reference_number }} <ArrowUpRight :size="11" />
                </button>
                <span class="dd-tier" :style="{ '--c': tier.hex }"><MapPin :size="10" /> {{ tier.label }}</span>
                <span v-if="r.grade_name" class="dd-grade"><Layers :size="10" /> {{ r.grade_name }}</span>
              </div>
            </div>
            <div class="dd-hactions">
              <span class="dd-pill" :style="{ '--c': meta.hex }"><component :is="meta.icon" :size="12" /> {{ meta.label }}</span>
              <button class="dd-x" @click="$emit('close')"><X :size="18" /></button>
            </div>
          </header>

          <div class="dd-body">
            <!-- ══ hero — headline + settlement seal ══ -->
            <Motion class="dd-hero" v-bind="sT(0)">
              <div class="hero-amt">
                <span class="ha-lab">{{ amtLabel }}</span>
                <DaOdometer :value="headline" class="ha-odo" />
                <span class="ha-formula trv-mono">{{ days }}d × {{ fmtINR(rate) }}/day</span>
              </div>
              <div class="hero-seal" :class="{ drawn }">
                <svg viewBox="0 0 96 96" class="seal-svg" role="img" :aria-label="`${ratioPct}% of eligible`">
                  <circle class="seal-track" cx="48" cy="48" r="38" />
                  <circle class="seal-arc" cx="48" cy="48" r="38" :stroke="meta.hex"
                    :stroke-dasharray="drawn ? `${(ratioPct / 100) * SEAL_C} ${SEAL_C}` : `0 ${SEAL_C}`" />
                </svg>
                <div class="seal-center">
                  <span class="seal-pct trv-mono" :style="{ color: meta.hex }">{{ ratioPct }}%</span>
                  <span class="seal-cap">of eligible</span>
                </div>
              </div>
            </Motion>

            <!-- ══ signature instrument — per-diem accrual ramp ══ -->
            <Motion class="dd-card" v-bind="sT(1)">
              <span class="dd-ct"><TrendingUp :size="13" /> Per-diem accrual</span>
              <div class="ramp" :class="{ drawn }">
                <svg class="ramp-svg" :viewBox="`0 0 ${RW} ${RH}`" preserveAspectRatio="none" aria-hidden="true">
                  <defs>
                    <linearGradient id="ddRampFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" :stop-color="meta.hex" stop-opacity="0.34" />
                      <stop offset="100%" :stop-color="meta.hex" stop-opacity="0.02" />
                    </linearGradient>
                  </defs>
                  <!-- gridlines -->
                  <line v-for="g in 3" :key="'g' + g" class="ramp-grid" x1="0" :x2="RW"
                    :y1="(RH / 4) * g" :y2="(RH / 4) * g" />
                  <!-- eligible reference -->
                  <line class="ramp-ref" x1="0" :x2="RW" :y1="eligibleY" :y2="eligibleY" />
                  <!-- approved cap (only if trimmed) -->
                  <line v-if="trimmed" class="ramp-cap" :stroke="meta.hex" x1="0" :x2="RW" :y1="approvedY" :y2="approvedY" />
                  <!-- area + climbing line -->
                  <path class="ramp-area" :d="areaPath" fill="url(#ddRampFill)" />
                  <path class="ramp-line" :d="linePath" :stroke="meta.hex" pathLength="1"
                    stroke-dasharray="1" :stroke-dashoffset="drawn ? 0 : 1" />
                  <!-- day notches -->
                  <template v-if="days <= 16">
                    <circle v-for="(p, i) in rampPts" :key="'n' + i" class="ramp-notch" :cx="p[0]" :cy="p[1]" r="2.4"
                      :fill="meta.hex" :style="{ transitionDelay: (0.5 + i * 0.05) + 's' }" />
                  </template>
                  <!-- leading pulse -->
                  <circle class="ramp-head" :cx="endPt[0]" :cy="endPt[1]" r="4.5" :fill="meta.hex" />
                </svg>
                <div class="ramp-axis trv-mono">
                  <span>Day 1</span>
                  <span class="ramp-total">accrues to <b :style="{ color: meta.hex }">{{ fmtINR(eligible) }}</b></span>
                  <span>Day {{ days }}</span>
                </div>
              </div>
            </Motion>

            <!-- ══ computation receipt ══ -->
            <Motion class="dd-card" v-bind="sT(2)">
              <span class="dd-ct"><Receipt :size="13" /> Computation</span>
              <dl class="rcpt">
                <div class="rc-row"><dt><MapPin :size="12" /> Destination tier</dt><dd><span class="rc-chip" :style="{ '--c': tier.hex }">{{ tier.label }}</span></dd></div>
                <div class="rc-row"><dt><Layers :size="12" /> Grade applied</dt><dd>{{ r.grade_name || 'All grades' }}</dd></div>
                <div class="rc-row"><dt><CalendarDays :size="12" /> Travel days</dt><dd class="trv-mono">{{ days }}</dd></div>
                <div class="rc-row"><dt><Coins :size="12" /> Daily rate</dt><dd class="trv-mono">{{ fmtINR(rate) }}<span class="rc-unit">/day</span></dd></div>
                <div class="rc-row sum"><dt><Sigma :size="12" /> Eligible DA</dt><dd class="trv-mono">{{ fmtINR(eligible) }}</dd></div>
                <div v-if="approved != null" class="rc-row sum app">
                  <dt><CheckCircle2 :size="12" /> Approved DA</dt>
                  <dd class="trv-mono">{{ fmtINR(approved) }}
                    <span v-if="trimmed" class="rc-delta"><TrendingDown :size="10" /> −{{ fmtINR(reduction) }}</span>
                  </dd>
                </div>
                <div class="rc-row"><dt><Banknote :size="12" /> Currency</dt><dd class="trv-mono">{{ r.currency || 'INR' }}</dd></div>
              </dl>

              <div v-if="trimmed" class="dd-note warn">
                <Scissors :size="12" /> Approver settled <b>{{ fmtINR(reduction) }}</b> below the eligible per-diem.
              </div>
              <div v-else-if="isEstimate" class="dd-note info">
                <Info :size="12" /> This is an <b>estimate</b> — DA is finalised once the tour is marked completed.
              </div>
            </Motion>

            <!-- ══ lifecycle ══ -->
            <Motion class="dd-card" v-bind="sT(3)">
              <span class="dd-ct"><History :size="13" /> Lifecycle</span>
              <ol class="dd-tl">
                <li v-for="(step, i) in timeline" :key="i" :class="{ done: step.done, future: step.future, bad: step.bad }">
                  <span class="tl-dot" :style="step.done ? { background: step.hex, borderColor: step.hex } : {}" />
                  <div class="tl-c">
                    <span class="tl-lab">{{ step.label }}</span>
                    <span class="tl-when trv-mono">{{ step.at ? fmtDateTime(step.at) : (step.done ? 'done' : 'pending') }}</span>
                    <span v-if="step.extra" class="tl-extra trv-mono"><Wallet :size="10" /> {{ step.extra }}</span>
                  </div>
                </li>
              </ol>
              <div class="dd-tour">
                <span class="tour-lab">Source tour</span>
                <span class="tour-pill" :style="{ '--c': tourMeta.hex }"><component :is="tourMeta.icon" :size="11" /> {{ tourMeta.label }}</span>
              </div>
            </Motion>
          </div>

          <!-- ══ footer ══ -->
          <footer class="dd-foot">
            <div class="dd-links">
              <button class="lk" title="Source tour" @click="go({ tab: 'requests', filter: { q: r.travel_reference_number } })"><Plane :size="14" /></button>
              <button class="lk" title="Settlement" @click="go('settlement')"><Scale :size="14" /></button>
              <button class="lk" title="Advances" @click="go('advances')"><Wallet :size="14" /></button>
            </div>
            <div class="dd-actions">
              <span v-if="r.status === 'PAID' && r.payroll_ref" class="dd-payref trv-mono"><BadgeCheck :size="13" /> {{ r.payroll_ref }}</span>
              <button v-if="r.status === 'APPROVED'" class="btn ghost" @click="go('settlement')"><Scale :size="14" /> Settle</button>
              <Motion v-if="canApprove" as="button" class="btn primary" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }" @click="$emit('approve', r)">
                <Check :size="14" /> Approve DA
              </Motion>
              <span v-else-if="r.status === 'COMPUTED'" class="btn locked" title="DA is an estimate until the tour is completed">
                <Clock :size="14" /> Awaiting trip end
              </span>
            </div>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  Calculator, X, ArrowUpRight, MapPin, Layers, TrendingUp, TrendingDown, Receipt,
  CalendarDays, Coins, Sigma, CheckCircle2, Banknote, Scissors, Info, History,
  Wallet, Plane, Scale, Check, Clock, BadgeCheck, RotateCcw,
} from 'lucide-vue-next'
import DaOdometer from '../components/DaOdometer.vue'
import { fmtINR, cityMeta, statusMeta } from '@/composables/useTravel'
import { prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({ open: Boolean, rec: { type: Object, default: null } })
const emit = defineEmits(['close', 'approve', 'go'])

const r = computed(() => props.rec || null)
const go = (target) => emit('go', target)

const DA_META = {
  COMPUTED: { label: 'Computed', icon: Calculator, hex: '#fbbf24' },
  APPROVED: { label: 'Approved', icon: CheckCircle2, hex: '#34d399' },
  PAID: { label: 'Paid', icon: BadgeCheck, hex: '#60d394' },
  REVERSED: { label: 'Reversed', icon: RotateCcw, hex: '#c084fc' },
}
const meta = computed(() => DA_META[r.value?.status] || { label: r.value?.status || '—', icon: Calculator, hex: '#9ca3af' })
const tier = computed(() => cityMeta(r.value?.city_category))
const tourMeta = computed(() => statusMeta(r.value?.request_status))

const days = computed(() => Math.max(0, Number(r.value?.travel_days) || 0))
const rate = computed(() => Number(r.value?.daily_rate) || 0)
const eligible = computed(() => Number(r.value?.eligible_da) || 0)
const approved = computed(() => (r.value?.approved_da != null ? Number(r.value.approved_da) : null))
const headline = computed(() => (approved.value != null ? approved.value : eligible.value))
const trimmed = computed(() => approved.value != null && approved.value < eligible.value)
const reduction = computed(() => (trimmed.value ? eligible.value - approved.value : 0))
const ratioPct = computed(() => (eligible.value > 0 ? Math.min(100, Math.round((headline.value / eligible.value) * 100)) : 100))

const isEstimate = computed(() => r.value?.status === 'COMPUTED' && r.value?.request_status !== 'COMPLETED')
const canApprove = computed(() => r.value?.status === 'COMPUTED' && r.value?.request_status === 'COMPLETED')
const amtLabel = computed(() => {
  const s = r.value?.status
  if (s === 'PAID') return 'Paid DA'
  if (s === 'REVERSED') return 'Reversed DA'
  if (approved.value != null) return 'Approved DA'
  if (isEstimate.value) return 'Estimated DA'
  return 'Eligible DA'
})

// ── settlement seal ring ──
const SEAL_C = 2 * Math.PI * 38

// ── accrual ramp geometry ──
// RW tracks the rendered card width so preserveAspectRatio="none" scales the
// SVG ≈1:1 horizontally — keeps the marker dots round and the stroke even.
const RW = 520, RH = 96
const maxVal = computed(() => Math.max(eligible.value, approved.value || 0, rate.value, 1))
const rampPts = computed(() => {
  const n = Math.max(1, days.value)
  const pts = []
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * RW
    const y = RH - (Math.min(i * rate.value, maxVal.value) / maxVal.value) * RH
    pts.push([+x.toFixed(1), +y.toFixed(1)])
  }
  return pts
})
const linePath = computed(() => rampPts.value.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' '))
const areaPath = computed(() => `${linePath.value} L ${RW},${RH} L 0,${RH} Z`)
const endPt = computed(() => rampPts.value[rampPts.value.length - 1] || [RW, 0])
const eligibleY = computed(() => RH - (eligible.value / maxVal.value) * RH)
const approvedY = computed(() => (approved.value != null ? RH - (approved.value / maxVal.value) * RH : 0))

// ── lifecycle ──
const fmtDateTime = (d) => {
  if (!d) return '—'
  try { return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  catch { return String(d) }
}
const timeline = computed(() => {
  const x = r.value || {}
  const approvedDone = !!x.approved_at || ['APPROVED', 'PAID', 'REVERSED'].includes(x.status)
  const rows = [
    { label: 'Computed', at: x.computed_at, hex: '#fbbf24', done: true },
    { label: trimmed.value ? 'Approved (trimmed)' : 'Approved', at: x.approved_at, hex: '#34d399', done: approvedDone, future: !approvedDone },
  ]
  if (x.status === 'REVERSED') {
    rows.push({ label: 'Reversed', at: null, hex: '#c084fc', done: true, bad: true })
  } else {
    // A DA is paid as PART of the settlement — the method lives there, not on the
    // DA. Reflect the real disbursement instead of assuming payroll; fall back to a
    // method-agnostic label if the backend hasn't supplied settlement_method yet.
    const paid = x.status === 'PAID'
    const verb = { PAYROLL: 'Paid via payroll', BANK_TRANSFER: 'Paid · bank transfer', CASH: 'Paid in cash', CHEQUE: 'Paid by cheque' }
    const label = paid ? (verb[x.settlement_method] || 'Settled & paid') : 'Settlement & payout'
    rows.push({
      label, at: x.paid_at || null, hex: '#60d394', done: paid, future: !paid,
      extra: (paid && x.settlement_method === 'PAYROLL') ? (x.payroll_ref || null) : null,
    })
  }
  return rows
})

// ── draw-on choreography ──
const drawn = ref(false)
watch(() => props.open, (o) => {
  if (o) {
    drawn.value = false
    if (prefersReduced()) { drawn.value = true; return }
    requestAnimationFrame(() => requestAnimationFrame(() => { drawn.value = true }))
  } else drawn.value = false
}, { immediate: true })

const sT = (n) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, delay: 0.06 + n * 0.07, ease: [0.16, 1, 0.3, 1] } })
</script>

<style scoped>
.dd-overlay { position: fixed; inset: 0; z-index: 1446; display: grid; place-items: center; padding: 20px; background: rgba(6,5,4,0.66); backdrop-filter: blur(10px); }
.dd { position: relative; width: min(600px, 96vw); max-height: 92vh; overflow: hidden; display: flex; flex-direction: column;
  border-radius: 22px; background: var(--trv-surface-elevated); border: 1px solid var(--trv-border-strong); box-shadow: var(--trv-shadow); }
.dd-aura { position: absolute; inset: -40% 25% 60% -15%; pointer-events: none; opacity: 0.7;
  background: radial-gradient(56% 70% at 28% 0%, color-mix(in srgb, var(--c) 22%, transparent), transparent 70%); animation: trv-aura-drift 10s ease-in-out infinite; }
.dd-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; z-index: 2; }

/* header */
.dd-head { position: relative; z-index: 1; display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; padding: 18px 20px 14px; }
.dd-htext { min-width: 0; }
.dd-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--trv-amber); }
.dd-name { font-size: 19px; font-weight: 850; margin: 6px 0 7px; color: var(--trv-text); line-height: 1.1; }
.dd-subrow { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.dd-ref { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; color: var(--trv-amber-bright); background: none; border: none; padding: 0; cursor: pointer; }
.dd-ref:hover { text-decoration: underline; }
.dd-tier, .dd-grade { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 7px; }
.dd-tier { color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.dd-grade { color: var(--trv-text-muted); background: var(--trv-steel-soft); border: 1px solid var(--trv-border); }
.dd-hactions { display: flex; align-items: center; gap: 9px; flex-shrink: 0; }
.dd-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; padding: 5px 11px; border-radius: 999px; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 32%, transparent); }
.dd-x { background: var(--trv-panel); border: 1px solid var(--trv-border); border-radius: 9px; padding: 6px; color: var(--trv-text-dim); cursor: pointer; transition: color 0.2s; }
.dd-x:hover { color: var(--trv-text); }

/* body */
.dd-body { position: relative; z-index: 1; flex: 1; overflow-y: auto; padding: 4px 20px 18px; display: flex; flex-direction: column; gap: 13px; }
.dd-card { padding: 14px 15px; border-radius: 15px; background: var(--trv-surface); border: 1px solid var(--trv-border); }
.dd-ct { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase; color: var(--trv-text-muted); margin-bottom: 13px; }

/* hero */
.dd-hero { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 18px 20px; border-radius: 18px;
  background: linear-gradient(160deg, var(--trv-flap), color-mix(in srgb, var(--trv-flap) 82%, #000)); border: 1px solid var(--trv-border-strong); }
.hero-amt { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.ha-lab { font-size: 9.5px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--trv-text-dim); }
.ha-odo { font-size: 38px; --odo-color: var(--trv-flap-text); }
.ha-formula { font-size: 11px; color: var(--trv-text-muted); }
.hero-seal { position: relative; width: 96px; height: 96px; flex-shrink: 0; }
.seal-svg { width: 96px; height: 96px; transform: rotate(-90deg); }
.seal-track { fill: none; stroke: rgba(255,255,255,0.08); stroke-width: 7; }
.seal-arc { fill: none; stroke-width: 7; stroke-linecap: round; transition: stroke-dasharray 1.1s cubic-bezier(0.16,1,0.3,1); filter: drop-shadow(0 0 5px color-mix(in srgb, currentColor 45%, transparent)); }
.seal-center { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1px; }
.seal-pct { font-size: 19px; font-weight: 850; }
.seal-cap { font-size: 8px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--trv-text-dim); }

/* ramp */
.ramp { display: flex; flex-direction: column; gap: 9px; }
.ramp-svg { width: 100%; height: 96px; display: block; overflow: visible; }
.ramp-grid { stroke: var(--trv-border); stroke-width: 1; stroke-dasharray: 2 4; }
.ramp-ref { stroke: var(--trv-text-dim); stroke-width: 1; stroke-dasharray: 4 4; opacity: 0.6; }
.ramp-cap { stroke-width: 1.2; stroke-dasharray: 3 3; opacity: 0.85; }
.ramp-area { opacity: 0; transition: opacity 0.9s ease 0.35s; }
.ramp.drawn .ramp-area { opacity: 1; }
.ramp-line { fill: none; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; transition: stroke-dashoffset 1.25s cubic-bezier(0.16,1,0.3,1); filter: drop-shadow(0 0 4px color-mix(in srgb, currentColor 50%, transparent)); }
.ramp-notch { opacity: 0; transform: scale(0); transform-box: fill-box; transform-origin: center; transition: opacity 0.3s, transform 0.3s var(--trv-spring); }
.ramp.drawn .ramp-notch { opacity: 1; transform: scale(1); }
.ramp-head { opacity: 0; transition: opacity 0.3s ease 1.2s; }
.ramp.drawn .ramp-head { opacity: 1; animation: dd-pulse 1.8s ease-in-out infinite 1.4s; transform-box: fill-box; transform-origin: center; }
@keyframes dd-pulse { 0%, 100% { transform: scale(0.82); opacity: 0.85; } 50% { transform: scale(1.25); opacity: 1; } }
.ramp-axis { display: flex; align-items: center; justify-content: space-between; font-size: 9.5px; color: var(--trv-text-dim); }
.ramp-total b { font-weight: 800; }

/* receipt */
.rcpt { margin: 0; display: flex; flex-direction: column; gap: 0; }
.rc-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px dashed var(--trv-border); }
.rc-row:last-child { border-bottom: none; }
.rc-row dt { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; color: var(--trv-text-muted); margin: 0; }
.rc-row dt svg { color: var(--trv-text-dim); }
.rc-row dd { margin: 0; font-size: 12.5px; font-weight: 650; color: var(--trv-text); text-align: right; }
.rc-unit { font-size: 10px; color: var(--trv-text-dim); font-weight: 500; }
.rc-chip { font-size: 10px; font-weight: 700; padding: 2px 9px; border-radius: 6px; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.rc-row.sum dt { color: var(--trv-text-secondary); font-weight: 700; }
.rc-row.sum dd { font-size: 15px; font-weight: 850; color: var(--trv-amber-bright); }
.rc-row.sum.app dd { color: var(--trv-st-approved); display: inline-flex; align-items: center; gap: 7px; }
.rc-delta { display: inline-flex; align-items: center; gap: 3px; font-size: 9.5px; font-weight: 700; color: var(--trv-st-returned); padding: 2px 6px; border-radius: 5px; background: var(--trv-st-returned-soft); }

.dd-note { display: flex; align-items: center; gap: 7px; margin-top: 12px; padding: 9px 11px; border-radius: 9px; font-size: 11.5px; }
.dd-note b { color: var(--trv-text); }
.dd-note.warn { color: var(--trv-st-returned); background: var(--trv-st-returned-soft); }
.dd-note.info { color: var(--trv-amber); background: var(--trv-amber-soft); }

/* timeline */
.dd-tl { list-style: none; margin: 0; padding: 0 0 0 4px; }
.dd-tl li { position: relative; display: flex; align-items: flex-start; gap: 12px; padding: 0 0 14px 14px; border-left: 1.5px solid var(--trv-border); }
.dd-tl li:last-child { border-left-color: transparent; padding-bottom: 0; }
.tl-dot { position: absolute; left: -7px; top: 2px; width: 12px; height: 12px; border-radius: 50%; background: var(--trv-panel); border: 2px solid var(--trv-border-strong); transition: background 0.4s, border-color 0.4s; }
.dd-tl li.future { opacity: 0.45; }
.dd-tl li.bad .tl-dot { background: var(--trv-st-reversed, #c084fc); border-color: #c084fc; }
.tl-c { display: flex; flex-direction: column; gap: 1px; }
.tl-lab { font-size: 12.5px; font-weight: 650; color: var(--trv-text); }
.tl-when { font-size: 10.5px; color: var(--trv-text-dim); }
.tl-extra { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; color: var(--trv-st-completed); margin-top: 2px; }

.dd-tour { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--trv-border); }
.tour-lab { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--trv-text-dim); }
.tour-pill { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 999px; color: var(--c); background: color-mix(in srgb, var(--c) 13%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }

/* footer */
.dd-foot { position: relative; z-index: 1; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 13px 20px; border-top: 1px solid var(--trv-border); background: var(--trv-surface-glass); backdrop-filter: blur(12px); flex-wrap: wrap; }
.dd-links { display: flex; gap: 6px; }
.lk { display: inline-flex; padding: 8px; border-radius: 9px; background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-muted); cursor: pointer; transition: color 0.2s, border-color 0.2s; }
.lk:hover { color: var(--trv-amber); border-color: var(--trv-amber-border); }
.dd-actions { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.dd-payref { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--trv-st-completed); }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 11px; font-size: 12.5px; font-weight: 700; cursor: pointer; border: 1px solid transparent; background: none; }
.btn.primary { background: var(--trv-grad-hero); color: #1a1205; box-shadow: var(--trv-amber-glow); }
.btn.ghost { border: 1px solid var(--trv-border-strong); color: var(--trv-text-secondary); }
.btn.ghost:hover { border-color: var(--trv-amber-border); color: var(--trv-text); }
.btn.locked { cursor: help; background: var(--trv-steel-soft); border: 1px dashed var(--trv-border-strong); color: var(--trv-text-muted); font-weight: 650; }

/* light theme */
[data-theme="light"] .dd-overlay { background: rgba(60,40,15,0.32); }
[data-theme="light"] .dd-hero { background: linear-gradient(160deg, #2a2620, #1f1c16); }
[data-theme="light"] .seal-track { stroke: rgba(120,90,30,0.16); }
[data-theme="light"] .ramp-grid { stroke: rgba(60,45,20,0.12); }

@media (max-width: 560px) {
  .dd-hero { flex-direction: column-reverse; align-items: flex-start; }
  .ha-odo { font-size: 32px; }
}
@media (prefers-reduced-motion: reduce) {
  .dd-aura { animation: none; }
  .seal-arc, .ramp-area, .ramp-line, .ramp-notch, .ramp-head { transition: none; }
  .ramp.drawn .ramp-head { animation: none; }
}
</style>
