<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" as="div" class="ntr-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.25 }" @click.self="$emit('close')">
        <Motion as="div" class="ntr"
          :initial="{ opacity: 0, y: 28, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 18, scale: 0.97 }" :transition="{ duration: 0.44, ease: [0.16, 1, 0.3, 1] }">
          <span class="ntr-aura" aria-hidden="true" />

          <!-- header -->
          <header class="ntr-head">
            <div class="ntr-htext">
              <span class="ntr-eyebrow"><Plane :size="12" /> {{ isEdit ? 'Edit travel · ' + (editRequest?.travel_reference_number || '') : 'New travel · admin entry' }}</span>
              <h3>{{ isEdit ? 'Edit travel request' : 'Raise a travel request' }}</h3>
            </div>
            <button class="ntr-x" @click="$emit('close')"><X :size="18" /></button>
          </header>

          <!-- step rail -->
          <div class="ntr-steps">
            <div class="step-track"><span class="step-fill" :style="{ width: progress + '%' }" /></div>
            <div class="step-dots">
              <button v-for="(s, i) in STEPS" :key="s.key" class="step-dot" :class="{ on: step === i, done: i < step, reachable: i <= maxReached }"
                @click="i <= maxReached && (step = i)">
                <span class="dot-ix"><component v-if="i < step" :is="Check" :size="13" /><component v-else :is="s.icon" :size="13" /></span>
                <span class="dot-lab">{{ s.label }}</span>
              </button>
            </div>
          </div>

          <div class="ntr-body">
            <!-- ░░ form column ░░ -->
            <div class="ntr-form">
              <Presence mode="wait">
                <Motion :key="step" as="div" class="step-pane"
                  :initial="{ opacity: 0, x: dir * 26 }" :animate="{ opacity: 1, x: 0 }" :exit="{ opacity: 0, x: dir * -26 }"
                  :transition="{ duration: 0.34, ease: [0.16, 1, 0.3, 1] }">

                  <!-- STEP 1 — Traveller & purpose -->
                  <template v-if="step === 0">
                    <div class="fld" :style="fT(0)">
                      <label>Traveller</label>
                      <div v-if="isEdit" class="locked-emp"><UserRound :size="14" /> {{ editRequest?.employee_name || 'Employee' }} <span class="lock">fixed</span></div>
                      <HrSelect v-else v-model="form.employee_id" :options="empOptions" placeholder="Select employee…" searchable />
                      <small v-if="!isEdit && hiddenEmpCount" class="emp-note">{{ hiddenEmpCount }} exited employee{{ hiddenEmpCount > 1 ? 's' : '' }} hidden — a departed employee can't be sent on a new trip.</small>
                    </div>
                    <div class="row2" :style="fT(1)">
                      <div class="fld"><label>Travel type</label>
                        <HrSelect v-model="form.travel_type" :options="typeOptions" placeholder="Type…" /></div>
                      <div class="fld"><label>Category</label>
                        <HrSelect v-model="form.category_id" :options="catOptions" placeholder="Category…" @change="onCategoryChange" /></div>
                    </div>
                    <div class="fld" :style="fT(2)">
                      <label>Priority</label>
                      <div class="seg">
                        <button v-for="p in PRIORITIES" :key="p.key" class="seg-btn" :class="{ on: form.priority === p.key }"
                          :style="{ '--sc': p.hex }" @click="form.priority = p.key">{{ p.label }}</button>
                      </div>
                    </div>
                    <div class="fld" :style="fT(3)">
                      <label>Purpose of travel <span class="req-star">*</span></label>
                      <textarea v-model="form.purpose" class="inp" rows="3" placeholder="Why is this journey needed?" />
                    </div>
                  </template>

                  <!-- STEP 2 — Route & schedule -->
                  <template v-else-if="step === 1">
                    <div class="fld" :style="fT(0)">
                      <label>Trip type</label>
                      <div class="seg">
                        <button v-for="t in TRIP_TYPES" :key="t.key" class="seg-btn" :class="{ on: form.trip_type === t.key }" @click="setTripType(t.key)">
                          <component :is="t.icon" :size="13" /> {{ t.label }}
                        </button>
                      </div>
                    </div>

                    <template v-if="form.trip_type !== 'MULTI_CITY'">
                      <div class="row2" :style="fT(1)">
                        <div class="fld"><label>From <span class="req-star">*</span></label>
                          <input v-model="form.from_location" class="inp" placeholder="Origin city" /></div>
                        <div class="fld"><label>To <span class="req-star">*</span></label>
                          <input v-model="form.to_location" class="inp" placeholder="Destination city" /></div>
                      </div>
                      <div class="row2" :style="fT(2)">
                        <div class="fld"><label>Departure <span class="req-star">*</span></label><HrDatePicker v-model="form.departure_date" /></div>
                        <div v-if="form.trip_type === 'ROUND_TRIP'" class="fld"><label>Return <span class="req-star">*</span></label><HrDatePicker v-model="form.return_date" :min="form.departure_date" /></div>
                        <div v-else class="fld one-way-note"><label>Return</label><span class="ow-pill"><ArrowRight :size="13" /> One-way — no return</span></div>
                      </div>
                    </template>

                    <template v-else>
                      <div class="legs" :style="fT(1)">
                        <div v-for="(lg, i) in form.legs" :key="i" class="leg">
                          <span class="leg-ix">{{ i + 1 }}</span>
                          <div class="leg-body">
                            <div class="row2">
                              <div class="fld"><label>From <span class="req-star">*</span></label><input v-model="lg.from_location" class="inp" placeholder="Origin" @input="i === 0 && (form.from_location = lg.from_location)" /></div>
                              <div class="fld"><label>To <span class="req-star">*</span></label><input v-model="lg.to_location" class="inp" placeholder="Destination" @input="onLegToChange(i)" /></div>
                            </div>
                            <div class="fld"><label>Mode <span class="req-star">*</span></label>
                              <div class="leg-modes">
                                <button v-for="m in LEG_MODES" :key="m.key" type="button" class="lm-btn" :class="{ on: (lg.mode || 'FLIGHT') === m.key }" :title="m.label" @click="setLegMode(i, m.key)">
                                  <component :is="m.icon" :size="13" /><span class="lm-lbl">{{ m.short }}</span>
                                </button>
                              </div>
                            </div>
                            <div class="fld"><label>Date <span class="req-star">*</span></label><HrDatePicker v-model="lg.departure_date" :min="i > 0 ? form.legs[i-1].departure_date : ''" /></div>
                          </div>
                          <button v-if="form.legs.length > 2" class="leg-del" @click="removeLeg(i)" title="Remove leg"><Trash2 :size="14" /></button>
                        </div>
                        <button class="leg-add" @click="addLeg"><Plus :size="14" /> Add a city</button>
                        <p v-if="legDateError" class="leg-warn"><AlertTriangle :size="12" /> Each leg's date must be on or after the previous one.</p>
                      </div>
                    </template>

                    <div class="fld" :style="fT(2)">
                      <label>Destination tier (drives DA)</label>
                      <div class="seg">
                        <button v-for="c in CITY_CATEGORIES" :key="c.key" class="seg-btn" :class="{ on: form.to_city_category === c.key }"
                          :style="{ '--sc': c.hex }" @click="form.to_city_category = c.key">{{ c.label }}</button>
                      </div>
                    </div>
                    <div class="fld" :style="fT(3)">
                      <label>{{ form.trip_type === 'MULTI_CITY' ? 'Local transport, stay & advance' : 'Logistics needed' }}
                        <em v-if="form.trip_type === 'MULTI_CITY'" class="lbl-hint">inter-city travel is set per leg above</em></label>
                      <div class="reqs">
                        <button v-for="r in visibleReqToggles" :key="r.key" class="req" :class="{ on: form[r.key] }"
                          :title="r.key === 'local_transport_required' && roadLegExists ? 'A road leg already needs local transport' : ''"
                          @click="toggleAdminNeed(r.key)">
                          <component :is="r.icon" :size="13" /> {{ r.label }}
                        </button>
                      </div>
                    </div>
                    <div class="charge" :style="fT(4)">
                      <span class="charge-h"><Building2 :size="12" /> Charge to <em>(optional)</em></span>
                      <div class="row2">
                        <div class="fld"><label>Project</label><HrSelect v-model="form.project_id" :options="projectOptions" placeholder="No project" /></div>
                        <div class="fld"><label>Cost center</label><input v-model="form.cost_center" class="inp" placeholder="e.g. CC-204" /></div>
                      </div>
                      <div class="row2">
                        <div class="fld"><label>Budget head</label><input v-model="form.budget_head" class="inp" placeholder="e.g. Field Ops" /></div>
                        <div class="fld"><label>Funding source</label><input v-model="form.funding_source" class="inp" placeholder="e.g. Internal" /></div>
                      </div>
                    </div>
                  </template>

                  <!-- STEP 3 — Costs & details -->
                  <template v-else>
                    <div class="fld" :style="fT(0)">
                      <label>Estimated cost (₹)</label>
                      <div class="cost-grid">
                        <div v-for="c in costFields" :key="c.key" class="cost-cell">
                          <span class="cost-ic"><component :is="c.icon" :size="13" /></span>
                          <input v-model.number="form[c.key]" type="number" min="0" class="inp" :placeholder="c.label" />
                        </div>
                      </div>
                      <div class="cost-total"><span>Estimated total</span><b class="trv-mono">{{ fmtINR(estTotal) }}</b></div>
                    </div>

                    <div v-if="customFields.length" class="custom" :style="fT(1)">
                      <span class="charge-h"><Sparkles :size="12" /> {{ selectedCategory?.name }} details</span>
                      <div v-for="f in customFields" :key="f.key" class="fld">
                        <label>{{ f.label }} <span v-if="f.required" class="req-star">*</span></label>
                        <textarea v-if="f.type === 'textarea'" v-model="form.details[f.key]" class="inp" rows="2" :placeholder="f.placeholder || ''" />
                        <input v-else-if="f.type === 'number' || f.type === 'currency'" v-model="form.details[f.key]" type="number" class="inp" :placeholder="f.placeholder || ''" />
                        <HrDatePicker v-else-if="f.type === 'date'" v-model="form.details[f.key]" />
                        <HrSelect v-else-if="f.type === 'select'" v-model="form.details[f.key]" :options="(f.options || []).map(o => ({ value: o, label: o }))" :placeholder="f.placeholder || 'Select…'" />
                        <input v-else v-model="form.details[f.key]" class="inp" :placeholder="f.placeholder || ''" />
                      </div>
                    </div>

                    <div class="finale" :style="fT(2)">
                      <component :is="valid ? CircleCheckBig : OctagonAlert" :size="16" :class="valid ? 'ok' : 'warn'" />
                      <p>{{ valid ? (isEdit ? 'Ready to save your changes to this request.' : 'Ready for departure — this request will land fully approved and booking-ready.') : 'Complete the required fields to continue.' }}</p>
                    </div>
                  </template>
                </Motion>
              </Presence>
            </div>

            <!-- ░░ live preview ░░ -->
            <div class="ntr-preview">
              <span class="prev-eyebrow trv-mono">LIVE BOARDING PASS</span>
              <div class="prev-pass" :class="{ ready: valid }">
                <span class="prev-spine" />
                <span class="prev-glow" aria-hidden="true" />
                <div class="prev-top">
                  <span class="trv-mono prev-ref">{{ previewRef }}</span>
                  <span class="prev-stamp" :class="{ ready: valid }">{{ stampText }}</span>
                </div>
                <div class="prev-route">
                  <div class="pr-end"><span class="pr-code trv-mono">{{ code(envelope.from) }}</span><span class="pr-place">{{ envelope.from || 'Origin' }}</span></div>
                  <div class="pr-path"><span class="pr-line" /><Plane :size="14" class="pr-plane" /><span class="pr-line" /></div>
                  <div class="pr-end right"><span class="pr-code trv-mono">{{ code(envelope.to) }}</span><span class="pr-place">{{ envelope.to || 'Destination' }}</span></div>
                </div>
                <div v-if="form.trip_type === 'MULTI_CITY' && multiStops.length > 2" class="prev-stops trv-mono">{{ multiStops.join('  ›  ') }}</div>
                <div class="prev-meta">
                  <div><span>Traveller</span><b>{{ travellerName }}</b></div>
                  <div><span>Type</span><b>{{ form.travel_type || '—' }}</b></div>
                  <div><span>Days</span><b>{{ numDays }}</b></div>
                  <div><span>Tier</span><b>{{ cityLabel }}</b></div>
                </div>
                <div class="prev-req">
                  <span class="prq trip"><component :is="tripMeta.icon" :size="11" /> {{ tripMeta.label }}<template v-if="form.trip_type === 'MULTI_CITY'"> · {{ form.legs.length }} legs</template></span>
                  <span v-for="r in activeReqs" :key="r.key" class="prq"><component :is="r.icon" :size="11" /> {{ r.label }}</span>
                  <span v-if="!activeReqs.length" class="prq muted">No logistics flagged yet</span>
                </div>
                <div class="prev-foot">
                  <span class="prev-pri" :style="{ color: priHex }">{{ priLabel }} priority</span>
                  <span class="prev-total trv-mono">{{ fmtINR(estTotal) }}</span>
                </div>
              </div>
              <p class="prev-note">{{ isEdit ? 'Edits save in place — the approval state is preserved.' : 'Admin-raised requests land fully approved, ready for booking & DA.' }}</p>
            </div>
          </div>

          <!-- footer -->
          <footer class="ntr-foot">
            <button v-if="step > 0" class="btn ghost" @click="prev"><ChevronLeft :size="15" /> Back</button>
            <button v-else class="btn ghost" @click="$emit('close')">Cancel</button>
            <div class="foot-right">
              <span class="foot-hint" v-if="!stepValid">{{ stepHint }}</span>
              <Motion v-if="step < STEPS.length - 1" as="button" class="btn primary" :disabled="!stepValid"
                :whileHover="stepValid ? { y: -2 } : {}" :whileTap="stepValid ? { scale: 0.97 } : {}" @click="next">
                Continue <ChevronRight :size="15" />
              </Motion>
              <Motion v-else as="button" class="btn primary" :disabled="!valid || busy"
                :whileHover="(valid && !busy) ? { y: -2 } : {}" :whileTap="(valid && !busy) ? { scale: 0.97 } : {}" @click="save">
                <Loader2 v-if="busy" :size="15" class="spin" /><component v-else :is="isEdit ? Check : Plane" :size="15" />
                {{ isEdit ? 'Save changes' : 'Create request' }}
              </Motion>
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
  X, Plane, Loader2, Hotel, TrainFront, Car, Wallet, Check, ChevronLeft, ChevronRight,
  UserRound, Building2, Sparkles, CircleCheckBig, OctagonAlert, Compass, Route, Banknote,
  Plus, Trash2, ArrowRight, AlertTriangle,
} from 'lucide-vue-next'
import HrSelect from '@/components/hr/forms/HrSelect.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import { selectableEmployees } from '@/utils/hr/employable'
import { useToast } from 'vue-toastification'
import {
  fmtINR, airportCode, errText, adminCreateRequest, updateRequest,
  fetchEmployeesLite, fetchCategories, fetchProjectsLite,
  TRAVEL_TYPES, CITY_CATEGORIES, PRIORITIES, TRIP_TYPES, LEG_MODES,
} from '@/composables/useTravel'

const props = defineProps({ open: Boolean, editRequest: { type: Object, default: null } })
const emit = defineEmits(['close', 'saved'])
const toast = useToast()

const STEPS = [
  { key: 'who', label: 'Traveller', icon: UserRound },
  { key: 'route', label: 'Route', icon: Route },
  { key: 'cost', label: 'Costs', icon: Banknote },
]

const isEdit = computed(() => !!props.editRequest)
const step = ref(0)
const dir = ref(1)
const maxReached = ref(0)
const busy = ref(false)
const employees = ref([])
const categories = ref([])
const projects = ref([])

const blank = () => ({
  employee_id: null, travel_type: 'Official Tour', category_id: null, priority: 'NORMAL',
  purpose: '', trip_type: 'ROUND_TRIP', legs: [], from_location: '', to_location: '', to_city_category: 'TIER_2',
  departure_date: '', return_date: '',
  project_id: null, cost_center: '', budget_head: '', funding_source: '',
  est_travel_cost: 0, est_accommodation_cost: 0, est_local_cost: 0, est_food_cost: 0, est_misc_cost: 0,
  flight_required: false, train_required: false, hotel_required: false,
  local_transport_required: false, advance_required: false,
  details: {},
})
const form = reactive(blank())

const reqToggles = [
  { key: 'flight_required', label: 'Flight', icon: Plane },
  { key: 'train_required', label: 'Train', icon: TrainFront },
  { key: 'hotel_required', label: 'Hotel', icon: Hotel },
  { key: 'local_transport_required', label: 'Local transport', icon: Car },
  { key: 'advance_required', label: 'Advance', icon: Wallet },
]
const costFields = [
  { key: 'est_travel_cost', label: 'Travel', icon: Plane },
  { key: 'est_accommodation_cost', label: 'Hotel', icon: Hotel },
  { key: 'est_local_cost', label: 'Local', icon: Car },
  { key: 'est_food_cost', label: 'Food', icon: Compass },
  { key: 'est_misc_cost', label: 'Misc', icon: Wallet },
]

const fT = (i) => ({ animation: `trv-fade-up 0.4s ${0.05 + i * 0.06}s var(--trv-spring) backwards` })

const load = async () => {
  const [emps, cats, projs] = await Promise.all([
    fetchEmployeesLite().catch(() => ({ items: [] })),
    fetchCategories({ limit: 100 }).catch(() => ({ items: [] })),
    fetchProjectsLite().catch(() => ({ items: [] })),
  ])
  employees.value = emps.items || emps.employees || []
  categories.value = (cats.items || []).filter(c => c.is_active)
  projects.value = projs.items || projs.projects || []
}

const prefill = (r) => {
  Object.assign(form, blank())
  if (!r) return
  const keys = ['employee_id', 'travel_type', 'category_id', 'priority', 'purpose', 'trip_type', 'from_location',
    'to_location', 'to_city_category', 'departure_date', 'return_date', 'project_id', 'cost_center',
    'budget_head', 'funding_source', 'flight_required', 'train_required', 'hotel_required',
    'local_transport_required', 'advance_required', 'est_travel_cost', 'est_accommodation_cost',
    'est_local_cost', 'est_food_cost', 'est_misc_cost']
  keys.forEach(k => { if (r[k] !== undefined && r[k] !== null) form[k] = r[k] })
  form.trip_type = String(r.trip_type || 'ROUND_TRIP').toUpperCase()
  form.legs = (form.trip_type === 'MULTI_CITY' && Array.isArray(r.itinerary))
    ? r.itinerary.map(l => ({ from_location: l.from_location || '', to_location: l.to_location || '', departure_date: l.departure_date || '', mode: String(l.mode || 'FLIGHT').toUpperCase() }))
    : []
  form.details = { ...(r.details || {}) }
}

watch(() => props.open, (v) => {
  if (!v) return
  step.value = 0; dir.value = 1; maxReached.value = 0
  prefill(props.editRequest)
  load()
})

// Keep ON_NOTICE (a trip before their last day is fine; the backend caps by
// date) but drop the fully-separated — they can't be sent on a new trip.
const selectableEmps = computed(() => selectableEmployees(employees.value, 'not-separated'))
const hiddenEmpCount = computed(() => (employees.value?.length || 0) - selectableEmps.value.length)
const empOptions = computed(() => selectableEmps.value.map(e => ({
  value: e.id, label: `${e.full_name || e.name || 'Employee'} · ${e.employee_code || e.employee_id || ''}`.trim(),
})))
const typeOptions = TRAVEL_TYPES.map(t => ({ value: t.key, label: t.key, icon: t.icon }))
const catOptions = computed(() => [{ value: null, label: '— none —' }, ...categories.value.map(c => ({ value: c.id, label: c.name }))])
const projectOptions = computed(() => [{ value: null, label: 'No project' }, ...projects.value.map(p => ({ value: p.id, label: p.name }))])

const selectedCategory = computed(() => categories.value.find(c => c.id === form.category_id) || null)
const customFields = computed(() => selectedCategory.value?.field_schema || [])
const onCategoryChange = () => {
  // keep only keys defined by the new category schema
  const allowed = new Set((selectedCategory.value?.field_schema || []).map(f => f.key))
  const next = {}
  Object.keys(form.details).forEach(k => { if (allowed.has(k)) next[k] = form.details[k] })
  form.details = next
  // honour the category's default travel type (when it maps to a known type)
  const dft = selectedCategory.value?.default_travel_type
  if (dft && TRAVEL_TYPES.some(t => t.key === dft)) form.travel_type = dft
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
const roadLegExists = computed(() => form.trip_type === 'MULTI_CITY'
  && form.legs.some(l => ['BUS', 'TAXI', 'RENTAL'].includes(String(l.mode || '').toUpperCase())))
const syncMultiCityFlags = () => {
  if (form.trip_type !== 'MULTI_CITY') return
  const modes = new Set(form.legs.map(l => String(l.mode || 'FLIGHT').toUpperCase()))
  form.flight_required = modes.has('FLIGHT')
  form.train_required = modes.has('TRAIN')
  // A road leg implies local transport, but never auto-clear the user's in-city choice.
  if (modes.has('BUS') || modes.has('TAXI') || modes.has('RENTAL')) form.local_transport_required = true
}
const setLegMode = (i, mode) => { if (form.legs[i]) { form.legs[i].mode = mode; syncMultiCityFlags() } }
const toggleAdminNeed = (key) => {
  if (key === 'local_transport_required' && roadLegExists.value) return
  form[key] = !form[key]
}
watch(() => form.legs, syncMultiCityFlags, { deep: true })
// Multi-city sets inter-city transport per leg; Local transport (in-city), Hotel
// and Advance remain trip-level toggles.
const visibleReqToggles = computed(() => form.trip_type === 'MULTI_CITY'
  ? reqToggles.filter(r => ['local_transport_required', 'hotel_required', 'advance_required'].includes(r.key))
  : reqToggles)
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
const tripMeta = computed(() => TRIP_TYPES.find(t => t.key === form.trip_type) || TRIP_TYPES[1])
const multiStops = computed(() => {
  if (form.trip_type !== 'MULTI_CITY' || !form.legs.length) return []
  return [form.legs[0].from_location, ...form.legs.map(l => l.to_location)].filter(Boolean).map(s => airportCode(s))
})

const code = (l) => airportCode(l)
const estTotal = computed(() => costFields.reduce((a, c) => a + (Number(form[c.key]) || 0), 0))
const numDays = computed(() => {
  const e = envelope.value
  if (!e.dep) return '—'
  if (form.trip_type === 'ONE_WAY') return 1
  if (!e.ret) return '—'
  const d = (new Date(e.ret) - new Date(e.dep)) / 86400000
  return d >= 0 ? d + 1 : '—'
})
const cityLabel = computed(() => CITY_CATEGORIES.find(c => c.key === form.to_city_category)?.label || '—')
const priMeta = computed(() => PRIORITIES.find(p => p.key === form.priority) || PRIORITIES[1])
const priLabel = computed(() => priMeta.value.label)
const priHex = computed(() => priMeta.value.hex)
const travellerName = computed(() => {
  if (isEdit.value) return props.editRequest?.employee_name || '—'
  const e = employees.value.find(x => x.id === form.employee_id)
  return e ? (e.full_name || e.name) : '—'
})
const activeReqs = computed(() => reqToggles.filter(r => form[r.key]))
const previewRef = computed(() => isEdit.value ? props.editRequest.travel_reference_number : 'TR-•• ••••••')
const stampText = computed(() => isEdit.value ? 'EDIT' : (valid.value ? 'READY' : 'DRAFT'))

// validation
const step1Valid = computed(() => (isEdit.value || !!form.employee_id) && !!form.travel_type && form.purpose.trim().length >= 3)
const step2Valid = computed(() => {
  if (form.trip_type === 'MULTI_CITY') return legsComplete.value && !legDateError.value
  const baseOk = !!(form.from_location.trim() && form.to_location.trim() && form.departure_date)
  if (form.trip_type === 'ONE_WAY') return baseOk
  return baseOk && !!form.return_date && new Date(form.return_date) >= new Date(form.departure_date)
})
const customValid = computed(() => customFields.value.every(f => !f.required || (form.details[f.key] !== undefined && String(form.details[f.key]).trim() !== '')))
const step3Valid = computed(() => customValid.value)
const valid = computed(() => step1Valid.value && step2Valid.value && step3Valid.value)

const stepValid = computed(() => (step.value === 0 ? step1Valid.value : step.value === 1 ? step2Valid.value : step3Valid.value))
const stepHint = computed(() => {
  if (step.value === 0) return !form.purpose.trim() ? 'Add a purpose' : 'Pick traveller & type'
  if (step.value === 1) return 'Set route & dates'
  return 'Fill required details'
})
const progress = computed(() => ((step.value + (stepValid.value ? 1 : 0.4)) / STEPS.length) * 100)

const next = () => { if (!stepValid.value) return; dir.value = 1; step.value = Math.min(STEPS.length - 1, step.value + 1); maxReached.value = Math.max(maxReached.value, step.value) }
const prev = () => { dir.value = -1; step.value = Math.max(0, step.value - 1) }

const save = async () => {
  if (!valid.value) return
  busy.value = true
  try {
    const { legs, ...rest } = form
    const e = envelope.value
    const payload = {
      ...rest,
      trip_type: form.trip_type,
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
      delete payload.employee_id
      await updateRequest(props.editRequest.id, payload)
      toast.success('Travel request updated')
    } else {
      await adminCreateRequest(payload)
      toast.success('Travel request created · ready for booking')
    }
    emit('saved'); emit('close')
  } catch (e) { toast.error(errText(e, 'Could not save request')) }
  finally { busy.value = false }
}
</script>

<style scoped>
.ntr-overlay { position: fixed; inset: 0; z-index: 1440; display: grid; place-items: center; padding: 18px; background: rgba(6,5,4,0.64); backdrop-filter: blur(9px); }
.ntr { position: relative; width: min(980px, 97vw); max-height: 94vh; overflow: hidden; display: flex; flex-direction: column;
  border-radius: 24px; background: var(--trv-surface-elevated); border: 1px solid var(--trv-border-strong); box-shadow: var(--trv-shadow); }
.ntr-aura { position: absolute; inset: -40% 40% 60% -10%; pointer-events: none; background: radial-gradient(55% 70% at 25% 0%, rgba(251,191,36,0.16), transparent 70%); animation: trv-aura-drift 10s ease-in-out infinite; }

.ntr-head { position: relative; display: flex; align-items: center; justify-content: space-between; padding: 18px 22px 14px; }
.ntr-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--trv-amber); }
.ntr-head h3 { font-size: 19px; font-weight: 850; margin: 5px 0 0; color: var(--trv-text); }
.ntr-x { background: var(--trv-panel); border: 1px solid var(--trv-border); border-radius: 9px; padding: 6px; color: var(--trv-text-dim); cursor: pointer; }
.ntr-x:hover { color: var(--trv-text); }

/* step rail */
.ntr-steps { position: relative; padding: 0 22px 14px; }
.step-track { height: 3px; border-radius: 999px; background: var(--trv-steel-soft); overflow: hidden; margin-bottom: 12px; }
.step-fill { display: block; height: 100%; border-radius: 999px; background: var(--trv-grad-hero); transition: width 0.5s var(--trv-spring); }
.step-dots { display: flex; gap: 8px; }
.step-dot { flex: 1; display: flex; align-items: center; gap: 8px; padding: 7px 10px; border-radius: 11px; cursor: default; background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-muted); transition: all 0.25s; }
.step-dot.reachable { cursor: pointer; }
.step-dot.on { border-color: var(--trv-amber-border); background: var(--trv-amber-soft); color: var(--trv-amber); }
.step-dot.done { color: var(--trv-st-approved); border-color: color-mix(in srgb, var(--trv-st-approved) 30%, transparent); }
.dot-ix { display: grid; place-items: center; width: 24px; height: 24px; border-radius: 50%; background: var(--trv-surface-elevated); border: 1px solid currentColor; flex-shrink: 0; }
.dot-lab { font-size: 12px; font-weight: 700; }

/* body */
.ntr-body { position: relative; display: grid; grid-template-columns: 1.4fr 0.85fr; gap: 0; overflow: hidden; flex: 1; min-height: 0; }
.ntr-form { padding: 16px 22px; overflow-y: auto; }
.step-pane { display: flex; flex-direction: column; gap: 13px; }
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.fld label { display: block; font-size: 11px; font-weight: 650; color: var(--trv-text-muted); margin-bottom: 5px; }
.emp-note { display: block; margin-top: 5px; font-size: 10.5px; color: var(--trv-text-dim); opacity: 0.85; }
.req-star { color: var(--trv-ember); }
.inp { width: 100%; padding: 9px 11px; border-radius: 9px; font-size: 13px; font-family: inherit; resize: vertical; background: rgba(0,0,0,0.3); border: 1px solid var(--trv-border); color: var(--trv-text); transition: border-color 0.2s, box-shadow 0.2s; }
.inp:focus { outline: none; border-color: var(--trv-amber-border); box-shadow: 0 0 0 3px rgba(251,191,36,0.1); }
.locked-emp { display: inline-flex; align-items: center; gap: 7px; padding: 9px 12px; border-radius: 9px; font-size: 13px; font-weight: 600; color: var(--trv-text); background: var(--trv-panel); border: 1px solid var(--trv-border); }
.locked-emp .lock { font-size: 9px; letter-spacing: 0.1em; text-transform: uppercase; color: var(--trv-text-dim); margin-left: 4px; }

.seg { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 6px; }
.seg-btn { padding: 8px 6px; border-radius: 9px; font-size: 12px; font-weight: 650; cursor: pointer; background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-muted); transition: all 0.2s; }
.seg-btn:hover { color: var(--trv-text-secondary); }
.seg-btn.on { color: var(--sc); border-color: var(--sc); background: color-mix(in srgb, var(--sc) 14%, transparent); }

.reqs { display: flex; flex-wrap: wrap; gap: 6px; }
.req { display: inline-flex; align-items: center; gap: 5px; padding: 8px 12px; border-radius: 9px; cursor: pointer; font-size: 12px; background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-muted); transition: all 0.2s; }
.req.on { color: var(--trv-amber); border-color: var(--trv-amber-border); background: var(--trv-amber-soft); }

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
.lbl-hint { color: var(--trv-text-dim); font-style: normal; font-weight: 500; }
@media (max-width: 600px) { .lm-lbl { display: none; } }
.one-way-note { display: flex; flex-direction: column; }
.ow-pill { display: inline-flex; align-items: center; gap: 6px; padding: 9px 11px; border-radius: 9px; font-size: 12px; color: var(--trv-text-muted); background: var(--trv-steel-soft); border: 1px dashed var(--trv-border); }
.prev-stops { font-size: 10px; color: var(--trv-text-muted); margin: -8px 0 12px; letter-spacing: 0.04em; text-align: center; }
.prq.trip { color: var(--trv-amber-bright); background: color-mix(in srgb, var(--trv-amber) 16%, transparent); border-color: var(--trv-amber-border); }

.charge, .custom { padding: 13px; border-radius: 13px; background: var(--trv-panel); border: 1px solid var(--trv-border); display: flex; flex-direction: column; gap: 10px; }
.charge-h { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 750; letter-spacing: 0.04em; color: var(--trv-amber); }
.charge-h em { color: var(--trv-text-dim); font-style: normal; font-weight: 500; }

.cost-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px; }
.cost-cell { position: relative; }
.cost-ic { position: absolute; left: 8px; top: 50%; transform: translateY(-50%); color: var(--trv-text-dim); pointer-events: none; }
.cost-cell .inp { padding: 9px 6px 9px 26px; font-size: 12px; }
.cost-total { display: flex; align-items: center; justify-content: space-between; margin-top: 10px; padding: 9px 12px; border-radius: 10px; background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); }
.cost-total span { font-size: 11px; color: var(--trv-text-muted); }
.cost-total b { font-size: 16px; color: var(--trv-amber-bright); }

.finale { display: flex; align-items: center; gap: 10px; padding: 13px; border-radius: 13px; background: var(--trv-panel); border: 1px solid var(--trv-border); }
.finale .ok { color: var(--trv-st-approved); }
.finale .warn { color: var(--trv-st-returned); }
.finale p { margin: 0; font-size: 12.5px; color: var(--trv-text-secondary); }

/* preview */
.ntr-preview { padding: 16px 18px; background: var(--trv-panel); border-left: 1px solid var(--trv-border); display: flex; flex-direction: column; gap: 12px; overflow-y: auto; }
.prev-eyebrow { font-size: 9px; letter-spacing: 0.18em; color: var(--trv-text-dim); }
.prev-pass { position: relative; border-radius: 16px; padding: 16px; background: var(--trv-pass); border: 1px solid var(--trv-pass-edge); overflow: hidden; transition: border-color 0.4s; }
.prev-pass.ready { border-color: var(--trv-amber-border); }
.prev-spine { position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--trv-grad-hero); }
.prev-glow { position: absolute; inset: 0; opacity: 0; background: radial-gradient(120% 80% at 0% 0%, rgba(251,191,36,0.14), transparent 60%); transition: opacity 0.5s; }
.prev-pass.ready .prev-glow { opacity: 1; }
.prev-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
.prev-ref { font-size: 11px; color: var(--trv-text-muted); }
.prev-stamp { font-size: 10px; font-weight: 800; letter-spacing: 0.08em; color: var(--trv-text-dim); padding: 2px 8px; border-radius: 6px; border: 1px solid var(--trv-border-strong); transition: all 0.3s; }
.prev-stamp.ready { color: var(--trv-amber); border-color: var(--trv-amber-border); background: var(--trv-amber-soft); }
.prev-route { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 8px; margin-bottom: 14px; }
.pr-end { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.pr-end.right { text-align: right; align-items: flex-end; }
.pr-code { font-size: 24px; font-weight: 850; color: var(--trv-text); line-height: 1; }
.pr-place { font-size: 9.5px; color: var(--trv-text-dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 92px; }
.pr-path { display: flex; align-items: center; gap: 3px; color: var(--trv-amber); }
.pr-line { width: 14px; height: 1.5px; background: repeating-linear-gradient(90deg, currentColor 0 4px, transparent 4px 8px); opacity: 0.55; }
.prev-meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 10px; margin-bottom: 12px; }
.prev-meta div { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.prev-meta span { font-size: 8.5px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--trv-text-dim); }
.prev-meta b { font-size: 12.5px; color: var(--trv-text-secondary); font-weight: 650; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.prev-req { display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 12px; }
.prq { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 600; padding: 3px 7px; border-radius: 6px; color: var(--trv-amber); background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); }
.prq.muted { color: var(--trv-text-dim); background: transparent; border-color: var(--trv-border); }
.prev-foot { display: flex; align-items: center; justify-content: space-between; padding-top: 11px; border-top: 1px dashed var(--trv-pass-edge); }
.prev-pri { font-size: 10px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; }
.prev-total { font-size: 17px; font-weight: 850; color: var(--trv-amber-bright); }
.prev-note { font-size: 11px; color: var(--trv-text-dim); margin: 0; line-height: 1.5; }

/* footer */
.ntr-foot { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 14px 22px; border-top: 1px solid var(--trv-border); }
.foot-right { display: flex; align-items: center; gap: 12px; }
.foot-hint { font-size: 11px; color: var(--trv-text-dim); }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 18px; border-radius: 11px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
.btn.ghost { background: transparent; border-color: var(--trv-border-strong); color: var(--trv-text-secondary); }
.btn.primary { background: var(--trv-grad-hero); color: #1a1205; box-shadow: var(--trv-amber-glow); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
.spin { animation: ntr-spin 0.8s linear infinite; }

@keyframes ntr-spin { to { transform: rotate(360deg); } }

@media (max-width: 760px) {
  .ntr-body { grid-template-columns: 1fr; }
  .ntr-preview { border-left: none; border-top: 1px solid var(--trv-border); order: -1; }
  .cost-grid { grid-template-columns: repeat(2, 1fr); }
  .step-dots .dot-lab { display: none; }
}
[data-theme="light"] .ntr-overlay { background: rgba(60,40,15,0.32); }
[data-theme="light"] .inp { background: rgba(255,250,240,0.72); }
[data-theme="light"] .dot-ix { background: var(--trv-surface); }
@media (prefers-reduced-motion: reduce) {
  .ntr-aura { animation: none; }
  .step-pane, [style*="trv-fade-up"] { animation: none !important; }
  .spin { animation: none; }
}
</style>
