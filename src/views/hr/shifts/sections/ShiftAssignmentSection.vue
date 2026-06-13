<template>
  <section class="assign">
    <Motion as="header" class="assign-banner" :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5 }">
      <span class="banner-glow" />
      <div class="banner-text">
        <span class="eyebrow"><span class="eyebrow-dot" /> Place the workforce</span>
        <h2>Shift Assignment</h2>
        <p>Pick a shift to roll it out to employees over a date range. Overlaps on a different shift are blocked — the engine returns the conflicting rows so you can resolve them.</p>
      </div>
      <button class="btn-ghost" @click="reload" :class="{ spin: loading }"><RefreshCw :size="14" /> Refresh</button>
    </Motion>

    <!-- shift picker strip -->
    <div class="picker">
      <span class="picker-label">Assign to:</span>
      <div class="picker-chips">
        <button v-for="s in shifts" :key="s.id" class="pchip" @click="openAssign(s)">
          <span class="pchip-dot" :style="{ background: shiftTypeMeta(s.shift_type).color }" />
          {{ s.name }}
          <span class="pchip-count">{{ counts[s.id] || 0 }}</span>
        </button>
        <span v-if="!shifts.length" class="picker-empty">No shifts yet — create one in Shift Management.</span>
      </div>
    </div>

    <!-- active assignments table -->
    <div class="table-card">
      <div class="tc-head">
        <h3>Active assignments <span class="tc-count">{{ filtered.length }}</span></h3>
        <div class="tc-search"><Search :size="13" /><input v-model="search" placeholder="Search employee / shift…" /></div>
      </div>
      <div class="tbl-wrap" v-if="filtered.length">
        <table class="tbl">
          <thead><tr><th>Employee</th><th>Shift</th><th>Effective from</th><th>Until</th><th></th></tr></thead>
          <tbody>
            <Motion v-for="(a, i) in filtered" :key="a.id" as="tr"
              :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :transition="{ duration: 0.25, delay: Math.min(i * 0.015, 0.3) }">
              <td><span class="emp-name">{{ a.employee_name || '—' }}</span></td>
              <td><span class="shift-tag"><span class="st-code">{{ a.shift_code }}</span> {{ a.shift_name }}</span></td>
              <td class="mono">{{ a.effective_from }}</td>
              <td class="mono">{{ a.effective_until || '— open' }}</td>
              <td class="ta-act"><button class="rm" :disabled="removingId === a.id" @click="remove(a)" title="Remove"><X :size="13" /></button></td>
            </Motion>
          </tbody>
        </table>
      </div>
      <ShiftEmptyState v-else :icon="UsersRound" title="No active assignments"
        sub="Pick a shift above to start placing employees on it." />
    </div>

    <ShiftAssignModal :open="showAssign" :shift="assignTarget" @close="showAssign = false" @assigned="onAssigned" />
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { RefreshCw, Search, X, UsersRound } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import ShiftAssignModal from '../modals/ShiftAssignModal.vue'
import ShiftEmptyState from '../components/ShiftEmptyState.vue'
import { fetchShifts, fetchShiftAssignments, unassignShift, shiftTypeMeta, todayIso } from '@/composables/useShifts'

const emit = defineEmits(['refresh-stats'])
const toast = useToast()

const shifts = ref([])
const assignments = ref([])
const counts = reactive({})
const loading = ref(false)
const search = ref('')
const showAssign = ref(false)
const assignTarget = ref(null)
const removingId = ref(null)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return assignments.value
  return assignments.value.filter(a =>
    (a.employee_name || '').toLowerCase().includes(q) ||
    (a.shift_name || '').toLowerCase().includes(q) ||
    (a.shift_code || '').toLowerCase().includes(q))
})

const reload = async () => {
  loading.value = true
  try {
    const [sh, as] = await Promise.all([
      fetchShifts({ limit: 100 }),
      fetchShiftAssignments({ active_on: todayIso() }),
    ])
    shifts.value = sh.items || []
    const rows = Array.isArray(as) ? as : (as.items || [])
    assignments.value = rows
    for (const key of Object.keys(counts)) delete counts[key]
    for (const a of rows) counts[a.shift_id] = (counts[a.shift_id] || 0) + 1
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load assignments')
  } finally { loading.value = false }
}
onMounted(reload)

const openAssign = (s) => { assignTarget.value = s; showAssign.value = true }
const onAssigned = async () => { await reload(); emit('refresh-stats') }

const remove = async (a) => {
  if (removingId.value) return
  removingId.value = a.id
  try {
    await unassignShift(a.id)
    toast.success(`${a.employee_name || 'Employee'} removed from ${a.shift_code}`)
    await reload(); emit('refresh-stats')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not remove') }
  finally { removingId.value = null }
}
</script>

<style scoped>
.assign { display: flex; flex-direction: column; gap: 16px; }
.assign-banner { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 20px; padding: 20px 24px; border-radius: 20px; overflow: hidden; background: var(--shift-surface); border: 1px solid var(--shift-border); }
.banner-glow { position: absolute; inset: 0; background: var(--shift-grad-hero); pointer-events: none; }
.banner-text { position: relative; z-index: 1; max-width: 640px; }
.eyebrow { display: inline-flex; align-items: center; gap: 7px; font-family: var(--shift-mono); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--shift-amber-strong); }
.eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--shift-ok); }
.banner-text h2 { margin: 6px 0 4px; font-size: 22px; font-weight: 800; color: var(--shift-text); letter-spacing: -0.02em; }
.banner-text p { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--shift-text-muted); }
.btn-ghost { display: inline-flex; align-items: center; gap: 6px; padding: 9px 13px; border-radius: 10px; cursor: pointer; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); font-weight: 600; font-size: 13px; flex-shrink: 0; }
.btn-ghost:hover { color: var(--shift-text); border-color: var(--shift-border); }
.btn-ghost.spin :deep(svg) { animation: shift-spin 0.85s linear infinite; }

.picker { display: flex; align-items: center; gap: 12px; padding: 14px 18px; border-radius: 16px; background: var(--shift-surface); border: 1px solid var(--shift-border-soft); }
.picker-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--shift-text-muted); flex-shrink: 0; }
.picker-chips { display: flex; flex-wrap: wrap; gap: 8px; }
.pchip { display: inline-flex; align-items: center; gap: 7px; padding: 7px 12px; border-radius: 999px; cursor: pointer;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); font-size: 12.5px; font-weight: 600; transition: 0.18s; }
.pchip:hover { border-color: var(--shift-amber); color: var(--shift-text); transform: translateY(-1px); }
.pchip-dot { width: 8px; height: 8px; border-radius: 50%; }
.pchip-count { font-family: var(--shift-mono); font-size: 10px; padding: 1px 6px; border-radius: 999px; background: rgba(251,191,36,0.14); color: var(--shift-amber); }
.picker-empty { font-size: 12px; color: var(--shift-text-dim); }

.table-card { border-radius: 18px; background: var(--shift-surface); border: 1px solid var(--shift-border-soft); overflow: hidden; }
.tc-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 18px; border-bottom: 1px solid var(--shift-border-soft); }
.tc-head h3 { margin: 0; font-size: 14px; font-weight: 700; color: var(--shift-text); display: inline-flex; align-items: center; gap: 8px; }
.tc-count { font-family: var(--shift-mono); font-size: 11px; padding: 2px 8px; border-radius: 999px; background: rgba(251,191,36,0.14); color: var(--shift-amber); }
.tc-search { display: flex; align-items: center; gap: 7px; padding: 7px 11px; border-radius: 10px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); color: var(--shift-text-muted); }
.tc-search input { background: transparent; border: 0; outline: none; color: var(--shift-text); font: inherit; font-size: 12.5px; width: 200px; }
.tbl-wrap { overflow-x: auto; }
.tbl { width: 100%; border-collapse: collapse; }
.tbl th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--shift-text-dim); padding: 11px 18px; border-bottom: 1px solid var(--shift-border-soft); font-weight: 600; }
.tbl td { padding: 11px 18px; border-bottom: 1px solid var(--shift-border-soft); font-size: 13px; color: var(--shift-text-2); }
.tbl tbody tr:hover td { background: rgba(251,191,36,0.04); }
.emp-name { color: var(--shift-text); font-weight: 600; }
.shift-tag { display: inline-flex; align-items: center; gap: 7px; }
.st-code { font-family: var(--shift-mono); font-size: 10px; padding: 2px 7px; border-radius: 6px; background: rgba(251,191,36,0.12); color: var(--shift-amber); }
.mono { font-family: var(--shift-mono); font-size: 12px; color: var(--shift-text-muted); }
.ta-act { text-align: right; }
.rm { width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--shift-alert-soft); background: var(--shift-alert-soft); color: var(--shift-alert); cursor: pointer; display: inline-grid; place-items: center; }
.rm:disabled { opacity: 0.5; }
@media (max-width: 600px) { .tc-search input { width: 120px; } }
</style>
