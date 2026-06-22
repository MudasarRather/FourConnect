<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" as="div" class="bm-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.25 }" @click.self="$emit('close')">
        <Motion as="div" class="bm"
          :initial="{ opacity: 0, y: 24, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 16, scale: 0.97 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
          <header class="bm-head">
            <div>
              <span class="bm-eyebrow"><Ticket :size="12" /> {{ editing ? 'Edit segment' : 'New segment' }}</span>
              <h3 class="trv-mono">{{ requestRef || pickedRef || 'Select a tour' }}</h3>
            </div>
            <button class="bm-x" @click="$emit('close')"><X :size="18" /></button>
          </header>

          <div class="bm-body">
            <!-- standalone tour picker (global New booking) -->
            <div v-if="needsTourPick" class="fld">
              <label>Tour <span class="req">*</span></label>
              <HrSelect v-model="selectedTour" :options="tours" placeholder="Pick an approved tour…" searchable />
            </div>

            <!-- ░░ live boarding-pass preview ░░ -->
            <div class="bm-pass" :style="{ '--c': typeMeta.hex }">
              <span class="bp-perf left" /><span class="bp-perf right" />
              <div class="bp-top">
                <span class="bp-type"><component :is="typeMeta.icon" :size="14" /> {{ typeMeta.label }}</span>
                <span class="bp-status" :style="{ '--s': statusHex }">{{ statusLabel }}</span>
              </div>
              <div class="bp-mid">
                <template v-if="form.booking_type === 'HOTEL'">
                  <span class="bp-line">{{ form.hotel_name || 'Hotel name' }}</span>
                  <span class="bp-sub trv-mono">{{ form.check_in ? fmtDate(form.check_in) : '—' }} → {{ form.check_out ? fmtDate(form.check_out) : '—' }}<template v-if="nights"> · {{ nights }}n</template></span>
                </template>
                <template v-else-if="['TAXI','BUS','RENTAL'].includes(form.booking_type)">
                  <span class="bp-line trv-mono">{{ form.from_place || '—' }} <ArrowRight :size="13" /> {{ form.to_place || '—' }}</span>
                  <span class="bp-sub trv-mono">{{ form.travel_date ? fmtDate(form.travel_date) : 'Travel date —' }}</span>
                </template>
                <template v-else>
                  <span class="bp-line trv-mono">{{ flightLabel }}</span>
                  <span class="bp-sub trv-mono">{{ form.pnr_number ? 'PNR ' + form.pnr_number : 'PNR —' }}<template v-if="form.seat_number"> · {{ form.seat_number }}</template> · {{ form.travel_date ? fmtDate(form.travel_date) : '—' }}</span>
                </template>
              </div>
              <div class="bp-bottom">
                <span class="bp-vendor">{{ form.vendor || 'Vendor —' }}</span>
                <span class="bp-cost trv-mono">{{ fmtINR(total) }}</span>
              </div>
              <span class="bp-barcode" aria-hidden="true" />
            </div>

            <!-- type selector -->
            <div class="fld"><label>Segment type</label>
              <div class="seg">
                <button v-for="t in BOOKING_TYPES" :key="t.key" class="seg-btn" :class="{ on: form.booking_type === t.key }"
                  :style="{ '--c': t.hex }" :disabled="editing" @click="form.booking_type = t.key">
                  <component :is="t.icon" :size="14" /> {{ t.label }}
                </button>
              </div>
            </div>

            <div class="row2">
              <div class="fld"><label>Vendor</label><input v-model="form.vendor" class="inp" placeholder="e.g. IndiGo / Taj" /></div>
              <div class="fld"><label>Status</label><HrSelect v-model="form.status" :options="statusOptions" /></div>
            </div>

            <div v-if="['FLIGHT','TRAIN'].includes(form.booking_type)" class="grp">
              <div class="row2">
                <div class="fld"><label>PNR</label><input v-model="form.pnr_number" class="inp" /></div>
                <div class="fld"><label>{{ form.booking_type === 'FLIGHT' ? 'Airline' : 'Train no.' }}</label>
                  <input v-model="form[form.booking_type === 'FLIGHT' ? 'airline' : 'train_number']" class="inp" /></div>
              </div>
              <div class="row2">
                <div class="fld"><label>Seat</label><input v-model="form.seat_number" class="inp" placeholder="Seat / coach" /></div>
                <div class="fld"><label>Travel date</label><HrDatePicker v-model="form.travel_date" /></div>
              </div>
            </div>

            <div v-else-if="form.booking_type === 'HOTEL'" class="grp">
              <div class="fld"><label>Hotel name</label><input v-model="form.hotel_name" class="inp" /></div>
              <div class="row2">
                <div class="fld"><label>Check-in</label><HrDatePicker v-model="form.check_in" /></div>
                <div class="fld"><label>Check-out</label><HrDatePicker v-model="form.check_out" :min="form.check_in" /></div>
              </div>
            </div>

            <div v-else class="grp">
              <div class="row2">
                <div class="fld"><label>From</label><input v-model="form.from_place" class="inp" /></div>
                <div class="fld"><label>To</label><input v-model="form.to_place" class="inp" /></div>
              </div>
              <div class="fld"><label>Travel date</label><HrDatePicker v-model="form.travel_date" /></div>
            </div>

            <div class="row2">
              <div class="fld"><label>Cost (₹)</label><input v-model.number="form.booking_cost" type="number" min="0" class="inp" /></div>
              <div class="fld"><label>Taxes (₹)</label><input v-model.number="form.taxes" type="number" min="0" class="inp" /></div>
            </div>
            <div class="bm-total">Total <b class="trv-mono">{{ fmtINR(total) }}</b></div>
          </div>

          <footer class="bm-foot">
            <button v-if="editing" class="btn del" :class="{ armed: confirmDel }" :disabled="busy" @click="onDelete">
              <Trash2 :size="14" /> {{ confirmDel ? 'Confirm remove' : 'Remove' }}
            </button>
            <span class="bm-spacer" />
            <button class="btn ghost" @click="$emit('close')">Cancel</button>
            <Motion as="button" class="btn primary" :disabled="busy || (!editing && !effectiveReqId)"
              :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }" @click="save">
              <Loader2 v-if="busy" :size="15" class="spin" /><Ticket v-else :size="15" /> {{ editing ? 'Save segment' : 'Add segment' }}
            </Motion>
          </footer>
        </Motion>
      </Motion>
    </Presence>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { X, Ticket, Loader2, Trash2, ArrowRight } from 'lucide-vue-next'
import HrSelect from '@/components/hr/forms/HrSelect.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import { useToast } from 'vue-toastification'
import {
  fmtINR, fmtDate, errText, createBooking, updateBooking, deleteBooking,
  BOOKING_TYPES, BOOKING_STATUS, bookingMeta,
} from '@/composables/useTravel'

const props = defineProps({
  open: Boolean, requestId: { type: String, default: null }, requestRef: { type: String, default: '' },
  booking: { type: Object, default: null }, tours: { type: Array, default: () => [] },
})
const emit = defineEmits(['close', 'saved'])
const toast = useToast()

const editing = computed(() => !!props.booking)
const needsTourPick = computed(() => !editing.value && !props.requestId)
const blank = () => ({ booking_type: 'FLIGHT', vendor: '', status: 'BOOKED', pnr_number: '', airline: '', train_number: '', seat_number: '', from_place: '', to_place: '', hotel_name: '', travel_date: '', check_in: '', check_out: '', booking_cost: 0, taxes: 0 })
const form = reactive(blank())
const busy = ref(false)
const confirmDel = ref(false)
const selectedTour = ref(null)
const statusOptions = BOOKING_STATUS.map(s => ({ value: s.key, label: s.label }))
const STATUS_MAP = Object.fromEntries(BOOKING_STATUS.map(s => [s.key, s]))

watch(() => props.open, (v) => {
  if (v) { Object.assign(form, blank()); if (props.booking) Object.assign(form, props.booking); confirmDel.value = false; selectedTour.value = null }
})
watch(() => form.booking_type, () => { confirmDel.value = false })

const effectiveReqId = computed(() => props.requestId || selectedTour.value)
const pickedRef = computed(() => props.tours.find(t => t.value === selectedTour.value)?.label?.split(' · ')[0] || '')
const typeMeta = computed(() => bookingMeta(form.booking_type))
const statusLabel = computed(() => STATUS_MAP[form.status]?.label || form.status)
const statusHex = computed(() => STATUS_MAP[form.status]?.hex || '#9ca3af')
const total = computed(() => (Number(form.booking_cost) || 0) + (Number(form.taxes) || 0))
const nights = computed(() => {
  if (!form.check_in || !form.check_out) return 0
  const d = (new Date(form.check_out) - new Date(form.check_in)) / 86400000
  return d > 0 ? Math.round(d) : 0
})
const flightLabel = computed(() => {
  const carrier = form.booking_type === 'FLIGHT' ? (form.airline || 'Airline —') : (form.train_number ? 'Train ' + form.train_number : 'Train —')
  return carrier
})

// Empty <HrDatePicker> values come back as '' — Pydantic rejects '' for a date
// ("input is too short"), so blank dates must be sent as null.
const DATE_FIELDS = ['travel_date', 'check_in', 'check_out']
const buildPayload = () => {
  const p = { ...form }
  for (const k of DATE_FIELDS) if (k in p && !p[k]) p[k] = null
  return p
}

const save = async () => {
  const reqId = effectiveReqId.value
  if (!editing.value && !reqId) { toast.error('Pick a tour first'); return }
  busy.value = true
  try {
    if (editing.value) await updateBooking(props.booking.id, buildPayload())
    else await createBooking({ ...buildPayload(), travel_request_id: reqId })
    toast.success(editing.value ? 'Segment updated' : 'Segment added to itinerary')
    emit('saved'); emit('close')
  } catch (e) { toast.error(errText(e, 'Could not save segment')) }
  finally { busy.value = false }
}

const onDelete = async () => {
  if (!confirmDel.value) { confirmDel.value = true; return }
  busy.value = true
  try {
    await deleteBooking(props.booking.id)
    toast.success('Segment removed from itinerary')
    emit('saved'); emit('close')
  } catch (e) { toast.error(errText(e, 'Could not remove segment')) }
  finally { busy.value = false; confirmDel.value = false }
}
</script>

<style scoped>
.bm-overlay { position: fixed; inset: 0; z-index: 1440; display: grid; place-items: center; padding: 18px; background: rgba(6,5,4,0.62); backdrop-filter: blur(8px); }
.bm { width: min(560px, 96vw); max-height: 92vh; overflow: hidden; display: flex; flex-direction: column; border-radius: 20px; background: var(--trv-surface-elevated); border: 1px solid var(--trv-border-strong); box-shadow: var(--trv-shadow); }
.bm-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px; border-bottom: 1px solid var(--trv-border); }
.bm-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--trv-amber); }
.bm-head h3 { font-size: 14px; margin: 4px 0 0; color: var(--trv-text); }
.bm-x { background: none; border: none; color: var(--trv-text-dim); cursor: pointer; }
.bm-body { padding: 18px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; flex: 1 1 auto; min-height: 0; }
.bm-body > * { flex-shrink: 0; }
.req { color: var(--trv-st-rejected); }

/* live boarding-pass preview */
.bm-pass { position: relative; overflow: hidden; padding: 14px 16px; border-radius: 14px; background: var(--trv-pass);
  border: 1px solid color-mix(in srgb, var(--c) 30%, var(--trv-border)); box-shadow: inset 3px 0 0 var(--c); }
.bp-perf { position: absolute; top: 50%; width: 14px; height: 14px; border-radius: 50%; background: var(--trv-surface-elevated); transform: translateY(-50%); }
.bp-perf.left { left: -7px; } .bp-perf.right { right: -7px; }
.bp-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.bp-type { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 750; color: var(--c); min-width: 0; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.bp-status { flex-shrink: 0; white-space: nowrap; font-size: 9.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; padding: 2px 8px; border-radius: 999px; color: var(--s); background: color-mix(in srgb, var(--s) 14%, transparent); border: 1px solid color-mix(in srgb, var(--s) 32%, transparent); }
.bp-mid { display: flex; flex-direction: column; gap: 2px; margin: 9px 0; }
.bp-line { display: inline-flex; align-items: center; gap: 6px; font-size: 15px; font-weight: 800; color: var(--trv-text); }
.bp-sub { font-size: 11px; color: var(--trv-text-muted); }
.bp-bottom { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-top: 9px; border-top: 1px dashed color-mix(in srgb, var(--c) 28%, var(--trv-border)); }
.bp-vendor { font-size: 12px; color: var(--trv-text-secondary); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bp-cost { font-size: 15px; font-weight: 800; color: var(--trv-amber); flex-shrink: 0; }
.bp-barcode { display: block; height: 13px; margin-top: 11px; border-radius: 3px; opacity: 0.4;
  background: repeating-linear-gradient(90deg, var(--trv-barcode) 0 1.5px, transparent 1.5px 4px); }

.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.grp { display: flex; flex-direction: column; gap: 12px; padding: 12px; border-radius: 12px; background: var(--trv-panel); border: 1px solid var(--trv-border); }
.fld label { display: block; font-size: 11px; font-weight: 650; color: var(--trv-text-muted); margin-bottom: 5px; }
.inp { width: 100%; padding: 9px 11px; border-radius: 9px; font-size: 13px; font-family: inherit; background: rgba(0,0,0,0.3); border: 1px solid var(--trv-border); color: var(--trv-text); }
.inp:focus { outline: none; border-color: var(--trv-amber-border); }
.seg { display: flex; flex-wrap: wrap; gap: 6px; }
.seg-btn { display: inline-flex; align-items: center; gap: 5px; padding: 8px 12px; border-radius: 9px; cursor: pointer; font-size: 12px; background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-muted); transition: all 0.2s; }
.seg-btn.on { color: var(--c); border-color: var(--c); background: color-mix(in srgb, var(--c) 12%, transparent); }
.seg-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.bm-total { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; border-radius: 10px; background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); font-size: 13px; color: var(--trv-text-secondary); }
.bm-total b { font-size: 16px; color: var(--trv-amber-bright); }
.bm-foot { display: flex; align-items: center; gap: 10px; padding: 16px 20px; border-top: 1px solid var(--trv-border); }
.bm-spacer { flex: 1; }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 18px; border-radius: 11px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
.btn.ghost { background: transparent; border-color: var(--trv-border-strong); color: var(--trv-text-secondary); }
.btn.primary { background: var(--trv-grad-hero); color: #1a1205; }
.btn.del { background: transparent; border-color: color-mix(in srgb, var(--trv-st-rejected) 30%, transparent); color: var(--trv-st-rejected); padding: 10px 14px; }
.btn.del.armed { background: var(--trv-st-rejected); color: #fff; border-color: var(--trv-st-rejected); }
.btn:disabled { opacity: 0.5; cursor: not-allowed; }
.spin { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
[data-theme="light"] .bm-overlay { background: rgba(60,40,15,0.3); }
[data-theme="light"] .inp { background: rgba(255,250,240,0.7); }
[data-theme="light"] .bp-perf { background: var(--trv-surface-elevated); }
</style>
