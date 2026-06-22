<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" as="div" class="ov" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.25 }" @click.self="$emit('close')">
        <Motion as="div" class="bk" :initial="{ opacity: 0, y: 26, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 16 }" :transition="{ duration: 0.42, ease: [0.16,1,0.3,1] }">
          <span class="bk-aura" aria-hidden="true" />
          <header class="bk-head">
            <div><span class="bk-eyebrow"><Ticket :size="12" /> {{ isEdit ? 'Edit booking' : 'Book your travel' }} · {{ trip?.travel_reference_number }}</span><h3>{{ catMeta.label }} booking</h3></div>
            <button class="bk-x" @click="$emit('close')"><X :size="18" /></button>
          </header>

          <!-- category selector — mirrors the request's logistics; one booking per category -->
          <div v-if="!noneAvailable && flaggedCats.length > 1" class="bk-types">
            <button v-for="c in flaggedCats" :key="c.key" class="type"
              :class="{ on: form.category === c.key, booked: isCatBooked(c.key) && c.key !== editCat }"
              :style="{ '--tc': c.hex }"
              :disabled="isEdit || (isCatBooked(c.key) && c.key !== editCat)"
              @click="selectCat(c.key)">
              <component :is="c.icon" :size="15" /> {{ c.label }}
              <Check v-if="isCatBooked(c.key) && c.key !== editCat" :size="12" class="type-tick" />
            </button>
          </div>

          <!-- everything's already booked -->
          <div v-if="noneAvailable" class="bk-done">
            <span class="done-ico"><CheckCheck :size="26" /></span>
            <h4>Itinerary complete</h4>
            <p>Every logistics you flagged on this request is already booked. Edit an existing booking from the itinerary to make changes.</p>
            <button class="btn primary" @click="$emit('close')">Close</button>
          </div>

          <template v-else>
          <div class="bk-body">
            <!-- ░░ form ░░ -->
            <div class="bk-form">
              <!-- multi-city: pick which leg this booking covers (scoped to the category's mode) -->
              <div v-if="showLegPicker" class="bk-legpick">
                <label>Which leg? <span class="req">*</span></label>
                <div class="legpick-row">
                  <button v-for="lg in legsForCategory" :key="lg._i" type="button" class="legpick" :class="{ on: form.leg_index === lg._i }" @click="selectLeg(lg)">
                    <span class="lp-ix">{{ lg._i + 1 }}</span>{{ code(lg.from_location) }} → {{ code(lg.to_location) }}
                  </button>
                </div>
              </div>

              <template v-if="isFlight || isTrain">
                <div class="row2">
                  <div class="fld"><label>From</label><input v-model="form.from_place" class="inp" placeholder="Origin" /></div>
                  <div class="fld"><label>To</label><input v-model="form.to_place" class="inp" placeholder="Destination" /></div>
                </div>
                <div class="row2">
                  <div class="fld"><label>{{ tripMulti ? 'Date' : 'Departure' }} <span class="req">*</span></label><HrDatePicker v-model="form.travel_date" /></div>
                  <div v-if="!tripMulti" class="fld"><label>Return <span class="req">*</span></label><HrDatePicker v-model="form.return_date" :min="form.travel_date" /></div>
                  <div v-else class="fld one-way-note"><label>Type</label><span class="ow-leg"><Route :size="13" /> One-way leg</span></div>
                </div>
                <p v-if="dateError" class="bk-err"><AlertTriangle :size="12" /> Return must be on or after departure.</p>
                <div class="row2">
                  <div class="fld" v-if="isFlight"><label>Airline</label><input v-model="form.airline" class="inp" placeholder="e.g. IndiGo" /></div>
                  <div class="fld" v-else><label>Train no.</label><input v-model="form.train_number" class="inp" placeholder="e.g. 12951" /></div>
                  <div class="fld"><label>PNR</label><input v-model="form.pnr_number" class="inp" placeholder="Booking ref" /></div>
                </div>
                <div class="fld"><label>Ticket no.</label><input v-model="form.ticket_number" class="inp" placeholder="Optional" /></div>

                <!-- seat map (flight) -->
                <div v-if="isFlight" class="seatmap">
                  <div class="sm-head"><span><Armchair :size="12" /> Pick your seat</span><span class="sm-sel trv-mono">{{ form.seat_number || '—' }}</span></div>
                  <div class="sm-cabin">
                    <span class="sm-nose" />
                    <div class="sm-grid">
                      <template v-for="r in seatRows" :key="r">
                        <span class="sm-rownum trv-mono">{{ r }}</span>
                        <button v-for="c in ['A','B','C']" :key="c" class="seat" :class="seatClass(r, c)" @click="pick(r, c)" />
                        <span class="sm-aisle" />
                        <button v-for="c in ['D','E','F']" :key="c" class="seat" :class="seatClass(r, c)" @click="pick(r, c)" />
                      </template>
                    </div>
                  </div>
                  <div class="sm-legend"><span><i class="sd free" /> Free</span><span><i class="sd taken" /> Taken</span><span><i class="sd sel" /> Yours</span></div>
                </div>
              </template>

              <template v-else-if="isHotel">
                <div class="fld"><label>Hotel name</label><input v-model="form.hotel_name" class="inp" placeholder="e.g. Taj Bengaluru" /></div>
                <div class="row2">
                  <div class="fld"><label>Check-in</label><HrDatePicker v-model="form.check_in" :min="trip?.departure_date" :max="trip?.return_date" /></div>
                  <div class="fld"><label>Check-out</label><HrDatePicker v-model="form.check_out" :min="form.check_in || trip?.departure_date" :max="trip?.return_date" /></div>
                </div>
                <p class="bk-hint"><Info :size="12" /> Your stay sits within the trip window — {{ fmtDate(trip?.departure_date) }} → {{ fmtDate(trip?.return_date) }} · {{ nights || 0 }} night{{ nights === 1 ? '' : 's' }}.</p>
                <p v-if="hotelOutOfRange" class="bk-err"><AlertTriangle :size="12" /> Check-in / check-out must fall within your trip dates.</p>
              </template>

              <template v-else>
                <div class="fld">
                  <label>Mode</label>
                  <div class="seg3">
                    <button v-for="m in LOCAL_MODES" :key="m.key" class="seg3-btn" :class="{ on: form.local_mode === m.key }" :disabled="isEdit" @click="form.local_mode = m.key">
                      <component :is="m.icon" :size="13" /> {{ m.label }}
                    </button>
                  </div>
                </div>
                <div class="fld"><label>Provider</label><input v-model="form.vendor" class="inp" placeholder="e.g. Uber, RedBus" /></div>
                <div class="row2">
                  <div class="fld"><label>Travel date <span class="req">*</span></label><HrDatePicker v-model="form.travel_date" :min="trip?.departure_date" :max="trip?.return_date" /></div>
                  <div class="fld"><label>End date <em>(blank = 1 day)</em></label><HrDatePicker v-model="form.return_date" :min="form.travel_date || trip?.departure_date" :max="trip?.return_date" /></div>
                </div>
                <p v-if="dateError" class="bk-err"><AlertTriangle :size="12" /> End date must be on or after the travel date.</p>
                <div class="row2">
                  <div class="fld"><label>From</label><input v-model="form.from_place" class="inp" placeholder="Pickup" /></div>
                  <div class="fld"><label>To</label><input v-model="form.to_place" class="inp" placeholder="Drop" /></div>
                </div>
              </template>

              <!-- day-wise cost breakup for hotel & local; a single fare for flight/train -->
              <template v-if="isDayWise">
                <div class="fld">
                  <label>{{ isHotel ? 'Room rate · per night' : 'Daily rate · per day' }}</label>
                  <div class="rate-row">
                    <div class="rate-in"><span class="cur">₹</span><input :value="unitRate" type="number" min="0" class="inp" placeholder="0" @input="applyUnitRate($event.target.value)" /></div>
                    <span class="rate-hint">applies to all {{ breakupDays.length }} {{ unitWord }}</span>
                  </div>
                </div>
                <div v-if="breakupDays.length" class="breakup">
                  <span class="breakup-h">{{ isHotel ? 'Night-by-night' : 'Day-by-day' }} — tweak any {{ isHotel ? 'night' : 'day' }}</span>
                  <div v-for="(d, i) in breakupDays" :key="d" class="bd-row">
                    <span class="bd-date"><b class="trv-mono">{{ isHotel ? 'Night' : 'Day' }} {{ i + 1 }}</b> · {{ fmtDate(d) }}</span>
                    <div class="bd-in"><span class="cur">₹</span><input v-model.number="dayAmounts[d]" type="number" min="0" class="inp" placeholder="0" /></div>
                  </div>
                  <div class="bd-total"><span>{{ isHotel ? 'Room total' : 'Transport total' }} · {{ breakupDays.length }} {{ unitWord }}</span><b class="trv-mono">{{ fmtINR(breakupTotal) }}</b></div>
                </div>
                <div class="fld"><label>Taxes (₹) <em>(optional)</em></label><input v-model.number="form.taxes" type="number" min="0" class="inp" placeholder="0" /></div>
              </template>
              <div v-else class="row2">
                <div class="fld"><label>Fare (₹)</label><input v-model.number="form.booking_cost" type="number" min="0" class="inp" placeholder="0" /></div>
                <div class="fld"><label>Taxes (₹)</label><input v-model.number="form.taxes" type="number" min="0" class="inp" placeholder="0" /></div>
              </div>
              <p v-if="showPrefillHint" class="bk-hint"><Info :size="12" /> {{ dayWiseHintText }}</p>
              <div class="fld"><label>Notes</label><input v-model="form.notes" class="inp" placeholder="Optional" /></div>
            </div>

            <!-- ░░ live ticket ░░ -->
            <div class="bk-prev">
              <span class="pv-eyebrow trv-mono">YOUR TICKET</span>
              <div class="ticket" :style="{ '--tc': typeMeta.hex }">
                <span class="tk-spine" /><span class="tk-glow" aria-hidden="true" />
                <div class="tk-top"><span class="tk-type"><component :is="typeMeta.icon" :size="14" /> {{ typeMeta.label }}</span><span class="tk-cost trv-mono">{{ fmtINR(total) }}</span></div>
                <div v-if="isHotel" class="tk-hotel">
                  <b>{{ form.hotel_name || 'Hotel' }}</b>
                  <span class="trv-mono">{{ form.check_in ? fmtDate(form.check_in) : '—' }} → {{ form.check_out ? fmtDate(form.check_out) : '—' }}</span>
                  <span class="tk-nights">{{ nights || 0 }} night{{ nights === 1 ? '' : 's' }}</span>
                </div>
                <div v-else class="tk-route">
                  <div class="tk-end"><span class="tk-code trv-mono">{{ code(form.from_place) }}</span><span class="tk-place">{{ form.from_place || 'From' }}</span></div>
                  <div class="tk-path"><span class="tk-line" /><component :is="typeMeta.icon" :size="13" /><span class="tk-line" /></div>
                  <div class="tk-end right"><span class="tk-code trv-mono">{{ code(form.to_place) }}</span><span class="tk-place">{{ form.to_place || 'To' }}</span></div>
                </div>
                <div class="tk-meta">
                  <div v-if="isFlight"><span>Airline</span><b>{{ form.airline || '—' }}</b></div>
                  <div v-if="isTrain"><span>Train</span><b>{{ form.train_number || '—' }}</b></div>
                  <div v-if="isFlight"><span>Seat</span><b class="trv-mono">{{ form.seat_number || '—' }}</b></div>
                  <template v-if="isFlight || isTrain">
                    <div><span>Depart</span><b class="trv-mono">{{ form.travel_date ? fmtDate(form.travel_date) : '—' }}</b></div>
                    <div><span>Return</span><b class="trv-mono">{{ form.return_date ? fmtDate(form.return_date) : '—' }}</b></div>
                  </template>
                  <template v-if="isLocal">
                    <div><span>{{ form.return_date && form.return_date !== form.travel_date ? 'From' : 'Date' }}</span><b class="trv-mono">{{ form.travel_date ? fmtDate(form.travel_date) : '—' }}</b></div>
                    <div v-if="form.return_date && form.return_date !== form.travel_date"><span>To · {{ breakupDays.length }}d</span><b class="trv-mono">{{ fmtDate(form.return_date) }}</b></div>
                  </template>
                  <div v-if="form.pnr_number"><span>PNR</span><b class="trv-mono">{{ form.pnr_number }}</b></div>
                </div>
                <span class="tk-barcode" aria-hidden="true"><i v-for="n in 30" :key="n" :style="{ height: (40 + ((n*43)%56)) + '%' }" /></span>
              </div>
              <p class="pv-note">Recorded against your tour — it appears in your itinerary and is reconciled at settlement.</p>
            </div>
          </div>

          <footer class="bk-foot">
            <button class="btn ghost" @click="$emit('close')">Cancel</button>
            <Motion as="button" class="btn primary" :disabled="!valid || busy" :whileHover="(valid && !busy) ? { y: -2 } : {}" :whileTap="(valid && !busy) ? { scale: 0.97 } : {}" @click="submit">
              <Loader2 v-if="busy" :size="15" class="spin" /><Check v-else :size="15" /> {{ isEdit ? 'Save booking' : 'Add to itinerary' }}
            </Motion>
          </footer>
          </template>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { reactive, computed, ref, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { X, Ticket, Armchair, Check, CheckCheck, Loader2, Info, AlertTriangle, Plane, TrainFront, Hotel, Car, Bus, CarFront, Route } from 'lucide-vue-next'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import { useToast } from 'vue-toastification'
import { fmtINR, fmtDate, airportCode, errText, bookingMeta, createMyBooking, updateMyBooking, fetchMyBookings, isMultiCity, tripLegs } from '@/composables/useTravel'

const props = defineProps({ open: Boolean, trip: { type: Object, default: null }, editBooking: { type: Object, default: null } })
const emit = defineEmits(['close', 'saved'])
const toast = useToast()

const isEdit = computed(() => !!props.editBooking)
const busy = ref(false)
const existing = ref([])   // current bookings on the trip (for duplicate detection)

const blank = () => ({ category: 'FLIGHT', local_mode: 'TAXI', booking_type: 'FLIGHT', leg_index: null, vendor: '', airline: '', train_number: '', from_place: '', to_place: '', travel_date: '', return_date: '', booking_date: '', pnr_number: '', ticket_number: '', seat_number: '', hotel_name: '', check_in: '', check_out: '', num_nights: null, booking_cost: 0, taxes: 0, notes: '' })
const form = reactive(blank())

// Day-wise cost: hotel is split per night, local transport per trip day.
const unitRate = ref(0)            // per-night / per-day rate that fills the breakup
const dayAmounts = reactive({})    // { 'YYYY-MM-DD': amount } — editable per day

// ── categories — mirror the New Travel Request (Flight / Train / Hotel / Local) ──
const CATEGORIES = [
  { key: 'FLIGHT', label: 'Flight', icon: Plane, flag: 'flight_required', types: ['FLIGHT'], hex: '#fbbf24' },
  { key: 'TRAIN', label: 'Train', icon: TrainFront, flag: 'train_required', types: ['TRAIN'], hex: '#fb923c' },
  { key: 'HOTEL', label: 'Hotel', icon: Hotel, flag: 'hotel_required', types: ['HOTEL'], hex: '#34d399' },
  { key: 'LOCAL', label: 'Local transport', icon: Car, flag: 'local_transport_required', types: ['TAXI', 'BUS', 'RENTAL'], hex: '#f59e0b' },
]
const CAT_BY_TYPE = { FLIGHT: 'FLIGHT', TRAIN: 'TRAIN', HOTEL: 'HOTEL', TAXI: 'LOCAL', BUS: 'LOCAL', RENTAL: 'LOCAL' }
const LOCAL_MODES = [
  { key: 'TAXI', label: 'Taxi', icon: Car },
  { key: 'BUS', label: 'Bus', icon: Bus },
  { key: 'RENTAL', label: 'Rental', icon: CarFront },
]
// The persisted booking_type — Local resolves to the chosen mode.
const bookingType = computed(() => form.category === 'LOCAL' ? form.local_mode : form.category)

// Which estimate cell on the request seeds this category's fare.
const EST_FOR_TYPE = { FLIGHT: 'est_travel_cost', TRAIN: 'est_travel_cost', HOTEL: 'est_accommodation_cost', TAXI: 'est_local_cost', BUS: 'est_local_cost', RENTAL: 'est_local_cost' }
const tripPrefs = computed(() => props.trip?.details?.__preferences || {})
const showPrefillHint = computed(() => !isEdit.value && !!props.trip)

// multi-city: a flight/train booking maps to ONE leg, so the trip needs several of
// them — the one-per-category rule is lifted and a leg picker prefills the route.
const tripMulti = computed(() => isMultiCity(props.trip))
const tripLegList = computed(() => props.trip ? tripLegs(props.trip) : [])

const catMeta = computed(() => CATEGORIES.find(c => c.key === form.category) || CATEGORIES[0])
const typeMeta = computed(() => bookingMeta(bookingType.value))
const isFlight = computed(() => form.category === 'FLIGHT')
const isTrain = computed(() => form.category === 'TRAIN')
const isHotel = computed(() => form.category === 'HOTEL')
const isLocal = computed(() => form.category === 'LOCAL')
const nights = computed(() => { if (!form.check_in || !form.check_out) return 0; const d = (new Date(form.check_out) - new Date(form.check_in)) / 864e5; return d > 0 ? d : 0 })
const code = (l) => airportCode(l)

// ── day-wise cost (hotel = per night, local = per trip day) ─────────────────
const isDayWise = computed(() => isHotel.value || isLocal.value)
const unitWord = computed(() => { const n = breakupDays.value.length; const w = isHotel.value ? 'night' : 'day'; return `${w}${n === 1 ? '' : 's'}` })
const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const dateRange = (start, end, inclusive) => {
  const out = []; if (!start || !end) return out
  let d = new Date(start); const last = new Date(end)
  if (Number.isNaN(d.getTime()) || Number.isNaN(last.getTime())) return out
  while (inclusive ? d <= last : d < last) { out.push(toISO(d)); d = new Date(d.getTime() + 864e5); if (out.length > 366) break }
  return out
}
const breakupDays = computed(() => {
  if (isHotel.value) return dateRange(form.check_in, form.check_out, false)              // nights: check-in … (check-out − 1)
  if (isLocal.value) return dateRange(form.travel_date, form.return_date || form.travel_date, true)  // travel_date … end-of-span (blank end = single day)
  return []
})
const breakupTotal = computed(() => breakupDays.value.reduce((a, d) => a + (Number(dayAmounts[d]) || 0), 0))
const baseCost = computed(() => isDayWise.value ? breakupTotal.value : (Number(form.booking_cost) || 0))
const total = computed(() => baseCost.value + (Number(form.taxes) || 0))
const applyUnitRate = (v) => { const n = Number(v) || 0; unitRate.value = n; breakupDays.value.forEach(d => { dayAmounts[d] = n }) }
// Split an estimate evenly across the days; any rounding remainder lands on the last day so the total matches.
const seedBreakup = (est) => {
  const days = breakupDays.value
  Object.keys(dayAmounts).forEach(k => delete dayAmounts[k])
  if (!days.length) { unitRate.value = 0; return }
  const per = Math.max(0, Math.floor((Number(est) || 0) / days.length))
  unitRate.value = per
  days.forEach(d => { dayAmounts[d] = per })
  const rem = (Number(est) || 0) - per * days.length
  if (rem > 0) dayAmounts[days[days.length - 1]] = per + rem
}
const hotelOutOfRange = computed(() => {
  const t = props.trip; if (!isHotel.value || !t) return false
  if (form.check_in && t.departure_date && new Date(form.check_in) < new Date(t.departure_date)) return true
  if (form.check_out && t.return_date && new Date(form.check_out) > new Date(t.return_date)) return true
  return false
})
const dayWiseHintText = computed(() => isDayWise.value
  ? `${isHotel.value ? 'Room' : 'Transport'} cost is split ${isHotel.value ? 'per night' : 'per day'} from your estimate — edit any ${isHotel.value ? 'night' : 'day'} to match the actual.`
  : 'Dates & fare are prefilled from your request estimate — update them to the actual booked values.')

// ── category availability (only the request's logistics; one booking per category) ──
const editCat = computed(() => isEdit.value && props.editBooking ? (CAT_BY_TYPE[props.editBooking.booking_type] || null) : null)
const bookedCats = computed(() => {
  const s = new Set()
  for (const b of existing.value) {
    if (props.editBooking && b.id === props.editBooking.id) continue
    const c = CAT_BY_TYPE[b.booking_type]
    if (c) s.add(c)
  }
  return s
})
// On a multi-city trip a category can hold several bookings (one per leg) — never "booked out".
const isCatBooked = (k) => !tripMulti.value && bookedCats.value.has(k)
const flaggedCats = computed(() => {
  const t = props.trip || {}
  const f = CATEGORIES.filter(c => t[c.flag])
  return f.length ? f : CATEGORIES   // nothing flagged → don't dead-end, offer all
})
const availableCats = computed(() => tripMulti.value
  ? flaggedCats.value
  : flaggedCats.value.filter(c => !bookedCats.value.has(c.key) || c.key === editCat.value))
const noneAvailable = computed(() => !isEdit.value && !tripMulti.value && availableCats.value.length === 0)
const selectCat = (k) => { if (isEdit.value) return; if (isCatBooked(k) && k !== editCat.value) return; form.category = k }

// leg picker — scoped to the legs whose mode matches the current category
const CAT_MODES = { FLIGHT: ['FLIGHT'], TRAIN: ['TRAIN'], LOCAL: ['BUS', 'TAXI', 'RENTAL'] }
const legsForCategory = computed(() => {
  if (!tripMulti.value) return []
  const allowed = CAT_MODES[form.category] || []
  return tripLegList.value
    .map((lg, i) => ({ ...lg, _i: i }))
    .filter(lg => allowed.includes(String(lg.mode || 'FLIGHT').toUpperCase()))
})
const showLegPicker = computed(() => tripMulti.value && !isHotel.value && legsForCategory.value.length > 0)
const selectLeg = (lg) => {
  if (!lg) return
  form.leg_index = lg._i
  form.from_place = lg.from_location || ''
  form.to_place = lg.to_location || ''
  form.travel_date = lg.departure_date || ''
  form.return_date = ''   // a multi-city leg is a one-way hop
  const m = String(lg.mode || '').toUpperCase()
  if (isLocal.value && ['BUS', 'TAXI', 'RENTAL'].includes(m)) form.local_mode = m
}

const seatRows = [1, 2, 3, 4, 5, 6]
const takenSet = computed(() => { // deterministic pseudo-taken seats per trip, stable across renders
  const s = new Set(); const cols = ['A', 'B', 'C', 'D', 'E', 'F']; const seed = (props.trip?.id || '0').charCodeAt(0) || 7
  seatRows.forEach(r => cols.forEach((c, ci) => { if (((r * 7 + ci * 13 + seed) % 5) === 0) s.add(`${r}${c}`) }))
  return s
})
const seatClass = (r, c) => { const id = `${r}${c}`; if (form.seat_number === id) return 'sel'; if (takenSet.value.has(id)) return 'taken'; return 'free' }
const pick = (r, c) => { const id = `${r}${c}`; if (takenSet.value.has(id)) return; form.seat_number = form.seat_number === id ? '' : id }

const dateError = computed(() => (isFlight.value || isTrain.value || isLocal.value) && form.travel_date && form.return_date && new Date(form.return_date) < new Date(form.travel_date))
const valid = computed(() => {
  if (noneAvailable.value) return false
  if (isHotel.value) return !!form.hotel_name && nights.value > 0 && !hotelOutOfRange.value
  if (isFlight.value || isTrain.value) {
    const hasLeg = !!(form.from_place || form.to_place || form.airline || form.train_number)
    if (tripMulti.value) return hasLeg && !!form.travel_date          // multi-city = one-way leg, no return
    return hasLeg && !!form.travel_date && !!form.return_date && !dateError.value
  }
  return !!(form.vendor || form.from_place || form.to_place) && !!form.travel_date && !dateError.value
})

// Seed type-specific fields from the request: route, dates and the matching estimate.
const applyTripDefaults = () => {
  const t = props.trip
  if (!t) return
  const estKey = EST_FOR_TYPE[bookingType.value]
  const est = estKey ? (Number(t[estKey]) || 0) : 0
  form.taxes = 0
  if (isHotel.value) {
    form.check_in = t.departure_date || ''
    form.check_out = t.return_date || ''
    form.from_place = ''; form.to_place = ''; form.travel_date = ''; form.return_date = ''
  } else if (tripMulti.value) {
    // multi-city: default to the first leg matching this category's transport mode
    const lg = legsForCategory.value[0]
    form.leg_index = lg ? lg._i : null
    form.from_place = lg?.from_location || ''
    form.to_place = lg?.to_location || ''
    form.travel_date = lg?.departure_date || ''
    form.return_date = ''                              // a multi-city leg is a one-way hop
    if (isLocal.value && lg && ['BUS', 'TAXI', 'RENTAL'].includes(String(lg.mode || '').toUpperCase())) form.local_mode = String(lg.mode).toUpperCase()
    form.check_in = ''; form.check_out = ''
    form.booking_cost = est
  } else if (isLocal.value) {
    form.travel_date = t.departure_date || ''
    form.return_date = t.return_date || ''            // local spans travel_date … trip end by default
    form.from_place = t.from_location || ''; form.to_place = t.to_location || ''
    form.check_in = ''; form.check_out = ''
  } else {
    form.from_place = t.from_location || ''
    form.to_place = t.to_location || ''
    form.travel_date = t.departure_date || ''
    form.return_date = (isFlight.value || isTrain.value) ? (t.return_date || '') : ''
    form.check_in = ''; form.check_out = ''
    form.booking_cost = est                 // flight/train use a single fare
  }
  if (isFlight.value && tripPrefs.value.airline) form.airline = tripPrefs.value.airline
  if (isDayWise.value) seedBreakup(est)      // hotel/local: distribute the estimate day-wise
}

watch(() => props.open, async (v) => {
  if (!v) return
  Object.assign(form, blank())
  Object.keys(dayAmounts).forEach(k => delete dayAmounts[k]); unitRate.value = 0
  // seed dup-detection from the trip payload, then refresh authoritatively
  existing.value = props.trip?.bookings || []
  if (props.editBooking) {
    const b = props.editBooking
    form.category = CAT_BY_TYPE[b.booking_type] || 'FLIGHT'
    if (form.category === 'LOCAL') form.local_mode = b.booking_type
    Object.keys(form).forEach(k => { if (b[k] !== undefined && b[k] !== null) form[k] = b[k] })
    if (isDayWise.value) seedBreakup(Number(form.booking_cost) || 0)   // rebuild the day-wise split from the saved total
  } else if (props.trip) {
    const first = availableCats.value[0] || flaggedCats.value[0] || CATEGORIES[0]
    form.category = first.key
    form.local_mode = first.key === 'LOCAL' ? 'TAXI' : 'TAXI'
    applyTripDefaults()
  }
  // authoritative current bookings (covers desk-added bookings not on the cached trip)
  if (props.trip?.id && !props.editBooking) {
    try {
      const d = await fetchMyBookings(props.trip.id)
      if (d?.items) existing.value = d.items
      // if our chosen category got booked meanwhile, hop to the next free one
      if (isCatBooked(form.category)) {
        const free = availableCats.value[0]
        if (free) { form.category = free.key; applyTripDefaults() }
      }
    } catch { /* keep the cached list */ }
  }
}, { immediate: false })

// switching category (or local mode) re-seeds the fare/dates from the matching estimate
watch(() => form.category, () => { if (props.open && !isEdit.value) applyTripDefaults() })
watch(() => form.local_mode, () => { if (props.open && !isEdit.value && isLocal.value) applyTripDefaults() })
watch([() => form.check_in, () => form.check_out], () => { if (isHotel.value) form.num_nights = nights.value || null })
// keep the day-wise list populated when the date range grows (new days inherit the rate)
watch(breakupDays, (days) => { days.forEach(d => { if (dayAmounts[d] == null) dayAmounts[d] = Number(unitRate.value) || 0 }) })

const submit = async () => {
  if (!valid.value || !props.trip) return
  busy.value = true
  try {
    const body = {
      booking_type: bookingType.value, vendor: form.vendor || null, airline: form.airline || null,
      train_number: form.train_number || null, from_place: form.from_place || null, to_place: form.to_place || null,
      travel_date: form.travel_date || null,
      return_date: (isFlight.value || isTrain.value || isLocal.value) ? (form.return_date || null) : null,
      pnr_number: form.pnr_number || null, ticket_number: form.ticket_number || null,
      seat_number: form.seat_number || null, hotel_name: form.hotel_name || null,
      check_in: form.check_in || null, check_out: form.check_out || null,
      num_nights: isHotel.value ? (nights.value || null) : null,
      booking_cost: Number(baseCost.value) || 0, taxes: Number(form.taxes) || 0, currency: 'INR', notes: form.notes || null,
    }
    if (isEdit.value) { const { booking_type, ...rest } = body; await updateMyBooking(props.editBooking.id, rest) }
    else await createMyBooking(props.trip.id, body)
    toast.success(isEdit.value ? 'Booking updated' : 'Added to your itinerary'); emit('saved'); emit('close')
  } catch (e) { toast.error(errText(e, 'Could not save booking')) } finally { busy.value = false }
}
</script>

<style scoped>
.ov { position: fixed; inset: 0; z-index: 1460; display: grid; place-items: center; padding: 18px; background: rgba(6,5,4,0.64); backdrop-filter: blur(9px); }
.bk { position: relative; width: min(840px, 97vw); max-height: 94vh; overflow: hidden; display: flex; flex-direction: column; border-radius: 24px; background: var(--trv-surface-elevated); border: 1px solid var(--trv-border-strong); box-shadow: var(--trv-shadow); }
.bk-aura { position: absolute; inset: -40% 40% 70% -10%; pointer-events: none; background: radial-gradient(55% 70% at 25% 0%, rgba(251,191,36,0.16), transparent 70%); }
.bk-head { position: relative; display: flex; align-items: center; justify-content: space-between; padding: 18px 22px 10px; }
.bk-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--trv-amber); }
.bk-head h3 { font-size: 18px; font-weight: 850; margin: 5px 0 0; color: var(--trv-text); }
.bk-x { background: var(--trv-panel); border: 1px solid var(--trv-border); border-radius: 9px; padding: 6px; color: var(--trv-text-dim); cursor: pointer; }
.bk-x:hover { color: var(--trv-text); }
.bk-types { display: flex; gap: 7px; padding: 0 22px 12px; flex-wrap: wrap; }
.type { display: inline-flex; align-items: center; gap: 6px; padding: 8px 13px; border-radius: 10px; font-size: 12.5px; font-weight: 700; cursor: pointer; background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-muted); transition: all 0.2s; }
.type.on { color: var(--tc); border-color: var(--tc); background: color-mix(in srgb, var(--tc) 14%, transparent); }
.type.booked { color: var(--trv-st-approved); border-color: color-mix(in srgb, var(--trv-st-approved) 30%, transparent); background: var(--trv-st-approved-soft); opacity: 0.85; }
.type:disabled { cursor: not-allowed; }
.type:disabled:not(.booked) { opacity: 0.4; }
.type-tick { color: var(--trv-st-approved); }

/* everything booked */
.bk-done { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 8px; padding: 30px 28px 34px; }
.done-ico { display: grid; place-items: center; width: 58px; height: 58px; border-radius: 50%; color: var(--trv-st-approved); background: var(--trv-st-approved-soft); border: 1px solid color-mix(in srgb, var(--trv-st-approved) 30%, transparent); }
.bk-done h4 { font-size: 16px; font-weight: 800; color: var(--trv-text); margin: 6px 0 0; }
.bk-done p { font-size: 12.5px; color: var(--trv-text-muted); margin: 0 0 8px; max-width: 360px; line-height: 1.5; }

.bk-body { display: grid; grid-template-columns: 1.35fr 0.9fr; overflow: hidden; flex: 1; min-height: 0; }
.bk-form { padding: 4px 22px 16px; overflow-y: auto; display: flex; flex-direction: column; gap: 11px; }
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.fld label { display: block; font-size: 11px; font-weight: 650; color: var(--trv-text-muted); margin-bottom: 5px; }
.req { color: var(--trv-ember); }
.inp { width: 100%; padding: 9px 11px; border-radius: 9px; font-size: 13px; font-family: inherit; background: rgba(0,0,0,0.3); border: 1px solid var(--trv-border); color: var(--trv-text); transition: border-color 0.2s; }
.inp:focus { outline: none; border-color: var(--trv-amber-border); }
.inp:disabled { opacity: 0.7; }
.bk-err { display: flex; align-items: center; gap: 6px; margin: -2px 0 0; font-size: 11px; font-weight: 600; color: var(--trv-st-rejected); }
.bk-err svg { flex-shrink: 0; }
.bk-hint { display: flex; align-items: flex-start; gap: 6px; margin: -2px 0 0; font-size: 11px; line-height: 1.45; color: var(--trv-text-muted); }
.bk-hint svg { color: var(--trv-amber); flex-shrink: 0; margin-top: 1px; }
.fld label em { color: var(--trv-text-dim); font-style: normal; font-weight: 500; }

/* day-wise cost breakup */
.rate-row { display: flex; align-items: center; gap: 11px; }
.rate-in, .bd-in { display: flex; align-items: center; gap: 3px; padding: 0 10px; border-radius: 9px; background: rgba(0,0,0,0.3); border: 1px solid var(--trv-border); transition: border-color 0.2s; }
.rate-in { flex: 1; } .bd-in { width: 116px; }
.rate-in:focus-within, .bd-in:focus-within { border-color: var(--trv-amber-border); box-shadow: 0 0 0 3px rgba(251,191,36,0.1); }
.cur { font-size: 12px; color: var(--trv-text-dim); }
.rate-in .inp, .bd-in .inp { border: none !important; background: transparent !important; box-shadow: none !important; padding: 9px 0 !important; font-weight: 650; }
.rate-hint { font-size: 11px; color: var(--trv-text-muted); white-space: nowrap; }
.breakup { padding: 11px 12px; border-radius: 13px; background: var(--trv-panel); border: 1px solid var(--trv-border); display: flex; flex-direction: column; gap: 7px; }
.breakup-h { font-size: 9.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--trv-text-dim); }
.bd-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.bd-date { font-size: 12px; color: var(--trv-text-secondary); }
.bd-date b { color: var(--trv-text); font-weight: 700; margin-right: 2px; }
.bd-total { display: flex; align-items: center; justify-content: space-between; margin-top: 3px; padding-top: 8px; border-top: 1px dashed var(--trv-pass-edge); }
.bd-total span { font-size: 11px; color: var(--trv-text-muted); }
.bd-total b { font-size: 16px; color: var(--trv-amber-bright); }
[data-theme="light"] .rate-in, [data-theme="light"] .bd-in { background: rgba(255,250,240,0.72); }
.seg3 { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 6px; }
.seg3-btn { display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 8px 6px; border-radius: 9px; font-size: 12px; font-weight: 650; cursor: pointer; background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-muted); transition: all 0.2s; }
.seg3-btn:hover:not(:disabled) { color: var(--trv-text-secondary); }
.seg3-btn.on { color: var(--trv-amber); border-color: var(--trv-amber); background: var(--trv-amber-soft); }
.seg3-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* multi-city leg picker */
.bk-legpick { display: flex; flex-direction: column; gap: 6px; }
.bk-legpick > label { font-size: 11px; font-weight: 650; color: var(--trv-text-muted); }
.legpick-row { display: flex; flex-wrap: wrap; gap: 6px; }
.legpick { display: inline-flex; align-items: center; gap: 6px; padding: 7px 11px; border-radius: 9px; font-size: 12px; font-weight: 650; cursor: pointer; background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-muted); font-family: var(--trv-mono); transition: all 0.2s; }
.legpick:hover { color: var(--trv-text-secondary); }
.legpick.on { color: var(--trv-ember); border-color: color-mix(in srgb, var(--trv-ember) 40%, transparent); background: color-mix(in srgb, var(--trv-ember) 12%, transparent); }
.lp-ix { display: grid; place-items: center; width: 17px; height: 17px; border-radius: 50%; font-size: 9px; font-weight: 800; color: #1a1205; background: var(--trv-grad-hero); }
.ow-leg { display: inline-flex; align-items: center; gap: 6px; padding: 9px 11px; border-radius: 9px; font-size: 12px; color: var(--trv-ember); background: color-mix(in srgb, var(--trv-ember) 12%, transparent); border: 1px dashed color-mix(in srgb, var(--trv-ember) 32%, transparent); }

.seatmap { padding: 12px; border-radius: 14px; background: var(--trv-panel); border: 1px solid var(--trv-border); }
.sm-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
.sm-head span:first-child { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: var(--trv-amber); }
.sm-sel { font-size: 13px; font-weight: 800; color: var(--trv-amber-bright); }
.sm-cabin { position: relative; padding: 8px 8px 8px 18px; border-radius: 40px 40px 14px 14px; background: var(--trv-surface); border: 1px solid var(--trv-border); }
.sm-nose { position: absolute; top: -1px; left: 0; right: 0; height: 18px; border-radius: 40px 40px 0 0; background: linear-gradient(var(--trv-border-strong), transparent); opacity: 0.4; }
.sm-grid { display: grid; grid-template-columns: 14px repeat(3, 1fr) 10px repeat(3, 1fr); gap: 5px; align-items: center; }
.sm-rownum { font-size: 9px; color: var(--trv-text-dim); text-align: center; }
.sm-aisle { }
.seat { aspect-ratio: 1; border-radius: 6px 6px 4px 4px; cursor: pointer; border: 1px solid var(--trv-border-strong); background: var(--trv-steel-soft); transition: all 0.15s; }
.seat.free:hover { border-color: var(--trv-amber); background: var(--trv-amber-soft); }
.seat.taken { background: var(--trv-st-rejected-soft); border-color: color-mix(in srgb, var(--trv-st-rejected) 30%, transparent); cursor: not-allowed; opacity: 0.6; }
.seat.sel { background: var(--trv-grad-hero); border-color: var(--trv-amber); box-shadow: 0 0 10px rgba(251,191,36,0.4); }
.sm-legend { display: flex; gap: 14px; margin-top: 9px; }
.sm-legend span { display: inline-flex; align-items: center; gap: 5px; font-size: 10px; color: var(--trv-text-dim); }
.sd { width: 11px; height: 11px; border-radius: 4px; border: 1px solid var(--trv-border-strong); }
.sd.free { background: var(--trv-steel-soft); } .sd.taken { background: var(--trv-st-rejected-soft); } .sd.sel { background: var(--trv-grad-hero); }

.bk-prev { padding: 4px 18px 16px; background: var(--trv-panel); border-left: 1px solid var(--trv-border); display: flex; flex-direction: column; gap: 10px; overflow-y: auto; }
.pv-eyebrow { font-size: 9px; letter-spacing: 0.18em; color: var(--trv-text-dim); }
.ticket { position: relative; border-radius: 16px; padding: 15px; background: var(--trv-pass); border: 1px solid var(--trv-pass-edge); overflow: hidden; }
.tk-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--tc); }
.tk-glow { position: absolute; inset: 0; opacity: 0.5; background: radial-gradient(120% 80% at 0% 0%, color-mix(in srgb, var(--tc) 16%, transparent), transparent 60%); }
.tk-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 13px; position: relative; }
.tk-type { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 750; color: var(--tc); }
.tk-cost { font-size: 15px; font-weight: 850; color: var(--trv-amber-bright); }
.tk-route { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px; margin-bottom: 13px; color: var(--tc); position: relative; }
.tk-end { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.tk-end.right { text-align: right; align-items: flex-end; }
.tk-code { font-size: 21px; font-weight: 850; color: var(--trv-text); line-height: 1; }
.tk-place { font-size: 9px; color: var(--trv-text-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 80px; }
.tk-path { display: flex; align-items: center; gap: 3px; }
.tk-line { width: 12px; height: 1.5px; background: repeating-linear-gradient(90deg, currentColor 0 4px, transparent 4px 8px); opacity: 0.5; }
.tk-hotel { display: flex; flex-direction: column; gap: 3px; margin-bottom: 13px; position: relative; }
.tk-hotel b { font-size: 15px; color: var(--trv-text); } .tk-hotel span { font-size: 10px; color: var(--trv-text-muted); }
.tk-nights { color: var(--tc) !important; font-weight: 700; }
.tk-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 7px 10px; position: relative; }
.tk-meta div { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.tk-meta span { font-size: 8px; letter-spacing: 0.07em; text-transform: uppercase; color: var(--trv-text-dim); }
.tk-meta b { font-size: 12px; color: var(--trv-text-secondary); font-weight: 650; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tk-barcode { display: flex; align-items: flex-end; gap: 1.5px; height: 24px; margin-top: 13px; }
.tk-barcode i { flex: 1; background: var(--trv-barcode); border-radius: 1px; }
.pv-note { font-size: 10.5px; color: var(--trv-text-dim); margin: 0; line-height: 1.5; }

.bk-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 22px; border-top: 1px solid var(--trv-border); }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 17px; border-radius: 11px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
.btn.ghost { background: transparent; border-color: var(--trv-border-strong); color: var(--trv-text-secondary); }
.btn.primary { background: var(--trv-grad-hero); color: #1a1205; box-shadow: var(--trv-amber-glow); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
.spin { animation: trv-spin-slow 0.8s linear infinite; }

@media (max-width: 720px) { .bk-body { grid-template-columns: 1fr; } .bk-prev { border-left: none; border-top: 1px solid var(--trv-border); order: -1; } }
[data-theme="light"] .ov { background: rgba(60,40,15,0.32); }
[data-theme="light"] .inp { background: rgba(255,250,240,0.72); }
@media (prefers-reduced-motion: reduce) { .spin { animation: none; } }
</style>
