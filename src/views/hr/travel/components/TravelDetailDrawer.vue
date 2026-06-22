<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" as="div" class="dd-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.25 }" @click.self="$emit('close')">
        <Motion as="aside" class="dd"
          :initial="{ x: '100%' }" :animate="{ x: 0 }" :exit="{ x: '100%' }"
          :transition="{ duration: 0.46, ease: [0.16, 1, 0.3, 1] }">

          <div v-if="loading" class="dd-loading"><Loader2 :size="24" class="spin" /><span>Loading journey…</span></div>

          <template v-else-if="req">
            <!-- ░░ sticky header ░░ -->
            <header class="dd-head">
              <span class="dd-spine" :style="{ background: stMeta.hex }" aria-hidden="true" />
              <div class="dd-head-id">
                <span class="dd-ref trv-mono"><component :is="stMeta.icon" :size="13" /> {{ req.travel_reference_number }}</span>
                <TrvStatusPill :status="req.status" />
              </div>
              <button class="dd-x" @click="$emit('close')"><X :size="18" /></button>
            </header>

            <!-- ░░ scroll body ░░ -->
            <div ref="scrollEl" class="dd-scroll">
              <!-- hero route -->
              <Motion as="section" class="dd-hero trv-grain" v-bind="sT(0)">
                <span class="dd-hero-aura" aria-hidden="true" />
                <div class="dd-route">
                  <div class="dd-end">
                    <span class="dd-code trv-mono">{{ code(req.from_location) }}</span>
                    <span class="dd-place">{{ req.from_location }}</span>
                  </div>
                  <div class="dd-mid">
                    <span class="dd-mid-track"><span class="dd-dash" /><span class="dd-plane"><Plane :size="16" /></span><span class="dd-dash" /></span>
                    <span class="dd-mid-days trv-mono">{{ req.num_days }}d</span>
                  </div>
                  <div class="dd-end right">
                    <span class="dd-code trv-mono">{{ code(req.to_location) }}</span>
                    <span class="dd-place">{{ req.to_location }}</span>
                  </div>
                </div>
                <div class="dd-when">
                  <span class="dw"><CalendarDays :size="12" /> {{ fmtDate(req.departure_date) }}</span>
                  <ArrowRight :size="12" class="dw-arr" />
                  <span class="dw">{{ fmtDate(req.return_date) }}</span>
                  <span class="dd-chips">
                    <span class="dd-pri" :style="{ '--c': priMeta.hex }">{{ priMeta.label }}</span>
                    <span class="dd-tier">{{ cityMeta(req.to_city_category).label }}</span>
                  </span>
                </div>
                <p v-if="req.purpose" class="dd-purpose">{{ req.purpose }}</p>
              </Motion>

              <!-- multi-city route legs -->
              <Motion v-if="isMultiCity(req)" as="section" class="dd-card" v-bind="sT(1)">
                <h4 class="dd-h"><Route :size="14" /> Route <span class="dd-h-pill">{{ legs.length }} legs</span></h4>
                <div class="dd-legs">
                  <div v-for="(lg, i) in legs" :key="i" class="dd-leg">
                    <span class="dl-ix trv-mono">{{ i + 1 }}</span>
                    <span class="dl-codes"><b class="trv-mono">{{ code(lg.from_location) }}</b><component :is="legModeMeta(lg.mode).icon" :size="12" /><b class="trv-mono">{{ code(lg.to_location) }}</b></span>
                    <span class="dl-place">{{ lg.from_location }} → {{ lg.to_location }} · {{ legModeMeta(lg.mode).short }}</span>
                    <span class="dl-date trv-mono">{{ fmtDate(lg.departure_date) }}</span>
                  </div>
                </div>
              </Motion>

              <!-- quick metrics -->
              <Motion as="section" class="dd-metrics" v-bind="sT(1)">
                <div v-for="m in metrics" :key="m.label" class="metric" :style="{ '--c': m.hex }">
                  <component :is="m.icon" :size="15" class="metric-ic" />
                  <span class="metric-val trv-mono">{{ m.value }}</span>
                  <span class="metric-lab">{{ m.label }}</span>
                </div>
              </Motion>

              <!-- cost breakdown -->
              <Motion v-if="costSegs.length" as="section" class="dd-card" v-bind="sT(2)">
                <h4 class="dd-h"><Banknote :size="14" /> Estimated cost breakdown <b class="dd-h-amt trv-mono">{{ fmtINR(req.est_total_cost) }}</b></h4>
                <div class="cost-bar">
                  <span v-for="s in costSegs" :key="s.key" class="cost-seg" :style="{ width: (shown ? s.pct : 0) + '%', background: s.hex }" :title="`${s.label}: ${fmtINR(s.val)}`" />
                </div>
                <div class="cost-legend">
                  <span v-for="s in costSegs" :key="s.key + 'l'" class="cl">
                    <i :style="{ background: s.hex }" />{{ s.label }} <b class="trv-mono">{{ fmtINR(s.val) }}</b>
                  </span>
                </div>
              </Motion>

              <!-- budget vs disbursement -->
              <Motion v-if="moneyMapItems.length && Number(req.est_total_cost) > 0" as="section" class="dd-card" v-bind="sT(3)">
                <h4 class="dd-h"><Target :size="14" /> Budget vs disbursement</h4>
                <TravelMoneyMap :estimated="Number(req.est_total_cost)" :items="moneyMapItems" title="APPROVED BUDGET" />
              </Motion>

              <!-- logistics -->
              <Motion v-if="activeReqs.length || allReqs.length" as="section" class="dd-card" v-bind="sT(3)">
                <h4 class="dd-h"><Briefcase :size="14" /> Logistics</h4>
                <div class="dd-reqs">
                  <span v-for="r in allReqs" :key="r.key" class="dd-req" :class="{ on: req[r.key] }">
                    <component :is="r.icon" :size="13" /> {{ r.label }}
                    <Check v-if="req[r.key]" :size="12" class="rq-check" />
                  </span>
                </div>
              </Motion>

              <!-- approval chain + decision timeline -->
              <Motion as="section" class="dd-card" v-bind="sT(4)">
                <h4 class="dd-h"><ShieldCheck :size="14" /> Approval chain</h4>
                <ApprovalRunway :req="req" />
                <div v-if="chainSteps.length" class="dd-timeline">
                  <div v-for="(s, i) in chainSteps" :key="i" class="tl-row" :class="s.state">
                    <span class="tl-node"><component :is="stepIcon(s.state)" :size="12" /></span>
                    <div class="tl-body">
                      <div class="tl-top"><b>{{ s.typeLabel }}</b><span class="tl-dec">{{ decisionLabel(s) }}</span></div>
                      <span v-if="s.decided_by_name || s.approver_name" class="tl-by">{{ s.decided_by_name || s.approver_name }}<template v-if="s.decided_at"> · {{ fmtDateTime(s.decided_at) }}</template></span>
                      <p v-if="s.notes" class="tl-note">“{{ s.notes }}”</p>
                    </div>
                  </div>
                </div>
              </Motion>

              <!-- lifecycle -->
              <Motion v-if="lifecycle.length" as="section" class="dd-card" v-bind="sT(5)">
                <h4 class="dd-h"><History :size="14" /> Lifecycle</h4>
                <div class="dd-life">
                  <div v-for="(e, i) in lifecycle" :key="e.key" class="life">
                    <span class="life-node"><component :is="e.icon" :size="12" /></span>
                    <span class="life-lab">{{ e.label }}</span>
                    <span class="life-at trv-mono">{{ fmtDateTime(e.at) }}</span>
                    <span v-if="i < lifecycle.length - 1" class="life-bar" aria-hidden="true" />
                  </div>
                </div>
              </Motion>

              <!-- trip facts -->
              <Motion as="section" class="dd-card" v-bind="sT(6)">
                <h4 class="dd-h"><FileText :size="14" /> Trip details</h4>
                <div class="dd-facts">
                  <div class="fact"><span>Traveller</span><b>{{ req.employee_name || '—' }}</b></div>
                  <div class="fact"><span>Emp. code</span><b class="trv-mono">{{ req.employee_code || '—' }}</b></div>
                  <div class="fact"><span>Department</span><b>{{ req.department || '—' }}</b></div>
                  <div class="fact"><span>Designation</span><b>{{ req.designation || '—' }}</b></div>
                  <div class="fact"><span>Grade</span><b>{{ req.grade_name || '—' }}</b></div>
                  <div class="fact"><span>Type</span><b>{{ req.travel_type || '—' }}</b></div>
                  <div v-if="req.project_name" class="fact"><span>Project</span><b>{{ req.project_name }}</b></div>
                  <div v-if="req.cost_center" class="fact"><span>Cost center</span><b>{{ req.cost_center }}</b></div>
                  <div v-if="req.budget_head" class="fact"><span>Budget head</span><b>{{ req.budget_head }}</b></div>
                  <div v-if="req.funding_source" class="fact"><span>Funding</span><b>{{ req.funding_source }}</b></div>
                </div>
              </Motion>

              <!-- custom details -->
              <Motion v-if="customDetails.length" as="section" class="dd-card" v-bind="sT(7)">
                <h4 class="dd-h"><Sparkles :size="14" /> {{ req.category_name || 'Category' }} details</h4>
                <div class="dd-facts">
                  <div v-for="c in customDetails" :key="c.k" class="fact"><span>{{ c.label }}</span><b>{{ c.v }}</b></div>
                </div>
              </Motion>

              <!-- traveller's flight/stay preferences -->
              <Motion v-if="travelPrefs.length" as="section" class="dd-card" v-bind="sT(7)">
                <h4 class="dd-h"><Sparkles :size="14" /> Travel preferences</h4>
                <div class="dd-facts">
                  <div v-for="p in travelPrefs" :key="p.k" class="fact"><span>{{ p.label }}</span><b>{{ p.v }}</b></div>
                </div>
              </Motion>

              <!-- linked artefacts -->
              <Motion v-if="req.bookings && req.bookings.length" as="section" class="dd-card" v-bind="sT(8)">
                <h4 class="dd-h"><Ticket :size="14" /> Bookings <span class="dd-h-pill">{{ req.bookings.length }}</span></h4>
                <div v-for="b in req.bookings" :key="b.id" class="dd-line">
                  <component :is="bookingMeta(b.booking_type).icon" :size="14" :style="{ color: bookingMeta(b.booking_type).hex }" />
                  <span>{{ bookingMeta(b.booking_type).label }}<template v-if="b.vendor"> · {{ b.vendor }}</template></span>
                  <b class="trv-mono">{{ fmtINR(b.total_cost) }}</b>
                </div>
              </Motion>
              <Motion v-if="req.advance" as="section" class="dd-card" v-bind="sT(9)">
                <h4 class="dd-h"><Coins :size="14" /> Travel advance</h4>
                <div class="dd-line">
                  <span class="trv-mono">{{ req.advance.advance_number }}</span>
                  <span class="dd-mini-pill" :style="{ '--c': advanceMeta(req.advance.status).hex }">{{ advanceMeta(req.advance.status).label }}</span>
                  <b class="trv-mono">{{ fmtINR(req.advance.approved_amount || req.advance.advance_amount) }}</b>
                </div>
              </Motion>
              <Motion v-if="req.da" as="section" class="dd-card" v-bind="sT(10)">
                <h4 class="dd-h"><Calculator :size="14" /> Daily allowance</h4>
                <div class="dd-line"><span>{{ req.da.travel_days }}d × {{ fmtINR(req.da.daily_rate) }}</span><b class="trv-mono">{{ fmtINR(req.da.approved_da || req.da.eligible_da) }}</b></div>
              </Motion>
              <Motion v-if="req.settlement" as="section" class="dd-card" v-bind="sT(11)">
                <h4 class="dd-h"><Scale :size="14" /> Settlement</h4>
                <div class="dd-line"><span>Payable</span><b class="trv-mono ok">{{ fmtINR(req.settlement.payable_amount) }}</b></div>
                <div class="dd-line"><span>Recoverable</span><b class="trv-mono warn">{{ fmtINR(req.settlement.recoverable_amount) }}</b></div>
                <span class="dd-mini-pill" :style="{ '--c': settlementMeta(req.settlement.status).hex }">{{ settlementMeta(req.settlement.status).label }}</span>
              </Motion>

              <!-- status reason -->
              <Motion v-if="noteInfo" as="section" class="dd-note" :class="noteInfo.tone" v-bind="sT(12)">
                <OctagonAlert :size="15" />
                <div><span class="note-lab">{{ noteInfo.label }}</span><p>{{ noteInfo.text }}</p></div>
              </Motion>
            </div>

            <!-- ░░ sticky footer ░░ -->
            <footer class="dd-foot">
              <Motion v-if="req.can_edit" as="button" class="btn steel" :disabled="busy"
                :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }" @click="$emit('edit', req)"><FilePen :size="15" /> Edit</Motion>
              <Motion v-if="req.status === 'APPROVED'" as="button" class="btn primary" :disabled="busy || !req.can_execute"
                :title="req.can_execute ? 'Start this travel now' : `Starts automatically on ${fmtDate(req.departure_date)}`"
                :whileHover="req.can_execute ? { y: -2 } : {}" :whileTap="req.can_execute ? { scale: 0.97 } : {}" @click="doExecute">
                <component :is="req.can_execute ? PlaneTakeoff : Clock" :size="15" /> {{ req.can_execute ? 'Start travel' : `Starts ${fmtDate(req.departure_date)}` }}
              </Motion>
              <Motion v-if="req.status === 'IN_PROGRESS'" as="button" class="btn steel" :disabled="busy || !req.can_complete"
                :title="req.can_complete ? 'Mark this tour complete' : `Completes automatically after ${fmtDate(req.return_date)}`"
                :whileHover="req.can_complete ? { y: -2 } : {}" :whileTap="req.can_complete ? { scale: 0.97 } : {}" @click="doComplete">
                <component :is="req.can_complete ? BadgeCheck : Clock" :size="15" /> {{ req.can_complete ? 'Complete' : `Completes ${fmtDate(req.return_date)}` }}
              </Motion>
              <button v-if="canBook" class="btn ghost" @click="$emit('go', 'booking')"><Ticket :size="14" /> Booking</button>
              <button v-if="canCancel" class="btn danger" :disabled="busy" @click="doCancel"><Ban :size="15" /> Cancel</button>
              <button v-if="canDelete" class="btn danger ghost" :disabled="busy" @click="doDelete"><Trash2 :size="14" /> Delete</button>
              <span v-if="settlementClosed" class="dd-viewonly" title="This tour's settlement is finalized — its bookings are locked">
                <Lock :size="14" /> Settlement {{ settlementMeta(req.settlement.status).label.toLowerCase() }} · view only
              </span>
            </footer>
          </template>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>

  <!-- cancel / delete workflow -->
  <RequestActionModal :open="!!actionMode" :mode="actionMode || 'cancel'" :req="req" :busy="actionBusy"
    @close="actionMode = null" @confirm="onActionConfirm" />
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  X, Plane, PlaneTakeoff, ShieldCheck, Ticket, Coins, Calculator, Scale, BadgeCheck, Ban, Loader2,
  FilePen, Trash2, TrainFront, Hotel, Car, Wallet, Banknote, CalendarDays, ArrowRight, Briefcase,
  FileText, Sparkles, History, Check, OctagonAlert, CircleCheckBig, XCircle, Undo2, Hourglass, MinusCircle, Clock, Send, Target, Lock, Route,
} from 'lucide-vue-next'
import TrvStatusPill from './TrvStatusPill.vue'
import ApprovalRunway from './ApprovalRunway.vue'
import TravelMoneyMap from './TravelMoneyMap.vue'
import RequestActionModal from '../modals/RequestActionModal.vue'
import { useToast } from 'vue-toastification'
import {
  fmtINR, fmtDate, airportCode, bookingMeta, statusMeta, priorityMeta, cityMeta,
  advanceMeta, settlementMeta, runwayStateFor, errText, isMultiCity, tripLegs, legModeMeta,
  fetchRequest, executeRequest, completeRequest, cancelRequest, deleteRequest,
} from '@/composables/useTravel'

const props = defineProps({ open: Boolean, requestId: { type: String, default: null } })
const emit = defineEmits(['close', 'changed', 'go', 'edit'])
const toast = useToast()

const req = ref(null)
const loading = ref(false)
const busy = ref(false)
const shown = ref(false)
const scrollEl = ref(null)

const code = (l) => airportCode(l)
const fmtDateTime = (d) => { if (!d) return '—'; try { return new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) } catch { return String(d) } }

const stMeta = computed(() => statusMeta(req.value?.status))
const legs = computed(() => req.value ? tripLegs(req.value) : [])
const priMeta = computed(() => priorityMeta(req.value?.priority))
// A finalized settlement (settled/paid/reversed) freezes the tour — bookings are
// locked and the drawer is view-only. Mirrors TrvBookingSection's CLOSED_SETTLEMENT.
const settlementClosed = computed(() => ['SETTLED', 'PAID', 'REVERSED'].includes(req.value?.settlement?.status))
const canBook = computed(() => !settlementClosed.value && ['APPROVED', 'IN_PROGRESS', 'COMPLETED'].includes(req.value?.status))
const canCancel = computed(() => !['COMPLETED', 'CANCELLED', 'REJECTED'].includes(req.value?.status))
const canDelete = computed(() => !['IN_PROGRESS', 'COMPLETED'].includes(req.value?.status))

const allReqs = [
  { key: 'flight_required', label: 'Flight', icon: Plane },
  { key: 'train_required', label: 'Train', icon: TrainFront },
  { key: 'hotel_required', label: 'Hotel', icon: Hotel },
  { key: 'local_transport_required', label: 'Local transport', icon: Car },
  { key: 'advance_required', label: 'Advance', icon: Wallet },
]
const activeReqs = computed(() => allReqs.filter(r => req.value?.[r.key]))

const bookedTotal = computed(() => (req.value?.bookings || []).reduce((a, b) => a + Number(b.total_cost || 0), 0))
const moneyMapItems = computed(() => {
  const r = req.value; if (!r) return []
  const out = []
  if (r.da) out.push({ label: 'DA (per-diem)', value: Number(r.da.approved_da ?? r.da.eligible_da ?? 0), hex: '#fbbf24', icon: Calculator })
  if (bookedTotal.value > 0) out.push({ label: 'Booked', value: bookedTotal.value, hex: '#fb923c', icon: Ticket })
  if (r.advance) out.push({ label: 'Advance paid', value: Number(r.advance.approved_amount ?? r.advance.advance_amount ?? 0), hex: '#f59e0b', icon: Coins })
  if (r.settlement) out.push({ label: 'Settled payout', value: Number(r.settlement.payable_amount ?? 0), hex: '#34d399', icon: Scale })
  return out
})

const costSegs = computed(() => {
  const r = req.value; if (!r) return []
  const segs = [
    { key: 'travel', label: 'Travel', val: Number(r.est_travel_cost || 0), hex: '#fbbf24' },
    { key: 'hotel', label: 'Hotel', val: Number(r.est_accommodation_cost || 0), hex: '#fb923c' },
    { key: 'local', label: 'Local', val: Number(r.est_local_cost || 0), hex: '#f59e0b' },
    { key: 'food', label: 'Food', val: Number(r.est_food_cost || 0), hex: '#fcd34d' },
    { key: 'misc', label: 'Misc', val: Number(r.est_misc_cost || 0), hex: '#a3a3a3' },
  ].filter(s => s.val > 0)
  const total = segs.reduce((a, s) => a + s.val, 0) || 1
  return segs.map(s => ({ ...s, pct: (s.val / total) * 100 }))
})

const metrics = computed(() => {
  const r = req.value; if (!r) return []
  const out = [
    { label: 'Est. cost', value: fmtINR(r.est_total_cost), icon: Banknote, hex: '#fbbf24' },
    { label: 'Duration', value: `${r.num_days} days`, icon: CalendarDays, hex: '#fb923c' },
  ]
  if (r.advance) out.push({ label: 'Advance', value: fmtINR(r.advance.approved_amount || r.advance.advance_amount), icon: Coins, hex: '#f59e0b' })
  if (r.da) out.push({ label: 'DA', value: fmtINR(r.da.approved_da || r.da.eligible_da), icon: Calculator, hex: '#fcd34d' })
  return out
})

const chainSteps = computed(() => req.value ? runwayStateFor(req.value) : [])
const stepIcon = (s) => ({ done: CircleCheckBig, rejected: XCircle, returned: Undo2, current: Hourglass, skipped: MinusCircle, pending: Clock }[s] || Clock)
const decisionLabel = (s) => ({ done: 'Approved', rejected: 'Rejected', returned: 'Returned', current: 'Awaiting', skipped: 'Skipped', pending: 'Pending' }[s.state] || 'Pending')

const lifecycle = computed(() => {
  const r = req.value; if (!r) return []
  const out = [{ key: 'created', label: 'Raised', at: r.created_at, icon: Clock }]
  if (r.submitted_at) out.push({ key: 'submitted', label: 'Submitted', at: r.submitted_at, icon: Send })
  if (r.approved_at) out.push({ key: 'approved', label: 'Approved', at: r.approved_at, icon: CircleCheckBig })
  if (r.executed_at) out.push({ key: 'departed', label: 'Departed', at: r.executed_at, icon: PlaneTakeoff })
  if (r.completed_at) out.push({ key: 'completed', label: 'Completed', at: r.completed_at, icon: BadgeCheck })
  return out
})

const humanize = (k) => k.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
const customDetails = computed(() => {
  const d = req.value?.details || {}
  // Skip system slots (keys starting with "_", e.g. __preferences) and any nested
  // object/array values — those are surfaced separately (see travelPrefs).
  return Object.entries(d)
    .filter(([k, v]) => !String(k).startsWith('_') && v !== null && v !== '' && v !== undefined && typeof v !== 'object')
    .map(([k, v]) => ({ k, label: humanize(k), v: String(v) }))
})

// Traveller's flight/stay wishes, stored at details.__preferences by the
// self-service request wizard. Rendered readably instead of [object Object].
const PREF_LABELS = { flight_class: 'Cabin', depart_window: 'Departure', airline: 'Airline', seat: 'Seat', bags: 'Bags', train_class: 'Train class', hotel_category: 'Hotel', notes: 'Requests' }
const PREF_HUMANIZE = new Set(['flight_class', 'depart_window', 'seat', 'train_class'])
const travelPrefs = computed(() => {
  const p = req.value?.details?.__preferences
  if (!p || typeof p !== 'object') return []
  return Object.entries(p)
    .filter(([, v]) => v !== null && v !== '' && v !== undefined && !(typeof v === 'string' && v.toUpperCase() === 'ANY'))
    .map(([k, v]) => ({ k, label: PREF_LABELS[k] || humanize(k), v: PREF_HUMANIZE.has(k) ? humanize(String(v)) : String(v) }))
})

const noteInfo = computed(() => {
  const r = req.value; if (!r) return null
  if (r.status === 'REJECTED' && r.reject_reason) return { tone: 'rejected', label: 'Rejection reason', text: r.reject_reason }
  if (r.status === 'RETURNED' && r.return_reason) return { tone: 'returned', label: 'Returned for changes', text: r.return_reason }
  if (r.status === 'CANCELLED' && r.cancelled_reason) return { tone: 'cancelled', label: 'Cancellation reason', text: r.cancelled_reason }
  if (r.approver_notes) return { tone: 'pending', label: 'Approver notes', text: r.approver_notes }
  return null
})

// staggered section entrance
const sT = (n) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.42, delay: 0.05 + n * 0.05, ease: [0.16, 1, 0.3, 1] },
})

const load = async () => {
  if (!props.requestId) return
  loading.value = true
  shown.value = false
  try {
    req.value = await fetchRequest(props.requestId)
    await nextTick()
    requestAnimationFrame(() => { shown.value = true })
  } catch (e) { toast.error(errText(e, 'Failed to load request')) }
  finally { loading.value = false }
}
watch(() => [props.open, props.requestId], () => { if (props.open && props.requestId) load() })

const doExecute = async () => { busy.value = true; try { req.value = await executeRequest(props.requestId); toast.success('Travel started · attendance marked ON_DUTY'); emit('changed') } catch (e) { toast.error(errText(e)) } finally { busy.value = false } }
const doComplete = async () => { busy.value = true; try { req.value = await completeRequest(props.requestId); toast.success('Tour completed · settlement opened'); emit('changed') } catch (e) { toast.error(errText(e)) } finally { busy.value = false } }
const actionMode = ref(null)        // 'cancel' | 'delete' | null
const actionBusy = ref(false)
const doCancel = () => { actionMode.value = 'cancel' }
const doDelete = () => { actionMode.value = 'delete' }
const onActionConfirm = async (reason) => {
  actionBusy.value = true
  try {
    if (actionMode.value === 'delete') {
      await deleteRequest(props.requestId, reason)
      toast.success('Request deleted'); actionMode.value = null; emit('changed'); emit('close')
    } else {
      req.value = await cancelRequest(props.requestId, reason)
      toast.success('Request cancelled'); actionMode.value = null; emit('changed')
    }
  } catch (e) { toast.error(errText(e)) } finally { actionBusy.value = false }
}
</script>

<style scoped>
.dd-overlay { position: fixed; inset: 0; z-index: 1435; background: rgba(6,5,4,0.58); backdrop-filter: blur(7px); }
.dd { position: absolute; right: 0; top: 0; bottom: 0; width: min(540px, 97vw); display: flex; flex-direction: column; overflow: hidden;
  background: var(--trv-surface-elevated); border-left: 1px solid var(--trv-border-strong); box-shadow: -28px 0 80px rgba(0,0,0,0.55); }
.dd-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; height: 100%; color: var(--trv-amber); font-size: 13px; }
.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* header */
.dd-head { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 18px 15px 22px;
  border-bottom: 1px solid var(--trv-border); background: var(--trv-surface-glass); backdrop-filter: blur(12px); z-index: 3; }
.dd-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; }
.dd-head-id { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.dd-ref { display: inline-flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 750; color: var(--trv-amber-bright); }
.dd-x { background: var(--trv-panel); border: 1px solid var(--trv-border); border-radius: 9px; padding: 6px; color: var(--trv-text-muted); cursor: pointer; flex-shrink: 0; }
.dd-x:hover { color: var(--trv-text); border-color: var(--trv-amber-border); }

/* scroll body */
.dd-scroll { flex: 1; min-height: 0; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 12px; }

/* hero */
.dd-hero { position: relative; border-radius: 16px; padding: 19px 16px 15px; background: var(--trv-pass); border: 1px solid var(--trv-pass-edge); }
.dd-hero-aura { position: absolute; inset: 0; border-radius: inherit; overflow: hidden; pointer-events: none; z-index: 0; }
.dd-hero-aura::before { content: ""; position: absolute; inset: -50% 40% 30% -20%; background: radial-gradient(60% 80% at 20% 0%, rgba(251,191,36,0.16), transparent 70%); animation: trv-aura-drift 9s ease-in-out infinite; }
.dd-route { position: relative; z-index: 1; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 10px; }
.dd-end { display: flex; flex-direction: column; gap: 2px; min-width: 0; } .dd-end.right { align-items: flex-end; text-align: right; }
.dd-code { font-size: 29px; font-weight: 850; color: var(--trv-text); line-height: 1.12; padding-top: 1px; }
.dd-place { font-size: 11px; color: var(--trv-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 130px; }
.dd-mid { position: relative; display: flex; flex-direction: column; align-items: center; gap: 4px; color: var(--trv-amber); }
.dd-mid-track { display: flex; align-items: center; gap: 5px; }
.dd-dash { width: 24px; height: 1.5px; background: repeating-linear-gradient(90deg, currentColor 0 4px, transparent 4px 8px); opacity: 0.5; }
.dd-plane { display: grid; place-items: center; }
.dd-mid-days { font-size: 9.5px; color: var(--trv-text-dim); font-weight: 700; }
.dd-when { position: relative; display: flex; align-items: center; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
.dw { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--trv-text-secondary); font-family: var(--trv-mono); }
.dw-arr { color: var(--trv-text-dim); }
.dd-chips { display: inline-flex; gap: 6px; margin-left: auto; }
.dd-pri { font-size: 10px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; padding: 3px 8px; border-radius: 6px; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.dd-tier { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 6px; color: var(--trv-text-secondary); background: var(--trv-steel-soft); border: 1px solid var(--trv-border); }
.dd-purpose { position: relative; font-size: 13px; color: var(--trv-text-secondary); margin: 12px 0 0; line-height: 1.5; }

/* metrics */
.dd-metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(118px, 1fr)); gap: 9px; }
.metric { display: flex; flex-direction: column; gap: 3px; padding: 12px 13px; border-radius: 13px; background: color-mix(in srgb, var(--c) 7%, var(--trv-surface)); border: 1px solid color-mix(in srgb, var(--c) 22%, var(--trv-border)); }
.metric-ic { color: var(--c); }
.metric-val { font-size: 17px; font-weight: 800; color: var(--trv-text); }
.metric-lab { font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; color: var(--trv-text-dim); }

/* cards */
.dd-card { padding: 14px; border-radius: 14px; background: var(--trv-panel); border: 1px solid var(--trv-border); }
.dd-h { display: flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 750; color: var(--trv-amber); margin: 0 0 12px; }
.dd-h-amt { margin-left: auto; color: var(--trv-text); font-size: 13px; }
.dd-h-pill { margin-left: 6px; font-size: 10px; padding: 1px 7px; border-radius: 999px; background: var(--trv-amber-soft); color: var(--trv-amber); border: 1px solid var(--trv-amber-border); }

.cost-bar { display: flex; height: 12px; border-radius: 999px; overflow: hidden; background: var(--trv-steel-soft); margin-bottom: 12px; }
.cost-seg { height: 100%; transition: width 0.9s var(--trv-spring); }
.cost-legend { display: flex; flex-wrap: wrap; gap: 8px 14px; }
.cl { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--trv-text-muted); }
.cl i { width: 9px; height: 9px; border-radius: 3px; }
.cl b { color: var(--trv-text-secondary); }

.dd-legs { display: flex; flex-direction: column; gap: 7px; }
.dd-leg { display: grid; grid-template-columns: 20px auto 1fr auto; align-items: center; gap: 9px; padding: 7px 10px; border-radius: 10px; background: var(--trv-surface); border: 1px solid var(--trv-border); }
.dl-ix { display: grid; place-items: center; width: 19px; height: 19px; border-radius: 50%; font-size: 9.5px; font-weight: 800; color: #1a1205; background: var(--trv-grad-hero); }
.dl-codes { display: inline-flex; align-items: center; gap: 4px; font-size: 13px; color: var(--trv-text); }
.dl-codes svg { color: var(--trv-amber); }
.dl-place { font-size: 10.5px; color: var(--trv-text-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
.dl-date { font-size: 10.5px; color: var(--trv-text-secondary); white-space: nowrap; }

.dd-reqs { display: flex; flex-wrap: wrap; gap: 7px; }
.dd-req { display: inline-flex; align-items: center; gap: 5px; padding: 7px 11px; border-radius: 9px; font-size: 12px; color: var(--trv-text-dim); background: var(--trv-surface); border: 1px solid var(--trv-border); opacity: 0.55; }
.dd-req.on { color: var(--trv-amber); background: var(--trv-amber-soft); border-color: var(--trv-amber-border); opacity: 1; }
.rq-check { color: var(--trv-st-approved); }

/* decision timeline */
.dd-timeline { margin-top: 14px; display: flex; flex-direction: column; gap: 2px; }
.tl-row { display: grid; grid-template-columns: 24px 1fr; gap: 10px; padding: 8px 0; position: relative; }
.tl-row:not(:last-child)::before { content: ""; position: absolute; left: 11px; top: 26px; bottom: -2px; width: 1.5px; background: var(--trv-border-strong); }
.tl-node { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; background: var(--trv-surface-elevated); border: 1.5px solid var(--trv-border-strong); color: var(--trv-text-muted); z-index: 1; }
.tl-row.done .tl-node { color: var(--trv-st-approved); border-color: var(--trv-st-approved); background: var(--trv-st-approved-soft); }
.tl-row.current .tl-node { color: var(--trv-amber); border-color: var(--trv-amber); background: var(--trv-amber-soft); animation: trv-beacon 1.8s ease-in-out infinite; }
.tl-row.rejected .tl-node { color: var(--trv-st-rejected); border-color: var(--trv-st-rejected); background: var(--trv-st-rejected-soft); }
.tl-row.returned .tl-node { color: var(--trv-st-returned); border-color: var(--trv-st-returned); background: var(--trv-st-returned-soft); }
.tl-top { display: flex; align-items: center; gap: 8px; }
.tl-top b { font-size: 12.5px; color: var(--trv-text); font-weight: 700; }
.tl-dec { font-size: 10px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--trv-text-muted); margin-left: auto; }
.tl-row.done .tl-dec { color: var(--trv-st-approved); } .tl-row.current .tl-dec { color: var(--trv-amber); }
.tl-row.rejected .tl-dec { color: var(--trv-st-rejected); } .tl-row.returned .tl-dec { color: var(--trv-st-returned); }
.tl-by { font-size: 11px; color: var(--trv-text-muted); }
.tl-note { margin: 4px 0 0; font-size: 11.5px; color: var(--trv-text-secondary); font-style: italic; }

/* lifecycle */
.dd-life { display: flex; flex-direction: column; gap: 0; }
.life { position: relative; display: grid; grid-template-columns: 24px 1fr auto; align-items: center; gap: 10px; padding: 6px 0; }
.life-node { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; background: var(--trv-amber-soft); border: 1.5px solid var(--trv-amber-border); color: var(--trv-amber); z-index: 1; }
.life-bar { position: absolute; left: 11px; top: 30px; height: 8px; width: 1.5px; background: var(--trv-amber-border); }
.life-lab { font-size: 12.5px; font-weight: 600; color: var(--trv-text-secondary); }
.life-at { font-size: 11px; color: var(--trv-text-muted); }

/* facts */
.dd-facts { display: grid; grid-template-columns: 1fr 1fr; gap: 11px 14px; }
.fact { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.fact span { font-size: 9.5px; letter-spacing: 0.07em; text-transform: uppercase; color: var(--trv-text-dim); }
.fact b { font-size: 13px; color: var(--trv-text-secondary); font-weight: 650; word-break: break-word; }

/* lines */
.dd-line { display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: var(--trv-text-secondary); padding: 5px 0; }
.dd-line b { margin-left: auto; color: var(--trv-text); }
.dd-line b.ok { color: var(--trv-st-approved); } .dd-line b.warn { color: var(--trv-st-returned); }
.dd-mini-pill { font-size: 10px; font-weight: 700; padding: 2px 8px; border-radius: 999px; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }

/* status note */
.dd-note { display: flex; gap: 11px; padding: 13px 14px; border-radius: 14px; border: 1px solid; }
.dd-note .note-lab { font-size: 11px; font-weight: 750; letter-spacing: 0.04em; text-transform: uppercase; }
.dd-note p { margin: 4px 0 0; font-size: 12.5px; line-height: 1.5; }
.dd-note.rejected { background: var(--trv-st-rejected-soft); border-color: color-mix(in srgb, var(--trv-st-rejected) 30%, transparent); color: var(--trv-st-rejected); }
.dd-note.returned { background: var(--trv-st-returned-soft); border-color: color-mix(in srgb, var(--trv-st-returned) 30%, transparent); color: var(--trv-st-returned); }
.dd-note.cancelled { background: var(--trv-st-cancelled-soft); border-color: var(--trv-border-strong); color: var(--trv-text-muted); }
.dd-note.pending { background: var(--trv-amber-soft); border-color: var(--trv-amber-border); color: var(--trv-amber); }
.dd-note p { color: var(--trv-text-secondary); }

/* footer */
.dd-foot { display: flex; flex-wrap: wrap; gap: 8px; padding: 13px 16px; border-top: 1px solid var(--trv-border); background: var(--trv-surface-glass); backdrop-filter: blur(12px); z-index: 3; }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 15px; border-radius: 10px; font-size: 12.5px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
.btn.primary { background: var(--trv-grad-hero); color: #1a1205; box-shadow: var(--trv-amber-glow); }
.btn.steel { background: var(--trv-steel-soft); color: var(--trv-text); border-color: var(--trv-border-strong); }
.btn.ghost { background: transparent; border-color: var(--trv-border-strong); color: var(--trv-text-secondary); }
.btn.danger { background: rgba(239,68,68,0.12); color: #f87171; border-color: rgba(239,68,68,0.3); }
.btn.danger.ghost { background: transparent; color: #f87171; border-color: rgba(239,68,68,0.28); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.dd-viewonly { display: inline-flex; align-items: center; gap: 7px; padding: 9px 14px; border-radius: 10px; font-size: 12px; font-weight: 700; color: var(--trv-text-muted); background: var(--trv-steel-soft); border: 1px dashed var(--trv-border-strong); cursor: default; }
.dd-viewonly svg { color: var(--trv-st-completed); }

[data-theme="light"] .dd-overlay { background: rgba(60,40,15,0.3); }
[data-theme="light"] .dd-head, [data-theme="light"] .dd-foot { background: rgba(255,250,240,0.82); }
@media (prefers-reduced-motion: reduce) { .dd-hero-aura::before, .tl-row.current .tl-node { animation: none; } .cost-seg { transition: none; } .spin { animation: none; } }
</style>
