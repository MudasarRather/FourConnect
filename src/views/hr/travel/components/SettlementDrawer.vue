<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" as="div" class="sd-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.25 }" @click.self="$emit('close')">
        <Motion as="aside" class="sd" role="dialog" aria-label="Settlement detail"
          :initial="{ x: 60, opacity: 0 }" :animate="{ x: 0, opacity: 1 }" :exit="{ x: 60, opacity: 0 }"
          :transition="{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }">
          <span class="sd-aura" aria-hidden="true" />

          <!-- header -->
          <header class="sd-head">
            <span class="sd-spine" :style="{ background: meta.hex }" />
            <div class="sd-htext">
              <span class="sd-num trv-mono">{{ rec.settlement_number }}</span>
              <span class="sd-pill" :style="{ '--c': meta.hex }"><component :is="meta.icon" :size="11" /> {{ meta.label }}</span>
            </div>
            <button class="sd-x" @click="$emit('close')"><X :size="18" /></button>
          </header>

          <div class="sd-body">
            <!-- net verdict hero -->
            <Motion class="sd-hero" v-bind="sT(0)">
              <div class="sh-row">
                <div class="sh-who">
                  <span class="sh-name">{{ rec.employee_name || '—' }}</span>
                  <button class="sh-ref trv-mono" @click="$emit('go', { tab: 'requests', filter: { q: rec.travel_reference_number } })">
                    {{ rec.travel_reference_number }} <ArrowUpRight :size="11" />
                  </button>
                </div>
                <span class="sh-meth" v-if="rec.settlement_method">
                  <component :is="methodMeta.icon" :size="11" /> {{ methodMeta.label }}
                </span>
              </div>
              <div class="sh-net" :style="{ '--c': netHex }">
                <component :is="netIcon" :size="20" />
                <span class="sh-net-val trv-mono">{{ rec.net > 0 ? '+' : rec.net < 0 ? '−' : '' }}{{ fmtINR(Math.abs(rec.net)) }}</span>
                <span class="sh-net-lab">{{ netLabel }}</span>
              </div>
            </Motion>

            <!-- reconciliation bridge -->
            <Motion class="sd-card" v-bind="sT(1)">
              <span class="sd-ct"><Scale :size="13" /> Reconciliation</span>
              <div class="br" :class="{ lit: shown }">
                <template v-if="daCovered > 0">
                  <div class="br-row">
                    <span class="br-tag">Filed expense</span>
                    <div class="br-track"><span class="br-bar exp" :style="{ width: bw(rec.total_expense) }" /></div>
                    <b class="trv-mono">{{ fmtINR(rec.total_expense) }}</b>
                  </div>
                  <div class="br-row cover">
                    <span class="br-tag">− Covered by DA</span>
                    <div class="br-track"><span class="br-bar cov" :style="{ width: bw(daCovered) }" /></div>
                    <b class="trv-mono">−{{ fmtINR(daCovered) }}</b>
                  </div>
                </template>
                <div class="br-row sum">
                  <span class="br-tag">Approved expense</span>
                  <div class="br-track"><span class="br-bar exp" :style="{ width: bw(rec.approved_expense) }" /></div>
                  <b class="trv-mono">{{ fmtINR(rec.approved_expense) }}</b>
                </div>
                <div class="br-row">
                  <span class="br-tag">+ DA allowance</span>
                  <div class="br-track"><span class="br-bar da" :style="{ width: bw(rec.da_amount) }" /></div>
                  <b class="trv-mono">{{ fmtINR(rec.da_amount) }}</b>
                </div>
                <div class="br-row">
                  <span class="br-tag">− Advance</span>
                  <div class="br-track"><span class="br-bar adv" :style="{ width: bw(rec.advance_received) }" /></div>
                  <b class="trv-mono">{{ fmtINR(rec.advance_received) }}</b>
                </div>
                <div class="br-row net" :style="{ '--c': netHex }">
                  <span class="br-tag">= Net</span>
                  <div class="br-track"><span class="br-bar netbar" :style="{ width: bw(Math.abs(rec.net)), background: netHex }" /></div>
                  <b class="trv-mono" :style="{ color: netHex }">{{ rec.net > 0 ? '+' : rec.net < 0 ? '−' : '' }}{{ fmtINR(Math.abs(rec.net)) }}</b>
                </div>
              </div>
              <p v-if="daCovered > 0" class="br-note"><Info :size="11" /> {{ fmtINR(daCovered) }} of food / local-transport / incidental claims is covered by the per-diem and excluded — per-diem isn't paid twice.</p>
            </Motion>

            <!-- expense lines (the verification surface) -->
            <Motion class="sd-card" v-bind="sT(2)">
              <span class="sd-ct"><Receipt :size="13" /> Expense receipts <em v-if="lines.length">({{ lines.length }})</em></span>
              <div v-if="dupCount" class="sd-dup-banner">
                <TriangleAlert :size="14" />
                <span><b>{{ dupCount }} line{{ dupCount > 1 ? 's' : '' }}</b> may duplicate company-paid bookings. Confirm the traveller paid out of pocket before settling — don't reimburse it twice.</span>
              </div>
              <div v-if="unsupportedCount" class="sd-dup-banner unsup">
                <ReceiptText :size="14" />
                <span><b>{{ unsupportedCount }} line{{ unsupportedCount > 1 ? 's' : '' }}</b> over {{ fmtINR(RECEIPT_THRESHOLD) }} {{ unsupportedCount > 1 ? 'have' : 'has' }} no receipt attached — verify before approving.</span>
              </div>
              <div v-if="loadingLines" class="sd-lineload"><span v-for="n in 2" :key="n" class="sd-line-skel" /></div>
              <table v-else-if="lines.length" class="sd-lines">
                <thead>
                  <tr><th>Category</th><th>Date</th><th>Vendor</th><th class="r">Amount</th><th class="r">GST</th></tr>
                </thead>
                <tbody>
                  <tr v-for="(ln, i) in lines" :key="i" :class="{ dup: lineFlag(ln).strong, soft: lineFlag(ln).flagged && !lineFlag(ln).strong, covered: isCovered(ln) }">
                    <td><span class="cat-chip" :style="{ '--c': catHex(ln.category) }">{{ prettyCat(ln.category) }}</span></td>
                    <td class="trv-mono dim">{{ ln.expense_date ? fmtDate(ln.expense_date) : '—' }}</td>
                    <td class="vend">
                      {{ ln.vendor || '—' }}
                      <span v-if="isCovered(ln)" class="cov-tag" title="Covered by the per-diem — excluded from reimbursement">covered by DA</span>
                      <span v-if="lineFlag(ln).flagged" class="dup-tag" :class="{ strong: lineFlag(ln).strong }"
                        :title="lineFlag(ln).strong ? 'Amount matches a company-paid booking' : 'Category overlaps a company-paid booking'">
                        <TriangleAlert :size="9" /> booked?
                      </span>
                      <span v-if="isUnsupported(ln)" class="nr-tag" title="No receipt attached"><ReceiptText :size="9" /> no receipt</span>
                      <a v-for="(att, k) in (ln.attachments || [])" :key="k" class="att" :href="attUrl(att)" target="_blank" rel="noopener" :title="att.original_filename || 'receipt'">
                        <Paperclip :size="10" />
                      </a>
                      <span v-if="ln.note" class="ln-note" :title="ln.note"><StickyNote :size="10" /></span>
                    </td>
                    <td class="r trv-mono" :class="{ struck: isCovered(ln) }">{{ fmtINR(ln.amount) }}</td>
                    <td class="r trv-mono dim">{{ ln.gst ? fmtINR(ln.gst) : '—' }}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr><td colspan="3">Total filed</td><td class="r trv-mono total">{{ fmtINR(rec.total_expense) }}</td><td></td></tr>
                </tfoot>
              </table>
              <div v-else class="sd-empty">
                <Inbox :size="22" />
                <p>No expenses filed yet</p>
                <span>The traveller hasn't submitted post-tour receipts. The settlement opens once they file from self-service.</span>
              </div>
            </Motion>

            <!-- company-paid bookings (read-only — double-pay reference) -->
            <Motion v-if="bookings.length" class="sd-card" v-bind="sT(3)">
              <span class="sd-ct"><Ticket :size="13" /> Company-paid bookings <em>({{ bookings.length }})</em></span>
              <div class="sd-book">
                <div v-for="b in bookings" :key="b.id" class="bk-row" :style="{ '--c': bookingMeta(b.booking_type).hex }">
                  <component :is="bookingMeta(b.booking_type).icon" :size="14" class="bk-ic" />
                  <span class="bk-lab">{{ bookingMeta(b.booking_type).label }}<em v-if="b.vendor"> · {{ b.vendor }}</em></span>
                  <b class="trv-mono">{{ fmtINR(b.total_cost) }}</b>
                </div>
                <div class="bk-row total"><span class="bk-lab">Total company-paid</span><b class="trv-mono">{{ fmtINR(bookedTotal) }}</b></div>
              </div>
              <p class="sd-book-note">Paid directly by the company — excluded from the reconciliation above. Flagged expense lines may double-claim these.</p>
            </Motion>

            <!-- lifecycle timeline -->
            <Motion class="sd-card" v-bind="sT(4)">
              <span class="sd-ct"><History :size="13" /> Lifecycle</span>
              <ol class="sd-tl">
                <li v-for="(step, i) in timeline" :key="i" :class="step.state">
                  <span class="tl-dot" :style="step.state === 'done' ? { background: step.hex, borderColor: step.hex } : {}" />
                  <div class="tl-c">
                    <span class="tl-lab">{{ step.label }}</span>
                    <span class="tl-when trv-mono">{{ step.at ? fmtDateTime(step.at) : step.state === 'skipped' ? 'skipped' : step.state === 'done' ? '—' : 'pending' }}</span>
                  </div>
                </li>
              </ol>
              <div v-if="rec.reversal_reason" class="sd-reason">
                <RotateCcw :size="12" /> <b>Reversal:</b> {{ rec.reversal_reason }}
              </div>
            </Motion>
          </div>

          <!-- footer actions -->
          <footer class="sd-foot">
            <div class="sd-links">
              <button class="lk" @click="$emit('go', 'advances')" title="Linked advances"><Coins :size="13" /></button>
              <button class="lk" @click="$emit('go', 'da')" title="Linked DA"><Calculator :size="13" /></button>
              <button class="lk" @click="$emit('go', 'booking')" title="Linked bookings"><Ticket :size="13" /></button>
            </div>
            <div class="sd-actions">
              <button v-if="rec.status === 'SUBMITTED'" class="btn steel" @click="$emit('verify', rec)"><ClipboardCheck :size="14" /> Verify</button>
              <button v-if="['SUBMITTED','VERIFIED'].includes(rec.status)" class="btn primary" @click="$emit('settle', rec)"><Wallet :size="14" /> Settle</button>
              <button v-if="['SETTLED','PAID'].includes(rec.status)" class="btn ghost danger" @click="$emit('reverse', rec)"><RotateCcw :size="14" /> Reverse</button>
              <span v-if="rec.payroll_ref" class="pay-ref trv-mono"><Wallet :size="12" /> {{ rec.payroll_ref }}</span>
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
  X, ArrowUpRight, Scale, Receipt, History, RotateCcw, Wallet, ClipboardCheck,
  Coins, Calculator, Ticket, Paperclip, StickyNote, Inbox, TrendingUp, TrendingDown,
  Clock, CheckCircle2, BadgeCheck, TriangleAlert, Info, ReceiptText,
} from 'lucide-vue-next'
import {
  fmtINR, fmtDate, settlementMeta, settlementMethodMeta, getSettlement,
  bookingDupeFlag, countBookingDupes, bookingMeta,
  daCoveredFlag, sumDaCovered, expenseLineUnsupported, countUnsupported, RECEIPT_THRESHOLD,
} from '@/composables/useTravel'
import { API_BASE } from '@/utils/api'

const props = defineProps({
  open: Boolean,
  settlement: { type: Object, default: null },
  bookings: { type: Array, default: () => [] },   // company-paid bookings for this tour
})
defineEmits(['close', 'verify', 'settle', 'reverse', 'go'])

const ST_ICON = { DRAFT: Clock, SUBMITTED: Coins, VERIFIED: ClipboardCheck, SETTLED: CheckCircle2, PAID: BadgeCheck, REVERSED: RotateCcw }
const rec = computed(() => {
  const s = full.value || props.settlement || {}
  const payable = Number(s.payable_amount) || 0
  const recoverable = Number(s.recoverable_amount) || 0
  return { ...s, net: payable - recoverable }
})
const meta = computed(() => ({ ...(settlementMeta(rec.value.status) || {}), icon: ST_ICON[rec.value.status] || Clock }))
const methodMeta = computed(() => settlementMethodMeta(rec.value.settlement_method))

const reimbursable = computed(() => (Number(rec.value.approved_expense || rec.value.total_expense) || 0) + (Number(rec.value.da_amount) || 0))
const netDir = computed(() => rec.value.net > 0 ? 'payable' : rec.value.net < 0 ? 'recoverable' : 'balanced')
const netHex = computed(() => netDir.value === 'payable' ? 'var(--trv-st-approved)' : netDir.value === 'recoverable' ? 'var(--trv-st-rejected)' : 'var(--trv-steel)')
const netLabel = computed(() => netDir.value === 'payable' ? 'Payable to traveller' : netDir.value === 'recoverable' ? 'Recover from traveller' : 'Balanced')
const netIcon = computed(() => netDir.value === 'payable' ? TrendingUp : netDir.value === 'recoverable' ? TrendingDown : Scale)

const lines = computed(() => (rec.value.expense_lines || []))

// double-pay guard — company-paid bookings vs filed expense lines
const dupCount = computed(() => countBookingDupes(lines.value, props.bookings))
const lineFlag = (ln) => bookingDupeFlag(ln, props.bookings)
const bookedTotal = computed(() => (props.bookings || []).reduce((a, b) => a + (Number(b.total_cost) || 0), 0))

// per-diem (M&IE) coverage + receipt discipline
const daCovered = computed(() => sumDaCovered(lines.value, rec.value.da_amount))
const unsupportedCount = computed(() => countUnsupported(lines.value))
const isCovered = (ln) => daCoveredFlag(ln, rec.value.da_amount)
const isUnsupported = (ln) => expenseLineUnsupported(ln)

const scaleMax = computed(() => Math.max(
  Number(rec.value.advance_received) || 0, reimbursable.value, Math.abs(rec.value.net), 1))
const bw = (v) => shown.value ? Math.round((Math.abs(Number(v) || 0) / scaleMax.value) * 100) + '%' : '0%'

const CAT_HEX = { TRAVEL: '#fbbf24', ACCOMMODATION: '#fb923c', FOOD: '#34d399', TAXI: '#f59e0b', FUEL: '#ea580c', PARKING: '#a3a3a3', TOLL: '#60d394', COMMUNICATION: '#fcd34d', MISC: '#9ca3af' }
const catHex = (c) => CAT_HEX[c] || '#9ca3af'
const prettyCat = (c) => (c || 'MISC').charAt(0) + (c || 'MISC').slice(1).toLowerCase()
const attUrl = (att) => { const u = att?.file_url || att?.url || ''; return u.startsWith('http') ? u : `${API_BASE}${u}` }

const fmtDateTime = (d) => { if (!d) return '—'; try { return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) } catch { return String(d) } }

const STATUS_STAGE = { DRAFT: 0, SUBMITTED: 1, VERIFIED: 2, SETTLED: 3, PAID: 4 }
const timeline = computed(() => {
  const s = rec.value
  const reversed = s.status === 'REVERSED'
  const reached = reversed ? 3 : (STATUS_STAGE[s.status] ?? 0)
  const m = s.settlement_method
  const settledLabel = m === 'PAYROLL' ? 'Settled to payroll'
    : m ? `Settled · ${methodMeta.value.label.toLowerCase()}`
    : 'Settled'
  const steps = [
    { key: 'opened', label: 'Opened', at: s.created_at, hex: '#9ca3af' },
    { key: 'submitted', label: 'Expenses submitted', at: s.submitted_at, hex: '#fbbf24' },
    { key: 'verified', label: 'Verified', at: s.verified_at, hex: '#fb923c' },
    { key: 'settled', label: settledLabel, at: s.settled_at, hex: '#34d399' },
    reversed
      ? { key: 'reversed', label: 'Reversed', at: s.reversed_at || s.created_at, hex: '#c084fc' }
      : { key: 'paid', label: m && m !== 'PAYROLL' ? 'Disbursed' : 'Paid out', at: s.paid_at, hex: '#60d394' },
  ]
  return steps.map((step, i) => {
    let state
    if (reversed && step.key === 'reversed') state = 'done'
    else if (i < reached) state = step.at ? 'done' : 'skipped'   // earlier stage implied by a later one
    else if (i === reached) state = 'done'
    else state = 'future'
    return { ...step, state }
  })
})

// re-fetch full record (fresh expense_lines) on open
const full = ref(null)
const loadingLines = ref(false)
watch(() => [props.open, props.settlement?.id], async () => {
  if (!props.open || !props.settlement?.id) { full.value = null; return }
  full.value = props.settlement
  loadingLines.value = true
  try { full.value = await getSettlement(props.settlement.id) }
  catch { /* fall back to list payload */ }
  finally { loadingLines.value = false }
}, { immediate: true })

// draw-on flag
const shown = ref(false)
watch(() => props.open, (o) => {
  if (o) { shown.value = false; requestAnimationFrame(() => requestAnimationFrame(() => { shown.value = true })) }
  else shown.value = false
})

// staggered section entrance
const sT = (n) => ({ initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.45, delay: 0.06 + n * 0.07, ease: [0.16, 1, 0.3, 1] } })
</script>

<style scoped>
.sd-overlay { position: fixed; inset: 0; z-index: 1440; display: flex; justify-content: flex-end; background: rgba(6,5,4,0.6); backdrop-filter: blur(8px); }
.sd { position: relative; width: min(560px, 100vw); height: 100%; display: flex; flex-direction: column; overflow: hidden;
  background: var(--trv-surface-elevated); border-left: 1px solid var(--trv-border-strong); box-shadow: -30px 0 80px rgba(0,0,0,0.5); }
.sd-aura { position: absolute; inset: -30% 0 60% 0; pointer-events: none; background: radial-gradient(60% 50% at 70% 0%, rgba(251,191,36,0.12), transparent 70%); animation: trv-aura-drift 12s ease-in-out infinite; }

.sd-head { position: relative; display: flex; align-items: center; gap: 12px; padding: 16px 18px; border-bottom: 1px solid var(--trv-border); background: var(--trv-surface-glass); backdrop-filter: blur(12px); }
.sd-spine { width: 4px; height: 26px; border-radius: 3px; }
.sd-htext { display: flex; align-items: center; gap: 10px; flex: 1; }
.sd-num { font-size: 14px; font-weight: 800; color: var(--trv-amber-bright); }
.sd-pill { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 999px; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 32%, transparent); }
.sd-x { background: var(--trv-panel); border: 1px solid var(--trv-border); border-radius: 9px; padding: 6px; color: var(--trv-text-dim); cursor: pointer; }
.sd-x:hover { color: var(--trv-text); }

.sd-body { position: relative; flex: 1; overflow-y: auto; padding: 16px 18px; display: flex; flex-direction: column; gap: 14px; }
.sd-card { padding: 14px; border-radius: 14px; background: var(--trv-surface); border: 1px solid var(--trv-border); }
.sd-ct { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--trv-text-muted); margin-bottom: 12px; }
.sd-ct em { color: var(--trv-text-dim); font-style: normal; }

/* hero */
.sd-hero { padding: 16px; border-radius: 16px; background: linear-gradient(160deg, var(--trv-surface), var(--trv-panel)); border: 1px solid var(--trv-border-strong); }
.sh-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.sh-who { display: flex; flex-direction: column; gap: 3px; }
.sh-name { font-size: 15px; font-weight: 800; color: var(--trv-text); }
.sh-ref { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; color: var(--trv-amber-bright); background: none; border: none; padding: 0; cursor: pointer; }
.sh-ref:hover { text-decoration: underline; }
.sh-meth { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 650; padding: 4px 9px; border-radius: 8px; color: var(--trv-text-secondary); background: var(--trv-panel); border: 1px solid var(--trv-border); }
.sh-net { display: flex; align-items: center; gap: 10px; color: var(--c); }
.sh-net-val { font-size: 30px; font-weight: 850; letter-spacing: -0.01em; }
.sh-net-lab { font-size: 12px; font-weight: 650; color: var(--trv-text-secondary); margin-left: auto; }

/* bridge */
.br { display: flex; flex-direction: column; gap: 8px; }
.br-row { display: grid; grid-template-columns: 96px 1fr auto; align-items: center; gap: 10px; }
.br-row.sum .br-tag, .br-row.net .br-tag { font-weight: 800; color: var(--trv-text-secondary); }
.br-tag { font-size: 11px; color: var(--trv-text-dim); }
.br-track { height: 11px; border-radius: 6px; background: var(--trv-panel); border: 1px solid var(--trv-border); overflow: hidden; }
.br-bar { display: block; height: 100%; width: 0; border-radius: 6px; transition: width 0.85s var(--trv-spring); }
.br-bar.exp { background: linear-gradient(90deg, var(--trv-amber-strong), var(--trv-amber)); }
.br-bar.da { background: linear-gradient(90deg, var(--trv-ember), color-mix(in srgb, var(--trv-ember) 60%, transparent)); }
.br-bar.rim { background: linear-gradient(90deg, var(--trv-amber), var(--trv-ember)); }
.br-bar.adv { background: linear-gradient(90deg, var(--trv-steel), color-mix(in srgb, var(--trv-steel) 55%, transparent)); }
.br-bar.cov { background: repeating-linear-gradient(45deg, color-mix(in srgb, var(--trv-st-rejected) 55%, transparent) 0 5px, transparent 5px 10px); }
.br-row b { font-size: 11.5px; color: var(--trv-text); min-width: 64px; text-align: right; }
.br-row.cover .br-tag, .br-row.cover b { color: var(--trv-st-rejected); }
.br-row.net { padding-top: 4px; border-top: 1px dashed var(--trv-border); margin-top: 2px; }
.br-note { display: flex; align-items: flex-start; gap: 6px; margin: 10px 0 0; font-size: 10.5px; line-height: 1.45; color: var(--trv-text-muted); }
.br-note svg { flex-shrink: 0; margin-top: 1px; color: var(--trv-amber); }

/* double-pay banner + flags */
.sd-dup-banner { display: flex; gap: 9px; align-items: flex-start; margin-bottom: 12px; padding: 10px 12px; border-radius: 11px; font-size: 11.5px; line-height: 1.45; color: var(--trv-st-returned); background: var(--trv-st-returned-soft); border: 1px solid color-mix(in srgb, var(--trv-st-returned) 28%, transparent); }
.sd-dup-banner svg { flex-shrink: 0; margin-top: 1px; }
.sd-dup-banner b { color: var(--trv-text); }
.sd-dup-banner.unsup { color: var(--trv-st-progress); background: var(--trv-st-progress-soft); border-color: color-mix(in srgb, var(--trv-st-progress) 28%, transparent); }
.dup-tag { display: inline-flex; align-items: center; gap: 2px; margin-left: 5px; font-size: 8.5px; font-weight: 700; padding: 1px 5px; border-radius: 999px; color: var(--trv-st-returned); background: var(--trv-st-returned-soft); vertical-align: middle; }
.dup-tag.strong { color: var(--trv-st-rejected); background: color-mix(in srgb, var(--trv-st-rejected) 12%, transparent); }
.cov-tag { display: inline-flex; align-items: center; margin-left: 5px; font-size: 8.5px; font-weight: 700; padding: 1px 6px; border-radius: 999px; color: var(--trv-amber-strong); background: var(--trv-amber-soft); vertical-align: middle; }
.nr-tag { display: inline-flex; align-items: center; gap: 2px; margin-left: 5px; font-size: 8.5px; font-weight: 700; padding: 1px 5px; border-radius: 999px; color: var(--trv-st-progress); background: var(--trv-st-progress-soft); vertical-align: middle; }
.sd-lines td.struck { text-decoration: line-through; color: var(--trv-text-dim); }
.sd-lines tbody tr.covered { opacity: 0.72; }

/* company-paid bookings */
.sd-book { display: flex; flex-direction: column; gap: 6px; }
.bk-row { display: flex; align-items: center; gap: 9px; padding: 8px 11px; border-radius: 9px; font-size: 12px; color: var(--trv-text-secondary); background: var(--trv-panel); border: 1px solid var(--trv-border); border-left: 3px solid var(--c); }
.bk-ic { color: var(--c); flex-shrink: 0; }
.bk-lab { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bk-lab em { color: var(--trv-text-dim); font-style: normal; }
.bk-row b { color: var(--trv-text); font-size: 12px; }
.bk-row.total { background: none; border: none; border-top: 1px dashed var(--trv-border); border-radius: 0; padding-top: 9px; color: var(--trv-text); font-weight: 700; }
.sd-book-note { margin: 9px 0 0; font-size: 10.5px; line-height: 1.45; color: var(--trv-text-dim); }

/* expense lines */
.sd-lineload { display: flex; flex-direction: column; }
.sd-lines { width: 100%; border-collapse: collapse; font-size: 11.5px; }
.sd-lines tbody tr.dup { background: color-mix(in srgb, var(--trv-st-rejected) 7%, transparent); }
.sd-lines tbody tr.soft { background: color-mix(in srgb, var(--trv-st-returned) 6%, transparent); }
.sd-lines th { text-align: left; font-size: 9.5px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--trv-text-dim); font-weight: 700; padding: 4px 6px; border-bottom: 1px solid var(--trv-border); }
.sd-lines th.r, .sd-lines td.r { text-align: right; }
.sd-lines td { padding: 7px 6px; border-bottom: 1px solid var(--trv-border); color: var(--trv-text-secondary); vertical-align: middle; }
.sd-lines td.dim { color: var(--trv-text-dim); }
.cat-chip { display: inline-block; font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 6px; color: var(--c); background: color-mix(in srgb, var(--c) 13%, transparent); border: 1px solid color-mix(in srgb, var(--c) 28%, transparent); }
.vend { color: var(--trv-text); }
.att, .ln-note { display: inline-flex; margin-left: 5px; color: var(--trv-amber); vertical-align: middle; }
.ln-note { color: var(--trv-text-dim); }
.sd-lines tfoot td { border-bottom: none; font-size: 11px; color: var(--trv-text-muted); padding-top: 9px; }
.sd-lines .total { color: var(--trv-text); font-weight: 800; font-size: 12.5px; }
.sd-line-skel { height: 30px; border-radius: 8px; margin-bottom: 7px; background: linear-gradient(100deg, var(--trv-surface) 30%, var(--trv-surface-elevated) 50%, var(--trv-surface) 70%); background-size: 200% 100%; animation: trv-runway-flow 1.4s linear infinite; }
.sd-empty { text-align: center; padding: 22px 10px; color: var(--trv-text-dim); }
.sd-empty p { margin: 8px 0 4px; font-size: 13px; font-weight: 700; color: var(--trv-text-secondary); }
.sd-empty span { font-size: 11.5px; }

/* timeline */
.sd-tl { list-style: none; margin: 0; padding: 0 0 0 4px; }
.sd-tl li { position: relative; display: flex; align-items: flex-start; gap: 12px; padding: 0 0 14px 14px; border-left: 1.5px solid var(--trv-border); }
.sd-tl li:last-child { border-left-color: transparent; padding-bottom: 0; }
.tl-dot { position: absolute; left: -7px; top: 2px; width: 12px; height: 12px; border-radius: 50%; background: var(--trv-panel); border: 2px solid var(--trv-border-strong); }
.sd-tl li.future { opacity: 0.45; }
.sd-tl li.skipped { opacity: 0.5; }
.sd-tl li.skipped .tl-when { font-style: italic; }
.tl-c { display: flex; flex-direction: column; gap: 1px; }
.tl-lab { font-size: 12.5px; font-weight: 650; color: var(--trv-text); }
.tl-when { font-size: 10.5px; color: var(--trv-text-dim); }
.sd-reason { display: flex; gap: 6px; margin-top: 8px; padding: 9px 11px; border-radius: 9px; font-size: 11.5px; color: var(--trv-text-secondary); background: rgba(192,132,252,0.1); border: 1px solid rgba(192,132,252,0.25); }
.sd-reason b { color: var(--trv-text); }

/* footer */
.sd-foot { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 13px 18px; border-top: 1px solid var(--trv-border); background: var(--trv-surface-glass); backdrop-filter: blur(12px); flex-wrap: wrap; }
.sd-links { display: flex; gap: 6px; }
.lk { display: inline-flex; padding: 8px; border-radius: 9px; background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-muted); cursor: pointer; }
.lk:hover { color: var(--trv-amber); border-color: var(--trv-amber-border); }
.sd-actions { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 15px; border-radius: 10px; font-size: 12.5px; font-weight: 700; cursor: pointer; border: 1px solid transparent; background: none; }
.btn.primary { background: var(--trv-grad-hero); color: #1a1205; box-shadow: var(--trv-amber-glow); }
.btn.steel { background: var(--trv-steel-soft); color: var(--trv-text); border: 1px solid var(--trv-border-strong); }
.btn.ghost { border: 1px solid var(--trv-border-strong); color: var(--trv-text-secondary); }
.btn.ghost.danger:hover { border-color: color-mix(in srgb, var(--trv-st-rejected) 40%, transparent); color: var(--trv-st-rejected); }
.pay-ref { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; color: var(--trv-st-completed); }

[data-theme="light"] .sd-overlay { background: rgba(60,40,15,0.3); }
@media (prefers-reduced-motion: reduce) { .sd-aura { animation: none; } .br-bar { transition: none; } }
</style>
