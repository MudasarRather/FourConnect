<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="trip" as="div" class="dov" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.24 }" @click.self="$emit('close')">
        <Motion as="aside" class="dr" :initial="{ x: '100%' }" :animate="{ x: 0 }" :exit="{ x: '100%' }"
          :transition="{ duration: 0.42, ease: [0.16,1,0.3,1] }">
          <span class="dr-aura" aria-hidden="true" />

          <!-- header -->
          <header class="dr-head">
            <div class="dr-htop">
              <span class="dr-ref trv-mono"><component :is="stMeta.icon" :size="13" /> {{ trip.travel_reference_number }}</span>
              <div class="dr-htr"><TrvStatusPill :status="trip.status" /><button class="dr-x" @click="$emit('close')"><X :size="17" /></button></div>
            </div>
            <div class="dr-route">
              <div class="dr-end"><span class="dr-code trv-mono">{{ code(trip.from_location) }}</span><span class="dr-place">{{ trip.from_location }}</span></div>
              <div class="dr-path"><span class="dr-line" /><span class="dr-pw" :class="{ fly: trip.status==='IN_PROGRESS' }"><Plane :size="15" /></span><span class="dr-line" /></div>
              <div class="dr-end right"><span class="dr-code trv-mono">{{ code(trip.to_location) }}</span><span class="dr-place">{{ trip.to_location }}</span></div>
            </div>
            <p class="dr-purpose">{{ trip.purpose }}</p>
          </header>

          <div class="dr-scroll">
            <!-- approval runway -->
            <section class="dr-sec">
              <span class="dr-st"><Route :size="13" /> Approval</span>
              <ApprovalRunway :req="trip" compact />
              <p v-if="trip.return_reason" class="dr-flag warn"><Undo2 :size="13" /> Returned: {{ trip.return_reason }}</p>
              <p v-if="trip.reject_reason" class="dr-flag bad"><XCircle :size="13" /> Rejected: {{ trip.reject_reason }}</p>
            </section>

            <!-- facts + cost variance -->
            <section class="dr-sec">
              <div class="dr-facts">
                <div><span>Depart</span><b class="trv-mono">{{ fmtDate(trip.departure_date) }}</b></div>
                <div><span>Return</span><b class="trv-mono">{{ fmtDate(trip.return_date) }}</b></div>
                <div><span>Days</span><b class="trv-mono">{{ trip.num_days }}</b></div>
                <div><span>City tier</span><b>{{ cityLabel }}</b></div>
              </div>
              <div class="dr-cost">
                <div class="dc-row"><span>Estimated</span><b class="trv-mono">{{ fmtINR(trip.est_total_cost) }}</b></div>
                <div v-if="trip.booked_cost != null" class="dc-row"><span>Booked</span><b class="trv-mono">{{ fmtINR(trip.booked_cost) }}</b></div>
                <div v-if="trip.actual_cost != null" class="dc-row"><span>Actual</span><b class="trv-mono">{{ fmtINR(trip.actual_cost) }}</b></div>
                <div v-if="hasVariance" class="dc-bar">
                  <span class="dc-fill" :class="{ over: trip.cost_variance > 0 }" :style="{ width: variancePct + '%' }" />
                </div>
                <div v-if="hasVariance" class="dc-var" :class="{ over: trip.cost_variance > 0 }">
                  <component :is="trip.cost_variance > 0 ? TrendingUp : TrendingDown" :size="12" />
                  {{ trip.cost_variance > 0 ? 'Over estimate by' : 'Under estimate by' }} {{ fmtINR(Math.abs(trip.cost_variance)) }}
                </div>
              </div>
            </section>

            <!-- multi-city route legs -->
            <section v-if="isMultiCity(trip)" class="dr-sec">
              <span class="dr-st"><Route :size="13" /> Route · {{ legs.length }} legs</span>
              <div class="dr-legs">
                <div v-for="(lg, i) in legs" :key="i" class="dr-leg">
                  <span class="dl-ix trv-mono">{{ i + 1 }}</span>
                  <span class="dl-route"><b class="trv-mono">{{ code(lg.from_location) }}</b> <component :is="legModeMeta(lg.mode).icon" :size="12" class="dl-mode" /> <b class="trv-mono">{{ code(lg.to_location) }}</b></span>
                  <span class="dl-place">{{ lg.from_location }} → {{ lg.to_location }} · {{ legModeMeta(lg.mode).short }}</span>
                  <span class="dl-date trv-mono">{{ fmtDate(lg.departure_date) }}</span>
                </div>
              </div>
            </section>

            <!-- preferences -->
            <section v-if="prefChips.length" class="dr-sec">
              <span class="dr-st"><Sparkles :size="13" /> My preferences</span>
              <div class="dr-chips">
                <span v-for="(p, i) in prefChips" :key="i" class="dr-chip"><component :is="p.icon" :size="11" /> {{ p.text }}</span>
              </div>
            </section>

            <!-- itinerary -->
            <section class="dr-sec">
              <div class="dr-sthead">
                <span class="dr-st"><Ticket :size="13" /> Itinerary <em v-if="bookings.length">· {{ bookings.length }}</em></span>
                <button v-if="canBook" class="mini-btn" @click="act('book')"><Plus :size="13" /> Add</button>
              </div>
              <div v-if="loadingBk" class="dr-skel" />
              <div v-else-if="bookings.length" class="dr-itin">
                <div v-for="b in bookings" :key="b.id" class="itin" :class="{ own: isOwn(b) }">
                  <span class="itin-ic" :style="{ '--bc': bMeta(b).hex }"><component :is="bMeta(b).icon" :size="15" /></span>
                  <div class="itin-body">
                    <div class="itin-top">
                      <b>{{ bMeta(b).label }}<span v-if="isOwn(b)" class="itin-self">you</span></b>
                      <span class="itin-cost trv-mono">{{ fmtINR(b.total_cost) }}</span>
                    </div>
                    <span class="itin-detail">{{ bookingLine(b) }}</span>
                    <div class="itin-foot">
                      <span class="itin-status" :style="{ color: bStatusHex(b.status) }">{{ b.status }}</span>
                      <span v-if="b.travel_date" class="itin-date trv-mono">{{ bookingDate(b) }}</span>
                    </div>
                  </div>
                  <div v-if="isOwn(b) && editableBk(b)" class="itin-acts">
                    <button title="Edit" @click="act('book', b)"><FilePen :size="13" /></button>
                    <button title="Remove" class="del" @click="act('deletebooking', b)"><Trash2 :size="13" /></button>
                  </div>
                </div>
              </div>
              <p v-else class="dr-empty">{{ canBook ? 'No bookings yet — add your flights, train or hotel.' : 'Bookings appear once your trip is approved.' }}</p>
            </section>

            <!-- advance / DA summaries -->
            <section v-if="trip.advance || trip.da || canRequestAdvance" class="dr-sec">
              <span class="dr-st"><Wallet :size="13" /> Money</span>

              <!-- advance lifecycle -->
              <div v-if="trip.advance" class="adv-card" :class="{ term: !!advState.terminal }">
                <div class="adv-head">
                  <span class="adv-ic"><Coins :size="15" /></span>
                  <div class="adv-h"><b>Advance {{ trip.advance.advance_number }}</b><span :style="{ color: advanceMeta(trip.advance.status).hex }">{{ advStatusLabel }}</span></div>
                  <span class="adv-amt trv-mono">{{ fmtINR(trip.advance.approved_amount ?? trip.advance.advance_amount) }}</span>
                </div>
                <div v-if="!advState.terminal" class="adv-gates">
                  <div v-for="(g, i) in advGates" :key="g.key" class="agate" :class="{ done: i <= advState.reached, current: i === advState.reached && !advState.recovered }">
                    <span class="ag-node"><component :is="i < advState.reached ? CheckCheck : g.icon" :size="10" /></span>
                    <span v-if="i < advGates.length - 1" class="ag-bar" :class="{ on: i < advState.reached }" />
                    <span class="ag-lab">{{ g.label }}</span>
                  </div>
                </div>
                <div v-else class="adv-term">
                  <span><XCircle :size="12" /> {{ trip.advance.status === 'REJECTED' ? 'Rejected by finance' : 'Cancelled' }}</span>
                  <button v-if="canRequestAdvance" class="adv-re" @click="act('advance')"><Coins :size="11" /> Request again</button>
                </div>
                <p v-if="trip.advance.approved_amount != null && Number(trip.advance.approved_amount) !== Number(trip.advance.advance_amount)" class="adv-trim">
                  Requested {{ fmtINR(trip.advance.advance_amount) }} → approved {{ fmtINR(trip.advance.approved_amount) }}
                </p>
              </div>

              <!-- invite to request (no advance yet) -->
              <Motion v-else-if="canRequestAdvance" as="button" class="adv-invite" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.98 }" @click="act('advance')">
                <span class="adv-ic"><Coins :size="16" /></span>
                <div><b>Need funds upfront?</b><span>Request a travel advance for this trip</span></div>
                <ChevronRight :size="16" />
              </Motion>

              <!-- DA -->
              <div v-if="trip.da" class="money-row" :style="{ marginTop: (trip.advance || canRequestAdvance) ? '10px' : '0' }">
                <Calculator :size="14" style="color:var(--trv-amber-bright)" /><div><b>Daily allowance</b><span>{{ fmtINR(trip.da.approved_da ?? trip.da.eligible_da) }} · {{ trip.da.travel_days }}d · {{ trip.da.status }}</span></div>
              </div>
            </section>

            <!-- ░ Reconcile prompt — trip done, expenses not filed yet ░ -->
            <section v-if="showReconcilePrompt" class="dr-sec recon-prompt">
              <span class="rp-aura" aria-hidden="true" />
              <div class="rp-head">
                <span class="rp-ic"><Scale :size="17" /></span>
                <div class="rp-h"><b>Reconcile your trip</b><span>Trip complete — file what you actually spent.</span></div>
              </div>
              <p class="rp-body">
                Spent more than the <b>{{ fmtINR(trip.est_total_cost) }}</b> estimate? File your receipts here —
                the difference is <b>reimbursed to you</b> after finance approves.
                <template v-if="advTaken > 0"> Your <b>{{ fmtINR(advTaken) }}</b> advance is netted automatically, so you only get the balance.</template>
              </p>
              <p class="rp-note"><Info :size="12" /> Trip costs are reconciled here — don't raise a separate reimbursement claim for them.</p>
              <Motion as="button" class="rp-cta" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }" @click="act('expense')">
                <Scale :size="15" /> File expenses &amp; claim the difference
              </Motion>
            </section>

            <!-- ░ Clearing House — settlement reconciliation ░ -->
            <section v-if="trip.settlement" class="dr-sec stl">
              <span class="dr-st"><Scale :size="13" /> Settlement <em>· {{ settlement?.settlement_number || trip.settlement.settlement_number }}</em></span>

              <!-- net balance hero -->
              <div class="stl-hero" :class="net.direction">
                <span class="stl-hero-aura" aria-hidden="true" />
                <div class="stl-hero-top">
                  <span class="stl-amt-lab">{{ netLabel }}</span>
                  <span class="stl-badge" :style="{ '--bc': stMetaPill.hex }">{{ stMetaPill.label }}</span>
                </div>
                <div class="stl-amt">
                  <span class="stl-amt-ic"><component :is="netIcon" :size="18" /></span>
                  <b class="trv-mono">{{ fmtINR(netAmount) }}</b>
                </div>
                <!-- dual balance beam -->
                <div v-if="hasFull" class="stl-beam">
                  <div class="beam-row">
                    <span class="beam-l">Reimbursable</span>
                    <span class="beam-track"><i class="beam-fill reimb" :style="{ width: reimbPct + '%' }" /></span>
                    <b class="trv-mono">{{ fmtINR(reimbursable) }}</b>
                  </div>
                  <div class="beam-row">
                    <span class="beam-l">Advance taken</span>
                    <span class="beam-track"><i class="beam-fill adv" :style="{ width: advPct + '%' }" /></span>
                    <b class="trv-mono">{{ fmtINR(advRecv) }}</b>
                  </div>
                </div>
              </div>

              <div v-if="loadingStl && !hasFull" class="dr-skel" />

              <!-- reconciliation ledger -->
              <div v-if="hasFull" class="stl-ledger">
                <div class="led-row"><span><Receipt :size="12" /> Expenses claimed</span><b class="trv-mono">{{ fmtINR(settlement.total_expense) }}</b></div>
                <div class="led-row"><span><FileCheck :size="12" /> Approved</span><b class="trv-mono">{{ fmtINR(settlement.approved_expense) }}</b></div>
                <div v-if="Number(settlement.da_amount) > 0" class="led-row"><span><Calculator :size="12" /> Per-diem (DA)</span><b class="trv-mono">+ {{ fmtINR(settlement.da_amount) }}</b></div>
                <div class="led-row strong"><span>Reimbursable</span><b class="trv-mono">{{ fmtINR(reimbursable) }}</b></div>
                <div class="led-row"><span><Coins :size="12" /> Advance taken</span><b class="trv-mono">− {{ fmtINR(advRecv) }}</b></div>
                <div class="led-row net" :class="net.direction">
                  <span>{{ net.direction === 'recoverable' ? 'You repay' : net.direction === 'payable' ? 'Net payable to you' : 'Net balanced' }}</span>
                  <b class="trv-mono">{{ fmtINR(netAmount) }}</b>
                </div>
              </div>

              <!-- expense lines -->
              <div v-if="stLines.length" class="stl-lines">
                <span class="stl-sub">{{ stLines.length }} expense line{{ stLines.length > 1 ? 's' : '' }}</span>
                <div v-for="(ln, i) in stLines" :key="i" class="exl">
                  <span class="exl-cat">{{ catLabel(ln.category) }}</span>
                  <div class="exl-mid">
                    <span class="exl-vendor">{{ ln.vendor || ln.note || '—' }}</span>
                    <span class="exl-sub trv-mono">{{ ln.expense_date ? fmtDate(ln.expense_date) : '' }}<i v-if="rcptCount(ln)" class="exl-rc"><Paperclip :size="9" /> {{ rcptCount(ln) }}</i></span>
                  </div>
                  <b class="exl-amt trv-mono">{{ fmtINR(ln.amount) }}</b>
                </div>
              </div>

              <!-- timeline -->
              <div v-if="stSteps.length" class="stl-time">
                <div v-for="(s, i) in stSteps" :key="s.key" class="stp" :class="{ done: s.done, current: s.current }">
                  <span class="stp-node"><component :is="s.icon" :size="11" /></span>
                  <span v-if="i < stSteps.length - 1" class="stp-bar" :class="{ on: s.done }" />
                  <span class="stp-lab">{{ s.label }}</span>
                  <span v-if="s.at" class="stp-at trv-mono">{{ fmtDate(s.at) }}</span>
                </div>
              </div>

              <!-- method + payroll ref -->
              <div v-if="methodMeta" class="stl-method">
                <span class="sm-ic" :style="{ '--mc': methodMeta.hex }"><component :is="methodMeta.icon" :size="13" /></span>
                <div><b>{{ methodMeta.label }}</b><span>{{ methodMeta.hint }}</span></div>
                <span v-if="settlement.payroll_ref" class="sm-ref trv-mono">{{ settlement.payroll_ref }}</span>
              </div>

              <p v-if="settlement?.reversal_reason" class="dr-flag bad"><Undo2 :size="13" /> Reversed: {{ settlement.reversal_reason }}</p>
            </section>

            <!-- custom details -->
            <section v-if="customEntries.length" class="dr-sec">
              <span class="dr-st"><Info :size="13" /> Details</span>
              <div class="dr-details"><div v-for="d in customEntries" :key="d.k"><span>{{ d.k }}</span><b>{{ d.v }}</b></div></div>
            </section>
          </div>

          <!-- action bar -->
          <footer v-if="actions.length || settledLocked" class="dr-foot" :class="{ ro: settledLocked && !actions.length }">
            <span v-if="settledLocked" class="dr-ro"><Lock :size="13" /> View only — settlement {{ String(stStatus).toLowerCase() }}</span>
            <Motion v-for="a in actions" :key="a.type" as="button" class="afb" :class="a.tone"
              :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="act(a.type)">
              <component :is="a.icon" :size="14" /> {{ a.label }}
            </Motion>
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
  X, Plane, Route, Ticket, Plus, FilePen, Trash2, Wallet, Coins, Calculator, Scale, Sparkles,
  Info, Send, Ban, Undo2, XCircle, TrendingUp, TrendingDown, Hotel, TrainFront, Car, Armchair, Clock,
  Receipt, FileCheck, BadgeCheck, Banknote, CheckCheck, ArrowDownLeft, ArrowUpRight, Lock, Paperclip, ChevronRight,
} from 'lucide-vue-next'
import TrvStatusPill from '../components/TrvStatusPill.vue'
import ApprovalRunway from '../components/ApprovalRunway.vue'
import {
  fmtINR, fmtDate, airportCode, statusMeta, bookingMeta, CITY_CATEGORIES, BOOKING_STATUS,
  FLIGHT_CLASSES, errText, fetchMyBookings, fetchMySettlement, reconcilePreview,
  settlementMeta, settlementMethodMeta, ADVANCE_GATES, advanceGateState, advanceMeta,
  isMultiCity, tripLegs, legModeMeta,
} from '@/composables/useTravel'
import { useToast } from 'vue-toastification'

const props = defineProps({ trip: { type: Object, default: null }, meId: { type: String, default: '' } })
const emit = defineEmits(['close', 'action'])
const toast = useToast()

const bookings = ref([])
const loadingBk = ref(false)
const settlement = ref(null)   // full settlement (expense_lines + reconcile), lazily fetched
const loadingStl = ref(false)

const code = (l) => airportCode(l)
const stMeta = computed(() => statusMeta(props.trip?.status))
const cityLabel = computed(() => CITY_CATEGORIES.find(c => c.key === props.trip?.to_city_category)?.label || '—')
const legs = computed(() => props.trip ? tripLegs(props.trip) : [])
const bMeta = (b) => bookingMeta(b.booking_type)
const bStatusHex = (s) => BOOKING_STATUS.find(x => x.key === s)?.hex || '#9ca3af'
const isOwn = (b) => props.meId && String(b.created_by_id) === String(props.meId)
const editableBk = (b) => !['CANCELLED', 'COMPLETED'].includes(b.status)
const canBook = computed(() => ['APPROVED', 'IN_PROGRESS'].includes(props.trip?.status))
// Advance can be requested on an approved/in-progress trip with no live advance
// (a REJECTED/CANCELLED one is terminal → a fresh request is allowed, mirroring the backend).
const canRequestAdvance = computed(() => {
  const t = props.trip; if (!t) return false
  return ['APPROVED', 'IN_PROGRESS'].includes(t.status) && (!t.advance || ['REJECTED', 'CANCELLED'].includes(t.advance.status))
})
const advGates = ADVANCE_GATES
const advState = computed(() => props.trip?.advance ? advanceGateState(props.trip.advance) : { reached: 0, terminal: null, recovered: false, live: false })
const advStatusLabel = computed(() => props.trip?.advance ? advanceMeta(props.trip.advance.status).label : '')
const advTaken = computed(() => {
  const a = props.trip?.advance
  if (!a || !['APPROVED', 'RELEASED', 'SETTLED', 'RECOVERED'].includes(a.status)) return 0
  return Number(a.approved_amount ?? a.advance_amount ?? 0)
})
// Completed trip with no settlement on record yet → prompt the traveller to file actuals.
const showReconcilePrompt = computed(() => props.trip?.status === 'COMPLETED'
  && (!props.trip?.settlement || props.trip.settlement.status === 'DRAFT'))

const hasVariance = computed(() => props.trip?.cost_variance != null && Number(props.trip.cost_variance) !== 0)
const variancePct = computed(() => {
  const est = Number(props.trip?.est_total_cost || 0); const act = Number(props.trip?.actual_cost || 0)
  if (!est) return act ? 100 : 0
  return Math.min(100, Math.round((act / est) * 100))
})

const prefChips = computed(() => {
  const p = props.trip?.details?.__preferences; if (!p) return []
  const out = []
  if (p.flight_class) out.push({ icon: Plane, text: FLIGHT_CLASSES.find(f => f.key === p.flight_class)?.label || p.flight_class })
  if (p.seat && p.seat !== 'ANY') out.push({ icon: Armchair, text: `${p.seat} seat` })
  if (p.depart_window && p.depart_window !== 'ANY') out.push({ icon: Clock, text: String(p.depart_window).toLowerCase() })
  if (p.airline) out.push({ icon: Plane, text: p.airline })
  if (p.train_class) out.push({ icon: TrainFront, text: p.train_class })
  if (p.hotel_category) out.push({ icon: Hotel, text: p.hotel_category })
  if (p.notes) out.push({ icon: Info, text: p.notes })
  return out
})
const customEntries = computed(() => {
  const d = props.trip?.details || {}
  return Object.entries(d).filter(([k]) => !k.startsWith('_')).map(([k, v]) => ({ k, v: Array.isArray(v) ? v.join(', ') : String(v) }))
})

// inclusive day-span for a booking with a start + end date (local transport / round trips)
const daySpan = (b) => {
  if (!b.travel_date || !b.return_date) return 0
  const d = Math.round((new Date(b.return_date) - new Date(b.travel_date)) / 864e5) + 1
  return d > 0 ? d : 0
}
// foot date: a span when there's an end date, else the single travel date
const bookingDate = (b) => {
  if (!b.travel_date) return ''
  if (b.return_date && b.return_date !== b.travel_date) return `${fmtDate(b.travel_date)} → ${fmtDate(b.return_date)}`
  return fmtDate(b.travel_date)
}

const bookingLine = (b) => {
  if (b.booking_type === 'HOTEL') return [b.hotel_name, b.num_nights ? `${b.num_nights} night${b.num_nights > 1 ? 's' : ''}` : null].filter(Boolean).join(' · ') || (b.vendor || 'Hotel')
  const parts = []
  if (b.airline) parts.push(b.airline)
  if (b.train_number) parts.push(`#${b.train_number}`)
  if (b.from_place || b.to_place) parts.push(`${b.from_place || '—'} → ${b.to_place || '—'}`)
  const span = daySpan(b)
  if (['TAXI', 'BUS', 'RENTAL'].includes(b.booking_type) && span > 1) parts.push(`${span} days`)
  if (b.pnr_number) parts.push(`PNR ${b.pnr_number}`)
  if (b.seat_number) parts.push(`Seat ${b.seat_number}`)
  return parts.join(' · ') || b.vendor || b.booking_number
}

const actions = computed(() => {
  const t = props.trip; if (!t) return []
  const s = t.status, out = []
  if (['DRAFT', 'RETURNED'].includes(s)) { out.push({ type: 'edit', label: 'Edit', icon: FilePen, tone: 'steel' }); out.push({ type: 'submit', label: s === 'RETURNED' ? 'Resubmit' : 'Submit', icon: Send, tone: 'primary' }) }
  if (canBook.value) out.push({ type: 'book', label: 'Add booking', icon: Ticket, tone: 'steel' })
  if (canRequestAdvance.value) out.push({ type: 'advance', label: 'Request advance', icon: Coins, tone: 'steel' })
  if (s === 'COMPLETED' && !(t.settlement && !['DRAFT', 'SUBMITTED'].includes(t.settlement.status))) out.push({ type: 'expense', label: t.settlement ? 'Edit expenses' : 'File expenses', icon: Scale, tone: 'primary' })
  if (t.can_withdraw && s !== 'DRAFT') out.push({ type: 'withdraw', label: 'Withdraw', icon: Ban, tone: 'steel' })
  if (!['APPROVED', 'IN_PROGRESS', 'COMPLETED'].includes(s)) out.push({ type: 'delete', label: s === 'DRAFT' ? 'Delete draft' : 'Delete', icon: Trash2, tone: 'danger' })
  return out
})

// ─── settlement (Clearing House) ───────────────────────────────────────────
const sSummary = computed(() => props.trip?.settlement || null)        // nested mini (always present if a settlement exists)
const hasFull = computed(() => !!settlement.value)                     // full record with expense_lines + reconcile
const stStatus = computed(() => settlement.value?.status || sSummary.value?.status || '')
const stMetaPill = computed(() => settlementMeta(stStatus.value))
// view-only whenever a settlement exists past the editable (draft/submitted) stage
const settledLocked = computed(() => { const s = stStatus.value; return !!s && !['DRAFT', 'SUBMITTED'].includes(s) })

const reimbursable = computed(() => hasFull.value ? Number(settlement.value.approved_expense || 0) + Number(settlement.value.da_amount || 0) : 0)
const advRecv = computed(() => hasFull.value ? Number(settlement.value.advance_received || 0) : 0)
const net = computed(() => {
  if (hasFull.value) return reconcilePreview({ advance: advRecv.value, da: Number(settlement.value.da_amount || 0), approvedExpense: Number(settlement.value.approved_expense || 0) })
  const p = Number(sSummary.value?.payable_amount || 0), r = Number(sSummary.value?.recoverable_amount || 0)
  return { payable: p, recoverable: r, reimbursable: p, net: p - r, direction: p > 0 ? 'payable' : r > 0 ? 'recoverable' : 'balanced' }
})
const beamMax = computed(() => Math.max(reimbursable.value, advRecv.value, 1))
const reimbPct = computed(() => Math.min(100, reimbursable.value / beamMax.value * 100))
const advPct = computed(() => Math.min(100, advRecv.value / beamMax.value * 100))
const stLines = computed(() => Array.isArray(settlement.value?.expense_lines) ? settlement.value.expense_lines : [])
const catLabel = (c) => { const s = String(c || ''); return s ? s.charAt(0) + s.slice(1).toLowerCase() : '—' }
const rcptCount = (ln) => (ln?.attachments || []).length
const methodMeta = computed(() => settlement.value?.settlement_method ? settlementMethodMeta(settlement.value.settlement_method) : null)
const stSteps = computed(() => {
  const s = settlement.value; if (!s) return []
  const out = [
    { key: 'submitted', label: 'Submitted', at: s.submitted_at, icon: Send },
    { key: 'verified', label: 'Verified', at: s.verified_at, icon: FileCheck },
    { key: 'settled', label: 'Settled', at: s.settled_at, icon: BadgeCheck },
  ]
  if (s.paid_at || s.status === 'PAID') out.push({ key: 'paid', label: 'Paid', at: s.paid_at, icon: Banknote })
  return out.map((st, i, arr) => ({ ...st, done: !!st.at, current: !st.at && (i === 0 || !!arr[i - 1].at) }))
})
const netIcon = computed(() => net.value.direction === 'recoverable' ? ArrowUpRight : net.value.direction === 'payable' ? ArrowDownLeft : CheckCheck)
const netLabel = computed(() => net.value.direction === 'recoverable' ? 'You repay the company' : net.value.direction === 'payable' ? 'Payable to you' : 'Fully balanced')
const netAmount = computed(() => net.value.direction === 'recoverable' ? net.value.recoverable : net.value.payable)

const loadBookings = async () => {
  if (!props.trip) return
  loadingBk.value = true
  try { const d = await fetchMyBookings(props.trip.id); bookings.value = d.items || [] }
  catch (e) { bookings.value = props.trip.bookings || []; if (e?.response?.status && e.response.status !== 404) toast.error(errText(e, 'Could not load itinerary')) }
  finally { loadingBk.value = false }
}
const loadSettlement = async () => {
  settlement.value = null
  if (!props.trip?.settlement) return        // no settlement on this trip → nothing to fetch
  loadingStl.value = true
  try { settlement.value = await fetchMySettlement(props.trip.id) }
  catch { settlement.value = null }
  finally { loadingStl.value = false }
}
const reloadAll = async () => { await Promise.all([loadBookings(), loadSettlement()]) }
watch(() => props.trip?.id, (id) => { if (id) reloadAll(); else { bookings.value = []; settlement.value = null } }, { immediate: true })
defineExpose({ reloadBookings: reloadAll })

const act = (type, booking) => emit('action', { type, req: props.trip, booking })
</script>

<style scoped>
.dov { position: fixed; inset: 0; z-index: 1450; display: flex; justify-content: flex-end; background: rgba(6,5,4,0.6); backdrop-filter: blur(7px); }
.dr { position: relative; width: min(540px, 96vw); height: 100%; display: flex; flex-direction: column; background: var(--trv-surface-elevated); border-left: 1px solid var(--trv-border-strong); box-shadow: -30px 0 80px rgba(0,0,0,0.5); overflow: hidden; }
.dr-aura { position: absolute; inset: -30% -10% 70% 30%; pointer-events: none; background: radial-gradient(60% 60% at 80% 0%, rgba(251,191,36,0.14), transparent 70%); }

.dr-head { position: relative; padding: 20px 22px 16px; border-bottom: 1px solid var(--trv-border); }
.dr-htop { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.dr-ref { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 750; color: var(--trv-amber-bright); }
.dr-htr { display: flex; align-items: center; gap: 10px; }
.dr-x { background: var(--trv-panel); border: 1px solid var(--trv-border); border-radius: 9px; padding: 6px; color: var(--trv-text-dim); cursor: pointer; }
.dr-x:hover { color: var(--trv-text); }
.dr-route { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px; margin-bottom: 10px; }
.dr-end { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.dr-end.right { text-align: right; align-items: flex-end; }
.dr-code { font-size: 26px; font-weight: 850; color: var(--trv-text); line-height: 1; }
.dr-place { font-size: 10px; color: var(--trv-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px; }
.dr-path { display: flex; align-items: center; gap: 4px; color: var(--trv-amber); }
.dr-line { width: 22px; height: 1.5px; background: repeating-linear-gradient(90deg, currentColor 0 4px, transparent 4px 8px); opacity: 0.55; }
.dr-pw.fly { animation: trv-plane-drift 2.4s ease-in-out infinite; }
.dr-purpose { margin: 0; font-size: 12.5px; color: var(--trv-text-secondary); line-height: 1.5; }

.dr-scroll { flex: 1; overflow-y: auto; padding: 6px 0; }
.dr-sec { padding: 14px 22px; border-bottom: 1px solid var(--trv-border); }
.dr-st { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 750; letter-spacing: 0.06em; text-transform: uppercase; color: var(--trv-amber); margin-bottom: 10px; }
.dr-st em { color: var(--trv-text-dim); font-style: normal; }
.dr-sthead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.dr-sthead .dr-st { margin-bottom: 0; }
.mini-btn { display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; color: var(--trv-amber); background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); }
/* reconcile prompt — completed trip, expenses not filed */
.recon-prompt { position: relative; overflow: hidden; }
.rp-aura { position: absolute; inset: -50% 30% 40% -10%; pointer-events: none; opacity: 0.6; background: radial-gradient(60% 80% at 20% 0%, rgba(52,211,153,0.18), transparent 70%); }
.rp-head { position: relative; display: flex; align-items: center; gap: 11px; margin-bottom: 9px; }
.rp-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0; color: var(--trv-st-approved); background: var(--trv-st-approved-soft); border: 1px solid color-mix(in srgb, var(--trv-st-approved) 32%, transparent); }
.rp-h { display: flex; flex-direction: column; gap: 1px; }
.rp-h b { font-size: 14px; font-weight: 800; color: var(--trv-text); }
.rp-h span { font-size: 11.5px; color: var(--trv-text-muted); }
.rp-body { position: relative; margin: 0 0 9px; font-size: 12.5px; line-height: 1.55; color: var(--trv-text-secondary); }
.rp-body b { color: var(--trv-text); font-weight: 700; }
.rp-note { position: relative; display: flex; align-items: flex-start; gap: 6px; margin: 0 0 12px; font-size: 11px; line-height: 1.45; color: var(--trv-text-dim); }
.rp-note svg { color: var(--trv-amber); flex-shrink: 0; margin-top: 1px; }
.rp-cta { position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 11px 16px; border-radius: 12px; font-size: 13px; font-weight: 750; cursor: pointer; border: 1px solid transparent; color: #1a1205; background: var(--trv-grad-hero); box-shadow: var(--trv-amber-glow); }
.dr-flag { display: flex; align-items: center; gap: 7px; margin: 10px 0 0; padding: 8px 11px; border-radius: 9px; font-size: 12px; }
.dr-flag.warn { color: var(--trv-st-returned); background: var(--trv-st-returned-soft); }
.dr-flag.bad { color: var(--trv-st-rejected); background: var(--trv-st-rejected-soft); }

.dr-facts { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 12px; }
.dr-facts div { display: flex; flex-direction: column; gap: 2px; }
.dr-facts span { font-size: 9px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--trv-text-dim); }
.dr-facts b { font-size: 13px; color: var(--trv-text-secondary); }
.dr-cost { padding: 11px 13px; border-radius: 12px; background: var(--trv-panel); border: 1px solid var(--trv-border); }
.dc-row { display: flex; align-items: center; justify-content: space-between; font-size: 12px; padding: 2px 0; }
.dc-row span { color: var(--trv-text-muted); } .dc-row b { color: var(--trv-text); }
.dc-bar { height: 5px; border-radius: 999px; background: var(--trv-steel-soft); overflow: hidden; margin: 8px 0 6px; }
.dc-fill { display: block; height: 100%; border-radius: 999px; background: var(--trv-st-approved); transition: width 0.8s var(--trv-spring); }
.dc-fill.over { background: var(--trv-st-rejected); }
.dc-var { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 650; color: var(--trv-st-approved); }
.dc-var.over { color: var(--trv-st-rejected); }

.dr-chips, .dr-details { display: flex; flex-wrap: wrap; gap: 6px; }
.dr-chip { display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: 8px; font-size: 11px; color: var(--trv-text-secondary); background: var(--trv-panel); border: 1px solid var(--trv-border); text-transform: capitalize; }

/* multi-city legs */
.dr-legs { display: flex; flex-direction: column; gap: 7px; }
.dr-leg { display: grid; grid-template-columns: 22px auto 1fr auto; align-items: center; gap: 9px; padding: 8px 11px; border-radius: 10px; background: var(--trv-panel); border: 1px solid var(--trv-border); }
.dl-ix { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; font-size: 10px; font-weight: 800; color: #1a1205; background: var(--trv-grad-hero); }
.dl-route { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: var(--trv-text); }
.dl-route svg { color: var(--trv-amber); }
.dl-place { font-size: 10.5px; color: var(--trv-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.dl-date { font-size: 10.5px; color: var(--trv-text-secondary); white-space: nowrap; }
.dr-details { flex-direction: column; gap: 7px; }
.dr-details div { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 12px; }
.dr-details span { color: var(--trv-text-muted); text-transform: capitalize; } .dr-details b { color: var(--trv-text-secondary); text-align: right; }

.dr-itin { display: flex; flex-direction: column; gap: 8px; }
.itin { display: flex; gap: 11px; padding: 11px 12px; border-radius: 13px; background: var(--trv-pass); border: 1px solid var(--trv-pass-edge); }
.itin.own { border-color: var(--trv-amber-border); }
.itin-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0; color: var(--bc); background: color-mix(in srgb, var(--bc) 14%, transparent); }
.itin-body { flex: 1; min-width: 0; }
.itin-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.itin-top b { font-size: 13px; color: var(--trv-text); display: inline-flex; align-items: center; gap: 6px; }
.itin-self { font-size: 8.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--trv-amber); padding: 1px 5px; border-radius: 5px; background: var(--trv-amber-soft); }
.itin-cost { font-size: 13px; font-weight: 700; color: var(--trv-amber-bright); }
.itin-detail { display: block; font-size: 11px; color: var(--trv-text-muted); margin: 2px 0 5px; overflow: hidden; text-overflow: ellipsis; }
.itin-foot { display: flex; align-items: center; gap: 10px; }
.itin-status { font-size: 10px; font-weight: 750; letter-spacing: 0.04em; }
.itin-date { font-size: 10px; color: var(--trv-text-dim); }
.itin-acts { display: flex; flex-direction: column; gap: 6px; }
.itin-acts button { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; cursor: pointer; background: var(--trv-surface-elevated); border: 1px solid var(--trv-border-strong); color: var(--trv-text-muted); }
.itin-acts button:hover { color: var(--trv-amber); }
.itin-acts button.del:hover { color: var(--trv-st-rejected); border-color: color-mix(in srgb, var(--trv-st-rejected) 40%, transparent); }
.dr-empty { font-size: 12px; color: var(--trv-text-dim); margin: 0; }
.dr-skel { height: 60px; border-radius: 13px; background: linear-gradient(100deg, var(--trv-surface) 30%, var(--trv-surface-elevated) 50%, var(--trv-surface) 70%); background-size: 200% 100%; animation: trv-runway-flow 1.4s linear infinite; }

.dr-money { display: flex; flex-direction: column; gap: 9px; }
.money-row { display: flex; align-items: center; gap: 11px; padding: 10px 12px; border-radius: 11px; background: var(--trv-panel); border: 1px solid var(--trv-border); }
.money-row b { display: block; font-size: 12.5px; color: var(--trv-text); }
.money-row span { font-size: 11px; color: var(--trv-text-muted); }

/* advance lifecycle */
.adv-card { padding: 12px 13px; border-radius: 13px; background: var(--trv-panel); border: 1px solid var(--trv-border-warm); position: relative; overflow: hidden; }
.adv-card.term { border-color: color-mix(in srgb, var(--trv-st-rejected) 30%, transparent); }
.adv-head { display: flex; align-items: center; gap: 10px; }
.adv-ic { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; color: var(--trv-ember); background: color-mix(in srgb, var(--trv-ember) 14%, transparent); flex-shrink: 0; }
.adv-h { flex: 1; min-width: 0; } .adv-h b { display: block; font-size: 12.5px; color: var(--trv-text); } .adv-h span { font-size: 10.5px; font-weight: 700; letter-spacing: 0.03em; }
.adv-amt { font-size: 15px; font-weight: 850; color: var(--trv-amber-bright); }
.adv-gates { display: flex; margin-top: 12px; }
.agate { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; position: relative; }
.ag-node { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: var(--trv-surface-elevated); border: 1.5px solid var(--trv-border-strong); color: var(--trv-text-dim); z-index: 1; transition: all 0.3s var(--trv-spring); }
.agate.done .ag-node { border-color: var(--trv-st-approved); color: var(--trv-st-approved); background: var(--trv-st-approved-soft); }
.agate.current .ag-node { border-color: var(--trv-ember); color: var(--trv-ember); background: color-mix(in srgb, var(--trv-ember) 14%, transparent); animation: trv-board-pulse 2.2s ease-in-out infinite; }
.ag-bar { position: absolute; top: 11px; left: 50%; width: 100%; height: 2px; background: var(--trv-border-strong); z-index: 0; }
.ag-bar.on { background: var(--trv-st-approved); }
.ag-lab { font-size: 8.5px; font-weight: 600; color: var(--trv-text-dim); text-align: center; }
.agate.done .ag-lab, .agate.current .ag-lab { color: var(--trv-text-secondary); }
.adv-term { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 10px; font-size: 11.5px; font-weight: 650; color: var(--trv-st-rejected); }
.adv-term > span { display: inline-flex; align-items: center; gap: 5px; }
.adv-re { display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; border-radius: 8px; font-size: 11px; font-weight: 700; cursor: pointer; color: var(--trv-amber); background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); }
.adv-trim { margin: 9px 0 0; font-size: 10.5px; color: var(--trv-text-muted); }
.adv-invite { display: flex; align-items: center; gap: 11px; width: 100%; text-align: left; padding: 12px 13px; border-radius: 13px; cursor: pointer; background: var(--trv-amber-soft); border: 1px dashed var(--trv-amber-border); color: var(--trv-text); }
.adv-invite b { display: block; font-size: 12.5px; color: var(--trv-text); } .adv-invite span { font-size: 11px; color: var(--trv-text-muted); }
.adv-invite > div { flex: 1; min-width: 0; }
.adv-invite > svg:last-child { color: var(--trv-amber); }
@media (prefers-reduced-motion: reduce) { .agate.current .ag-node { animation: none; } }

/* ░ Clearing House settlement ░ */
.stl-hero { position: relative; overflow: hidden; padding: 14px 15px 15px; border-radius: 15px; border: 1px solid var(--trv-border-strong); background: var(--trv-panel); }
.stl-hero.payable { border-color: color-mix(in srgb, var(--trv-st-approved) 40%, transparent); }
.stl-hero.recoverable { border-color: color-mix(in srgb, var(--trv-st-rejected) 40%, transparent); }
.stl-hero-aura { position: absolute; inset: -60% 40% 30% -10%; pointer-events: none; opacity: 0.5; background: radial-gradient(60% 80% at 20% 0%, color-mix(in srgb, var(--trv-amber) 30%, transparent), transparent 70%); }
.stl-hero.payable .stl-hero-aura { background: radial-gradient(60% 80% at 20% 0%, rgba(52,211,153,0.22), transparent 70%); }
.stl-hero.recoverable .stl-hero-aura { background: radial-gradient(60% 80% at 20% 0%, rgba(239,68,68,0.2), transparent 70%); }
.stl-hero-top { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
.stl-amt-lab { font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--trv-text-dim); }
.stl-badge { font-size: 9.5px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; padding: 3px 9px; border-radius: 7px; color: var(--bc); background: color-mix(in srgb, var(--bc) 14%, transparent); border: 1px solid color-mix(in srgb, var(--bc) 32%, transparent); }
.stl-amt { position: relative; display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.stl-amt-ic { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; color: var(--trv-text-secondary); background: var(--trv-steel-soft); }
.stl-hero.payable .stl-amt-ic { color: var(--trv-st-approved); background: var(--trv-st-approved-soft); }
.stl-hero.recoverable .stl-amt-ic { color: var(--trv-st-rejected); background: var(--trv-st-rejected-soft); }
.stl-amt b { font-size: 24px; font-weight: 850; color: var(--trv-text); line-height: 1; }
.stl-hero.payable .stl-amt b { color: var(--trv-st-approved); }
.stl-hero.recoverable .stl-amt b { color: var(--trv-st-rejected); }
.stl-beam { position: relative; display: flex; flex-direction: column; gap: 8px; }
.beam-row { display: grid; grid-template-columns: 78px 1fr auto; align-items: center; gap: 9px; }
.beam-l { font-size: 10px; color: var(--trv-text-muted); }
.beam-track { height: 7px; border-radius: 999px; background: var(--trv-steel-soft); overflow: hidden; }
.beam-fill { display: block; height: 100%; border-radius: 999px; transform-origin: left; animation: beam-grow 0.7s var(--trv-spring) backwards; transition: width 0.7s var(--trv-spring); }
.beam-fill.reimb { background: linear-gradient(90deg, var(--trv-st-approved), #6ee7b7); }
.beam-fill.adv { background: var(--trv-grad-hero); }
.beam-row b { font-size: 11.5px; font-weight: 700; color: var(--trv-text-secondary); }
@keyframes beam-grow { 0% { transform: scaleX(0); } 100% { transform: scaleX(1); } }

.stl-ledger { margin-top: 11px; padding: 11px 13px; border-radius: 12px; background: var(--trv-pass); border: 1px solid var(--trv-pass-edge); display: flex; flex-direction: column; gap: 3px; }
.led-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; font-size: 12px; padding: 3px 0; }
.led-row span { display: inline-flex; align-items: center; gap: 6px; color: var(--trv-text-muted); }
.led-row span svg { color: var(--trv-text-dim); }
.led-row b { color: var(--trv-text-secondary); }
.led-row.strong { border-top: 1px dashed var(--trv-pass-edge); margin-top: 3px; padding-top: 7px; }
.led-row.strong span, .led-row.strong b { color: var(--trv-text); font-weight: 750; }
.led-row.net { border-top: 1px solid var(--trv-border-strong); margin-top: 4px; padding-top: 8px; }
.led-row.net span { font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; font-size: 11px; }
.led-row.net b { font-size: 15px; font-weight: 850; }
.led-row.net.payable span, .led-row.net.payable b { color: var(--trv-st-approved); }
.led-row.net.recoverable span, .led-row.net.recoverable b { color: var(--trv-st-rejected); }

.stl-lines { margin-top: 11px; display: flex; flex-direction: column; gap: 6px; }
.stl-sub { font-size: 9.5px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--trv-text-dim); margin-bottom: 1px; }
.exl { display: flex; align-items: center; gap: 10px; padding: 8px 11px; border-radius: 10px; background: var(--trv-panel); border: 1px solid var(--trv-border); }
.exl-cat { flex-shrink: 0; font-size: 10px; font-weight: 700; letter-spacing: 0.03em; color: var(--trv-amber); padding: 3px 8px; border-radius: 6px; background: var(--trv-amber-soft); }
.exl-mid { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.exl-vendor { font-size: 12px; color: var(--trv-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.exl-sub { display: inline-flex; align-items: center; gap: 7px; font-size: 10px; color: var(--trv-text-dim); }
.exl-rc { display: inline-flex; align-items: center; gap: 3px; color: var(--trv-text-muted); }
.exl-amt { font-size: 13px; font-weight: 750; color: var(--trv-text); flex-shrink: 0; }

.stl-time { display: flex; margin-top: 13px; padding: 4px 2px 0; }
.stp { position: relative; flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; text-align: center; }
.stp-node { display: grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; z-index: 1; color: var(--trv-text-dim); background: var(--trv-panel); border: 1.5px solid var(--trv-border-strong); transition: all 0.3s; }
.stp.done .stp-node { color: var(--trv-st-approved); border-color: var(--trv-st-approved); background: var(--trv-st-approved-soft); }
.stp.current .stp-node { color: var(--trv-amber); border-color: var(--trv-amber); box-shadow: 0 0 10px var(--trv-amber); animation: trv-beacon 1.6s ease-in-out infinite; }
.stp-bar { position: absolute; top: 13px; left: 50%; width: 100%; height: 2px; background: var(--trv-border-strong); z-index: 0; }
.stp-bar.on { background: var(--trv-st-approved); }
.stp-lab { font-size: 9.5px; font-weight: 650; color: var(--trv-text-muted); }
.stp.done .stp-lab, .stp.current .stp-lab { color: var(--trv-text-secondary); }
.stp-at { font-size: 8.5px; color: var(--trv-text-dim); }

.stl-method { display: flex; align-items: center; gap: 10px; margin-top: 12px; padding: 9px 12px; border-radius: 11px; background: var(--trv-panel); border: 1px solid var(--trv-border); }
.sm-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; color: var(--mc); background: color-mix(in srgb, var(--mc) 14%, transparent); flex-shrink: 0; }
.stl-method b { display: block; font-size: 12px; color: var(--trv-text); }
.stl-method span { font-size: 10.5px; color: var(--trv-text-muted); }
.sm-ref { margin-left: auto; font-size: 10px; color: var(--trv-text-dim); padding: 3px 8px; border-radius: 6px; background: var(--trv-steel-soft); }
.stl .dr-flag { margin-top: 11px; }

.dr-foot { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 14px 22px; border-top: 1px solid var(--trv-border); background: var(--trv-surface-glass); }
.dr-ro { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 650; color: var(--trv-text-muted); padding: 8px 13px; border-radius: 10px; background: var(--trv-steel-soft); border: 1px solid var(--trv-border); }
.dr-ro svg { color: var(--trv-text-dim); }
.afb { display: inline-flex; align-items: center; gap: 6px; padding: 9px 14px; border-radius: 11px; font-size: 12.5px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
.afb.primary { background: var(--trv-grad-hero); color: #1a1205; box-shadow: var(--trv-amber-glow); }
.afb.steel { background: var(--trv-steel-soft); color: var(--trv-text); border-color: var(--trv-border-strong); }
.afb.danger { background: rgba(239,68,68,0.12); color: #f87171; border-color: rgba(239,68,68,0.3); }

[data-theme="light"] .dov { background: rgba(60,40,15,0.3); }
@media (prefers-reduced-motion: reduce) { .dr-pw.fly, .dr-skel, .dc-fill { animation: none; transition: none; } }
</style>
