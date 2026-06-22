<template>
  <Teleport to="body">
    <Presence>
      <Motion v-if="open" as="div" class="cm-overlay"
        :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
        :transition="{ duration: 0.25 }" @click.self="$emit('close')">
        <Motion as="div" class="cm"
          :initial="{ opacity: 0, y: 26, scale: 0.97 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :exit="{ opacity: 0, y: 18, scale: 0.97 }" :transition="{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }">
          <span class="cm-aura" aria-hidden="true" />
          <header class="cm-head">
            <div>
              <span class="cm-eyebrow"><Calculator :size="12" /> Per-diem · compute</span>
              <h3>Compute daily allowance</h3>
            </div>
            <button class="cm-x" @click="$emit('close')"><X :size="18" /></button>
          </header>

          <div class="cm-body">
            <div class="cm-form">
              <div class="fld" :style="ft(0)">
                <label>Eligible tour <span class="req">*</span></label>
                <HrSelect v-model="form.request_id" :options="reqOptions" placeholder="Select an approved tour…" searchable @change="onPick" />
                <p v-if="!loading && !reqOptions.length" class="cm-none">No approved tours are awaiting DA. Approve a request first.</p>
              </div>

              <template v-if="selectedReq">
                <div class="cm-tour" :style="ft(1)">
                  <span class="ct-route trv-mono">{{ code(selectedReq.from_location) }} → {{ code(selectedReq.to_location) }}</span>
                  <span class="ct-emp">{{ selectedReq.employee_name }}<template v-if="selectedReq.grade_name"> · {{ selectedReq.grade_name }}</template></span>
                </div>
                <div class="fld" :style="ft(2)">
                  <label>Destination tier</label>
                  <div class="seg">
                    <button v-for="c in CITY_CATEGORIES" :key="c.key" class="seg-btn" :class="{ on: form.city_category === c.key }"
                      :style="{ '--sc': c.hex }" @click="form.city_category = c.key">{{ c.label }}</button>
                  </div>
                </div>
                <div class="row2" :style="ft(3)">
                  <div class="fld"><label>Travel days</label><input v-model.number="form.travel_days" type="number" min="0" class="inp" /></div>
                  <div class="fld">
                    <label>Daily rate override</label>
                    <input v-model.number="form.daily_rate" type="number" min="0" class="inp" :placeholder="autoRate ? `Auto · ₹${autoRate}` : 'Auto (rate card)'" />
                  </div>
                </div>
                <div class="cm-rate-note" :class="{ warn: overridesPolicy }" :style="ft(4)">
                  <component :is="overridesPolicy ? OctagonAlert : rateSource === 'override' ? Pencil : autoRate ? FileBadge : OctagonAlert" :size="13" />
                  <span v-if="overridesPolicy">Your ₹{{ Number(form.daily_rate).toLocaleString('en-IN') }}/day is <b>above the ₹{{ autoRate.toLocaleString('en-IN') }}/day policy rate</b> for {{ cityLabel }}{{ rateGradeNote }} — justify it below.</span>
                  <span v-else-if="rateSource === 'override'">Using your manual rate of ₹{{ Number(form.daily_rate).toLocaleString('en-IN') }}/day (≤ policy).</span>
                  <span v-else-if="autoRate">Auto-resolved ₹{{ autoRate.toLocaleString('en-IN') }}/day from the rate card ({{ cityLabel }}{{ rateGradeNote }}).</span>
                  <span v-else>No rate card entry for {{ cityLabel }}. Set one in <button class="lnk" @click="$emit('go', 'policies')">Policies</button> or enter a manual rate.</span>
                </div>

                <div v-if="overridesPolicy" class="fld cm-ovr" :style="ft(5)">
                  <label class="ovr-lab"><OctagonAlert :size="12" /> Justification for above-policy rate <span class="req">*</span></label>
                  <textarea v-model="form.override_reason" class="inp ta" rows="2"
                    :placeholder="`Why ₹${Number(form.daily_rate).toLocaleString('en-IN')}/day instead of the ₹${autoRate.toLocaleString('en-IN')} policy rate? (recorded in the audit trail)`" />
                </div>
              </template>
            </div>

            <!-- live preview meter -->
            <div class="cm-preview">
              <span class="pv-eyebrow trv-mono">ELIGIBLE DA</span>
              <div class="pv-meter">
                <DaOdometer :value="eligible" class="pv-odo" />
                <div class="pv-calc trv-mono">{{ form.travel_days || 0 }}d × {{ fmtINR(effectiveRate) }}</div>
                <div class="pv-cells">
                  <span v-for="n in pvCells" :key="n" class="pv-cell" :style="{ transitionDelay: (n * 0.03) + 's' }" />
                  <span v-if="pvExtra" class="pv-more">+{{ pvExtra }}</span>
                </div>
                <span class="pv-tier" :style="{ '--c': tierHex }">{{ cityLabel }}</span>
              </div>
              <p class="pv-note">DA lands as <b>COMPUTED</b> — approve it, then it settles to payroll.</p>

              <TravelMoneyMap v-if="selectedReq && Number(selectedReq.est_total_cost) > 0"
                :estimated="Number(selectedReq.est_total_cost)" :items="moneyItems" title="VS APPROVED BUDGET" />
            </div>
          </div>

          <footer class="cm-foot">
            <button class="btn ghost" @click="$emit('close')">Cancel</button>
            <Motion as="button" class="btn primary" :disabled="!valid || busy"
              :whileHover="(valid && !busy) ? { y: -2 } : {}" :whileTap="(valid && !busy) ? { scale: 0.97 } : {}" @click="submit">
              <Loader2 v-if="busy" :size="15" class="spin" /><Calculator v-else :size="15" /> Compute DA
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
import { X, Calculator, Loader2, Pencil, FileBadge, OctagonAlert, Ticket } from 'lucide-vue-next'
import HrSelect from '@/components/hr/forms/HrSelect.vue'
import DaOdometer from '../components/DaOdometer.vue'
import TravelMoneyMap from '../components/TravelMoneyMap.vue'
import { useToast } from 'vue-toastification'
import {
  fmtINR, airportCode, errText, useTravelRequests, computeDa, fetchDaRates, cityMeta, CITY_CATEGORIES,
} from '@/composables/useTravel'

const props = defineProps({ open: Boolean })
const emit = defineEmits(['close', 'computed', 'go'])
const toast = useToast()

const { items, fetchList, setFilters } = useTravelRequests({ limit: 200 })
const rates = ref([])
const loading = ref(false)
const busy = ref(false)

const form = reactive({ request_id: null, city_category: 'TIER_2', travel_days: 0, daily_rate: null, override_reason: '' })
const ELIGIBLE = ['APPROVED', 'IN_PROGRESS', 'COMPLETED']

const load = async () => {
  loading.value = true
  try {
    setFilters({ status: '', limit: 200 })
    await Promise.all([fetchList(), fetchDaRates({}).then(d => { rates.value = d.items || [] }).catch(() => {})])
  } finally { loading.value = false }
}
watch(() => props.open, (v) => {
  if (!v) return
  Object.assign(form, { request_id: null, city_category: 'TIER_2', travel_days: 0, daily_rate: null, override_reason: '' })
  load()
})

const eligibleReqs = computed(() => items.value.filter(r => ELIGIBLE.includes(r.status) && !r.da))
const reqOptions = computed(() => eligibleReqs.value.map(r => ({
  value: r.id, label: `${r.travel_reference_number} · ${r.employee_name || '—'} · ${airportCode(r.from_location)}→${airportCode(r.to_location)}`,
})))
const selectedReq = computed(() => eligibleReqs.value.find(r => r.id === form.request_id) || null)

const onPick = () => {
  const r = selectedReq.value
  if (!r) return
  form.city_category = r.to_city_category || 'TIER_2'
  form.travel_days = Number(r.num_days) || 0
  form.daily_rate = null
  form.override_reason = ''
}

// client-side mirror of backend resolve_da_rate (grade match → null-grade fallback, latest effective)
const today = (() => { const d = new Date(); return d.toISOString().slice(0, 10) })()
const resolveRate = (gradeId, city) => {
  const pool = rates.value.filter(r => r.city_category === city && r.is_active && (!r.effective_date || r.effective_date <= today))
  const pick = (gid) => pool.filter(r => gid ? r.grade_id === gid : !r.grade_id)
    .sort((a, b) => String(b.effective_date || '').localeCompare(String(a.effective_date || '')))[0]
  return (gradeId && pick(gradeId)) || pick(null) || null
}
const autoRate = computed(() => {
  if (!selectedReq.value) return 0
  const row = resolveRate(selectedReq.value.grade_id, form.city_category)
  return row ? Math.round(Number(row.daily_rate)) : 0
})
const rateSource = computed(() => (form.daily_rate != null && form.daily_rate !== '' && Number(form.daily_rate) > 0) ? 'override' : (autoRate.value ? 'auto' : 'none'))
const effectiveRate = computed(() => rateSource.value === 'override' ? Number(form.daily_rate) : autoRate.value)
const rateGradeNote = computed(() => {
  const row = resolveRate(selectedReq.value?.grade_id, form.city_category)
  return row && row.grade_id ? ` · ${selectedReq.value?.grade_name || 'grade'}` : ' · all grades'
})
const eligible = computed(() => Math.round((Number(form.travel_days) || 0) * (Number(effectiveRate.value) || 0)))
const cityLabel = computed(() => cityMeta(form.city_category).label)
const tierHex = computed(() => cityMeta(form.city_category).hex)
const pvCells = computed(() => Math.min(20, Math.max(0, Number(form.travel_days) || 0)))
const pvExtra = computed(() => Math.max(0, (Number(form.travel_days) || 0) - 20))

const code = (l) => airportCode(l)
// A manual rate above the resolved policy rate must be justified (mirrors backend guard).
const overridesPolicy = computed(() => rateSource.value === 'override' && autoRate.value > 0 && Number(form.daily_rate) > autoRate.value)
const valid = computed(() =>
  !!form.request_id && (Number(form.travel_days) || 0) > 0 &&
  (!overridesPolicy.value || !!form.override_reason.trim()))

const moneyItems = computed(() => {
  if (!selectedReq.value) return []
  const est = Number(selectedReq.value.est_total_cost) || 0
  return [
    { label: 'This per-diem DA', value: eligible.value, hex: '#fbbf24', icon: Calculator },
    { label: 'Via booking & bills', value: Math.max(0, est - eligible.value), hex: '#fb923c', icon: Ticket },
  ]
})

const ft = (i) => ({ animation: `trv-fade-up 0.4s ${0.04 + i * 0.06}s var(--trv-spring) backwards` })

const submit = async () => {
  if (!valid.value) return
  busy.value = true
  try {
    const body = { city_category: form.city_category, travel_days: form.travel_days }
    if (form.daily_rate != null && form.daily_rate !== '' && Number(form.daily_rate) > 0) body.daily_rate = Number(form.daily_rate)
    if (overridesPolicy.value && form.override_reason.trim()) body.override_reason = form.override_reason.trim()
    await computeDa(form.request_id, body)
    toast.success('DA computed · ready to approve')
    emit('computed'); emit('close')
  } catch (e) { toast.error(errText(e, 'Could not compute DA')) }
  finally { busy.value = false }
}
</script>

<style scoped>
.cm-overlay { position: fixed; inset: 0; z-index: 1440; display: grid; place-items: center; padding: 18px; background: rgba(6,5,4,0.64); backdrop-filter: blur(9px); }
.cm { position: relative; width: min(820px, 97vw); max-height: 94vh; overflow: hidden; display: flex; flex-direction: column;
  border-radius: 22px; background: var(--trv-surface-elevated); border: 1px solid var(--trv-border-strong); box-shadow: var(--trv-shadow); }
.cm-aura { position: absolute; inset: -40% 40% 60% -10%; pointer-events: none; background: radial-gradient(55% 70% at 25% 0%, rgba(251,191,36,0.15), transparent 70%); animation: trv-aura-drift 10s ease-in-out infinite; }
.cm-head { position: relative; display: flex; align-items: center; justify-content: space-between; padding: 18px 22px 14px; }
.cm-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: var(--trv-amber); }
.cm-head h3 { font-size: 18px; font-weight: 850; margin: 5px 0 0; color: var(--trv-text); }
.cm-x { background: var(--trv-panel); border: 1px solid var(--trv-border); border-radius: 9px; padding: 6px; color: var(--trv-text-dim); cursor: pointer; }
.cm-body { position: relative; display: grid; grid-template-columns: 1.25fr 0.85fr; gap: 0; overflow: hidden; flex: 1; min-height: 0; }
.cm-form { padding: 14px 22px; overflow-y: auto; display: flex; flex-direction: column; gap: 13px; }
.fld label { display: block; font-size: 11px; font-weight: 650; color: var(--trv-text-muted); margin-bottom: 5px; }
.req { color: var(--trv-ember); }
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.inp { width: 100%; padding: 9px 11px; border-radius: 9px; font-size: 13px; font-family: inherit; background: rgba(0,0,0,0.3); border: 1px solid var(--trv-border); color: var(--trv-text); }
.inp:focus { outline: none; border-color: var(--trv-amber-border); box-shadow: 0 0 0 3px rgba(251,191,36,0.1); }
.cm-none { font-size: 11.5px; color: var(--trv-text-dim); margin: 6px 0 0; }
.cm-tour { display: flex; flex-direction: column; gap: 2px; padding: 10px 12px; border-radius: 10px; background: var(--trv-panel); border: 1px solid var(--trv-border); }
.ct-route { font-size: 14px; font-weight: 800; color: var(--trv-text); }
.ct-emp { font-size: 11.5px; color: var(--trv-text-muted); }
.seg { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 6px; }
.seg-btn { padding: 8px 6px; border-radius: 9px; font-size: 12px; font-weight: 650; cursor: pointer; background: var(--trv-panel); border: 1px solid var(--trv-border); color: var(--trv-text-muted); transition: all 0.2s; }
.seg-btn.on { color: var(--sc); border-color: var(--sc); background: color-mix(in srgb, var(--sc) 14%, transparent); }
.cm-rate-note { display: flex; align-items: flex-start; gap: 7px; font-size: 11.5px; color: var(--trv-text-secondary); padding: 9px 11px; border-radius: 9px; background: var(--trv-amber-soft); border: 1px solid var(--trv-amber-border); }
.cm-rate-note svg { color: var(--trv-amber); flex-shrink: 0; margin-top: 1px; }
.cm-rate-note b { color: var(--trv-text); }
.cm-rate-note.warn { color: var(--trv-st-rejected); background: var(--trv-st-rejected-soft); border-color: color-mix(in srgb, var(--trv-st-rejected) 30%, transparent); }
.cm-rate-note.warn svg { color: var(--trv-st-rejected); }
.cm-ovr .ovr-lab { display: inline-flex; align-items: center; gap: 5px; color: var(--trv-st-rejected); }
.ta { resize: vertical; }
.lnk { background: none; border: none; color: var(--trv-amber); text-decoration: underline; cursor: pointer; padding: 0; font: inherit; }

.cm-preview { padding: 16px 18px; background: var(--trv-panel); border-left: 1px solid var(--trv-border); display: flex; flex-direction: column; gap: 12px; }
.pv-eyebrow { font-size: 9px; letter-spacing: 0.18em; color: var(--trv-text-dim); }
.pv-meter { border-radius: 16px; padding: 18px 16px; text-align: center; background: linear-gradient(180deg, var(--trv-flap), color-mix(in srgb, var(--trv-flap) 84%, #000)); border: 1px solid var(--trv-border-strong); display: flex; flex-direction: column; align-items: center; gap: 9px; }
.pv-odo { font-size: 32px; }
.pv-calc { font-size: 11.5px; color: var(--trv-text-muted); }
.pv-cells { display: flex; flex-wrap: wrap; gap: 3px; justify-content: center; align-items: center; }
.pv-cell { width: 11px; height: 15px; border-radius: 3px; background: color-mix(in srgb, var(--trv-amber) 70%, transparent); box-shadow: 0 0 6px rgba(251,191,36,0.4); }
.pv-more { font-size: 10px; font-weight: 700; color: var(--trv-text-muted); }
.pv-tier { font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 7px; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.pv-note { font-size: 11px; color: var(--trv-text-dim); margin: 0; line-height: 1.5; }
.pv-note b { color: var(--trv-amber); }

.cm-foot { display: flex; justify-content: flex-end; gap: 10px; padding: 14px 22px; border-top: 1px solid var(--trv-border); }
.btn { display: inline-flex; align-items: center; gap: 7px; padding: 10px 18px; border-radius: 11px; font-size: 13px; font-weight: 700; cursor: pointer; border: 1px solid transparent; }
.btn.ghost { background: transparent; border-color: var(--trv-border-strong); color: var(--trv-text-secondary); }
.btn.primary { background: var(--trv-grad-hero); color: #1a1205; box-shadow: var(--trv-amber-glow); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; box-shadow: none; }
.spin { animation: cm-spin 0.8s linear infinite; }
@keyframes cm-spin { to { transform: rotate(360deg); } }

@media (max-width: 720px) { .cm-body { grid-template-columns: 1fr; } .cm-preview { border-left: none; border-top: 1px solid var(--trv-border); order: -1; } }
[data-theme="light"] .cm-overlay { background: rgba(60,40,15,0.32); }
[data-theme="light"] .inp { background: rgba(255,250,240,0.72); }
[data-theme="light"] .pv-meter { background: linear-gradient(180deg, #2a2620, #1f1c16); }
@media (prefers-reduced-motion: reduce) { .cm-aura { animation: none; } .cm-form [style*="trv-fade-up"] { animation: none !important; } .spin { animation: none; } }
</style>
