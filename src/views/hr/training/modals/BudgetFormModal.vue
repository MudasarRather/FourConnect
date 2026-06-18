<template>
  <TrnModal :open="open" wide :title="budget ? 'Edit budget' : 'New training budget'"
    subtitle="Allocate L&D spend for a period and (optionally) a department." :icon="Wallet" @close="$emit('close')">
    <div class="bf-layout">
      <!-- form -->
      <div class="bf-form">
        <Motion as="div" class="bf-group" :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.04 }">
          <TrnField v-model="form.name" label="Budget name" required placeholder="e.g. FY26 Engineering L&D" />
        </Motion>

        <Motion as="div" class="bf-group" :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.09 }">
          <span class="bf-label">Period</span>
          <div class="bf-seg" :style="{ '--idx': periodIdx, '--count': 3 }">
            <span class="bf-seg-ind" aria-hidden="true" />
            <button v-for="p in PERIODS" :key="p" type="button" :class="{ on: form.period_type === p }" @click="setPeriod(p)">{{ cap(p) }}</button>
          </div>
          <Presence>
            <Motion v-if="form.period_type === 'QUARTERLY'" as="div" class="bf-sub" key="q"
              :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :exit="{ opacity: 0, height: 0 }" :transition="{ duration: 0.26 }">
              <div class="bf-chips">
                <button v-for="q in 4" :key="q" type="button" class="bf-chip" :class="{ on: form.period_index === q }" @click="form.period_index = q">Q{{ q }}</button>
              </div>
            </Motion>
            <Motion v-else-if="form.period_type === 'MONTHLY'" as="div" class="bf-sub" key="m"
              :initial="{ opacity: 0, height: 0 }" :animate="{ opacity: 1, height: 'auto' }" :exit="{ opacity: 0, height: 0 }" :transition="{ duration: 0.26 }">
              <TrnSelect v-model="form.period_index" :options="monthOptions" placeholder="Pick a month" />
            </Motion>
          </Presence>
        </Motion>

        <Motion as="div" class="bf-group bf-row" :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.14 }">
          <TrnField v-model.number="form.fiscal_year" label="Fiscal year" type="number" required />
          <TrnSelect v-model="form.department_id" label="Department" :options="deptOptions" placeholder="Org-wide" searchable search-placeholder="Search departments…" />
        </Motion>

        <Motion as="div" class="bf-group bf-row" :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, delay: 0.19 }">
          <TrnField v-model.number="form.allocated_amount" label="Allocated amount" type="number" />
          <TrnSelect v-model="form.currency" label="Currency" :options="CURRENCIES" />
        </Motion>

        <Presence>
          <Motion v-if="duplicate" as="div" class="bf-dup" key="dup"
            :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }" :exit="{ opacity: 0, y: 6 }" :transition="{ duration: 0.3 }">
            <TriangleAlert :size="15" />
            <span>A <b>{{ cap(form.period_type) }}</b> budget for this {{ form.department_id ? 'department' : 'org-wide scope' }} &amp; period already exists (<b>{{ duplicate.name }}</b>).</span>
          </Motion>
        </Presence>
      </div>

      <!-- live preview -->
      <aside class="bf-aside">
        <span class="bf-aside-eyebrow"><Sparkles :size="12" /> Live preview</span>
        <Motion as="div" class="bf-preview" :animate="{ scale: form.name ? 1 : 0.99 }">
          <span class="bf-pv-accent" aria-hidden="true" />
          <div class="bf-pv-head">
            <span class="bf-pv-ic"><Wallet :size="16" /></span>
            <span class="bf-pv-name">{{ form.name || 'Budget name' }}</span>
          </div>
          <div class="bf-pv-badges">
            <span class="bf-pv-badge"><CalendarRange :size="11" /> {{ periodLabel }} · FY{{ String(form.fiscal_year || '').slice(-2) }}</span>
            <span class="bf-pv-badge"><Building2 :size="11" /> {{ selectedDept || 'Org-wide' }}</span>
          </div>
          <div class="bf-pv-amount">
            <span class="bf-pv-amt trn-mono">₹{{ inr(form.allocated_amount) }}</span>
            <span class="bf-pv-amt-l">allocated</span>
          </div>
          <div class="bf-pv-rail"><span class="bf-pv-rail-fill" /></div>
          <div v-if="fyShare != null" class="bf-pv-share"><TrendingUp :size="12" /> {{ fyShare }}% of FY{{ String(form.fiscal_year || '').slice(-2) }} allocation</div>
        </Motion>
        <p class="bf-hint">Committed &amp; spent will burn down against this allocation as cost lines are logged.</p>
      </aside>
    </div>

    <template #footer>
      <button class="trn-btn trn-btn-ghost" @click="$emit('close')">Cancel</button>
      <Motion as="button" type="button" class="trn-btn trn-btn-primary" :disabled="!canSave || saving"
        :whileHover="canSave && !saving ? { y: -2 } : {}" :whileTap="canSave && !saving ? { scale: 0.97 } : {}" @click="save">
        <Loader v-if="saving" :size="14" class="spin" /><Wallet v-else :size="15" />
        {{ budget ? 'Save changes' : 'Create budget' }}
      </Motion>
    </template>
  </TrnModal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Motion, AnimatePresence as Presence } from 'motion-v'
import { useToast } from 'vue-toastification'
import { Wallet, Loader, CalendarRange, Building2, Sparkles, TriangleAlert, TrendingUp } from 'lucide-vue-next'
import TrnModal from '../components/TrnModal.vue'
import TrnField from '../components/TrnField.vue'
import TrnSelect from '../components/TrnSelect.vue'
import { createBudget, patchBudget } from '@/composables/useTraining'
import { useHrReference } from '@/composables/useEmployees'

const props = defineProps({
  open: { type: Boolean, default: false },
  budget: { type: Object, default: null },
  existing: { type: Array, default: () => [] },
})
const emit = defineEmits(['close', 'saved'])
const toast = useToast()
const saving = ref(false)
const { reference, loadReferenceData } = useHrReference()

const PERIODS = ['MONTHLY', 'QUARTERLY', 'ANNUAL']
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const monthOptions = MONTHS.map((m, i) => ({ value: i + 1, label: m }))

const cap = (s) => (s || '').charAt(0) + (s || '').slice(1).toLowerCase()
const num = (v) => Number(v || 0)
const inr = (v) => num(v).toLocaleString('en-IN')

const deptOptions = computed(() => (reference.departments || []).map(d => ({ value: d.id, label: d.name })))
const selectedDept = computed(() => deptOptions.value.find(d => d.value === form.value.department_id)?.label || '')
const periodIdx = computed(() => PERIODS.indexOf(form.value.period_type))

const thisYear = new Date().getFullYear()
const blank = () => ({ name: '', period_type: 'ANNUAL', fiscal_year: thisYear, period_index: null, department_id: '', allocated_amount: 0, currency: 'INR' })
const form = ref(blank())

const setPeriod = (p) => {
  form.value.period_type = p
  if (p === 'ANNUAL') form.value.period_index = null
  else if (p === 'QUARTERLY' && (!form.value.period_index || form.value.period_index > 4)) form.value.period_index = 1
  else if (p === 'MONTHLY' && (!form.value.period_index || form.value.period_index > 12)) form.value.period_index = thisMonth
}
const thisMonth = new Date().getMonth() + 1

const periodLabel = computed(() => {
  const t = form.value.period_type, idx = form.value.period_index
  if (t === 'ANNUAL') return 'Annual'
  if (t === 'QUARTERLY') return idx ? `Q${idx}` : 'Quarterly'
  if (t === 'MONTHLY') return (idx >= 1 && idx <= 12) ? MONTHS[idx - 1].slice(0, 3) : 'Monthly'
  return 'Annual'
})

const duplicate = computed(() => {
  const f = form.value
  return (props.existing || []).find(b =>
    (!props.budget || b.id !== props.budget.id) &&
    b.fiscal_year === Number(f.fiscal_year) &&
    b.period_type === f.period_type &&
    (b.period_index ?? null) === (f.period_index ?? null) &&
    (b.department_id || '') === (f.department_id || '')) || null
})

const fyShare = computed(() => {
  const alloc = num(form.value.allocated_amount)
  if (!alloc) return null
  const others = (props.existing || [])
    .filter(b => b.fiscal_year === Number(form.value.fiscal_year) && (!props.budget || b.id !== props.budget.id))
    .reduce((s, b) => s + num(b.allocated_amount), 0)
  const total = others + alloc
  return total > 0 ? Math.round((alloc / total) * 100) : 100
})

const canSave = computed(() => !!form.value.name && !!form.value.fiscal_year)

watch(() => props.open, (o) => {
  if (!o) return
  loadReferenceData()
  form.value = props.budget
    ? {
        name: props.budget.name || '', period_type: props.budget.period_type || 'ANNUAL', fiscal_year: props.budget.fiscal_year || thisYear,
        period_index: props.budget.period_index ?? null, department_id: props.budget.department_id || '',
        allocated_amount: props.budget.allocated_amount ?? 0, currency: props.budget.currency || 'INR',
      }
    : blank()
})

const save = async () => {
  if (!canSave.value) return
  saving.value = true
  try {
    const payload = { ...form.value }
    if (!payload.department_id) delete payload.department_id
    if (payload.period_index === null || payload.period_index === '') delete payload.period_index
    if (props.budget) await patchBudget(props.budget.id, payload)
    else await createBudget(payload)
    toast.success(props.budget ? 'Budget updated' : 'Budget created')
    emit('saved'); emit('close')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not save budget') }
  finally { saving.value = false }
}
</script>

<style scoped>
.bf-layout { display: grid; grid-template-columns: 1.3fr 1fr; gap: 20px; }
.bf-form { display: flex; flex-direction: column; gap: 14px; }
.bf-group { display: flex; flex-direction: column; gap: 8px; }
.bf-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.bf-label { font-size: 12px; font-weight: 600; color: var(--trn-text-secondary); }

.bf-seg { position: relative; display: grid; grid-template-columns: repeat(3, 1fr); padding: 4px; border-radius: 12px; background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.bf-seg-ind { position: absolute; top: 4px; bottom: 4px; left: 4px; width: calc((100% - 8px) / var(--count)); border-radius: 9px; z-index: 0;
  background: color-mix(in srgb, var(--trn-amber) 16%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--trn-amber) 32%, transparent);
  transform: translateX(calc(var(--idx) * 100%)); transition: transform 0.38s var(--trn-spring); }
.bf-seg button { position: relative; z-index: 1; font: inherit; font-size: 12.5px; font-weight: 600; padding: 8px; border: 0; background: transparent; cursor: pointer; color: var(--trn-text-muted); transition: color 0.25s; border-radius: 9px; }
.bf-seg button.on { color: var(--trn-amber-strong); }
.bf-sub { overflow: hidden; }
.bf-chips { display: flex; gap: 8px; }
.bf-chip { flex: 1; font: inherit; font-size: 12.5px; font-weight: 700; padding: 8px; border-radius: 10px; cursor: pointer; color: var(--trn-text-muted);
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); transition: all 0.2s; }
.bf-chip:hover { color: var(--trn-text); }
.bf-chip.on { color: var(--trn-amber-strong); border-color: color-mix(in srgb, var(--trn-amber) 50%, transparent); background: color-mix(in srgb, var(--trn-amber) 13%, transparent); }

.bf-dup { display: flex; align-items: flex-start; gap: 9px; padding: 10px 12px; border-radius: 11px; font-size: 12px; line-height: 1.5;
  color: var(--trn-text-secondary); background: var(--trn-st-waived-soft); border: 1px solid color-mix(in srgb, var(--trn-st-waived) 30%, transparent); }
.bf-dup :deep(svg) { color: var(--trn-st-waived); flex-shrink: 0; margin-top: 1px; }
.bf-dup b { color: var(--trn-text); }

/* preview */
.bf-aside { display: flex; flex-direction: column; gap: 10px; }
.bf-aside-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--trn-mono); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--trn-amber-strong); }
.bf-aside-eyebrow :deep(svg) { color: var(--trn-amber); }
.bf-preview { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: 12px; padding: 16px 16px 16px 18px; border-radius: 16px;
  background: var(--trn-grad-hero), var(--trn-surface); border: 1px solid var(--trn-border-soft); transition: transform 0.3s var(--trn-spring); }
.bf-pv-accent { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: linear-gradient(180deg, var(--trn-amber-bright), var(--trn-amber-strong)); }
.bf-pv-head { display: flex; align-items: center; gap: 9px; }
.bf-pv-ic { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0; color: var(--trn-amber); background: color-mix(in srgb, var(--trn-amber) 14%, transparent); }
.bf-pv-name { font-size: 14.5px; font-weight: 750; color: var(--trn-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bf-pv-badges { display: flex; flex-wrap: wrap; gap: 6px; }
.bf-pv-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; font-weight: 600; color: var(--trn-text-muted); padding: 3px 8px; border-radius: 7px; background: var(--trn-surface-elevated); border: 1px solid var(--trn-border-soft); }
.bf-pv-badge :deep(svg) { color: var(--trn-text-dim); }
.bf-pv-amount { display: flex; align-items: baseline; gap: 8px; }
.bf-pv-amt { font-size: 26px; font-weight: 850; color: var(--trn-text); letter-spacing: -0.02em; }
.bf-pv-amt-l { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--trn-text-dim); }
.bf-pv-rail { height: 8px; border-radius: 999px; overflow: hidden; background: color-mix(in srgb, var(--trn-st-completed) 16%, var(--trn-surface)); border: 1px solid var(--trn-border-soft); }
.bf-pv-rail-fill { display: block; height: 100%; width: 0; }
.bf-pv-share { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 600; color: var(--trn-amber-strong); }
.bf-hint { margin: 0; font-size: 11.5px; line-height: 1.5; color: var(--trn-text-dim); }

.spin { animation: trn-orbit-spin 0.9s linear infinite; }
@media (max-width: 640px) {
  .bf-layout { grid-template-columns: 1fr; }
  .bf-row { grid-template-columns: 1fr; }
}
@media (prefers-reduced-motion: reduce) { .spin { animation: none; } .bf-seg-ind { transition: none; } }
</style>
