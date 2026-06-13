<template>
  <section class="mgmt">
    <Motion as="header" class="mgmt-banner" :initial="{ opacity: 0, y: -10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5 }">
      <span class="banner-glow" />
      <div class="banner-text">
        <span class="eyebrow"><span class="eyebrow-dot" /> Schedule templates</span>
        <h2>Shift Management</h2>
        <p>Reusable shift blueprints — timing, break windows, late-punch policy and overrun alerts. Assign one as the active shift per employee; the daily rollup honours it.</p>
      </div>
      <div class="banner-actions">
        <button class="btn-primary" @click="openCreate"><Plus :size="14" />New shift</button>
        <button class="btn-ghost" @click="reload" :class="{ spin: loading }"><RefreshCw :size="14" /></button>
      </div>
    </Motion>

    <div v-if="loading && !shifts.length" class="grid">
      <div v-for="n in 4" :key="n" class="sk-card" />
    </div>

    <div v-else class="grid">
      <Motion v-for="(s, i) in shifts" :key="s.id" as="article" class="shift-card"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.4, delay: 0.04 * i, ease: [0.16,1,0.3,1] }" :whileHover="{ y: -3 }">
        <header class="sc-head">
          <div class="sc-id">
            <span class="sc-code">{{ s.code }}</span>
            <span class="sc-type" :style="{ color: shiftTypeMeta(s.shift_type).color, borderColor: shiftTypeMeta(s.shift_type).color }">{{ s.shift_type }}</span>
          </div>
          <div class="sc-actions">
            <button title="Assign" @click="openAssign(s)"><UsersRound :size="13" /></button>
            <button title="Edit" @click="openEdit(s)"><Pencil :size="13" /></button>
            <button title="Delete" class="danger" @click="askDelete(s)"><Trash2 :size="13" /></button>
          </div>
        </header>
        <h3 class="sc-name">{{ s.name }}</h3>

        <div class="sc-timeline">
          <div class="tl-track">
            <div class="tl-bar" :style="{ left: hourPct(s.start_time) + '%', width: durationPct(s.start_time, s.end_time) + '%', background: shiftTypeMeta(s.shift_type).color }">
              <span class="tl-start">{{ shortTime(s.start_time) }}</span>
              <span class="tl-end">{{ shortTime(s.end_time) }}</span>
            </div>
            <span v-for="(bw, bi) in (s.break_windows || [])" :key="bi" class="tl-break"
              :style="{ left: hourPct(bw.start_time) + '%', width: durationPct(bw.start_time, bw.end_time) + '%' }"
              :title="`${bw.label} ${bw.start_time}–${bw.end_time} (max ${bw.max_minutes}m)`"><span class="tl-break-dot" /></span>
          </div>
          <div class="tl-ruler"><span v-for="h in [0,6,12,18,24]" :key="h">{{ String(h).padStart(2,'0') }}</span></div>
        </div>

        <div class="sc-meta">
          <span><Coffee :size="11" />{{ s.break_minutes }}m break</span>
          <span><Hourglass :size="11" />{{ s.grace_minutes }}m grace</span>
          <span><CalendarOff :size="11" />{{ offLabel(s.weekly_off_days) }}</span>
        </div>
        <div class="sc-chips">
          <ShiftStatusPill v-if="s.late_punch_requires_approval" tone="gold"><ShieldCheck :size="10" /> Approval</ShiftStatusPill>
          <ShiftStatusPill v-if="(s.break_windows||[]).length" tone="neutral">{{ s.break_windows.length }} window{{ s.break_windows.length>1?'s':'' }}</ShiftStatusPill>
          <ShiftStatusPill v-if="s.night_allowance" tone="gold"><Moon :size="10" /> Night</ShiftStatusPill>
        </div>
        <button class="sc-assign" @click="openAssign(s)">
          <UsersRound :size="12" />
          {{ (counts[s.id] || 0) === 0 ? 'Assign to employees' : `${counts[s.id]} assigned · manage` }}
        </button>
      </Motion>

      <ShiftEmptyState v-if="!loading && !shifts.length" :icon="CalendarClock"
        title="No shift templates yet"
        sub="Create reusable blueprints with break windows, late-punch policy and overrun alerts — then assign them per employee.">
        <template #actions><button class="btn-primary" @click="openCreate"><Plus :size="14" />Create first shift</button></template>
      </ShiftEmptyState>
    </div>

    <ShiftFormModal :open="showForm" :shift="editTarget" @close="showForm = false" @saved="onSaved" />
    <ShiftAssignModal :open="showAssign" :shift="assignTarget" @close="showAssign = false" @assigned="onAssigned" />

    <OnbModal :open="!!deleteTarget" title="Delete shift template?" :icon="Trash2" :width="460" @close="deleteTarget = null">
      <p class="del-copy">Existing assignments stay intact, but new assignments to <b>{{ deleteTarget?.name }}</b> will be blocked. This is logged to the audit trail.</p>
      <template #footer>
        <button class="btn-ghost" @click="deleteTarget = null">Cancel</button>
        <button class="btn-danger" :disabled="deleting" @click="confirmDelete">
          <Loader2 v-if="deleting" :size="14" class="spin" /> Delete shift
        </button>
      </template>
    </OnbModal>
  </section>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { Motion } from 'motion-v'
import {
  Plus, RefreshCw, UsersRound, Pencil, Trash2, Coffee, Hourglass, CalendarOff,
  ShieldCheck, Moon, CalendarClock, Loader2,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import ShiftFormModal from '../modals/ShiftFormModal.vue'
import ShiftAssignModal from '../modals/ShiftAssignModal.vue'
import ShiftStatusPill from '../components/ShiftStatusPill.vue'
import ShiftEmptyState from '../components/ShiftEmptyState.vue'
import OnbModal from '../../onboarding/components/OnbModal.vue'
import {
  fetchShifts, deleteShift, fetchShiftAssignments,
  hourPct, durationPct, shortTime, shiftTypeMeta, DOW_FULL, todayIso,
} from '@/composables/useShifts'

const emit = defineEmits(['refresh-stats'])
const toast = useToast()

const shifts = ref([])
const loading = ref(false)
const counts = reactive({})
const showForm = ref(false)
const editTarget = ref(null)
const showAssign = ref(false)
const assignTarget = ref(null)
const deleteTarget = ref(null)
const deleting = ref(false)

const offLabel = (arr) => {
  if (!Array.isArray(arr) || !arr.length) return 'No off day'
  return arr.map(d => DOW_FULL[d]).join(', ') + ' off'
}

const reload = async () => {
  loading.value = true
  try {
    const data = await fetchShifts({ limit: 100 })
    shifts.value = data.items || []
    try {
      const assigns = await fetchShiftAssignments({ active_on: todayIso() })
      const rows = Array.isArray(assigns) ? assigns : (assigns.items || [])
      for (const key of Object.keys(counts)) delete counts[key]
      for (const a of rows) counts[a.shift_id] = (counts[a.shift_id] || 0) + 1
    } catch { /* counts best-effort */ }
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load shifts')
  } finally { loading.value = false }
}
onMounted(reload)

const openCreate = () => { editTarget.value = null; showForm.value = true }
const openEdit = (s) => { editTarget.value = s; showForm.value = true }
const openAssign = (s) => { assignTarget.value = s; showAssign.value = true }
const onSaved = async () => { await reload(); emit('refresh-stats') }
const onAssigned = async () => { await reload(); emit('refresh-stats') }

const askDelete = (s) => { deleteTarget.value = s }
const confirmDelete = async () => {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await deleteShift(deleteTarget.value.id)
    toast.success(`Shift "${deleteTarget.value.name}" deleted`)
    deleteTarget.value = null
    await reload(); emit('refresh-stats')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not delete shift') }
  finally { deleting.value = false }
}
</script>

<style scoped>
.mgmt { display: flex; flex-direction: column; gap: 18px; }
.mgmt-banner { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 20px;
  padding: 20px 24px; border-radius: 20px; overflow: hidden; background: var(--shift-surface); border: 1px solid var(--shift-border); }
.banner-glow { position: absolute; inset: 0; background: var(--shift-grad-hero); pointer-events: none; }
.banner-text { position: relative; z-index: 1; max-width: 620px; }
.eyebrow { display: inline-flex; align-items: center; gap: 7px; font-family: var(--shift-mono); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--shift-amber-strong); }
.eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--shift-ok); }
.banner-text h2 { margin: 6px 0 4px; font-size: 22px; font-weight: 800; color: var(--shift-text); letter-spacing: -0.02em; }
.banner-text p { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--shift-text-muted); }
.banner-actions { position: relative; z-index: 1; display: flex; gap: 8px; flex-shrink: 0; }

.btn-primary { display: inline-flex; align-items: center; gap: 6px; padding: 9px 15px; border-radius: 10px; border: none; cursor: pointer;
  background: var(--shift-grad-cta); color: #1f1408; font-weight: 700; font-size: 13px; box-shadow: 0 8px 22px -10px rgba(245,158,11,0.7); }
.btn-ghost { display: inline-flex; align-items: center; gap: 6px; padding: 9px 13px; border-radius: 10px; cursor: pointer;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); font-weight: 600; font-size: 13px; }
.btn-ghost:hover { color: var(--shift-text); border-color: var(--shift-border); }
.btn-ghost.spin :deep(svg) { animation: shift-spin 0.85s linear infinite; }
.btn-danger { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 10px; border: none; cursor: pointer;
  background: var(--shift-alert); color: #fff; font-weight: 700; font-size: 13px; }
.btn-danger:disabled { opacity: 0.6; }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
.sk-card { height: 220px; border-radius: 18px; background: linear-gradient(100deg, var(--shift-surface), var(--shift-surface-2), var(--shift-surface)); background-size: 200% 100%; animation: shift-shimmer 1.4s linear infinite; }
@keyframes shift-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

.shift-card { display: flex; flex-direction: column; gap: 12px; padding: 16px; border-radius: 18px; background: var(--shift-surface); border: 1px solid var(--shift-border-soft); transition: border-color 0.2s; }
.shift-card:hover { border-color: var(--shift-border); }
.sc-head { display: flex; align-items: center; justify-content: space-between; }
.sc-id { display: flex; align-items: center; gap: 8px; }
.sc-code { font-family: var(--shift-mono); font-size: 12px; font-weight: 700; color: var(--shift-text); }
.sc-type { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; padding: 2px 7px; border-radius: 6px; border: 1px solid; opacity: 0.9; }
.sc-actions { display: flex; gap: 5px; }
.sc-actions button { width: 28px; height: 28px; border-radius: 8px; border: 1px solid var(--shift-border-soft); background: var(--shift-surface-2); color: var(--shift-text-muted); cursor: pointer; display: grid; place-items: center; transition: 0.18s; }
.sc-actions button:hover { color: var(--shift-amber); border-color: var(--shift-border); }
.sc-actions button.danger:hover { color: var(--shift-alert); border-color: var(--shift-alert-soft); }
.sc-name { margin: 0; font-size: 15px; font-weight: 700; color: var(--shift-text); }

.sc-timeline { display: flex; flex-direction: column; gap: 5px; }
.tl-track { position: relative; height: 26px; border-radius: 8px; background: rgba(148,163,184,0.1); overflow: hidden; }
.tl-bar { position: absolute; top: 0; bottom: 0; border-radius: 6px; opacity: 0.85; display: flex; align-items: center; justify-content: space-between; padding: 0 6px; min-width: 40px; }
.tl-start, .tl-end { font-family: var(--shift-mono); font-size: 8px; color: #1f1408; font-weight: 700; white-space: nowrap; }
.tl-break { position: absolute; top: 0; bottom: 0; display: grid; place-items: center; }
.tl-break-dot { width: 100%; height: 100%; background: repeating-linear-gradient(45deg, rgba(0,0,0,0.35), rgba(0,0,0,0.35) 3px, transparent 3px, transparent 6px); }
.tl-ruler { display: flex; justify-content: space-between; }
.tl-ruler span { font-family: var(--shift-mono); font-size: 8px; color: var(--shift-text-dim); }

.sc-meta { display: flex; flex-wrap: wrap; gap: 12px; }
.sc-meta span { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--shift-text-muted); }
.sc-meta svg { color: var(--shift-amber); }
.sc-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.sc-assign { margin-top: auto; display: flex; align-items: center; justify-content: center; gap: 7px; padding: 9px; border-radius: 10px; cursor: pointer;
  background: rgba(251,191,36,0.08); border: 1px dashed var(--shift-border); color: var(--shift-amber); font-size: 12px; font-weight: 600; transition: 0.18s; }
.sc-assign:hover { background: rgba(251,191,36,0.14); }

.del-copy { font-size: 13px; line-height: 1.6; color: var(--shift-text-2); margin: 0; }
.spin :deep(svg), .spin { animation: shift-spin 0.85s linear infinite; }
</style>
