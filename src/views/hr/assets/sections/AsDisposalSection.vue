<template>
  <div class="ds">
    <FoundryConsole :counts="counts" :recovery="recoveryRate" :book-retired="bookRetired" :recovered="recovered"
      :active-status="statusFilter" @pick="onPick" @new="openCreate" @go="(t) => $emit('go', t)" />

    <!-- filter strip (mirrors console lenses; clear affordance) -->
    <div class="ds-bar">
      <div class="ds-chips">
        <button v-for="f in FILTERS" :key="f.v" class="ds-chip" :class="{ on: statusFilter === f.v }" :data-tone="f.tone" @click="statusFilter = f.v">
          {{ f.l }}<span v-if="countFor(f.v)" class="ds-chip-n">{{ countFor(f.v) }}</span>
        </button>
      </div>
      <button v-if="statusFilter" class="as-btn as-btn-ghost mini" @click="statusFilter = ''"><FilterX :size="13" /> Clear</button>
    </div>

    <!-- loading -->
    <div v-if="loading" class="ds-grid">
      <div v-for="n in 4" :key="n" class="ds-skel" :style="{ '--i': n }"><span class="ds-skel-beam" /></div>
    </div>

    <!-- empty -->
    <AssetEmptyState v-else-if="!filtered.length" :icon="Trash2"
      :title="statusFilter ? 'No disposals in this lane' : 'The foundry is cold'"
      :sub="statusFilter ? 'Nothing matches this filter yet.' : 'Retire an end-of-life asset to send it through the decommission workflow and reclaim its residual value.'">
      <button v-if="statusFilter" class="as-btn as-btn-ghost" @click="statusFilter = ''"><FilterX :size="14" /> Clear filter</button>
      <button class="as-btn as-btn-primary" @click="openCreate"><Plus :size="14" /> Request disposal</button>
    </AssetEmptyState>

    <!-- docket grid -->
    <div v-else class="ds-grid" :key="gridNonce">
      <DisposalDocketCard v-for="(d, i) in filtered" :key="d.id" :d="d" :index="i"
        @action="(a) => onAction(d, a)" @detail="$emit('detail', d.asset_id)" />
    </div>

    <!-- ════════════ Request disposal modal ════════════ -->
    <AssetModal :open="formOpen" title="Request disposal" subtitle="Retire an end-of-life asset" :icon="Trash2" :width="600" @close="formOpen = false">
      <div class="rf">
        <!-- live decommission docket preview -->
        <Motion as="div" class="rf-docket" :data-tone="reqMeta.tone" :data-ready="ready"
          :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4 }">
          <span class="rf-dk-grid" aria-hidden="true" />
          <span class="rf-dk-stamp" :data-ready="ready">{{ ready ? 'READY' : 'DRAFT' }}</span>
          <div class="rf-dk-head">
            <span class="rf-dk-ic"><component :is="reqMeta.icon" :size="18" /></span>
            <div class="rf-dk-id">
              <b class="as-mono">{{ pickedAsset ? pickedAsset.asset_code : '— select asset —' }}</b>
              <span>{{ reqMeta.label }} · {{ reqMeta.blurb }}</span>
            </div>
          </div>
          <div class="rf-dk-ledger">
            <span class="rf-dk-fig"><small>book value</small><b class="as-mono">{{ pickedBook != null ? money(pickedBook) : '—' }}</b></span>
            <span class="rf-dk-arrow"><ArrowRight :size="14" /></span>
            <span class="rf-dk-fig gain"><small>{{ reqMeta.recovers ? 'recovering' : 'recovered' }}</small><b class="as-mono">{{ money(form.sale_value || 0) }}</b></span>
          </div>
          <div class="rf-dk-bar"><span class="rf-dk-bar-fill" :style="{ width: reqRecPct + '%' }" /></div>
        </Motion>

        <!-- allocated guard -->
        <Motion v-if="pickedAsset && pickedAsset.status === 'ALLOCATED'" as="div" class="rf-warn"
          :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }">
          <TriangleAlert :size="15" /> This asset is <b>allocated</b> — return it first before it can be disposed.
        </Motion>

        <Motion as="div" :initial="fIn" :animate="fOn" :transition="fT(0)">
          <AssetPicker v-model="pickedAsset" label="Asset" required />
        </Motion>

        <!-- method — cinematic segmented selector -->
        <Motion as="div" class="rf-field" :initial="fIn" :animate="fOn" :transition="fT(1)">
          <span class="rf-lab">Disposal method</span>
          <div class="rf-methods">
            <Motion v-for="opt in methodOptions" :key="opt.value" as="button" type="button" class="rf-method"
              :class="{ on: form.disposal_method === opt.value }" :data-tone="opt.tone"
              :whileHover="{ y: -2 }" :whileTap="{ scale: 0.95 }" @click="form.disposal_method = opt.value">
              <component :is="opt.icon" :size="16" />
              <span class="rf-method-lab">{{ opt.label }}</span>
              <span v-if="opt.recovers" class="rf-method-tag"><Coins :size="9" /></span>
            </Motion>
          </div>
        </Motion>

        <div class="rf-grid2">
          <Motion as="div" :initial="fIn" :animate="fOn" :transition="fT(2)">
            <AssetField v-model="form.sale_value" type="number" label="Sale / recovery value (₹)" step="0.01" min="0" placeholder="0.00" full />
          </Motion>
          <Motion as="div" :initial="fIn" :animate="fOn" :transition="fT(3)">
            <AssetField v-model="form.buyer" label="Buyer / recipient" placeholder="Who receives it?" full />
          </Motion>
        </div>

        <Motion as="div" :initial="fIn" :animate="fOn" :transition="fT(4)">
          <AssetField v-model="form.reason" type="textarea" label="Reason" required placeholder="Why is this asset being retired?" :rows="2" full />
        </Motion>
      </div>

      <template #footer>
        <button class="as-btn as-btn-ghost" @click="formOpen = false">Cancel</button>
        <Motion as="button" type="button" class="as-btn as-btn-primary" :class="{ disabled: !canSubmit }"
          :whileHover="canSubmit ? { y: -2, scale: 1.02 } : {}" :whileTap="{ scale: 0.97 }"
          :disabled="!canSubmit" @click="submit">
          <Loader v-if="saving" :size="14" class="spin" /><Check v-else :size="14" /> Request disposal
        </Motion>
      </template>
    </AssetModal>

    <!-- ════════════ Complete (into the foundry) modal ════════════ -->
    <AssetModal :open="completeOpen" :title="`Into the foundry · ${completeTarget?.asset_code || ''}`"
      subtitle="Permanently retire this asset" :icon="Flame" :width="540" @close="completeOpen = false">
      <div class="cf">
        <div class="cf-foundry">
          <DisposalCrucible :recovery="completeRecovery" :intensity="1" :size="138" compact label="recovery" :start="completeOpen" />
          <div class="cf-figs">
            <span class="cf-fig"><small>book value</small><b class="as-mono">{{ completeBook != null ? money(completeBook) : '—' }}</b></span>
            <span class="cf-fig gain"><small>final recovery</small><b class="as-mono">{{ money(completeForm.sale_value || 0) }}</b></span>
            <span class="cf-fig" :class="completeDelta >= 0 ? 'up' : 'down'">
              <small>{{ completeDelta >= 0 ? 'net gain' : 'written down' }}</small>
              <b class="as-mono"><component :is="completeDelta >= 0 ? TrendingUp : TrendingDown" :size="12" /> {{ money(Math.abs(completeDelta)) }}</b>
            </span>
          </div>
        </div>

        <div class="cf-warn"><TriangleAlert :size="15" /> This asset will be permanently <b>RETIRED</b> and removed from active inventory. This can't be undone.</div>

        <div class="cf-grid2">
          <div class="rf-field">
            <span class="rf-lab">Disposed date</span>
            <HrDatePicker v-model="completeForm.disposed_date" placeholder="dd / mm / yyyy" />
          </div>
          <AssetField v-model="completeForm.sale_value" type="number" label="Final sale value (₹)" step="0.01" min="0" placeholder="0.00" />
        </div>
        <AssetField v-model="completeForm.notes" type="textarea" label="Closing note" placeholder="Optional disposal record note" :rows="2" full />
      </div>

      <template #footer>
        <button class="as-btn as-btn-ghost" @click="completeOpen = false">Cancel</button>
        <Motion as="button" type="button" class="as-btn as-btn-primary" :class="{ disabled: completing }"
          :whileHover="completing ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }"
          :disabled="completing" @click="doComplete">
          <Loader v-if="completing" :size="14" class="spin" /><Flame v-else :size="14" /> Retire asset
        </Motion>
      </template>
    </AssetModal>

    <!-- ════════════ Decision modal (approve / reject / cancel) ════════════ -->
    <AssetModal :open="decisionOpen" :title="decisionMeta.title" :subtitle="decisionTarget?.asset_code ? decisionTarget.asset_code : ''"
      :icon="decisionMeta.icon" :width="460" @close="decisionOpen = false">
      <div class="df" :data-tone="decisionMeta.tone">
        <div class="df-target">
          <span class="df-target-ic"><component :is="targetMeta.icon" :size="16" /></span>
          <div class="df-target-meta">
            <b class="as-mono">{{ decisionTarget?.asset_code || '—' }}</b>
            <span>{{ targetMeta.label }} · {{ titleCase(decisionTarget?.status || '') }}</span>
          </div>
          <AsStamp v-if="decisionTarget" :value="decisionTarget.status" />
        </div>

        <p class="df-copy">{{ decisionMeta.copy }}</p>

        <div v-if="decisionAction === 'reject'" class="rf-field">
          <span class="rf-lab">Reason</span>
          <AsSelect v-model="rejectPreset" :options="rejectPresets" placeholder="Pick a reason…" @update:model-value="applyPreset" />
        </div>

        <AssetField v-model="decisionForm.notes" type="textarea"
          :label="decisionAction === 'reject' ? 'Notes' : 'Note (optional)'"
          :placeholder="decisionMeta.notePlaceholder" :rows="2" full />
      </div>

      <template #footer>
        <button class="as-btn as-btn-ghost" @click="decisionOpen = false">Dismiss</button>
        <Motion as="button" type="button" class="as-btn" :class="[decisionMeta.btnClass, { disabled: deciding }]"
          :whileHover="deciding ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }"
          :disabled="deciding" @click="doDecision">
          <Loader v-if="deciding" :size="14" class="spin" /><component v-else :is="decisionMeta.icon" :size="14" /> {{ decisionMeta.cta }}
        </Motion>
      </template>
    </AssetModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  Trash2, Plus, Check, Flame, FilterX, Loader, ArrowRight, Coins,
  TrendingUp, TrendingDown, TriangleAlert, ShieldCheck, XCircle, Ban,
} from 'lucide-vue-next'
import FoundryConsole from '../components/FoundryConsole.vue'
import DisposalDocketCard from '../components/DisposalDocketCard.vue'
import DisposalCrucible from '../components/DisposalCrucible.vue'
import AssetModal from '../components/AssetModal.vue'
import AssetField from '../components/AssetField.vue'
import AssetPicker from '../components/AssetPicker.vue'
import AsSelect from '../components/AsSelect.vue'
import AsStamp from '../components/AsStamp.vue'
import AssetEmptyState from '../components/AssetEmptyState.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import {
  fetchDisposals, createDisposal, disposalAction,
  DISPOSAL_METHODS, disposalMethodMeta, titleCase, errText,
} from '@/composables/useAssets'

const emit = defineEmits(['refresh-stats', 'detail', 'go'])
const toast = useToast()

const FILTERS = [
  { v: '', l: 'All', tone: '' },
  { v: 'REQUESTED', l: 'Requested', tone: 'req' },
  { v: 'APPROVED', l: 'Cleared', tone: 'app' },
  { v: 'COMPLETED', l: 'Retired', tone: 'cmp' },
  { v: 'REJECTED', l: 'Rejected', tone: 'rej' },
  { v: 'CANCELLED', l: 'Cancelled', tone: 'can' },
]
const methodOptions = DISPOSAL_METHODS.map(v => ({ value: v, ...disposalMethodMeta(v) }))
const money = (v) => '₹' + Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })

// ── data ──
const all = ref([])
const loading = ref(true)
const gridNonce = ref(0)
const statusFilter = ref('')

async function reload() {
  loading.value = true
  try { all.value = (await fetchDisposals({ limit: 200 })).items || []; gridNonce.value++ }
  catch (e) { toast.error(errText(e, 'Failed to load disposals')) }
  finally { loading.value = false }
}
onMounted(reload)

// ── telemetry ──
const counts = computed(() => {
  const c = { requested: 0, approved: 0, completed: 0, rejected: 0, cancelled: 0, total: all.value.length }
  const map = { REQUESTED: 'requested', APPROVED: 'approved', COMPLETED: 'completed', REJECTED: 'rejected', CANCELLED: 'cancelled' }
  for (const d of all.value) { const k = map[d.status]; if (k) c[k]++ }
  return c
})
const completedRows = computed(() => all.value.filter(d => d.status === 'COMPLETED'))
const bookRetired = computed(() => completedRows.value.reduce((s, d) => s + Number(d.book_value || 0), 0))
const recovered = computed(() => completedRows.value.reduce((s, d) => s + Number(d.sale_value || 0), 0))
const recoveryRate = computed(() => {
  if (bookRetired.value > 0) return Math.round((recovered.value / bookRetired.value) * 100)
  return recovered.value > 0 ? 100 : 0
})
const countFor = (v) => v ? all.value.filter(d => d.status === v).length : all.value.length
const filtered = computed(() => statusFilter.value ? all.value.filter(d => d.status === statusFilter.value) : all.value)
const onPick = (s) => { statusFilter.value = statusFilter.value === s ? '' : s }

// ── field-entry choreography ──
const fIn = { opacity: 0, y: 12 }
const fOn = { opacity: 1, y: 0 }
const fT = (i) => ({ duration: 0.4, delay: 0.05 + i * 0.06, ease: [0.16, 1, 0.3, 1] })

// ── Request modal ──
const formOpen = ref(false)
const saving = ref(false)
const pickedAsset = ref(null)
const blank = () => ({ disposal_method: 'SCRAPPED', sale_value: null, buyer: '', reason: '' })
const form = ref(blank())
const openCreate = () => { form.value = blank(); pickedAsset.value = null; formOpen.value = true }

const reqMeta = computed(() => disposalMethodMeta(form.value.disposal_method))
const pickedBook = computed(() => {
  const a = pickedAsset.value
  if (!a) return null
  const v = a.current_book_value ?? a.purchase_cost
  return v != null ? Number(v) : null
})
const reqRecPct = computed(() => {
  const b = pickedBook.value, s = Number(form.value.sale_value || 0)
  if (b && b > 0) return Math.min(100, (s / b) * 100)
  return s > 0 ? 100 : 0
})
const ready = computed(() => !!pickedAsset.value && !!form.value.reason && pickedAsset.value.status !== 'ALLOCATED')
const canSubmit = computed(() => ready.value && !saving.value)

async function submit() {
  if (!canSubmit.value) return
  saving.value = true
  try {
    await createDisposal({
      asset_id: pickedAsset.value.id, disposal_method: form.value.disposal_method,
      sale_value: form.value.sale_value, buyer: form.value.buyer || null, reason: form.value.reason,
    })
    toast.success('Disposal requested'); formOpen.value = false; reload(); emit('refresh-stats')
  } catch (e) { toast.error(errText(e, 'Failed to request disposal')) }
  finally { saving.value = false }
}

// ── Complete modal ──
const completeOpen = ref(false)
const completeTarget = ref(null)
const completing = ref(false)
const completeForm = ref({ disposed_date: '', sale_value: null, notes: '' })
const completeBook = computed(() => completeTarget.value?.book_value != null ? Number(completeTarget.value.book_value) : null)
const completeDelta = computed(() => Number(completeForm.value.sale_value || 0) - (completeBook.value || 0))
const completeRecovery = computed(() => {
  const b = completeBook.value, s = Number(completeForm.value.sale_value || 0)
  if (b && b > 0) return Math.round(Math.min(100, (s / b) * 100))
  return s > 0 ? 100 : 0
})
function openComplete(d) {
  completeTarget.value = d
  completeForm.value = { disposed_date: '', sale_value: d.sale_value ?? null, notes: '' }
  completeOpen.value = true
}
async function doComplete() {
  completing.value = true
  try {
    await disposalAction(completeTarget.value.id, 'complete', {
      disposed_date: completeForm.value.disposed_date || null,
      sale_value: completeForm.value.sale_value,
      notes: completeForm.value.notes || null,
    })
    toast.success('Asset retired'); completeOpen.value = false; reload(); emit('refresh-stats')
  } catch (e) { toast.error(errText(e, 'Failed to complete')) }
  finally { completing.value = false }
}

// ── Decision modal (approve / reject / cancel) ──
const decisionOpen = ref(false)
const decisionAction = ref('approve')
const decisionTarget = ref(null)
const deciding = ref(false)
const decisionForm = ref({ notes: '' })
const rejectPreset = ref('')
const rejectPresets = [
  { value: 'Still in active use', label: 'Still in active use' },
  { value: 'Insufficient justification', label: 'Insufficient justification' },
  { value: 'Recoverable via repair', label: 'Recoverable via repair' },
  { value: 'Duplicate request', label: 'Duplicate request' },
  { value: 'Book value too high to write off', label: 'Book value too high to write off' },
]
const DECISION_META = {
  approve: { title: 'Approve disposal', icon: ShieldCheck, tone: 'app', cta: 'Approve', btnClass: 'as-btn-primary',
    copy: 'Clear this asset for disposal. It can still be cancelled before it is retired.', notePlaceholder: 'Optional approval note' },
  reject: { title: 'Reject request', icon: XCircle, tone: 'rej', cta: 'Reject', btnClass: 'as-btn-danger',
    copy: 'Deny this disposal request. The asset stays in active inventory.', notePlaceholder: 'Why is this being rejected?' },
  cancel: { title: 'Cancel disposal', icon: Ban, tone: 'can', cta: 'Stand down', btnClass: 'as-btn-danger',
    copy: 'Stand down this disposal. The asset keeps its current status.', notePlaceholder: 'Optional cancellation note' },
}
const decisionMeta = computed(() => DECISION_META[decisionAction.value] || DECISION_META.approve)
const targetMeta = computed(() => disposalMethodMeta(decisionTarget.value?.disposal_method))
function openDecision(d, action) {
  decisionTarget.value = d; decisionAction.value = action
  decisionForm.value = { notes: '' }; rejectPreset.value = ''
  decisionOpen.value = true
}
function applyPreset(v) { if (v && !decisionForm.value.notes) decisionForm.value.notes = v }
async function doDecision() {
  deciding.value = true
  try {
    await disposalAction(decisionTarget.value.id, decisionAction.value, { notes: decisionForm.value.notes || null })
    toast.success(`Disposal ${decisionAction.value === 'cancel' ? 'cancelled' : decisionAction.value + 'd'}`)
    decisionOpen.value = false; reload(); emit('refresh-stats')
  } catch (e) { toast.error(errText(e, `Failed to ${decisionAction.value}`)) }
  finally { deciding.value = false }
}

// ── card action router ──
function onAction(d, action) {
  if (action === 'complete') return openComplete(d)
  return openDecision(d, action) // approve | reject | cancel → decision modal (captures a note)
}
</script>

<style scoped>
.ds { display: flex; flex-direction: column; gap: 16px; }

/* filter strip */
.ds-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.ds-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.ds-chip { display: inline-flex; align-items: center; gap: 6px; padding: 7px 13px; border-radius: 999px; cursor: pointer; font: inherit; font-size: 12.5px; font-weight: 600;
  color: var(--as-text-muted); background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: all 0.2s; }
.ds-chip:hover { color: var(--as-text); border-color: var(--as-border-strong); }
.ds-chip[data-tone="req"] { --c: var(--as-st-reserved); }
.ds-chip[data-tone="app"] { --c: var(--as-st-allocated); }
.ds-chip[data-tone="cmp"] { --c: var(--as-ember); }
.ds-chip[data-tone="rej"] { --c: var(--as-cond-poor); }
.ds-chip[data-tone="can"] { --c: var(--as-st-retired); }
.ds-chip.on { color: var(--c, var(--as-amber)); background: color-mix(in srgb, var(--c, var(--as-amber)) 12%, transparent); border-color: color-mix(in srgb, var(--c, var(--as-amber)) 32%, transparent); }
.ds-chip-n { font-size: 11px; font-weight: 800; padding: 1px 6px; border-radius: 999px; background: color-mix(in srgb, var(--as-text) 8%, transparent); color: var(--as-text-secondary); font-variant-numeric: tabular-nums; }
.ds-chip.on .ds-chip-n { background: color-mix(in srgb, var(--c, var(--as-amber)) 22%, transparent); color: var(--c, var(--as-amber)); }
.as-btn.mini { padding: 7px 13px; font-size: 12.5px; }

/* grid */
.ds-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 14px; }
@media (max-width: 520px) { .ds-grid { grid-template-columns: 1fr; } }

/* skeleton */
.ds-skel { position: relative; overflow: hidden; height: 210px; border-radius: 18px; background: var(--as-surf-card); border: 1px solid var(--as-border-soft);
  animation: as-deal-row 0.5s var(--as-spring) both; animation-delay: calc(var(--i) * 0.06s); }
.ds-skel-beam { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, color-mix(in srgb, var(--as-ember) 9%, transparent) 50%, transparent 70%); background-size: 220% 100%; animation: as-sheen 1.5s ease infinite; }

/* ════ shared form bits ════ */
.rf, .cf, .df { display: flex; flex-direction: column; gap: 15px; }
.rf-field { display: flex; flex-direction: column; gap: 6px; }
.rf-lab { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; color: var(--as-text-dim); }
.rf-grid2, .cf-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
@media (max-width: 520px) { .rf-grid2, .cf-grid2 { grid-template-columns: 1fr; } }

/* ── request: live docket preview ── */
.rf-docket { position: relative; overflow: hidden; padding: 15px 16px; border-radius: 15px; background: var(--as-surf-card);
  border: 1px solid var(--as-border-soft); box-shadow: var(--as-card-shadow); transition: border-color 0.3s; }
.rf-docket[data-tone="gain"]  { --mc: var(--as-st-available); }
.rf-docket[data-tone="amber"] { --mc: var(--as-amber); }
.rf-docket[data-tone="ember"] { --mc: var(--as-ember); }
.rf-docket[data-tone="steel"] { --mc: var(--as-steel); }
.rf-docket[data-tone="loss"]  { --mc: var(--as-cond-poor); }
.rf-docket[data-ready="true"] { border-color: color-mix(in srgb, var(--mc) 36%, transparent); }
.rf-dk-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.4;
  background-image: linear-gradient(var(--as-blueprint) 1px, transparent 1px), linear-gradient(90deg, var(--as-blueprint) 1px, transparent 1px);
  background-size: 20px 20px; mask-image: radial-gradient(120% 100% at 0% 0%, #000, transparent 80%); -webkit-mask-image: radial-gradient(120% 100% at 0% 0%, #000, transparent 80%); }
.rf-dk-stamp { position: absolute; top: 12px; right: 14px; font-family: var(--as-mono); font-size: 10px; font-weight: 800; letter-spacing: 0.16em;
  padding: 3px 9px; border-radius: 6px; border: 1.5px solid var(--as-text-dim); color: var(--as-text-dim); opacity: 0.7; transform: rotate(4deg); transition: all 0.3s; }
.rf-dk-stamp[data-ready="true"] { color: var(--mc); border-color: var(--mc); opacity: 0.95; }
.rf-dk-head { position: relative; z-index: 1; display: flex; align-items: center; gap: 11px; }
.rf-dk-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; color: var(--mc);
  background: color-mix(in srgb, var(--mc) 14%, transparent); border: 1px solid color-mix(in srgb, var(--mc) 28%, transparent); }
.rf-dk-id { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.rf-dk-id b { font-size: 14.5px; font-weight: 800; color: var(--as-text); }
.rf-dk-id span { font-size: 11.5px; color: var(--as-text-muted); }
.rf-dk-ledger { position: relative; z-index: 1; display: flex; align-items: center; gap: 12px; margin-top: 12px; }
.rf-dk-fig { display: flex; flex-direction: column; gap: 1px; }
.rf-dk-fig small { font-size: 8.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--as-text-dim); }
.rf-dk-fig b { font-size: 14px; font-weight: 800; color: var(--as-text); }
.rf-dk-fig.gain b { color: var(--as-st-available); }
.rf-dk-arrow { color: var(--mc); display: grid; place-items: center; }
.rf-dk-bar { position: relative; z-index: 1; height: 6px; margin-top: 10px; border-radius: 999px; overflow: hidden; background: color-mix(in srgb, var(--as-steel) 20%, transparent); }
.rf-dk-bar-fill { position: absolute; inset: 0 auto 0 0; border-radius: 999px; transition: width 0.5s var(--as-ease);
  background: linear-gradient(90deg, var(--as-ember), var(--as-amber-bright)); box-shadow: 0 0 8px color-mix(in srgb, var(--as-amber) 55%, transparent); }

.rf-warn, .cf-warn { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-radius: 11px; font-size: 12px; line-height: 1.45; overflow: hidden;
  color: var(--as-cond-poor); background: var(--as-cond-poor-soft); border: 1px solid color-mix(in srgb, var(--as-cond-poor) 30%, transparent); }
.rf-warn :deep(svg), .cf-warn :deep(svg) { flex-shrink: 0; }

/* ── request: method segmented selector ── */
.rf-methods { display: grid; grid-template-columns: repeat(4, 1fr); gap: 7px; }
.rf-method { position: relative; display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 11px 6px; border-radius: 12px; cursor: pointer; font: inherit;
  font-size: 10.5px; font-weight: 700; color: var(--as-text-muted); background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: color 0.2s, background 0.2s, border-color 0.2s; }
.rf-method[data-tone="gain"]  { --tc: var(--as-st-available); }
.rf-method[data-tone="amber"] { --tc: var(--as-amber); }
.rf-method[data-tone="ember"] { --tc: var(--as-ember); }
.rf-method[data-tone="steel"] { --tc: var(--as-steel); }
.rf-method[data-tone="loss"]  { --tc: var(--as-cond-poor); }
.rf-method :deep(svg) { color: var(--as-text-dim); transition: color 0.2s; }
.rf-method:hover { color: var(--as-text); border-color: var(--as-border-strong); }
.rf-method.on { color: var(--tc); background: color-mix(in srgb, var(--tc) 12%, transparent); border-color: color-mix(in srgb, var(--tc) 40%, transparent); }
.rf-method.on :deep(svg) { color: var(--tc); }
.rf-method-lab { text-align: center; line-height: 1.1; }
.rf-method-tag { position: absolute; top: 6px; right: 6px; display: grid; place-items: center; width: 15px; height: 15px; border-radius: 50%; color: var(--as-st-available); background: color-mix(in srgb, var(--as-st-available) 14%, transparent); }
@media (max-width: 520px) { .rf-methods { grid-template-columns: repeat(3, 1fr); } }

/* ── complete: foundry preview ── */
.cf-foundry { display: flex; align-items: center; gap: 18px; padding: 16px; border-radius: 15px; background: var(--as-surf-card); border: 1px solid var(--as-border-soft); flex-wrap: wrap; justify-content: center; }
.cf-figs { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 150px; }
.cf-fig { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; padding-bottom: 7px; border-bottom: 1px dashed var(--as-border-soft); }
.cf-fig:last-child { border-bottom: 0; padding-bottom: 0; }
.cf-fig small { font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--as-text-dim); }
.cf-fig b { font-size: 15px; font-weight: 800; color: var(--as-text); display: inline-flex; align-items: center; gap: 4px; }
.cf-fig.gain b { color: var(--as-st-available); }
.cf-fig.up b { color: var(--as-st-available); }
.cf-fig.down b { color: var(--as-cond-poor); }

/* ── decision modal ── */
.df[data-tone="app"] { --dc: var(--as-st-allocated); }
.df[data-tone="rej"] { --dc: var(--as-cond-poor); }
.df[data-tone="can"] { --dc: var(--as-st-retired); }
.df-target { display: flex; align-items: center; gap: 11px; padding: 12px 13px; border-radius: 13px; background: var(--as-surf-card); border: 1px solid var(--as-border-soft); }
.df-target-ic { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 10px; color: var(--dc, var(--as-amber)); background: color-mix(in srgb, var(--dc, var(--as-amber)) 13%, transparent); border: 1px solid color-mix(in srgb, var(--dc, var(--as-amber)) 26%, transparent); }
.df-target-meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.df-target-meta b { font-size: 14px; font-weight: 800; color: var(--as-text); }
.df-target-meta span { font-size: 11.5px; color: var(--as-text-muted); }
.df-copy { margin: 0; font-size: 13px; line-height: 1.55; color: var(--as-text-secondary); }

.as-btn.disabled { opacity: 0.5; cursor: not-allowed; }
.spin { animation: as-spin 0.9s linear infinite; }

@media (prefers-reduced-motion: reduce) {
  .ds-skel, .ds-skel-beam { animation: none; }
  .rf-dk-bar-fill { transition: none; }
}
</style>
