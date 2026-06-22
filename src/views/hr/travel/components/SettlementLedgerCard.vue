<template>
  <div class="sl-shell" :style="{ '--i': index }">
    <article ref="cardEl" class="sl" :class="[`st-${(s.status || '').toLowerCase()}`, { draft: isDraft }]">
      <span class="sl-glare" aria-hidden="true" />
      <span class="sl-spine" :style="{ background: meta.hex }" aria-hidden="true" />

      <header class="sl-top">
        <div class="sl-id">
          <span class="sl-name">{{ s.employee_name || '—' }}</span>
          <div class="sl-refs">
            <span class="sl-num trv-mono">{{ s.settlement_number }}</span>
            <button class="sl-srcref trv-mono" title="Open source tour"
              @click="$emit('go', { tab: 'requests', filter: { q: s.travel_reference_number } })">
              {{ s.travel_reference_number }} <ArrowUpRight :size="10" />
            </button>
          </div>
        </div>
        <span class="sl-pill" :style="{ '--c': meta.hex }">
          <component :is="meta.icon" :size="11" /> {{ meta.label }}
        </span>
      </header>

      <!-- verification guard: double-pay + missing-receipt -->
      <button v-if="reviewCount && actionable" class="sl-dup" @click="$emit('detail', s)">
        <TriangleAlert :size="12" />
        <span><b>{{ reviewCount }}</b> expense line{{ reviewCount > 1 ? 's' : '' }} {{ reviewMsg }}</span>
        <ChevronRight :size="13" />
      </button>

      <!-- ── reconciliation netting beam ── -->
      <div class="sl-recon" :class="{ lit }">
        <div class="rc-row">
          <span class="rc-tag">Reimbursable</span>
          <div class="rc-track">
            <span class="rc-seg exp" :style="{ width: lit ? expW + '%' : '0%' }" :title="`Expense ${fmtINR(expense)}`" />
            <span class="rc-seg da" :style="{ width: lit ? daW + '%' : '0%', left: lit ? expW + '%' : '0%' }" :title="`DA ${fmtINR(da)}`" />
          </div>
          <b class="rc-fig trv-mono">{{ fmtCompactINR(reimbursable) }}</b>
        </div>
        <div class="rc-row">
          <span class="rc-tag">Advance</span>
          <div class="rc-track">
            <span class="rc-seg adv" :style="{ width: lit ? advW + '%' : '0%' }" :title="`Advance ${fmtINR(advance)}`" />
          </div>
          <b class="rc-fig trv-mono">{{ fmtCompactINR(advance) }}</b>
        </div>

        <div class="rc-net" :style="{ '--c': netHex }">
          <component :is="netIcon" :size="13" class="rc-net-ic" />
          <span class="rc-net-lab">{{ netLabel }}</span>
          <b class="rc-net-val trv-mono">{{ fmtINR(netAmount) }}</b>
        </div>
      </div>

      <footer class="sl-foot">
        <div class="sl-meta">
          <span v-if="s.payroll_ref" class="sl-payref trv-mono" title="Payroll reference"><Wallet :size="10" /> {{ s.payroll_ref }}</span>
          <span v-else-if="isDraft" class="sl-await"><span class="aw-dot" /> Awaiting expenses</span>
          <span v-else class="sl-when trv-mono">{{ fmtDate(s.submitted_at || s.created_at) }}</span>
        </div>
        <div class="sl-act">
          <button class="mini ghost" @click="$emit('detail', s)"><Eye :size="13" /> Details</button>
          <Motion v-if="s.status === 'SUBMITTED'" as="button" class="mini steel" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="$emit('verify', s)">
            <ClipboardCheck :size="13" /> Verify
          </Motion>
          <Motion v-if="['SUBMITTED','VERIFIED'].includes(s.status)" as="button" class="mini primary" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="$emit('settle', s)">
            <Wallet :size="13" /> Settle
          </Motion>
          <button v-if="['SETTLED','PAID'].includes(s.status)" class="mini ghost danger" @click="$emit('reverse', s)"><RotateCcw :size="13" /> Reverse</button>
        </div>
      </footer>
    </article>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import {
  ArrowUpRight, Wallet, ClipboardCheck, RotateCcw, Eye, TrendingUp, TrendingDown, Scale,
  Clock, CheckCircle2, BadgeCheck, Coins, TriangleAlert, ChevronRight,
} from 'lucide-vue-next'
import {
  fmtINR, fmtCompactINR, fmtDate, settlementMeta, SETTLEMENT_STATUS, countBookingDupes, countUnsupported,
} from '@/composables/useTravel'
import { usePointerSpotlight, prefersReduced } from '@/composables/useShiftMotion'

const props = defineProps({
  s: { type: Object, required: true },
  index: { type: Number, default: 0 },
  bookings: { type: Array, default: () => [] },   // company-paid bookings for this tour
})
defineEmits(['verify', 'settle', 'reverse', 'detail', 'go'])

const actionable = computed(() => ['SUBMITTED', 'VERIFIED'].includes(props.s.status))
const dupCount = computed(() => countBookingDupes(props.s.expense_lines, props.bookings))
const unsupportedCount = computed(() => countUnsupported(props.s.expense_lines))
const reviewCount = computed(() => dupCount.value + unsupportedCount.value)
const reviewMsg = computed(() => {
  if (dupCount.value && unsupportedCount.value) return 'possible double-claims & missing receipts — review before settling'
  if (dupCount.value) return `may duplicate company-paid bookings — don't reimburse twice`
  return `over the receipt threshold with no proof attached — verify before settling`
})

const cardEl = ref(null)
const lit = ref(false)
usePointerSpotlight(cardEl)

const ST_ICON = { DRAFT: Clock, SUBMITTED: Coins, VERIFIED: ClipboardCheck, SETTLED: CheckCircle2, PAID: BadgeCheck, REVERSED: RotateCcw }
const meta = computed(() => {
  const m = settlementMeta(props.s.status) || SETTLEMENT_STATUS[0]
  return { ...m, icon: ST_ICON[props.s.status] || Clock }
})

const advance = computed(() => Number(props.s.advance_received) || 0)
const expense = computed(() => Number(props.s.approved_expense || props.s.total_expense) || 0)
const da = computed(() => Number(props.s.da_amount) || 0)
const reimbursable = computed(() => expense.value + da.value)
const isDraft = computed(() => props.s.status === 'DRAFT')

const scaleMax = computed(() => Math.max(reimbursable.value, advance.value, 1))
const expW = computed(() => Math.round((expense.value / scaleMax.value) * 100))
const daW = computed(() => Math.round((da.value / scaleMax.value) * 100))
const advW = computed(() => Math.round((advance.value / scaleMax.value) * 100))

const payable = computed(() => Number(props.s.payable_amount) || 0)
const recoverable = computed(() => Number(props.s.recoverable_amount) || 0)
const netDir = computed(() => payable.value > 0 ? 'payable' : recoverable.value > 0 ? 'recoverable' : 'balanced')
const netAmount = computed(() => payable.value > 0 ? payable.value : recoverable.value)
const netHex = computed(() => netDir.value === 'payable' ? 'var(--trv-st-approved)' : netDir.value === 'recoverable' ? 'var(--trv-st-rejected)' : 'var(--trv-steel)')
const netLabel = computed(() => netDir.value === 'payable' ? 'Payable to traveller' : netDir.value === 'recoverable' ? 'Recover from traveller' : 'Balanced')
const netIcon = computed(() => netDir.value === 'payable' ? TrendingUp : netDir.value === 'recoverable' ? TrendingDown : Scale)

onMounted(() => {
  if (prefersReduced()) { lit.value = true; return }
  requestAnimationFrame(() => requestAnimationFrame(() => { lit.value = true }))
})
</script>

<style scoped>
.sl-shell { animation: trv-deal 0.5s var(--trv-spring) backwards; animation-delay: calc(var(--i) * 0.045s); }
.sl { position: relative; overflow: hidden; border-radius: 16px; padding: 15px 17px;
  background: var(--trv-surface); border: 1px solid var(--trv-border); box-shadow: var(--trv-card-shadow);
  transition: transform 0.25s var(--trv-spring), box-shadow 0.25s, border-color 0.25s; }
.sl:hover { transform: perspective(1100px) rotateX(calc((var(--my,.5) - .5) * -4deg)) rotateY(calc((var(--mx,.5) - .5) * 6deg)) translateY(-3px); box-shadow: var(--trv-shadow-hover); border-color: var(--trv-amber-border); }
.sl.draft { border-style: dashed; }
.sl-glare { position: absolute; inset: 0; opacity: var(--spot, 0); pointer-events: none; background: radial-gradient(320px circle at calc(var(--mx,.5)*100%) calc(var(--my,.5)*100%), rgba(251,191,36,0.12), transparent 60%); transition: opacity 0.3s; }
.sl-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; }

.sl-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 13px; }
.sl-id { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.sl-name { font-size: 13.5px; font-weight: 700; color: var(--trv-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sl-refs { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.sl-num { font-size: 11px; font-weight: 700; color: var(--trv-amber-bright); }
.sl-srcref { display: inline-flex; align-items: center; gap: 3px; font-size: 10.5px; color: var(--trv-text-muted); background: none; border: none; padding: 0; cursor: pointer; }
.sl-srcref:hover { color: var(--trv-amber); text-decoration: underline; }
.sl-pill { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 999px; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 32%, transparent); flex-shrink: 0; }

/* double-pay guard */
.sl-dup { display: flex; align-items: center; gap: 8px; width: 100%; text-align: left; margin-bottom: 12px; padding: 8px 11px; border-radius: 10px; cursor: pointer; font-size: 11px; line-height: 1.35; color: var(--trv-st-returned);
  background: var(--trv-st-returned-soft); border: 1px solid color-mix(in srgb, var(--trv-st-returned) 28%, transparent); transition: border-color 0.2s; }
.sl-dup:hover { border-color: color-mix(in srgb, var(--trv-st-returned) 50%, transparent); }
.sl-dup span { flex: 1; }
.sl-dup b { color: var(--trv-text); }
.sl-dup svg:first-child { flex-shrink: 0; }
.sl-dup svg:last-child { flex-shrink: 0; opacity: 0.6; }

/* netting beam */
.sl-recon { display: flex; flex-direction: column; gap: 9px; padding: 12px 0; border-top: 1px dashed var(--trv-border); border-bottom: 1px dashed var(--trv-border); margin-bottom: 12px; }
.rc-row { display: grid; grid-template-columns: 78px 1fr auto; align-items: center; gap: 10px; }
.rc-tag { font-size: 9.5px; letter-spacing: 0.07em; text-transform: uppercase; color: var(--trv-text-dim); }
.rc-track { position: relative; height: 12px; border-radius: 7px; background: var(--trv-panel); border: 1px solid var(--trv-border); overflow: hidden; }
.rc-seg { position: absolute; top: 0; bottom: 0; transition: width 0.85s var(--trv-spring), left 0.85s var(--trv-spring); }
.rc-seg.exp { left: 0; background: linear-gradient(90deg, color-mix(in srgb, var(--trv-amber-strong) 80%, transparent), var(--trv-amber)); border-radius: 7px 0 0 7px; }
.rc-seg.da { background: linear-gradient(90deg, color-mix(in srgb, var(--trv-ember) 80%, transparent), var(--trv-ember)); }
.rc-seg.adv { left: 0; background: linear-gradient(90deg, color-mix(in srgb, var(--trv-steel) 60%, transparent), var(--trv-steel)); border-radius: 7px; }
.rc-fig { font-size: 11.5px; font-weight: 700; color: var(--trv-text); min-width: 44px; text-align: right; }

.rc-net { display: inline-flex; align-items: center; gap: 7px; align-self: flex-start; padding: 6px 11px; border-radius: 9px; margin-top: 2px;
  color: var(--c); background: color-mix(in srgb, var(--c) 11%, transparent); border: 1px solid color-mix(in srgb, var(--c) 28%, transparent); }
.rc-net-lab { font-size: 11px; font-weight: 700; }
.rc-net-val { font-size: 13.5px; font-weight: 850; margin-left: auto; }

.sl-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.sl-meta { display: flex; align-items: center; gap: 8px; min-height: 22px; }
.sl-payref { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; color: var(--trv-st-completed); }
.sl-when { font-size: 10.5px; color: var(--trv-text-dim); }
.sl-await { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 650; color: var(--trv-st-pending); }
.aw-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--trv-st-pending); animation: trv-beacon 1.8s ease-in-out infinite; }
.sl-act { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.mini { display: inline-flex; align-items: center; gap: 5px; padding: 6px 11px; border-radius: 9px; font-size: 12px; font-weight: 700; cursor: pointer; border: 1px solid transparent; background: none; }
.mini.primary { background: var(--trv-grad-hero); color: #1a1205; }
.mini.steel { background: var(--trv-steel-soft); color: var(--trv-text); border: 1px solid var(--trv-border-strong); }
.mini.ghost { border: 1px solid var(--trv-border-strong); color: var(--trv-text-secondary); }
.mini.ghost:hover { border-color: var(--trv-amber-border); color: var(--trv-text); }
.mini.ghost.danger:hover { border-color: color-mix(in srgb, var(--trv-st-rejected) 40%, transparent); color: var(--trv-st-rejected); }

@media (prefers-reduced-motion: reduce) {
  .sl-shell { animation: none; } .sl:hover { transform: translateY(-2px); }
  .rc-seg { transition: none; } .aw-dot { animation: none; }
}
</style>
