<template>
  <AssetModal :open="open" :title="`Allocate ${asset?.asset_code || 'asset'}`"
    subtitle="Issue this asset into the field" :icon="Send" :width="600" @close="$emit('close')">
    <div class="al">
      <!-- ░░ live handover ticket ░░ -->
      <Motion as="div" class="al-ticket" :data-ready="ready"
        :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }">
        <span class="al-tk-grid" aria-hidden="true" />
        <!-- FROM: the asset -->
        <div class="al-tk-end">
          <span class="al-tk-tag">ASSET</span>
          <div class="al-tk-id">
            <AssetTypeBadge v-if="asset" :type="asset.asset_type" medallion />
            <div class="al-tk-txt">
              <b class="as-mono">{{ asset?.asset_code || '—' }}</b>
              <span>{{ asset ? `${asset.brand || ''} ${asset.model || asset.asset_type}`.trim() : '' }}</span>
            </div>
          </div>
        </div>

        <!-- transit beam -->
        <div class="al-tk-mid">
          <span class="al-tk-beam" :class="{ live: ready }" aria-hidden="true" />
          <span class="al-tk-node" :class="{ live: ready }"><Send :size="13" /></span>
          <span class="al-stamp" :data-on="ready">{{ ready ? 'READY' : 'DRAFT' }}</span>
        </div>

        <!-- TO: the employee (keyed Motion re-animates on change; no AnimatePresence
             so the teleported modal subtree stays interactive) -->
        <div class="al-tk-end al-tk-to">
          <span class="al-tk-tag">HOLDER</span>
          <Motion v-if="selectedEmployee" :key="selectedEmployee.id" as="div" class="al-tk-id"
            :initial="{ opacity: 0, x: 14 }" :animate="{ opacity: 1, x: 0 }" :transition="{ duration: 0.3 }">
            <span class="al-tk-av">{{ initials(selectedEmployee.full_name) }}</span>
            <div class="al-tk-txt">
              <b>{{ selectedEmployee.full_name || 'Unnamed' }}</b>
              <span>{{ empSub(selectedEmployee) }}</span>
            </div>
          </Motion>
          <div v-else class="al-tk-id al-tk-empty">
            <span class="al-tk-av ghost"><UserPlus :size="15" /></span>
            <div class="al-tk-txt"><b>Pick an employee</b><span>awaiting assignment</span></div>
          </div>
        </div>

        <!-- ticket footer chips -->
        <div class="al-tk-foot">
          <span class="al-tk-chip"><CalendarClock :size="11" />{{ form.expected_return_date ? fmtDate(form.expected_return_date) : 'Open-ended' }}</span>
          <span class="al-tk-chip" :style="condStyle"><Gauge :size="11" />{{ condLabel }}</span>
          <span class="al-tk-chip ack"><ShieldQuestion :size="11" />Acknowledgement pending</span>
        </div>
      </Motion>

      <!-- ░░ step 1 · employee ░░ -->
      <Motion as="div" class="al-field" :initial="fIn" :animate="fOn" :transition="fT(0)">
        <span class="al-lab"><span class="al-step">1</span> Assign to <i>*</i></span>
        <div class="al-search">
          <Search :size="14" />
          <input v-model="search" class="al-search-input" placeholder="Search employee by name or code…" />
          <span v-if="employees.length" class="al-search-n">{{ filtered.length }}</span>
        </div>
        <div v-if="loading" class="al-emp-list">
          <div v-for="n in 4" :key="n" class="as-skel" style="height:46px;border-radius:11px" />
        </div>
        <div v-else-if="filtered.length" class="al-emp-list">
          <button v-for="(e, i) in filtered.slice(0, 50)" :key="e.id" type="button" class="al-emp"
            :class="{ on: form.employee_id === e.id }" :style="{ '--i': i }" @click="form.employee_id = e.id">
            <span class="al-emp-av">{{ initials(e.full_name) }}</span>
            <span class="al-emp-txt">
              <b>{{ e.full_name || 'Unnamed' }}</b>
              <i v-if="empSub(e)">{{ empSub(e) }}</i>
            </span>
            <span v-if="e.employee_id" class="al-emp-code as-mono">{{ e.employee_id }}</span>
            <span class="al-emp-radio" :class="{ on: form.employee_id === e.id }"><Check :size="12" /></span>
          </button>
        </div>
        <div v-else class="al-hint"><SearchX :size="14" /> No matching employees.</div>
        <p v-if="hiddenCount" class="al-hidden"><Info :size="12" /> {{ hiddenCount }} employee{{ hiddenCount > 1 ? 's' : '' }} on notice or exited are hidden — a leaving employee can't receive a new asset.</p>
      </Motion>

      <!-- ░░ step 2 · terms ░░ -->
      <Motion as="div" class="al-field" :initial="fIn" :animate="fOn" :transition="fT(1)">
        <span class="al-lab"><span class="al-step">2</span> Handover terms</span>
        <div class="al-grid2">
          <div class="al-sub">
            <span class="al-sub-lab"><CalendarClock :size="11" /> Expected return</span>
            <HrDatePicker v-model="form.expected_return_date" :min="today" placeholder="Open-ended" />
          </div>
          <div class="al-sub">
            <span class="al-sub-lab"><Gauge :size="11" /> Condition on issue</span>
            <div class="al-seg">
              <button v-for="c in CONDITIONS" :key="c.v" type="button" class="al-seg-btn"
                :class="{ on: form.condition_on_issue === c.v }" :style="{ '--c': `var(--as-cond-${c.token})` }"
                @click="form.condition_on_issue = c.v">{{ c.l }}</button>
            </div>
          </div>
        </div>
      </Motion>

      <!-- ░░ notes ░░ -->
      <Motion as="div" class="al-field" :initial="fIn" :animate="fOn" :transition="fT(2)">
        <span class="al-lab"><span class="al-step">3</span> Handover notes</span>
        <textarea v-model="form.notes" class="al-textarea" rows="2" placeholder="Accessories included, condition remarks, custody terms…" />
      </Motion>
    </div>

    <template #footer>
      <button class="as-btn as-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" type="button" class="as-btn as-btn-primary" :class="{ disabled: !ready || saving }"
        :whileHover="(!ready || saving) ? {} : { y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }"
        :disabled="!ready || saving" @click="submit">
        <Loader v-if="saving" :size="14" class="spin" /><Send v-else :size="14" />
        {{ saving ? 'Allocating…' : 'Allocate asset' }}
      </Motion>
    </template>
  </AssetModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import axios from 'axios'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import { Send, Search, SearchX, Check, Loader, UserPlus, CalendarClock, Gauge, ShieldQuestion, Info } from 'lucide-vue-next'
import { API, authHeader } from '@/utils/api'
import AssetModal from '../components/AssetModal.vue'
import AssetTypeBadge from '../components/AssetTypeBadge.vue'
import HrDatePicker from '@/components/hr/forms/HrDatePicker.vue'
import { allocateAsset, errText } from '@/composables/useAssets'

const props = defineProps({
  open: { type: Boolean, default: false },
  asset: { type: Object, default: null },
})
const emit = defineEmits(['close', 'allocated'])
const toast = useToast()

const CONDITIONS = [
  { v: 'NEW', l: 'New', token: 'new' },
  { v: 'GOOD', l: 'Good', token: 'good' },
  { v: 'FAIR', l: 'Fair', token: 'fair' },
  { v: 'POOR', l: 'Poor', token: 'poor' },
]

const saving = ref(false)
const loading = ref(false)
const employees = ref([])
const search = ref('')
const blank = () => ({ employee_id: '', expected_return_date: '', condition_on_issue: '', notes: '' })
const form = ref(blank())

const today = new Date().toISOString().slice(0, 10)

const fIn = { opacity: 0, y: 12 }
const fOn = { opacity: 1, y: 0 }
const fT = (i) => ({ duration: 0.4, delay: 0.08 + i * 0.07, ease: [0.16, 1, 0.3, 1] })

watch(() => props.open, (o) => {
  if (!o) return
  form.value = blank()
  // pre-fill the handover condition with the asset's current condition (editable)
  const c = (props.asset?.condition || '').toUpperCase()
  if (CONDITIONS.some(x => x.v === c)) form.value.condition_on_issue = c
  search.value = ''
  loadEmployees()
})

// Only ACTIVE / ON_PROBATION employees can receive a new asset — mirrors the
// backend guard_employable() rule, so a leaving / exited employee never appears
// as a pick (the API would 409 anyway).
const EMPLOYABLE = ['ACTIVE', 'ON_PROBATION']
const employablePool = computed(() => employees.value.filter(e => EMPLOYABLE.includes((e.lifecycle_state || '').toUpperCase())))
const hiddenCount = computed(() => employees.value.length - employablePool.value.length)
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return employablePool.value
  return employablePool.value.filter(e =>
    (e.full_name || '').toLowerCase().includes(q) || (e.employee_id || '').toLowerCase().includes(q))
})
const selectedEmployee = computed(() => employees.value.find(e => e.id === form.value.employee_id) || null)
const ready = computed(() => !!form.value.employee_id)

const initials = (n) => (n || '?').split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
const empSub = (e) => [e.designation_name || e.designation, e.department_name || e.department].filter(Boolean).join(' · ')
const fmtDate = (iso) => { try { return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' }) } catch { return iso } }

const condLabel = computed(() => CONDITIONS.find(c => c.v === form.value.condition_on_issue)?.l || (props.asset?.condition ? props.asset.condition[0] + props.asset.condition.slice(1).toLowerCase() : 'As-is'))
const condStyle = computed(() => {
  const c = CONDITIONS.find(x => x.v === form.value.condition_on_issue)
  return c ? { '--c': `var(--as-cond-${c.token})` } : {}
})

async function loadEmployees() {
  if (employees.value.length || loading.value) return
  loading.value = true
  try {
    const all = []
    let page = 1, total = Infinity
    while (all.length < total && page <= 60) {
      const { data } = await axios.get(`${API}/hr/employees/`, {
        headers: authHeader(), params: { page, limit: 100, sort_by: 'created_at', sort_dir: 'desc' },
      })
      const items = data.items || []
      all.push(...items)
      total = data.total ?? all.length
      if (!items.length) break
      page++
    }
    employees.value = all
  } catch (e) {
    toast.error(errText(e, 'Failed to load employees'))
  } finally {
    loading.value = false
  }
}

async function submit() {
  if (!props.asset || !form.value.employee_id) return
  saving.value = true
  try {
    await allocateAsset(props.asset.id, {
      asset_id: props.asset.id,
      employee_id: form.value.employee_id,
      expected_return_date: form.value.expected_return_date || null,
      condition_on_issue: form.value.condition_on_issue || null,
      notes: form.value.notes || null,
    })
    toast.success(`${props.asset.asset_code} allocated to ${selectedEmployee.value?.full_name || 'employee'}`)
    emit('allocated')
    emit('close')
  } catch (e) {
    toast.error(errText(e, 'Failed to allocate'))
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.al { display: flex; flex-direction: column; gap: 16px; }

/* ░░ handover ticket ░░ */
.al-ticket { position: relative; overflow: hidden; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 6px;
  padding: 16px 16px 0; border-radius: 16px; background: var(--as-surf-card); border: 1px solid var(--as-border-soft); box-shadow: var(--as-card-shadow); transition: border-color 0.4s; }
.al-ticket[data-ready="true"] { border-color: color-mix(in srgb, var(--as-amber) 36%, transparent); }
.al-tk-grid { position: absolute; inset: 0; pointer-events: none; z-index: 0; opacity: 0.5;
  background-image: linear-gradient(color-mix(in srgb, var(--as-amber) 7%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in srgb, var(--as-amber) 7%, transparent) 1px, transparent 1px);
  background-size: 22px 22px; mask-image: radial-gradient(120% 100% at 50% 0%, #000 30%, transparent 80%); -webkit-mask-image: radial-gradient(120% 100% at 50% 0%, #000 30%, transparent 80%); }
.al-tk-end { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 7px; min-width: 0; padding-bottom: 14px; }
.al-tk-to { align-items: flex-end; text-align: right; }
.al-tk-tag { font-size: 8px; font-weight: 800; letter-spacing: 0.14em; color: var(--as-text-dim); }
.al-tk-id { display: flex; align-items: center; gap: 10px; min-width: 0; }
.al-tk-to .al-tk-id { flex-direction: row-reverse; }
.al-tk-txt { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.al-tk-txt b { font-size: 14px; font-weight: 800; color: var(--as-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.al-tk-txt span { font-size: 11px; color: var(--as-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.al-tk-empty b { color: var(--as-text-dim); }
.al-tk-av { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0; font-size: 13px; font-weight: 800;
  color: var(--as-amber); background: color-mix(in srgb, var(--as-amber) 15%, transparent); border: 1px solid color-mix(in srgb, var(--as-amber) 30%, transparent); }
.al-tk-av.ghost { color: var(--as-text-dim); background: var(--as-surface); border-style: dashed; border-color: var(--as-border-strong); }

.al-tk-mid { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 5px; padding: 0 8px 14px; }
.al-tk-beam { width: 54px; height: 2px; border-radius: 2px; background: var(--as-border-strong); transition: background 0.4s; }
.al-tk-beam.live { background: linear-gradient(90deg, transparent, var(--as-amber), transparent); background-size: 200% 100%; animation: as-beam-flow 1.1s linear infinite; }
.al-tk-node { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; color: var(--as-text-dim);
  background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: all 0.4s var(--as-spring); }
.al-tk-node.live { color: #1a1206; background: linear-gradient(135deg, var(--as-amber), var(--as-amber-strong)); border-color: transparent; box-shadow: 0 6px 16px -7px var(--as-amber); transform: rotate(8deg); }
.al-stamp { font-family: var(--as-mono); font-size: 9px; font-weight: 800; letter-spacing: 0.1em; padding: 2px 7px; border-radius: 5px;
  color: var(--as-text-dim); background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: all 0.3s; }
.al-stamp[data-on="true"] { color: var(--as-st-available); background: var(--as-st-available-soft); border-color: color-mix(in srgb, var(--as-st-available) 36%, transparent); }

.al-tk-foot { grid-column: 1 / -1; position: relative; z-index: 1; display: flex; flex-wrap: wrap; gap: 7px; padding: 11px 0; margin-top: 4px; border-top: 1px dashed var(--as-border-strong); }
.al-tk-chip { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; color: var(--as-text-secondary);
  padding: 4px 9px; border-radius: 7px; background: var(--as-surface); border: 1px solid var(--as-border-soft); }
.al-tk-chip[style*="--c"] { color: var(--c); background: color-mix(in srgb, var(--c) 12%, transparent); border-color: color-mix(in srgb, var(--c) 30%, transparent); }
.al-tk-chip[style*="--c"] :deep(svg) { color: var(--c); }
.al-tk-chip.ack { color: var(--as-text-dim); }

/* ░░ fields ░░ */
.al-field { display: flex; flex-direction: column; gap: 9px; }
.al-lab { display: inline-flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; color: var(--as-text-dim); }
.al-lab i { color: var(--as-amber); font-style: normal; }
.al-step { display: grid; place-items: center; width: 18px; height: 18px; border-radius: 6px; font-size: 10px; font-weight: 800;
  color: var(--as-amber); background: color-mix(in srgb, var(--as-amber) 14%, transparent); border: 1px solid color-mix(in srgb, var(--as-amber) 28%, transparent); }

.al-search { display: flex; align-items: center; gap: 8px; padding: 9px 12px; border-radius: 11px; background: var(--as-surface); border: 1px solid var(--as-border-soft); color: var(--as-text-dim); transition: border-color 0.2s; }
.al-search:focus-within { border-color: color-mix(in srgb, var(--as-amber) 55%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--as-amber) 10%, transparent); }
.al-search-input { flex: 1; min-width: 0; border: none; background: none; outline: none; font: inherit; font-size: 13.5px; color: var(--as-text); }
.al-search-n { font-family: var(--as-mono); font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 999px; color: var(--as-text-secondary); background: var(--as-surface-elevated); }
.al-hint { display: flex; align-items: center; gap: 7px; font-size: 12.5px; color: var(--as-text-muted); padding: 14px 2px; }
.al-hidden { display: flex; align-items: center; gap: 6px; margin: 2px 0 0; font-size: 11px; color: var(--as-text-dim); }
.al-hidden :deep(svg) { flex-shrink: 0; color: var(--as-steel-dim); }

.al-emp-list { max-height: 216px; overflow-y: auto; display: flex; flex-direction: column; gap: 5px; padding: 2px; }
.al-emp { display: flex; align-items: center; gap: 11px; padding: 8px 11px; border-radius: 11px; cursor: pointer; text-align: left; font: inherit;
  background: var(--as-surface); border: 1px solid transparent; color: var(--as-text-secondary); transition: background 0.18s, border-color 0.18s, transform 0.18s;
  animation: as-deal-row 0.3s var(--as-spring) both; animation-delay: calc(var(--i) * 0.025s); }
.al-emp:hover { background: var(--as-surface-elevated); transform: translateX(2px); }
.al-emp.on { background: color-mix(in srgb, var(--as-amber) 12%, transparent); border-color: color-mix(in srgb, var(--as-amber) 34%, transparent); color: var(--as-text); }
.al-emp-av { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; font-size: 11px; font-weight: 800; flex-shrink: 0;
  color: var(--as-amber); background: color-mix(in srgb, var(--as-amber) 14%, transparent); }
.al-emp-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.al-emp-txt b { font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.al-emp-txt i { font-size: 10.5px; font-style: normal; color: var(--as-text-dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.al-emp-code { font-size: 10.5px; color: var(--as-text-dim); flex-shrink: 0; }
.al-emp-radio { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 50%; flex-shrink: 0; color: transparent;
  border: 1.5px solid var(--as-border-strong); transition: all 0.2s; }
.al-emp-radio.on { color: #1a1206; background: var(--as-amber); border-color: var(--as-amber); }

.al-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
@media (max-width: 520px) { .al-grid2 { grid-template-columns: 1fr; } }
.al-sub { display: flex; flex-direction: column; gap: 6px; }
.al-sub-lab { display: inline-flex; align-items: center; gap: 5px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--as-text-dim); }
.al-sub-lab :deep(svg) { color: var(--as-steel-dim); }
.al-seg { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; }
.al-seg-btn { padding: 9px 4px; border-radius: 9px; cursor: pointer; font: inherit; font-size: 12px; font-weight: 700; color: var(--as-text-muted);
  background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: all 0.18s; }
.al-seg-btn:hover { color: var(--as-text); border-color: var(--as-border-strong); }
.al-seg-btn.on { color: var(--c); background: color-mix(in srgb, var(--c) 13%, transparent); border-color: color-mix(in srgb, var(--c) 40%, transparent); }

.al-textarea { width: 100%; box-sizing: border-box; resize: vertical; font: inherit; font-size: 13.5px; color: var(--as-text); padding: 10px 12px;
  border-radius: 11px; background: var(--as-surface); border: 1px solid var(--as-border-soft); transition: border-color 0.2s; }
.al-textarea:focus { outline: none; border-color: color-mix(in srgb, var(--as-amber) 55%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--as-amber) 10%, transparent); }

.as-btn.disabled { opacity: 0.5; cursor: not-allowed; }
.spin { animation: as-spin 0.9s linear infinite; }

@media (prefers-reduced-motion: reduce) {
  .al-emp { animation: none; }
  .al-tk-beam.live { animation: none; }
}
</style>
