<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" as="div" class="ov" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.25 }" @click.self="$emit('close')">
        <Motion as="div" class="sr" :initial="{ opacity: 0, y: 28, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 18, scale: 0.97 }" :transition="{ duration: 0.44, ease: [0.16,1,0.3,1] }">
          <span class="sr-aura" aria-hidden="true" />

          <header class="sr-head">
            <div>
              <span class="sr-eyebrow"><Plane :size="12" /> {{ isEdit ? 'Edit · ' + (editRequest?.travel_reference_number || '') : 'New travel request' }}</span>
              <h3>{{ isEdit ? 'Revise your trip' : 'Where are you headed?' }}</h3>
            </div>
            <button class="sr-x" @click="$emit('close')"><X :size="18" /></button>
          </header>

          <!-- step rail -->
          <div class="sr-steps">
            <div class="step-track"><span class="step-fill" :style="{ width: progress + '%' }" /></div>
            <div class="step-dots">
              <button v-for="(s, i) in STEPS" :key="s.key" class="step-dot" :class="{ on: step === i, done: i < step, reachable: i <= maxReached }"
                @click="i <= maxReached && (step = i)">
                <span class="dot-ix"><component :is="i < step ? Check : s.icon" :size="13" /></span>
                <span class="dot-lab">{{ s.label }}</span>
              </button>
            </div>
          </div>

          <div class="sr-body">
            <!-- ░░ form ░░ -->
            <div class="sr-form">
              <Presence mode="wait">
                <Motion :key="step" as="div" class="pane" :initial="{ opacity: 0, x: dir * 26 }" :animate="{ opacity: 1, x: 0 }"
                  :exit="{ opacity: 0, x: dir * -26 }" :transition="{ duration: 0.32, ease: [0.16,1,0.3,1] }">

                  <!-- STEP 1 — purpose -->
                  <template v-if="step === 0">
                    <div class="row2" :style="fT(0)">
                      <div class="fld"><label>Travel type</label><TrvSelect v-model="form.travel_type" :options="typeOpts" placeholder="Type…" /></div>
                      <div class="fld"><label>Category</label><TrvSelect v-model="form.category_id" :options="catOpts" placeholder="Category…" @change="onCategoryChange" /></div>
                    </div>
                    <div class="fld" :style="fT(1)">
                      <label>Priority</label>
                      <div class="seg">
                        <button v-for="p in PRIORITIES" :key="p.key" class="seg-btn" :class="{ on: form.priority === p.key }" :style="{ '--sc': p.hex }" @click="form.priority = p.key">{{ p.label }}</button>
                      </div>
                    </div>
                    <div class="fld" :style="fT(2)">
                      <label>Purpose of travel <span class="req">*</span></label>
                      <textarea v-model="form.purpose" class="inp" rows="3" placeholder="Why is this journey needed? Be specific — your approver reads this." />
                    </div>
                  </template>

                  <!-- STEP 2 — route & schedule -->
                  <template v-else-if="step === 1">
                    <!-- trip shape -->
                    <div class="fld" :style="fT(0)">
                      <label>Trip type</label>
                      <div class="seg">
                        <button v-for="t in TRIP_TYPES" :key="t.key" class="seg-btn" :class="{ on: form.trip_type === t.key }" @click="setTripType(t.key)">
                          <component :is="t.icon" :size="13" /> {{ t.label }}
                        </button>
                      </div>
                    </div>

                    <!-- single-route (one-way / round trip) -->
                    <template v-if="form.trip_type !== 'MULTI_CITY'">
                      <div class="row2" :style="fT(1)">
                        <div class="fld"><label>From <span class="req">*</span></label><input v-model="form.from_location" class="inp" placeholder="Origin city" /></div>
                        <div class="fld"><label>To <span class="req">*</span></label><input v-model="form.to_location" class="inp" placeholder="Destination city" /></div>
                      </div>
                      <div class="row2" :style="fT(2)">
                        <div class="fld"><label>Departure <span class="req">*</span></label><HrDatePicker v-model="form.departure_date" /></div>
                        <div v-if="form.trip_type === 'ROUND_TRIP'" class="fld"><label>Return <span class="req">*</span></label><HrDatePicker v-model="form.return_date" :min="form.departure_date" /></div>
                        <div v-else class="fld one-way-note"><label>Return</label><span class="ow-pill"><ArrowRight :size="13" /> One-way — no return</span></div>
                      </div>
                    </template>

                    <!-- multi-city leg builder -->
                    <template v-else>
                      <div class="legs" :style="fT(1)">
                        <div v-for="(lg, i) in form.legs" :key="i" class="leg">
                          <span class="leg-ix">{{ i + 1 }}</span>
                          <div class="leg-body">
                            <div class="row2">
                              <div class="fld"><label>From <span class="req">*</span></label><input v-model="lg.from_location" class="inp" placeholder="Origin" @input="i === 0 && (form.from_location = lg.from_location)" /></div>
                              <div class="fld"><label>To <span class="req">*</span></label><input v-model="lg.to_location" class="inp" placeholder="Destination" @input="onLegToChange(i)" /></div>
                            </div>
                            <div class="fld"><label>Mode <span class="req">*</span></label>
                              <div class="leg-modes">
                                <button v-for="m in LEG_MODES" :key="m.key" type="button" class="lm-btn" :class="{ on: (lg.mode || 'FLIGHT') === m.key }" :title="m.label" @click="setLegMode(i, m.key)">
                                  <component :is="m.icon" :size="13" /><span class="lm-lbl">{{ m.short }}</span>
                                </button>
                              </div>
                            </div>
                            <div class="fld"><label>Date <span class="req">*</span></label><HrDatePicker v-model="lg.departure_date" :min="i > 0 ? form.legs[i-1].departure_date : ''" /></div>
                          </div>
                          <button v-if="form.legs.length > 2" class="leg-del" @click="removeLeg(i)" title="Remove leg"><Trash2 :size="14" /></button>
                        </div>
                        <button class="leg-add" @click="addLeg"><Plus :size="14" /> Add a city</button>
                        <p v-if="legDateError" class="leg-warn"><AlertTriangle :size="12" /> Each leg's date must be on or after the previous one.</p>
                      </div>
                    </template>

                    <div class="fld" :style="fT(2)">
                      <label>Destination tier <em>(sets your per-diem)</em></label>
                      <div class="seg">
                        <button v-for="c in CITY_CATEGORIES" :key="c.key" class="seg-btn" :class="{ on: form.to_city_category === c.key }" :style="{ '--sc': c.hex }" @click="form.to_city_category = c.key">{{ c.label }}</button>
                      </div>
                    </div>
                    <div class="fld" :style="fT(3)">
                      <label>{{ form.trip_type === 'MULTI_CITY' ? 'Local transport & stay?' : 'What logistics will you need?' }}
                        <em>{{ form.trip_type === 'MULTI_CITY' ? '(inter-city travel is set per leg above)' : '(Flight or Train — pick one primary mode)' }}</em></label>
                      <div class="reqs">
                        <button v-for="r in visibleReqToggles" :key="r.key" class="req-chip" :class="{ on: form[r.key] }"
                          :title="r.key === 'local_transport_required' && roadLegExists ? 'A road leg already needs local transport' : ''"
                          @click="toggleNeed(r.key)">
                          <component :is="r.icon" :size="13" /> {{ r.label }}
                        </button>
                      </div>
                    </div>

                    <!-- overlapping-trip heads-up -->
                    <Presence>
                      <Motion v-if="overlaps.length" as="div" class="overlap" :style="fT(4)"
                        :initial="{ opacity: 0, y: -4 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0 }">
                        <span class="ov-ic"><AlertTriangle :size="15" /></span>
                        <div>
                          <b>You already have {{ overlaps.length }} trip{{ overlaps.length > 1 ? 's' : '' }} on these dates</b>
                          <span v-for="o in overlaps.slice(0, 3)" :key="o.id" class="ov-row">
                            <i class="trv-mono">{{ o.travel_reference_number }}</i> · {{ o.from_location }} → {{ o.to_location }}
                            · {{ fmtDate(o.departure_date) }}–{{ fmtDate(o.return_date) }} <em>({{ ovStatus(o.status) }})</em>
                          </span>
                          <span v-if="overlaps.length > 3" class="ov-more">+{{ overlaps.length - 3 }} more</span>
                          <span class="ov-hint">Double-check you're not double-booking — adjust the dates or withdraw the other trip if this replaces it.</span>
                        </div>
                      </Motion>
                    </Presence>
                  </template>

                  <!-- STEP 3 — preferences -->
                  <template v-else-if="step === 2">
                    <p class="pane-note" :style="fT(0)"><Sparkles :size="13" /> Tell the travel desk how you like to fly &amp; stay. These are preferences — the desk books within your grade policy.</p>

                    <div v-if="form.flight_required" class="pref-block" :style="fT(1)">
                      <span class="pref-h"><Plane :size="12" /> Flight</span>
                      <div class="fld"><label>Cabin class preference</label>
                        <div class="seg wrap">
                          <button v-for="c in flightClassOpts" :key="c.key" class="seg-btn" :class="{ on: form.prefs.flight_class === c.key }" @click="form.prefs.flight_class = c.key">{{ c.short }}</button>
                        </div>
                      </div>
                      <div class="row2">
                        <div class="fld"><label>Departure window</label><TrvSelect v-model="form.prefs.depart_window" :options="windowOpts" /></div>
                        <div class="fld"><label>Preferred airline</label><input v-model="form.prefs.airline" class="inp" placeholder="e.g. IndiGo, Vistara" /></div>
                      </div>
                      <div class="row2">
                        <div class="fld"><label>Seat</label>
                          <div class="seg"><button v-for="s in SEATS" :key="s.key" class="seg-btn" :class="{ on: form.prefs.seat === s.key }" @click="form.prefs.seat = s.key">{{ s.label }}</button></div>
                        </div>
                        <div class="fld"><label>Checked bags</label><input v-model.number="form.prefs.bags" type="number" min="0" max="9" class="inp" /></div>
                      </div>
                    </div>

                    <div v-if="form.train_required" class="pref-block" :style="fT(2)">
                      <span class="pref-h"><TrainFront :size="12" /> Train</span>
                      <div class="fld"><label>Class preference</label><TrvSelect v-model="form.prefs.train_class" :options="trainClassOpts" placeholder="Any class" /></div>
                    </div>

                    <div v-if="form.hotel_required" class="pref-block" :style="fT(3)">
                      <span class="pref-h"><Hotel :size="12" /> Stay</span>
                      <div class="fld"><label>Hotel category</label><TrvSelect v-model="form.prefs.hotel_category" :options="hotelOpts" placeholder="Any" /></div>
                    </div>

                    <div class="fld" :style="fT(4)">
                      <label>Special requests <em>(optional)</em></label>
                      <textarea v-model="form.prefs.notes" class="inp" rows="2" placeholder="Dietary needs, accessibility, late check-out…" />
                    </div>

                    <div v-if="!anyLogistics" class="pane-empty" :style="fT(1)">
                      <Compass :size="20" /><p>No logistics flagged. Go back and tick Flight / Train / Hotel / Local transport to set your preferences — or just leave a special request below.</p>
                    </div>
                  </template>

                  <!-- STEP 4 — costs & review -->
                  <template v-else>
                    <div class="fld" :style="fT(0)">
                      <label>Estimated cost (₹) <em>— what the trip should cost; your approver reviews this</em></label>
                      <div class="cost-grid">
                        <div v-for="c in costFields" :key="c.key" class="cost-cell" :class="{ req: c.required, missing: c.required && !(Number(form[c.key]) > 0) }">
                          <span class="cost-lab"><component :is="c.icon" :size="12" /> {{ c.label }}<i v-if="c.required" class="req-star">*</i></span>
                          <div class="cost-in"><span class="cur">₹</span><input v-model.number="form[c.key]" type="number" min="0" class="inp" placeholder="0" /></div>
                        </div>
                      </div>
                      <Presence>
                        <Motion v-if="missingCosts.length" as="p" class="cost-warn" :initial="{ opacity: 0, y: -4 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0 }">
                          <OctagonAlert :size="13" /> Add an estimate for <b>{{ missingCosts.map(c => c.label).join(', ') }}</b> — you flagged {{ missingCosts.length > 1 ? 'these' : 'this' }} as needed on the route step.
                        </Motion>
                      </Presence>
                      <div class="cost-total"><span>Estimated total</span><b class="trv-mono">{{ fmtINR(estTotal) }}</b></div>
                    </div>

                    <details class="charge" :style="fT(2)">
                      <summary><Building2 :size="12" /> Charge to a project / cost-center <em>(optional)</em></summary>
                      <div class="charge-grid">
                        <div class="fld"><label>Project</label><TrvSelect v-model="form.project_id" :options="projectOpts" placeholder="No project" /></div>
                        <div class="fld"><label>Cost center</label><input v-model="form.cost_center" class="inp" placeholder="e.g. CC-204" /></div>
                        <div class="fld"><label>Budget head</label><input v-model="form.budget_head" class="inp" placeholder="e.g. Field Ops" /></div>
                        <div class="fld"><label>Funding source</label><input v-model="form.funding_source" class="inp" placeholder="e.g. Internal" /></div>
                      </div>
                    </details>

                    <div v-if="customFields.length" class="custom" :style="fT(3)">
                      <span class="pref-h"><Sparkles :size="12" /> {{ selectedCategory?.name }} details</span>
                      <div v-for="f in customFields" :key="f.key" class="fld">
                        <label>{{ f.label }} <span v-if="f.required" class="req">*</span></label>
                        <textarea v-if="f.type === 'textarea'" v-model="form.details[f.key]" class="inp" rows="2" :placeholder="f.placeholder || ''" />
                        <input v-else-if="['number','currency'].includes(f.type)" v-model="form.details[f.key]" type="number" class="inp" :placeholder="f.placeholder || ''" />
                        <HrDatePicker v-else-if="f.type === 'date'" v-model="form.details[f.key]" />
                        <TrvSelect v-else-if="f.type === 'select'" v-model="form.details[f.key]" :options="(f.options || []).map(o => ({ value: o, label: o }))" :placeholder="f.placeholder || 'Select…'" />
                        <input v-else v-model="form.details[f.key]" class="inp" :placeholder="f.placeholder || ''" />
                      </div>
                    </div>

                    <div class="finale" :style="fT(4)">
                      <component :is="valid ? CircleCheckBig : OctagonAlert" :size="16" :class="valid ? 'ok' : 'warn'" />
                      <p>{{ valid ? 'Ready to go. Submit now to start approval, or save as a draft to finish later.' : (missingCosts.length ? `Add a cost estimate for ${missingCosts.map(c => c.label).join(', ')} to continue.` : 'Complete the required fields to continue.') }}</p>
                    </div>
                  </template>
                </Motion>
              </Presence>
            </div>

            <!-- ░░ live boarding pass ░░ -->
            <div class="sr-preview">
              <span class="pv-eyebrow trv-mono">LIVE BOARDING PASS</span>
              <div class="pv-pass" :class="{ ready: valid }">
                <span class="pv-spine" /><span class="pv-glow" aria-hidden="true" />
                <div class="pv-top"><span class="trv-mono pv-ref">{{ previewRef }}</span><span class="pv-stamp" :class="{ ready: valid }">{{ stampText }}</span></div>
                <div class="pv-route">
                  <div class="pv-end"><span class="pv-code trv-mono">{{ code(envelope.from) }}</span><span class="pv-place">{{ envelope.from || 'Origin' }}</span></div>
                  <div class="pv-path"><span class="pv-line" /><Plane :size="13" class="pv-plane" /><span class="pv-line" /></div>
                  <div class="pv-end right"><span class="pv-code trv-mono">{{ code(envelope.to) }}</span><span class="pv-place">{{ envelope.to || 'Destination' }}</span></div>
                </div>
                <div v-if="form.trip_type === 'MULTI_CITY' && multiStops.length > 2" class="pv-stops trv-mono">{{ multiStops.join('  ›  ') }}</div>
                <div class="pv-meta">
                  <div><span>Traveller</span><b>{{ travellerName }}</b></div>
                  <div><span>Type</span><b>{{ form.travel_type || '—' }}</b></div>
                  <div><span>Days</span><b>{{ numDays }}</b></div>
                  <div><span>Tier</span><b>{{ cityLabel }}</b></div>
                </div>
                <div class="pv-chips">
                  <span class="pv-chip trip"><component :is="tripMeta.icon" :size="11" /> {{ tripMeta.label }}<template v-if="form.trip_type === 'MULTI_CITY'"> · {{ form.legs.length }} legs</template></span>
                  <span v-for="r in activeReqs" :key="r.key" class="pv-chip"><component :is="r.icon" :size="11" /> {{ r.label }}</span>
                  <span v-if="!activeReqs.length" class="pv-chip muted">No logistics yet</span>
                </div>
                <div v-if="prefSummary.length" class="pv-prefs">
                  <span v-for="(p, i) in prefSummary" :key="i" class="pv-pref trv-mono">{{ p }}</span>
                </div>
                <div class="pv-foot">
                  <span class="pv-pri" :style="{ color: priHex }">{{ priLabel }}</span>
                  <span class="pv-total trv-mono">{{ fmtINR(estTotal) }}</span>
                </div>
              </div>
              <p class="pv-note">Submitting routes this to your approval chain. The travel desk books your seats once approved.</p>
            </div>
          </div>

          <footer class="sr-foot">
            <button v-if="step > 0" class="btn ghost" @click="prev"><ChevronLeft :size="15" /> Back</button>
            <button v-else class="btn ghost" @click="$emit('close')">Cancel</button>
            <div class="foot-right">
              <span v-if="!stepValid" class="foot-hint">{{ stepHint }}</span>
              <Motion v-if="step < STEPS.length - 1" as="button" class="btn primary" :disabled="!stepValid"
                :whileHover="stepValid ? { y: -2 } : {}" :whileTap="stepValid ? { scale: 0.97 } : {}" @click="next">Continue <ChevronRight :size="15" /></Motion>
              <template v-else>
                <button class="btn steel" :disabled="!valid || busy" @click="save(false)">Save draft</button>
                <Motion as="button" class="btn primary" :disabled="!valid || busy" :whileHover="(valid && !busy) ? { y: -2 } : {}" :whileTap="(valid && !busy) ? { scale: 0.97 } : {}" @click="save(true)">
                  <Loader2 v-if="busy" :size="15" class="spin" /><Send v-else :size="15" /> {{ isEdit ? 'Save & resubmit' : 'Submit' }}
                </Motion>
              </template>
            </div>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import {
  X, Plane, TrainFront, Hotel, Car, Check, ChevronLeft, ChevronRight, Loader2, Send,
  Building2, Sparkles, Compass, Banknote, CircleCheckBig, OctagonAlert, UserRound, Route, AlertTriangle,
  Plus, Trash2, MapPin,
} from 'lucide-vue-next'
import TrvSelect from '../components/TrvSelect.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import { useToast } from 'vue-toastification'
import {
  fmtINR, fmtDate, airportCode, errText, statusMeta, createMyRequest, createMyDraft, updateMyRequest, submitMyRequest,
  fetchMyCategories, fetchProjectsLite, TRAVEL_TYPES, CITY_CATEGORIES, PRIORITIES, TRIP_TYPES, LEG_MODES,
  FLIGHT_CLASSES, TRAIN_CLASSES, HOTEL_CATEGORIES,
} from '@/composables/useTravel'

const props = defineProps({
  open: Boolean,
  editRequest: { type: Object, default: null },
  existingTrips: { type: Array, default: () => [] },   // for the overlapping-dates check
})
const emit = defineEmits(['close', 'saved'])
const toast = useToast()

const STEPS = [
  { key: 'why', label: 'Purpose', icon: UserRound },
  { key: 'route', label: 'Route', icon: Route },
  { key: 'pref', label: 'Preferences', icon: Sparkles },
  { key: 'cost', label: 'Review', icon: Banknote },
]
const isEdit = computed(() => !!props.editRequest)
const step = ref(0); const dir = ref(1); const maxReached = ref(0); const busy = ref(false)
const categories = ref([]); const projects = ref([])

const DEPART_WINDOWS = [
  { value: 'ANY', label: 'Any time' }, { value: 'EARLY', label: 'Early (before 8am)' },
  { value: 'MORNING', label: 'Morning (8am–12)' }, { value: 'AFTERNOON', label: 'Afternoon (12–5)' },
  { value: 'EVENING', label: 'Evening (5–9pm)' }, { value: 'NIGHT', label: 'Red-eye (after 9pm)' },
]
const SEATS = [{ key: 'ANY', label: 'Any' }, { key: 'WINDOW', label: 'Window' }, { key: 'AISLE', label: 'Aisle' }]

const blankPrefs = () => ({ flight_class: 'ECONOMY', depart_window: 'ANY', airline: '', seat: 'ANY', bags: 1, train_class: '', hotel_category: '', notes: '' })
const blank = () => ({
  travel_type: 'Official Tour', category_id: null, priority: 'NORMAL', purpose: '',
  trip_type: 'ROUND_TRIP', legs: [],
  from_location: '', to_location: '', to_city_category: 'TIER_2', departure_date: '', return_date: '',
  flight_required: false, train_required: false, hotel_required: false, local_transport_required: false, advance_required: false,
  est_travel_cost: 0, est_accommodation_cost: 0, est_local_cost: 0, est_food_cost: 0, est_misc_cost: 0,
  project_id: null, cost_center: '', budget_head: '', funding_source: '', details: {}, prefs: blankPrefs(),
})
const form = reactive(blank())

// Logistics the traveller can flag on step 2 — only the things actually booked /
// arranged. "Advance" is NOT logistics (it's a separate post-approval cash request),
// and per-diem food is covered by DA, so neither belongs here.
const reqToggles = [
  { key: 'flight_required', label: 'Flight', icon: Plane },
  { key: 'train_required', label: 'Train', icon: TrainFront },
  { key: 'hotel_required', label: 'Hotel', icon: Hotel },
  { key: 'local_transport_required', label: 'Local transport', icon: Car },
]
// Multi-city sets inter-city transport per leg; Local transport (in-city) + Hotel
// stay trip-level toggles, just like one-way / round-trip.
const visibleReqToggles = computed(() => form.trip_type === 'MULTI_CITY'
  ? reqToggles.filter(r => r.key === 'local_transport_required' || r.key === 'hotel_required')
  : reqToggles)
// Flight & Train are the same trip's primary long-distance mode → mutually exclusive.
const toggleNeed = (key) => {
  // In multi-city a road leg forces local transport on — don't let it be cleared.
  if (key === 'local_transport_required' && roadLegExists.value) return
  form[key] = !form[key]
  if (form[key] && key === 'flight_required') form.train_required = false
  if (form[key] && key === 'train_required') form.flight_required = false
}

// ── trip shape + multi-city legs ────────────────────────────────────────────
const blankLeg = (from = '', to = '', date = '', mode = 'FLIGHT') => ({ from_location: from, to_location: to, departure_date: date, mode })
const setTripType = (k) => {
  form.trip_type = k
  if (k === 'MULTI_CITY' && form.legs.length < 2) {
    const seedMode = form.train_required ? 'TRAIN' : 'FLIGHT'
    form.legs = [
      blankLeg(form.from_location, form.to_location, form.departure_date, seedMode),
      blankLeg(form.to_location, form.from_location, form.return_date, seedMode),
    ]
  }
  if (k === 'ONE_WAY') form.return_date = form.departure_date || ''
  if (k === 'MULTI_CITY') syncMultiCityFlags()
}
// Each multi-city leg owns its transport mode → derive the trip-level flags so the
// cost step, preferences and booking surface stay consistent (hotel stays user-set).
const roadLegExists = computed(() => form.trip_type === 'MULTI_CITY'
  && form.legs.some(l => ['BUS', 'TAXI', 'RENTAL'].includes(String(l.mode || '').toUpperCase())))
const syncMultiCityFlags = () => {
  if (form.trip_type !== 'MULTI_CITY') return
  const modes = new Set(form.legs.map(l => String(l.mode || 'FLIGHT').toUpperCase()))
  form.flight_required = modes.has('FLIGHT')
  form.train_required = modes.has('TRAIN')
  // A road leg (bus/taxi/rental) implies local transport, but never auto-clear the
  // user's own "Local transport" choice for in-city travel at the destinations.
  if (modes.has('BUS') || modes.has('TAXI') || modes.has('RENTAL')) form.local_transport_required = true
}
const setLegMode = (i, mode) => { if (form.legs[i]) { form.legs[i].mode = mode; syncMultiCityFlags() } }
watch(() => form.legs, syncMultiCityFlags, { deep: true })
const addLeg = () => {
  const last = form.legs[form.legs.length - 1]
  form.legs.push(blankLeg(last ? last.to_location : '', ''))
}
const removeLeg = (i) => {
  if (form.legs.length > 2) form.legs.splice(i, 1)
  if (form.legs.length) form.to_location = form.legs[form.legs.length - 1].to_location
}
const onLegToChange = (i) => {
  const next = form.legs[i + 1]
  if (next && !next.from_location) next.from_location = form.legs[i].to_location
  if (i === form.legs.length - 1) form.to_location = form.legs[i].to_location
}
const legDateError = computed(() => {
  if (form.trip_type !== 'MULTI_CITY') return false
  let prev = null
  for (const lg of form.legs) {
    if (!lg.departure_date) continue
    if (prev && new Date(lg.departure_date) < new Date(prev)) return true
    prev = lg.departure_date
  }
  return false
})
const legsComplete = computed(() => form.legs.length >= 2
  && form.legs.every(l => l.from_location.trim() && l.to_location.trim() && l.departure_date))
// Derived envelope (first origin → final destination, first → last date).
const envelope = computed(() => {
  if (form.trip_type === 'MULTI_CITY' && form.legs.length) {
    const f = form.legs[0], l = form.legs[form.legs.length - 1]
    return { from: f.from_location, to: l.to_location, dep: f.departure_date, ret: l.departure_date }
  }
  return {
    from: form.from_location, to: form.to_location, dep: form.departure_date,
    ret: form.trip_type === 'ONE_WAY' ? form.departure_date : form.return_date,
  }
})

// Review cost cells mirror the selected logistics 1:1 (Flight/Train → one Travel
// cell, Hotel → Hotel, Local transport → Local). Nothing the traveller didn't
// flag ever appears, so step 2 and the Review step always agree.
const LOGI_COST = [
  { flag: 'flight_required', key: 'est_travel_cost', label: 'Flight', icon: Plane },
  { flag: 'train_required', key: 'est_travel_cost', label: 'Train', icon: TrainFront },
  { flag: 'hotel_required', key: 'est_accommodation_cost', label: 'Hotel', icon: Hotel },
  { flag: 'local_transport_required', key: 'est_local_cost', label: 'Local', icon: Car },
]
const ALL_COST_KEYS = ['est_travel_cost', 'est_accommodation_cost', 'est_local_cost', 'est_food_cost', 'est_misc_cost']
const costFields = computed(() => {
  // Flight + Train share the single transport estimate (est_travel_cost) — when a
  // multi-city trip uses both, combine the labels ("Flight & Train") so the cell
  // clearly covers both, instead of dropping the second under a dedupe.
  const byKey = new Map()
  for (const c of LOGI_COST) {
    if (!form[c.flag]) continue
    const ex = byKey.get(c.key)
    if (ex) ex.labels.push(c.label)
    else byKey.set(c.key, { key: c.key, labels: [c.label], icon: c.icon, required: true })
  }
  const cells = Array.from(byKey.values()).map(c => ({ key: c.key, label: c.labels.join(' & '), icon: c.icon, required: true }))
  if (!cells.length) cells.push({ key: 'est_travel_cost', label: 'Estimated cost', icon: Plane, required: false })
  return cells
})
const fT = (i) => ({ animation: `trv-fade-up 0.4s ${0.04 + i * 0.06}s var(--trv-spring) backwards` })

const typeOpts = TRAVEL_TYPES.map(t => ({ value: t.key, label: t.key, icon: t.icon }))
const catOpts = computed(() => [{ value: null, label: '— none —' }, ...categories.value.map(c => ({ value: c.id, label: c.name }))])
const projectOpts = computed(() => [{ value: null, label: 'No project' }, ...projects.value.map(p => ({ value: p.id, label: p.name }))])
const flightClassOpts = FLIGHT_CLASSES.filter(f => f.key !== 'NONE')
const trainClassOpts = TRAIN_CLASSES.filter(t => t.key !== 'NONE').map(t => ({ value: t.key, label: t.label }))
const hotelOpts = HOTEL_CATEGORIES.map(h => ({ value: h, label: h }))
const windowOpts = DEPART_WINDOWS

const load = async () => {
  const [c, p] = await Promise.all([fetchMyCategories().catch(() => ({ items: [] })), fetchProjectsLite().catch(() => ({ items: [] }))])
  categories.value = (c.items || []).filter(x => x.is_active)
  projects.value = p.items || p.projects || []
}
const prefill = (r) => {
  Object.assign(form, blank())
  if (!r) return
  const keys = ['travel_type', 'category_id', 'priority', 'purpose', 'trip_type', 'from_location', 'to_location', 'to_city_category',
    'departure_date', 'return_date', 'project_id', 'cost_center', 'budget_head', 'funding_source',
    'flight_required', 'train_required', 'hotel_required', 'local_transport_required', 'advance_required',
    'est_travel_cost', 'est_accommodation_cost', 'est_local_cost', 'est_food_cost', 'est_misc_cost']
  keys.forEach(k => { if (r[k] !== undefined && r[k] !== null) form[k] = r[k] })
  form.trip_type = String(r.trip_type || 'ROUND_TRIP').toUpperCase()
  form.legs = (form.trip_type === 'MULTI_CITY' && Array.isArray(r.itinerary))
    ? r.itinerary.map(l => ({ from_location: l.from_location || '', to_location: l.to_location || '', departure_date: l.departure_date || '', mode: String(l.mode || 'FLIGHT').toUpperCase() }))
    : []
  const d = { ...(r.details || {}) }
  form.prefs = { ...blankPrefs(), ...(d.__preferences || {}) }
  delete d.__preferences
  form.details = d
}
watch(() => props.open, (v) => { if (!v) return; step.value = 0; dir.value = 1; maxReached.value = 0; prefill(props.editRequest); load() })

const selectedCategory = computed(() => categories.value.find(c => c.id === form.category_id) || null)
const customFields = computed(() => selectedCategory.value?.field_schema || [])
const onCategoryChange = () => {
  const allowed = new Set((selectedCategory.value?.field_schema || []).map(f => f.key))
  const next = {}; Object.keys(form.details).forEach(k => { if (allowed.has(k)) next[k] = form.details[k] }); form.details = next
  const dft = selectedCategory.value?.default_travel_type
  if (dft && TRAVEL_TYPES.some(t => t.key === dft)) form.travel_type = dft
}

const code = (l) => airportCode(l)
const anyLogistics = computed(() => form.flight_required || form.train_required || form.hotel_required || form.local_transport_required)
const estTotal = computed(() => costFields.value.reduce((a, c) => a + (Number(form[c.key]) || 0), 0))
// Cost cells the traveller flagged on step 2 but left at 0 — must be filled.
const missingCosts = computed(() => costFields.value.filter(c => c.required && !(Number(form[c.key]) > 0)))
const costValid = computed(() => missingCosts.value.length === 0)

// Other live trips whose dates overlap the one being raised — surfaced as a
// non-blocking heads-up so the traveller doesn't double-book themselves.
const overlaps = computed(() => {
  const e = envelope.value
  if (!e.dep || !e.ret) return []
  const d1 = +new Date(e.dep), d2 = +new Date(e.ret)
  if (Number.isNaN(d1) || Number.isNaN(d2)) return []
  return (props.existingTrips || []).filter(t => {
    if (props.editRequest && t.id === props.editRequest.id) return false
    if (['CANCELLED', 'REJECTED'].includes(t.status)) return false
    if (!t.departure_date || !t.return_date) return false
    const o1 = +new Date(t.departure_date), o2 = +new Date(t.return_date)
    return o1 <= d2 && d1 <= o2          // ranges intersect
  })
})
const ovStatus = (s) => statusMeta(s).label
const numDays = computed(() => {
  const e = envelope.value
  if (!e.dep) return '—'
  if (form.trip_type === 'ONE_WAY') return 1
  if (!e.ret) return '—'
  const d = (new Date(e.ret) - new Date(e.dep)) / 864e5
  return d >= 0 ? d + 1 : '—'
})
const cityLabel = computed(() => CITY_CATEGORIES.find(c => c.key === form.to_city_category)?.label || '—')
const tripMeta = computed(() => TRIP_TYPES.find(t => t.key === form.trip_type) || TRIP_TYPES[1])
const multiStops = computed(() => {
  if (form.trip_type !== 'MULTI_CITY' || !form.legs.length) return []
  return [form.legs[0].from_location, ...form.legs.map(l => l.to_location)].filter(Boolean).map(s => airportCode(s))
})
const priMeta = computed(() => PRIORITIES.find(p => p.key === form.priority) || PRIORITIES[1])
const priLabel = computed(() => priMeta.value.label + ' priority')
const priHex = computed(() => priMeta.value.hex)
const travellerName = computed(() => { try { return (JSON.parse(localStorage.getItem('user') || '{}').full_name || 'You') } catch { return 'You' } })
const activeReqs = computed(() => reqToggles.filter(r => form[r.key]))
const previewRef = computed(() => isEdit.value ? props.editRequest.travel_reference_number : 'TR-•• ••••••')
const stampText = computed(() => isEdit.value ? 'EDIT' : (valid.value ? 'READY' : 'DRAFT'))
const prefSummary = computed(() => {
  const out = []
  if (form.flight_required) {
    out.push(FLIGHT_CLASSES.find(f => f.key === form.prefs.flight_class)?.short || 'Eco')
    if (form.prefs.seat !== 'ANY') out.push(SEATS.find(s => s.key === form.prefs.seat)?.label)
    if (form.prefs.airline) out.push(form.prefs.airline)
  }
  if (form.hotel_required && form.prefs.hotel_category) out.push(form.prefs.hotel_category)
  return out.filter(Boolean).slice(0, 4)
})

const step1Valid = computed(() => !!form.travel_type && form.purpose.trim().length >= 3)
const step2Valid = computed(() => {
  if (form.trip_type === 'MULTI_CITY') return legsComplete.value && !legDateError.value
  const baseOk = !!(form.from_location.trim() && form.to_location.trim() && form.departure_date)
  if (form.trip_type === 'ONE_WAY') return baseOk
  return baseOk && !!form.return_date && new Date(form.return_date) >= new Date(form.departure_date)
})
const customValid = computed(() => customFields.value.every(f => !f.required || String(form.details[f.key] ?? '').trim() !== ''))
const valid = computed(() => step1Valid.value && step2Valid.value && customValid.value && costValid.value)
const stepValid = computed(() => step.value === 0 ? step1Valid.value : step.value === 1 ? step2Valid.value : step.value === 2 ? true : (customValid.value && costValid.value))
const stepHint = computed(() => step.value === 0 ? 'Add a purpose & type'
  : step.value === 1 ? 'Set route & dates'
  : missingCosts.value.length ? `Add a cost for ${missingCosts.value.map(c => c.label).join(', ')}`
  : 'Fill required details')
const progress = computed(() => ((step.value + (stepValid.value ? 1 : 0.4)) / STEPS.length) * 100)

const next = () => { if (!stepValid.value) return; dir.value = 1; step.value = Math.min(STEPS.length - 1, step.value + 1); maxReached.value = Math.max(maxReached.value, step.value) }
const prev = () => { dir.value = -1; step.value = Math.max(0, step.value - 1) }

const buildDetails = () => {
  const d = { ...form.details }
  const p = {}
  Object.entries(form.prefs).forEach(([k, v]) => { if (v !== '' && v != null && !(k === 'bags' && !form.flight_required)) p[k] = v })
  if (anyLogistics.value || form.prefs.notes) d.__preferences = p
  return d
}
const save = async (submit) => {
  if (!valid.value) return
  busy.value = true
  try {
    // Only the selected logistics carry an estimate — clear every other bucket.
    const activeKeys = new Set(costFields.value.map(c => c.key))
    ALL_COST_KEYS.forEach(k => { if (!activeKeys.has(k)) form[k] = 0 })
    const { prefs, legs, ...rest } = form
    const e = envelope.value
    const payload = {
      ...rest,
      details: buildDetails(),
      trip_type: form.trip_type,
      // The single-route envelope every consumer reads — derived from the legs.
      from_location: e.from, to_location: e.to,
      departure_date: e.dep, return_date: e.ret || e.dep,
      itinerary: form.trip_type === 'MULTI_CITY'
        ? form.legs.map(l => ({
            from_location: l.from_location, to_location: l.to_location,
            departure_date: l.departure_date, mode: String(l.mode || 'FLIGHT').toUpperCase(),
            to_city_category: form.to_city_category,
          }))
        : null,
    }
    if (isEdit.value) {
      await updateMyRequest(props.editRequest.id, payload)
      if (submit && ['DRAFT', 'RETURNED'].includes(props.editRequest.status)) await submitMyRequest(props.editRequest.id)
      toast.success(submit ? 'Updated & resubmitted' : 'Changes saved')
    } else if (submit) { await createMyRequest(payload); toast.success('Request submitted for approval') }
    else { await createMyDraft(payload); toast.success('Draft saved') }
    emit('saved'); emit('close')
  } catch (e) { toast.error(errText(e, 'Could not save request')) } finally { busy.value = false }
}
</script>

<style scoped>
.ov { position: fixed; inset: 0; z-index: 1440; display: grid; place-items: center; padding: 18px; background: rgba(6,5,4,0.64); backdrop-filter: blur(9px); }
.sr { position: relative; width: min(1000px, 97vw); max-height: 94vh; overflow: hidden; display: flex; flex-direction: column; border-radius: 24px; background: var(--trv-surface-elevated); border: 1px solid var(--trv-border-strong); box-shadow: var(--trv-shadow); }
.sr-aura { position: absolute; inset: -40% 40% 60% -10%; pointer-events: none; background: radial-gradient(55% 70% at 25% 0%, rgba(251,191,36,0.16), transparent 70%); animation: trv-aura-drift 10s ease-in-out infinite; }
.sr-head { position: relative; display: flex; align-items: center; justify-content: space-between; padding: 18px 22px 12px; }
.sr-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--trv-amber); }
.sr-head h3 { font-size: 19px; font-weight: 850; margin: 5px 0 0; color: var(--trv-text); }
.sr-x { background: var(--trv-panel); border: 1px solid var(--trv-border); border-radius: 9px; padding: 6px; color: var(--trv-text-dim); cursor: pointer; }
.sr-x:hover { color: var(--trv-text); }

.sr-steps { position: relative; padding: 0 22px 14px; }
.step-track { height: 3px; border-radius: 999px; background: var(--trv-steel-soft); overflow: hidden; margin-bottom: 12px; }
.step-fill { display: block; height: 100%; border-radius: 999px; background: var(--trv-grad-hero); transition: width 0.5s var(--trv-spring); }
.step-dots { display: flex; gap: 8px; }
.step-dot { flex: 1; display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: 11px; cursor: default; background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-muted); transition: all 0.25s; }
.step-dot.reachable { cursor: pointer; }
.step-dot.on { border-color: var(--trv-amber-border); background: var(--trv-amber-soft); color: var(--trv-amber); }
.step-dot.done { color: var(--trv-st-approved); border-color: color-mix(in srgb, var(--trv-st-approved) 30%, transparent); }
.dot-ix { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; background: var(--trv-surface-elevated); border: 1px solid currentColor; flex-shrink: 0; }
.dot-lab { font-size: 12px; font-weight: 700; }

.sr-body { position: relative; display: grid; grid-template-columns: 1.45fr 0.85fr; overflow: hidden; flex: 1; min-height: 0; }
.sr-form { padding: 14px 22px; overflow-y: auto; }
.pane { display: flex; flex-direction: column; gap: 13px; }
.pane-note { display: flex; align-items: flex-start; gap: 8px; margin: 0; font-size: 12px; color: var(--trv-text-secondary); padding: 10px 12px; border-radius: 11px; background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); }
.pane-note svg { color: var(--trv-amber); flex-shrink: 0; margin-top: 1px; }
.pane-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; text-align: center; padding: 22px; color: var(--trv-text-dim); }
.pane-empty p { margin: 0; font-size: 12px; max-width: 280px; }
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.fld label { display: block; font-size: 11px; font-weight: 650; color: var(--trv-text-muted); margin-bottom: 5px; }
.fld label em { color: var(--trv-text-dim); font-style: normal; font-weight: 500; }
.req { color: var(--trv-ember); }
.inp { width: 100%; padding: 9px 11px; border-radius: 9px; font-size: 13px; font-family: inherit; resize: vertical; background: rgba(0,0,0,0.3); border: 1px solid var(--trv-border); color: var(--trv-text); transition: border-color 0.2s, box-shadow 0.2s; }
.inp:focus { outline: none; border-color: var(--trv-amber-border); box-shadow: 0 0 0 3px rgba(251,191,36,0.1); }
.seg { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 6px; }
.seg.wrap { grid-auto-flow: row; grid-template-columns: repeat(4, 1fr); }
.seg-btn { padding: 8px 6px; border-radius: 9px; font-size: 12px; font-weight: 650; cursor: pointer; background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-muted); transition: all 0.2s; }
.seg-btn:hover { color: var(--trv-text-secondary); }
.seg-btn.on { color: var(--sc, var(--trv-amber)); border-color: var(--sc, var(--trv-amber)); background: color-mix(in srgb, var(--sc, var(--trv-amber)) 14%, transparent); }
.reqs { display: flex; flex-wrap: wrap; gap: 6px; }
.req-chip { display: inline-flex; align-items: center; gap: 5px; padding: 8px 12px; border-radius: 9px; cursor: pointer; font-size: 12px; background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-muted); transition: all 0.2s; }
.req-chip.on { color: var(--trv-amber); border-color: var(--trv-amber-border); background: var(--trv-amber-soft); }

/* multi-city leg builder */
.legs { display: flex; flex-direction: column; gap: 10px; }
.leg { position: relative; display: flex; gap: 11px; padding: 12px; border-radius: 13px; background: var(--trv-panel); border: 1px solid var(--trv-border); }
.leg-ix { flex-shrink: 0; display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; font-size: 11px; font-weight: 800; color: #1a1205; background: var(--trv-grad-hero); }
.leg-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 9px; }
.leg-del { flex-shrink: 0; align-self: flex-start; background: var(--trv-st-rejected-soft); border: 1px solid color-mix(in srgb, var(--trv-st-rejected) 28%, transparent); color: var(--trv-st-rejected); border-radius: 8px; padding: 6px; cursor: pointer; transition: all 0.2s; }
.leg-del:hover { background: color-mix(in srgb, var(--trv-st-rejected) 18%, transparent); }
.leg-add { display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 9px; border-radius: 11px; cursor: pointer; font-size: 12.5px; font-weight: 700; color: var(--trv-amber); background: var(--trv-amber-soft); border: 1px dashed var(--trv-amber-border); transition: all 0.2s; }
.leg-add:hover { background: color-mix(in srgb, var(--trv-amber) 16%, transparent); }
.leg-warn { display: flex; align-items: center; gap: 6px; margin: 0; font-size: 11px; font-weight: 600; color: var(--trv-st-returned); }
.leg-modes { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 4px; }
.lm-btn { display: inline-flex; align-items: center; justify-content: center; gap: 4px; min-width: 0; overflow: hidden; padding: 7px 4px; border-radius: 8px; font-size: 10.5px; font-weight: 650; cursor: pointer; background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-muted); transition: all 0.2s; }
.lm-btn svg { flex-shrink: 0; }
.lm-btn:hover { color: var(--trv-text-secondary); }
.lm-btn.on { color: var(--trv-amber); border-color: var(--trv-amber-border); background: var(--trv-amber-soft); }
.lm-lbl { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
@media (max-width: 600px) { .lm-lbl { display: none; } }
.one-way-note { display: flex; flex-direction: column; }
.ow-pill { display: inline-flex; align-items: center; gap: 6px; padding: 9px 11px; border-radius: 9px; font-size: 12px; color: var(--trv-text-muted); background: var(--trv-steel-soft); border: 1px dashed var(--trv-border); }
.pv-stops { font-size: 10px; color: var(--trv-text-muted); margin: -6px 0 12px; letter-spacing: 0.04em; text-align: center; }
.pv-chip.trip { color: var(--trv-amber-bright); background: color-mix(in srgb, var(--trv-amber) 16%, transparent); border-color: var(--trv-amber-border); }
.pref-block { padding: 13px; border-radius: 13px; background: var(--trv-panel); border: 1px solid var(--trv-border); display: flex; flex-direction: column; gap: 11px; }
.pref-h { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 750; letter-spacing: 0.04em; color: var(--trv-amber); }
.charge { padding: 11px 13px; border-radius: 13px; background: var(--trv-panel); border: 1px solid var(--trv-border); }
.charge summary { display: flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 700; color: var(--trv-amber); cursor: pointer; list-style: none; }
.charge summary em { color: var(--trv-text-dim); font-weight: 500; font-style: normal; }
.charge[open] summary { margin-bottom: 11px; }
.charge-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.custom { padding: 13px; border-radius: 13px; background: var(--trv-panel); border: 1px solid var(--trv-border); display: flex; flex-direction: column; gap: 10px; }
.cost-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 7px; }
.cost-cell { display: flex; flex-direction: column; gap: 5px; padding: 9px 9px 8px; border-radius: 11px; background: var(--trv-panel); border: 1px solid var(--trv-border); transition: border-color 0.25s, background 0.25s; }
.cost-cell.req { border-color: var(--trv-amber-border); }
.cost-cell.missing { border-color: color-mix(in srgb, var(--trv-st-returned) 55%, transparent); background: var(--trv-st-returned-soft); }
.cost-lab { display: inline-flex; align-items: center; gap: 4px; font-size: 9.5px; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; color: var(--trv-text-dim); }
.cost-lab svg { color: var(--trv-text-dim); }
.cost-cell.req .cost-lab, .cost-cell.req .cost-lab svg { color: var(--trv-amber); }
.cost-cell.missing .cost-lab, .cost-cell.missing .cost-lab svg { color: var(--trv-st-returned); }
.req-star { color: var(--trv-ember); font-style: normal; margin-left: 1px; }
.cost-in { display: flex; align-items: center; gap: 3px; padding: 0 8px; border-radius: 8px; background: rgba(0,0,0,0.3); border: 1px solid var(--trv-border); transition: border-color 0.2s; }
.cost-in:focus-within { border-color: var(--trv-amber-border); box-shadow: 0 0 0 3px rgba(251,191,36,0.1); }
.cost-in .cur { font-size: 12px; color: var(--trv-text-dim); }
.cost-in .inp { border: none !important; background: transparent !important; box-shadow: none !important; padding: 8px 0 !important; font-size: 13px; font-weight: 700; }
.cost-warn { display: flex; align-items: center; gap: 7px; margin: 9px 0 0; font-size: 11.5px; font-weight: 600; color: var(--trv-st-returned); }
.cost-warn svg { flex-shrink: 0; } .cost-warn b { color: var(--trv-st-returned); }
.overlap { display: flex; gap: 11px; padding: 12px 14px; border-radius: 13px; background: var(--trv-st-returned-soft); border: 1px solid color-mix(in srgb, var(--trv-st-returned) 32%, transparent); }
.ov-ic { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0; color: var(--trv-st-returned); background: color-mix(in srgb, var(--trv-st-returned) 14%, transparent); }
.overlap b { display: block; font-size: 12.5px; color: var(--trv-text); margin-bottom: 5px; }
.ov-row { display: block; font-size: 11.5px; color: var(--trv-text-secondary); line-height: 1.5; }
.ov-row i { color: var(--trv-amber-bright); font-style: normal; } .ov-row em { color: var(--trv-text-dim); font-style: normal; }
.ov-more { display: block; font-size: 11px; color: var(--trv-text-dim); margin-top: 2px; }
.ov-hint { display: block; font-size: 11px; color: var(--trv-text-muted); margin-top: 6px; line-height: 1.45; }
.cost-total { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; padding: 9px 12px; border-radius: 10px; background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); }
.cost-total span { font-size: 11px; color: var(--trv-text-muted); }
.cost-total b { font-size: 16px; color: var(--trv-amber-bright); }
.finale { display: flex; align-items: center; gap: 10px; padding: 13px; border-radius: 13px; background: var(--trv-panel); border: 1px solid var(--trv-border); }
.finale .ok { color: var(--trv-st-approved); } .finale .warn { color: var(--trv-st-returned); }
.finale p { margin: 0; font-size: 12.5px; color: var(--trv-text-secondary); }

.sr-preview { padding: 14px 18px; background: var(--trv-panel); border-left: 1px solid var(--trv-border); display: flex; flex-direction: column; gap: 11px; overflow-y: auto; }
.pv-eyebrow { font-size: 9px; letter-spacing: 0.18em; color: var(--trv-text-dim); }
.pv-pass { position: relative; border-radius: 16px; padding: 16px; background: var(--trv-pass); border: 1px solid var(--trv-pass-edge); overflow: hidden; transition: border-color 0.4s; }
.pv-pass.ready { border-color: var(--trv-amber-border); }
.pv-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--trv-grad-hero); }
.pv-glow { position: absolute; inset: 0; opacity: 0; background: radial-gradient(120% 80% at 0% 0%, rgba(251,191,36,0.14), transparent 60%); transition: opacity 0.5s; }
.pv-pass.ready .pv-glow { opacity: 1; }
.pv-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.pv-ref { font-size: 11px; color: var(--trv-text-muted); }
.pv-stamp { font-size: 10px; font-weight: 800; letter-spacing: 0.08em; color: var(--trv-text-dim); padding: 2px 8px; border-radius: 6px; border: 1px solid var(--trv-border-strong); transition: all 0.3s; }
.pv-stamp.ready { color: var(--trv-amber); border-color: var(--trv-amber-border); background: var(--trv-amber-soft); }
.pv-route { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px; margin-bottom: 14px; }
.pv-end { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.pv-end.right { text-align: right; align-items: flex-end; }
.pv-code { font-size: 23px; font-weight: 850; color: var(--trv-text); line-height: 1; }
.pv-place { font-size: 9.5px; color: var(--trv-text-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 92px; }
.pv-path { display: flex; align-items: center; gap: 3px; color: var(--trv-amber); }
.pv-line { width: 14px; height: 1.5px; background: repeating-linear-gradient(90deg, currentColor 0 4px, transparent 4px 8px); opacity: 0.55; }
.pv-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 10px; margin-bottom: 12px; }
.pv-meta div { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.pv-meta span { font-size: 8.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--trv-text-dim); }
.pv-meta b { font-size: 12.5px; color: var(--trv-text-secondary); font-weight: 650; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pv-chips { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 10px; }
.pv-chip { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 600; padding: 3px 7px; border-radius: 6px; color: var(--trv-amber); background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); }
.pv-chip.muted { color: var(--trv-text-dim); background: transparent; border-color: var(--trv-border); }
.pv-prefs { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 12px; }
.pv-pref { font-size: 9.5px; font-weight: 600; padding: 2px 7px; border-radius: 6px; color: var(--trv-text-secondary); background: var(--trv-steel-soft); border: 1px solid var(--trv-border); }
.pv-foot { display: flex; align-items: center; justify-content: space-between; padding-top: 11px; border-top: 1px dashed var(--trv-pass-edge); }
.pv-pri { font-size: 10px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
.pv-total { font-size: 17px; font-weight: 850; color: var(--trv-amber-bright); }
.pv-note { font-size: 11px; color: var(--trv-text-dim); margin: 0; line-height: 1.5; }

.sr-foot { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 14px 22px; border-top: 1px solid var(--trv-border); }
.foot-right { display: flex; align-items: center; gap: 10px; }
.foot-hint { font-size: 11px; color: var(--trv-text-dim); }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 17px; border-radius: 11px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
.btn.ghost { background: transparent; border-color: var(--trv-border-strong); color: var(--trv-text-secondary); }
.btn.steel { background: var(--trv-steel-soft); color: var(--trv-text); border-color: var(--trv-border-strong); }
.btn.primary { background: var(--trv-grad-hero); color: #1a1205; box-shadow: var(--trv-amber-glow); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
.spin { animation: trv-spin-slow 0.8s linear infinite; }

@media (max-width: 800px) {
  .sr-body { grid-template-columns: 1fr; }
  .sr-preview { border-left: none; border-top: 1px solid var(--trv-border); order: -1; }
  .cost-grid { grid-template-columns: repeat(2, 1fr); }
  .charge-grid { grid-template-columns: 1fr; }
  .step-dots .dot-lab { display: none; }
}
[data-theme="light"] .ov { background: rgba(60,40,15,0.32); }
[data-theme="light"] .inp { background: rgba(255,250,240,0.72); }
[data-theme="light"] .cost-in { background: rgba(255,250,240,0.72); }
[data-theme="light"] .dot-ix { background: var(--trv-surface); }
@media (prefers-reduced-motion: reduce) { .sr-aura, .pane, [style*="trv-fade-up"], .spin { animation: none !important; } }
</style>
