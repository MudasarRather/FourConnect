<template>
  <section class="hol">
    <Motion as="header" class="hol-banner" :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5 }">
      <span class="banner-glow" />
      <div class="banner-text">
        <span class="eyebrow"><Palmtree :size="12" /> Essential staffing</span>
        <h2>Holiday Shifts</h2>
        <p>Assign essential staff to work on holidays with their compensation rule — double-pay, comp-off, allowance or overtime. Feeds the pay run.</p>
      </div>
      <button class="btn-ghost" @click="reload" :class="{ spin: loading }"><RefreshCw :size="14" /> Refresh</button>
    </Motion>

    <div class="hol-pick">
      <span class="pick-label"><CalendarDays :size="13" /> Holiday</span>
      <select v-model="selectedId" class="pick-select" @change="loadAssignments">
        <option value="">Select a holiday…</option>
        <option v-for="h in holidays" :key="h.id" :value="h.id">{{ h.date }} — {{ h.name }}</option>
      </select>
      <span class="flex-spacer" />
      <button v-if="selected" class="btn-primary" @click="showModal = true"><Plus :size="14" />Assign staff</button>
    </div>

    <div v-if="selected" class="hol-body">
      <div class="hol-summary">
        <div class="hs-card"><b>{{ assignments.length }}</b><span>On duty</span></div>
        <div class="hs-card" v-for="c in compBreakdown" :key="c.key"><b>{{ c.count }}</b><span>{{ c.label }}</span></div>
      </div>
      <div class="table-card" v-if="assignments.length">
        <table class="tbl">
          <thead><tr><th>Employee</th><th>Shift</th><th>Compensation</th><th>×</th><th></th></tr></thead>
          <tbody>
            <Motion v-for="(a, i) in assignments" :key="a.id" as="tr" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :transition="{ duration: 0.25, delay: Math.min(i*0.02,0.3) }">
              <td><b class="emp">{{ a.employee_name }}</b></td>
              <td>{{ a.shift_code || '—' }}</td>
              <td><ShiftStatusPill :tone="compTone(a.compensation)">{{ compMeta(a.compensation).label }}</ShiftStatusPill></td>
              <td class="mono">{{ a.pay_multiplier }}×</td>
              <td class="ta-act"><button class="rm" @click="remove(a)"><X :size="13" /></button></td>
            </Motion>
          </tbody>
        </table>
      </div>
      <ShiftEmptyState v-else :icon="Palmtree" title="No one assigned yet"
        :sub="`Assign essential staff to work ${selectedHoliday?.name || 'this holiday'}.`">
        <template #actions><button class="btn-primary" @click="showModal = true"><Plus :size="14" />Assign staff</button></template>
      </ShiftEmptyState>
    </div>
    <ShiftEmptyState v-else-if="!loading" :icon="CalendarDays" title="Pick a holiday"
      sub="Select an upcoming holiday to manage who works it and how they're compensated." />

    <ShiftHolidayAssignModal :open="showModal" :holiday="selectedHoliday" @close="showModal = false" @saved="onSaved" />
  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { Palmtree, RefreshCw, Plus, CalendarDays, X } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import ShiftHolidayAssignModal from '../modals/ShiftHolidayAssignModal.vue'
import ShiftStatusPill from '../components/ShiftStatusPill.vue'
import ShiftEmptyState from '../components/ShiftEmptyState.vue'
import { fetchHolidays, fetchHolidayShifts, deleteHolidayShift, HOLIDAY_COMP_TYPES, compMeta } from '@/composables/useShifts'

const emit = defineEmits(['refresh-stats'])
const toast = useToast()
const holidays = ref([])
const assignments = ref([])
const selectedId = ref('')
const loading = ref(false)
const showModal = ref(false)

const selected = computed(() => !!selectedId.value)
const selectedHoliday = computed(() => holidays.value.find(h => h.id === selectedId.value) || null)
const compBreakdown = computed(() => HOLIDAY_COMP_TYPES.map(c => ({ key: c.key, label: c.label, count: assignments.value.filter(a => a.compensation === c.key).length })).filter(c => c.count > 0))

const compTone = (k) => ({ DOUBLE_PAY: 'gold', OVERTIME: 'warn', HOLIDAY_ALLOWANCE: 'ok', COMP_OFF: 'neutral' }[k] || 'neutral')

const reload = async () => {
  loading.value = true
  try {
    const today = new Date().toISOString().slice(0, 10)
    const all = await fetchHolidays({ limit: 200 })
    // upcoming-first, but keep all so past holidays remain selectable
    holidays.value = all.sort((a, b) => (a.date < b.date ? 1 : -1))
    if (selectedId.value) await loadAssignments()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load holidays') }
  finally { loading.value = false }
}
const loadAssignments = async () => {
  if (!selectedId.value) { assignments.value = []; return }
  try { const d = await fetchHolidayShifts({ holiday_id: selectedId.value, limit: 200 }); assignments.value = d.items || [] }
  catch (e) { toast.error(e?.response?.data?.detail || 'Could not load assignments') }
}
onMounted(reload)

const onSaved = async () => { await loadAssignments(); emit('refresh-stats') }
const remove = async (a) => {
  if (!window.confirm(`Remove ${a.employee_name} from this holiday?`)) return
  try { await deleteHolidayShift(a.id); toast.success('Removed'); await loadAssignments(); emit('refresh-stats') }
  catch (e) { toast.error(e?.response?.data?.detail || 'Could not remove') }
}
</script>

<style scoped>
.hol { display: flex; flex-direction: column; gap: 16px; }
.hol-banner { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 20px 24px; border-radius: 20px; overflow: hidden; background: var(--shift-surface); border: 1px solid var(--shift-border); }
.banner-glow { position: absolute; inset: 0; background: var(--shift-grad-hero); pointer-events: none; }
.banner-text { position: relative; z-index: 1; max-width: 640px; }
.eyebrow { display: inline-flex; align-items: center; gap: 7px; font-family: var(--shift-mono); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--shift-amber-strong); }
.banner-text h2 { margin: 6px 0 4px; font-size: 22px; font-weight: 800; color: var(--shift-text); letter-spacing: -0.02em; }
.banner-text p { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--shift-text-muted); }
.btn-ghost { display: inline-flex; align-items: center; gap: 6px; padding: 9px 13px; border-radius: 10px; cursor: pointer; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); font-weight: 600; font-size: 13px; flex-shrink: 0; }
.btn-ghost.spin :deep(svg) { animation: shift-spin 0.85s linear infinite; }
.btn-primary { display: inline-flex; align-items: center; gap: 6px; padding: 9px 15px; border-radius: 10px; border: none; cursor: pointer; background: var(--shift-grad-cta); color: #1f1408; font-weight: 700; font-size: 13px; }

.hol-pick { display: flex; align-items: center; gap: 12px; padding: 13px 18px; border-radius: 14px; background: var(--shift-surface); border: 1px solid var(--shift-border-soft); }
.pick-label { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--shift-text-muted); }
.pick-select { padding: 8px 12px; border-radius: 9px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); color: var(--shift-text); font: inherit; font-size: 12.5px; min-width: 280px; }
.flex-spacer { flex: 1; }

.hol-body { display: flex; flex-direction: column; gap: 14px; }
.hol-summary { display: flex; gap: 12px; flex-wrap: wrap; }
.hs-card { text-align: center; padding: 12px 18px; border-radius: 14px; background: var(--shift-surface); border: 1px solid var(--shift-border-soft); }
.hs-card b { display: block; font-family: var(--shift-mono); font-size: 22px; font-weight: 800; color: var(--shift-amber); }
.hs-card span { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--shift-text-muted); }

.table-card { border-radius: 16px; background: var(--shift-surface); border: 1px solid var(--shift-border-soft); overflow: hidden; }
.tbl { width: 100%; border-collapse: collapse; }
.tbl th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--shift-text-dim); padding: 11px 18px; border-bottom: 1px solid var(--shift-border-soft); }
.tbl td { padding: 11px 18px; border-bottom: 1px solid var(--shift-border-soft); font-size: 13px; color: var(--shift-text-2); }
.tbl tbody tr:hover td { background: rgba(251,191,36,0.04); }
.emp { color: var(--shift-text); }
.mono { font-family: var(--shift-mono); color: var(--shift-text); }
.ta-act { text-align: right; }
.rm { width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--shift-alert-soft); background: var(--shift-alert-soft); color: var(--shift-alert); cursor: pointer; display: inline-grid; place-items: center; }
@media (max-width: 600px) { .pick-select { min-width: 0; flex: 1; } }
</style>
