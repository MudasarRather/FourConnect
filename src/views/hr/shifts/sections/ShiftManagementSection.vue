<template>
  <section class="mgmt">
    <!-- ════════ COMMAND CONSOLE HEADER ════════ -->
    <Motion as="header" class="console" :initial="{ opacity: 0, y: -14 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.6, ease: [0.16,1,0.3,1] }">
      <span class="console-aurora" aria-hidden="true" />
      <span class="console-scan" aria-hidden="true" />
      <span class="console-grid" aria-hidden="true" />

      <div class="console-top">
        <div class="console-id">
          <span class="eyebrow"><span class="eyebrow-dot" /> Schedule blueprints · live</span>
          <h2 class="console-title">
            Shift Management
            <span class="title-sweep" aria-hidden="true" />
          </h2>
          <p>Reusable shift blueprints — timing, break windows, late-punch policy and overrun alerts. Assign one as the active shift per employee; the daily rollup honours it.</p>
        </div>

        <div class="console-side">
          <div class="live-clock" :title="clockZone">
            <span class="lc-dot" />
            <span class="lc-time">{{ clock }}</span>
            <span class="lc-label">local</span>
          </div>
          <div class="console-actions">
            <button class="btn-primary" v-magnetic="{ strength: 0.25 }" @click="openCreate">
              <Plus :size="15" /><span>New shift</span>
            </button>
            <button class="btn-ghost" :class="{ spin: loading }" title="Refresh" @click="reload"><RefreshCw :size="15" /></button>
          </div>
        </div>
      </div>

      <!-- KPI instrument ribbon -->
      <div class="kpi-ribbon">
        <Motion v-for="(k, i) in kpis" :key="k.key" as="div" class="kpi" :data-tone="k.tone"
          :initial="{ opacity: 0, y: 16, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ duration: 0.5, delay: 0.12 + i * 0.07, ease: [0.16,1,0.3,1] }"
          :whileHover="{ y: -3 }">
          <span class="kpi-spark" aria-hidden="true" />
          <div class="kpi-ico"><component :is="k.icon" :size="16" /></div>
          <div class="kpi-body">
            <div class="kpi-val">
              <ShiftCountUp :value="k.value" :decimals="k.decimals || 0" :suffix="k.suffix || ''" />
            </div>
            <div class="kpi-label">{{ k.label }}</div>
          </div>
        </Motion>
      </div>
    </Motion>

    <!-- ════════ SKELETON ════════ -->
    <div v-if="loading && !shifts.length" class="grid">
      <div v-for="n in 6" :key="n" class="sk-card" />
    </div>

    <!-- ════════ BLUEPRINT CARDS ════════ -->
    <div v-else class="grid">
      <Motion v-for="(s, i) in shifts" :key="s.id" as="div" class="card-wrap"
        :initial="{ opacity: 0, y: 22 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.5, delay: 0.05 * i, ease: [0.16,1,0.3,1] }">
        <article class="shift-card" :class="{ 'is-archived': s.is_active === false }"
          v-tilt="{ max: 5, scale: 1.012, perspective: 1100 }"
          @mousemove="onCardMove" :style="{ '--accent': shiftTypeMeta(s.shift_type).color }">
          <span class="sc-ring" aria-hidden="true" />
          <span class="sc-spot" aria-hidden="true" />

          <header class="sc-head" data-tilt-depth="14">
            <div class="sc-id">
              <span class="sc-code">{{ s.code }}</span>
              <span v-if="s.is_active === false" class="sc-archived"><Power :size="9" /> Archived</span>
              <span v-else class="sc-type">{{ shiftTypeMeta(s.shift_type).label }}</span>
            </div>
            <div class="sc-actions">
              <button v-if="s.is_active === false" title="Reactivate" class="reactivate" :disabled="reactivatingId === s.id" @click="reactivate(s)">
                <Loader2 v-if="reactivatingId === s.id" :size="14" class="spin" /><Power v-else :size="14" />
              </button>
              <button v-else title="Assign" @click="openAssign(s)"><UsersRound :size="14" /></button>
              <button title="Edit" @click="openEdit(s)"><Pencil :size="14" /></button>
              <button title="Decommission" class="danger" @click="askDelete(s)"><Trash2 :size="14" /></button>
            </div>
          </header>

          <div class="sc-name-row" data-tilt-depth="10">
            <h3 class="sc-name">{{ s.name }}</h3>
            <!-- duration mini-dial -->
            <div class="sc-dial" :title="`${shiftHours(s)} h shift`">
              <svg viewBox="0 0 40 40">
                <circle class="dial-bg" cx="20" cy="20" r="16" />
                <circle class="dial-fg" cx="20" cy="20" r="16"
                  :style="{ strokeDasharray: dialDash(s), stroke: shiftTypeMeta(s.shift_type).color }" />
              </svg>
              <span class="dial-num">{{ shiftHours(s) }}<small>h</small></span>
            </div>
          </div>

          <!-- 24h blueprint timeline -->
          <div class="sc-timeline" data-tilt-depth="20">
            <div class="tl-track">
              <span class="tl-gridlines" aria-hidden="true" />
              <div class="tl-bar" :class="{ overnight: isOvernight(s) }"
                :style="barStyle(s)">
                <span class="tl-start">{{ shortTime(s.start_time) }}</span>
                <span class="tl-end">{{ shortTime(s.end_time) }}</span>
              </div>
              <span v-for="(bw, bi) in (s.break_windows || [])" :key="bi" class="tl-break"
                :style="{ left: hourPct(bw.start_time) + '%', width: durationPct(bw.start_time, bw.end_time) + '%' }"
                :title="`${bw.label} ${bw.start_time}–${bw.end_time} (max ${bw.max_minutes}m)`" />
              <!-- live now-line -->
              <span class="tl-now" :style="{ left: nowPct + '%' }" :title="'Now · ' + clock">
                <span class="tl-now-dot" />
              </span>
            </div>
            <div class="tl-ruler"><span v-for="h in [0,6,12,18,24]" :key="h">{{ String(h).padStart(2,'0') }}</span></div>
          </div>

          <div class="sc-meta" data-tilt-depth="8">
            <span><Coffee :size="12" />{{ s.break_minutes }}m break</span>
            <span><Hourglass :size="12" />{{ s.grace_minutes }}m grace</span>
            <span><CalendarOff :size="12" />{{ offLabel(s.weekly_off_days) }}</span>
          </div>

          <div class="sc-chips" data-tilt-depth="6">
            <ShiftStatusPill v-if="s.late_punch_requires_approval" tone="gold"><ShieldCheck :size="10" /> Approval</ShiftStatusPill>
            <ShiftStatusPill v-if="(s.break_windows||[]).length" tone="neutral">{{ s.break_windows.length }} window{{ s.break_windows.length>1?'s':'' }}</ShiftStatusPill>
            <ShiftStatusPill v-if="s.night_allowance" tone="gold"><Moon :size="10" /> Night</ShiftStatusPill>
          </div>

          <button v-if="s.is_active === false" class="sc-assign archived" data-tilt-depth="4" @click="reactivate(s)">
            <span class="sa-left"><Power :size="13" /></span>
            <span class="sa-text">Archived — reactivate to assign</span>
            <ArrowRight :size="13" class="sa-arrow" />
          </button>
          <button v-else class="sc-assign" :class="{ active: (counts[s.id] || 0) > 0 }" data-tilt-depth="4" @click="openAssign(s)">
            <span class="sa-left"><UsersRound :size="13" /></span>
            <span class="sa-text">
              <template v-if="(counts[s.id] || 0) === 0">Assign to employees</template>
              <template v-else><b><ShiftCountUp :value="counts[s.id]" :duration="700" /></b> assigned · manage</template>
            </span>
            <ArrowRight :size="13" class="sa-arrow" />
          </button>
        </article>
      </Motion>

      <ShiftEmptyState v-if="!loading && !shifts.length" :icon="CalendarClock"
        title="No shift templates yet"
        sub="Create reusable blueprints with break windows, late-punch policy and overrun alerts — then assign them per employee.">
        <template #actions><button class="btn-primary" @click="openCreate"><Plus :size="14" />Create first shift</button></template>
      </ShiftEmptyState>
    </div>

    <ShiftFormModal :open="showForm" :shift="editTarget" @close="showForm = false" @saved="onSaved" />
    <ShiftAssignModal :open="showAssign" :shift="assignTarget" @close="showAssign = false" @assigned="onAssigned" />
    <ShiftDecommissionModal :open="!!decomTarget" :shift="decomTarget" :busy="decomBusy"
      @cancel="decomTarget = null" @confirm="onDecommission" @reassign="goReassign" />
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import {
  Plus, RefreshCw, UsersRound, Pencil, Trash2, Coffee, Hourglass, CalendarOff,
  ShieldCheck, Moon, CalendarClock, Loader2, ArrowRight, LayoutGrid, Users, Clock, MoonStar, Power,
} from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toastification'
import ShiftFormModal from '../modals/ShiftFormModal.vue'
import ShiftAssignModal from '../modals/ShiftAssignModal.vue'
import ShiftDecommissionModal from '../modals/ShiftDecommissionModal.vue'
import ShiftStatusPill from '../components/ShiftStatusPill.vue'
import ShiftEmptyState from '../components/ShiftEmptyState.vue'
import ShiftCountUp from '../components/ShiftCountUp.vue'
import {
  fetchShifts, deleteShift, patchShift, fetchShiftAssignments,
  hourPct, durationPct, shortTime, shiftTypeMeta, DOW_FULL, todayIso,
} from '@/composables/useShifts'

const emit = defineEmits(['refresh-stats'])
const toast = useToast()
const router = useRouter()

const shifts = ref([])
const loading = ref(false)
const counts = reactive({})
const showForm = ref(false)
const editTarget = ref(null)
const showAssign = ref(false)
const assignTarget = ref(null)
const decomTarget = ref(null)
const decomBusy = ref(false)
const reactivatingId = ref(null)

/* ── live clock + now-line ───────────────────────────────────────────────── */
const clock = ref('--:--:--')
const nowPct = ref(0)
const clockZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'local'
let clockTimer = null
const tickClock = () => {
  const d = new Date()
  clock.value = d.toLocaleTimeString(undefined, { hour12: false })
  nowPct.value = ((d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60) / 1440) * 100
}

/* ── derived helpers ─────────────────────────────────────────────────────── */
const toMin = (t) => { if (!t) return 0; const [h, m] = String(t).split(':').map(Number); return (h || 0) * 60 + (m || 0) }
const shiftMinutes = (s) => { let a = toMin(s.start_time), b = toMin(s.end_time); if (b <= a) b += 1440; return b - a }
const shiftHours = (s) => +(shiftMinutes(s) / 60).toFixed(1)
const isOvernight = (s) => toMin(s.end_time) <= toMin(s.start_time)
const dialDash = (s) => { const C = 2 * Math.PI * 16; const frac = Math.min(1, shiftMinutes(s) / 1440); return `${(C * frac).toFixed(1)} ${C.toFixed(1)}` }
const barStyle = (s) => ({
  left: hourPct(s.start_time) + '%',
  width: durationPct(s.start_time, s.end_time) + '%',
  '--bar': shiftTypeMeta(s.shift_type).color,
})

const offLabel = (arr) => {
  if (!Array.isArray(arr) || !arr.length) return 'No off day'
  return arr.map(d => DOW_FULL[d]).join(', ') + ' off'
}

/* ── KPI ribbon ──────────────────────────────────────────────────────────── */
const totalAssigned = computed(() => Object.values(counts).reduce((a, b) => a + (b || 0), 0))
const avgHours = computed(() => {
  if (!shifts.value.length) return 0
  return +(shifts.value.reduce((a, s) => a + shiftMinutes(s), 0) / shifts.value.length / 60).toFixed(1)
})
const nightCount = computed(() => shifts.value.filter(s => s.night_allowance).length)
const kpis = computed(() => [
  { key: 'tpl', label: 'Templates', value: shifts.value.length, icon: LayoutGrid, tone: 'gold' },
  { key: 'asg', label: 'Assigned today', value: totalAssigned.value, icon: Users, tone: 'ok' },
  { key: 'avg', label: 'Avg length', value: avgHours.value, decimals: 1, suffix: 'h', icon: Clock, tone: 'gold' },
  { key: 'nht', label: 'Night-ready', value: nightCount.value, icon: MoonStar, tone: 'ember' },
])

/* ── pointer spotlight ───────────────────────────────────────────────────── */
const onCardMove = (e) => {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  el.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%')
  el.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%')
}

/* ── data ────────────────────────────────────────────────────────────────── */
const reload = async () => {
  loading.value = true
  try {
    const data = await fetchShifts({ limit: 100 })
    shifts.value = data.items || []
    try {
      const assigns = await fetchShiftAssignments({ active_on: todayIso(), upcoming: true })
      const rows = Array.isArray(assigns) ? assigns : (assigns.items || [])
      for (const key of Object.keys(counts)) delete counts[key]
      for (const a of rows) counts[a.shift_id] = (counts[a.shift_id] || 0) + 1
    } catch { /* counts best-effort */ }
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load shifts')
  } finally { loading.value = false }
}

onMounted(() => {
  reload()
  tickClock()
  clockTimer = setInterval(tickClock, 1000)
})
onBeforeUnmount(() => { if (clockTimer) clearInterval(clockTimer) })

const openCreate = () => { editTarget.value = null; showForm.value = true }
const openEdit = (s) => { editTarget.value = s; showForm.value = true }
const openAssign = (s) => { assignTarget.value = s; showAssign.value = true }
const onSaved = async () => { await reload(); emit('refresh-stats') }
const onAssigned = async () => { await reload(); emit('refresh-stats') }

const askDelete = (s) => { decomTarget.value = s }

// Impact-aware lifecycle: archive (reversible) or delete (only when no active crew).
const onDecommission = async ({ mode, reason }) => {
  const s = decomTarget.value
  if (!s) return
  decomBusy.value = true
  try {
    if (mode === 'deactivate') {
      await patchShift(s.id, { is_active: false })
      toast.success(`"${s.name}" archived — hidden from new rosters, existing assignments kept`)
    } else {
      await deleteShift(s.id)
      toast.success(`Shift "${s.name}" deleted${reason ? ` · ${reason}` : ''}`)
    }
    decomTarget.value = null
    await reload(); emit('refresh-stats')
  } catch (e) {
    // backend 409 backstop (active assignments) surfaces here too
    toast.error(e?.response?.data?.detail || `Could not ${mode === 'deactivate' ? 'archive' : 'delete'} shift`)
  } finally { decomBusy.value = false }
}

const reactivate = async (s) => {
  if (reactivatingId.value) return
  reactivatingId.value = s.id
  try {
    await patchShift(s.id, { is_active: true })
    toast.success(`"${s.name}" reactivated`)
    await reload(); emit('refresh-stats')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not reactivate shift') }
  finally { reactivatingId.value = null }
}

const goReassign = () => {
  decomTarget.value = null
  router.push({ name: 'HrShiftsTab', params: { tab: 'assignment' } })
}
</script>

<style scoped>
.mgmt { display: flex; flex-direction: column; gap: 20px; }

/* ════════════════════ COMMAND CONSOLE ════════════════════ */
.console {
  position: relative; overflow: hidden;
  padding: 22px 26px 20px; border-radius: 24px;
  background: var(--shift-surface);
  border: 1px solid var(--shift-border);
  backdrop-filter: var(--shift-glass-blur); -webkit-backdrop-filter: var(--shift-glass-blur);
}
.console-aurora {
  position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background: var(--shift-grad-hero), radial-gradient(80% 120% at 100% 0%, rgba(251,146,60,0.10), transparent 60%);
  background-size: 200% 200%; animation: hr-aurora 16s ease-in-out infinite;
}
.console-scan {
  position: absolute; left: 0; right: 0; top: 0; height: 32%; pointer-events: none; z-index: 1;
  background: linear-gradient(180deg, rgba(253,230,138,0.10), transparent);
  animation: shift-scanline 7s ease-in-out infinite;
}
.console-grid {
  position: absolute; inset: 0; pointer-events: none; z-index: 0; opacity: 0.5;
  background-image: linear-gradient(var(--shift-grid-line) 1px, transparent 1px),
                    linear-gradient(90deg, var(--shift-grid-line) 1px, transparent 1px);
  background-size: 40px 40px; mask-image: radial-gradient(120% 90% at 50% 0%, #000 30%, transparent 75%);
  -webkit-mask-image: radial-gradient(120% 90% at 50% 0%, #000 30%, transparent 75%);
  animation: shift-grid-pan 24s linear infinite;
}
.console-top { position: relative; z-index: 2; display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; }
.console-id { max-width: 640px; }
.eyebrow { display: inline-flex; align-items: center; gap: 7px; font-family: var(--shift-mono); font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--shift-amber-strong); }
.eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--shift-ok); box-shadow: 0 0 0 0 var(--shift-ok); animation: shift-ring-pulse 2.4s ease-out infinite; }
.console-title { position: relative; display: inline-block; margin: 8px 0 6px; font-size: 26px; font-weight: 800; letter-spacing: -0.025em; color: var(--shift-text); }
.title-sweep {
  position: absolute; left: 0; bottom: -3px; height: 2px; width: 100%;
  background: linear-gradient(90deg, transparent, var(--shift-amber), var(--shift-ember), transparent);
  background-size: 220% 100%; border-radius: 2px; animation: title-shimmer 4.5s ease-in-out infinite;
}
@keyframes title-shimmer { 0%,100% { background-position: 200% 0; opacity: 0.55; } 50% { background-position: -40% 0; opacity: 1; } }
.console-id p { margin: 0; font-size: 12.5px; line-height: 1.6; color: var(--shift-text-muted); }

.console-side { display: flex; flex-direction: column; align-items: flex-end; gap: 12px; flex-shrink: 0; }
.live-clock { display: inline-flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 999px;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); }
.lc-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--shift-ok); box-shadow: 0 0 8px var(--shift-ok); animation: shift-ring-pulse 2s ease-out infinite; }
.lc-time { font-family: var(--shift-mono); font-size: 14px; font-weight: 700; color: var(--shift-text); letter-spacing: 0.04em; font-variant-numeric: tabular-nums; }
.lc-label { font-family: var(--shift-mono); font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; color: var(--shift-text-dim); }
.console-actions { display: flex; gap: 8px; }

.btn-primary { display: inline-flex; align-items: center; gap: 7px; padding: 10px 17px; border-radius: 12px; border: none; cursor: pointer;
  background: var(--shift-grad-cta); color: #1f1408; font-weight: 700; font-size: 13px; box-shadow: 0 10px 26px -10px rgba(245,158,11,0.75);
  transition: box-shadow 0.25s, transform 0.2s; }
.btn-primary:hover { box-shadow: 0 14px 34px -10px rgba(245,158,11,0.9); }
.btn-ghost { display: inline-flex; align-items: center; gap: 6px; padding: 10px 12px; border-radius: 12px; cursor: pointer;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); font-weight: 600; font-size: 13px; transition: 0.2s; }
.btn-ghost.solid { padding: 9px 16px; }
.btn-ghost:hover { color: var(--shift-text); border-color: var(--shift-border); }
.btn-ghost.spin :deep(svg) { animation: shift-spin 0.85s linear infinite; }
.btn-danger { display: inline-flex; align-items: center; gap: 6px; padding: 9px 16px; border-radius: 11px; border: none; cursor: pointer;
  background: var(--shift-alert); color: #fff; font-weight: 700; font-size: 13px; box-shadow: 0 8px 20px -10px var(--shift-alert); }
.btn-danger:disabled { opacity: 0.6; }

/* KPI ribbon */
.kpi-ribbon { position: relative; z-index: 2; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 20px; }
.kpi { position: relative; overflow: hidden; display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 16px;
  background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); transition: border-color 0.25s; }
.kpi:hover { border-color: var(--shift-border); }
.kpi-spark { position: absolute; right: -30%; top: -60%; width: 80%; height: 220%; pointer-events: none;
  background: radial-gradient(circle, color-mix(in srgb, var(--tone-c) 24%, transparent), transparent 65%); opacity: 0.5; }
.kpi[data-tone="gold"]  { --tone-c: var(--shift-amber); }
.kpi[data-tone="ok"]    { --tone-c: var(--shift-ok); }
.kpi[data-tone="ember"] { --tone-c: var(--shift-ember); }
.kpi-ico { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0;
  background: color-mix(in srgb, var(--tone-c) 14%, transparent); color: var(--tone-c);
  border: 1px solid color-mix(in srgb, var(--tone-c) 26%, transparent); }
.kpi-body { min-width: 0; }
.kpi-val { font-size: 22px; font-weight: 800; color: var(--shift-text); line-height: 1.1; letter-spacing: -0.02em; }
.kpi-label { margin-top: 2px; font-size: 10.5px; font-family: var(--shift-mono); text-transform: uppercase; letter-spacing: 0.07em; color: var(--shift-text-muted); }

/* ════════════════════ GRID + SKELETON ════════════════════ */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
.sk-card { height: 268px; border-radius: 20px; background: linear-gradient(100deg, var(--shift-surface), var(--shift-surface-2), var(--shift-surface)); background-size: 200% 100%; animation: shift-shimmer 1.4s linear infinite; }
@keyframes shift-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.card-wrap { perspective: 1100px; will-change: transform, opacity; }

/* ════════════════════ BLUEPRINT CARD ════════════════════ */
.shift-card {
  position: relative; display: flex; flex-direction: column; gap: 13px;
  padding: 17px 18px 16px; border-radius: 20px;
  background: var(--shift-surface); border: 1px solid var(--shift-border-soft);
  transform-style: preserve-3d; overflow: hidden;
}
@property --sc-a { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
.sc-ring {
  position: absolute; inset: 0; border-radius: inherit; padding: 1px; pointer-events: none; z-index: 0; opacity: 0;
  background: conic-gradient(from var(--sc-a), transparent 0deg, var(--accent) 90deg, transparent 200deg, var(--accent) 320deg, transparent 360deg);
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); mask-composite: exclude;
  transition: opacity 0.35s; animation: sc-ring-rot 6s linear infinite;
}
@keyframes sc-ring-rot { to { --sc-a: 360deg; } }
.shift-card:hover .sc-ring { opacity: 0.6; }
.sc-spot { position: absolute; inset: 0; pointer-events: none; z-index: 0; opacity: 0; transition: opacity 0.3s;
  background: radial-gradient(380px circle at var(--mx, 50%) var(--my, 50%), color-mix(in srgb, var(--accent) 16%, transparent), transparent 60%); }
.shift-card:hover .sc-spot { opacity: 1; }
.shift-card > *:not(.sc-ring):not(.sc-spot) { position: relative; z-index: 1; }

.sc-head { display: flex; align-items: center; justify-content: space-between; }
.sc-id { display: flex; align-items: center; gap: 9px; }
.sc-code { font-family: var(--shift-mono); font-size: 12.5px; font-weight: 700; color: var(--shift-text); padding: 3px 9px; border-radius: 7px;
  background: color-mix(in srgb, var(--accent) 12%, transparent); border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent); }
.sc-type { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.07em; color: var(--accent); }
.sc-actions { display: flex; gap: 5px; opacity: 0.5; transition: opacity 0.25s; }
.shift-card:hover .sc-actions { opacity: 1; }
.sc-actions button { width: 29px; height: 29px; border-radius: 9px; border: 1px solid var(--shift-border-soft); background: var(--shift-surface-2); color: var(--shift-text-muted); cursor: pointer; display: grid; place-items: center; transition: 0.18s; }
.sc-actions button:hover { color: var(--shift-amber); border-color: var(--shift-border); transform: translateY(-1px); }
.sc-actions button.danger:hover { color: var(--shift-alert); border-color: var(--shift-alert-soft); }
.sc-actions button.reactivate:hover { color: var(--shift-ok); border-color: color-mix(in srgb, var(--shift-ok) 42%, transparent); }
.sc-archived { display: inline-flex; align-items: center; gap: 4px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em;
  padding: 3px 8px; border-radius: 999px; color: var(--shift-text-muted); background: rgba(148,163,184,0.12); border: 1px solid var(--shift-border-soft); }
.shift-card.is-archived { opacity: 0.85; }
.shift-card.is-archived .sc-code { filter: saturate(0.5); }
.shift-card.is-archived .sc-ring { display: none; }

.sc-name-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.sc-name { margin: 0; font-size: 16px; font-weight: 700; color: var(--shift-text); letter-spacing: -0.01em; }
.sc-dial { position: relative; width: 44px; height: 44px; flex-shrink: 0; display: grid; place-items: center; }
.sc-dial svg { width: 44px; height: 44px; transform: rotate(-90deg); }
.dial-bg { fill: none; stroke: var(--shift-border-soft); stroke-width: 3.5; }
.dial-fg { fill: none; stroke-width: 3.5; stroke-linecap: round; transition: stroke-dasharray 0.8s var(--shift-ease); }
.dial-num { position: absolute; font-family: var(--shift-mono); font-size: 11px; font-weight: 700; color: var(--shift-text); }
.dial-num small { font-size: 7px; color: var(--shift-text-dim); }

/* timeline */
.sc-timeline { display: flex; flex-direction: column; gap: 5px; }
.tl-track { position: relative; height: 30px; border-radius: 9px; background: rgba(148,163,184,0.10); overflow: hidden; }
.tl-gridlines { position: absolute; inset: 0; pointer-events: none;
  background-image: repeating-linear-gradient(90deg, var(--shift-grid-line) 0, var(--shift-grid-line) 1px, transparent 1px, transparent calc(100%/4)); }
.tl-bar { position: absolute; top: 3px; bottom: 3px; border-radius: 7px; min-width: 42px; display: flex; align-items: center; justify-content: space-between; padding: 0 7px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--bar) 92%, white 8%), var(--bar)); box-shadow: 0 4px 12px -6px var(--bar);
  transform-origin: left center; animation: tl-grow 0.85s var(--shift-ease) both; animation-delay: 0.15s; }
.tl-bar.overnight { border-top-right-radius: 0; border-bottom-right-radius: 0; }
@keyframes tl-grow { from { transform: scaleX(0); opacity: 0; } to { transform: scaleX(1); opacity: 1; } }
.tl-start, .tl-end { font-family: var(--shift-mono); font-size: 8.5px; color: #2a1c08; font-weight: 800; white-space: nowrap; }
.tl-break { position: absolute; top: 3px; bottom: 3px; border-radius: 3px;
  background: repeating-linear-gradient(45deg, rgba(8,8,10,0.42), rgba(8,8,10,0.42) 3px, transparent 3px, transparent 6px); }
.tl-now { position: absolute; top: -2px; bottom: -2px; width: 2px; background: var(--shift-amber-bright); box-shadow: 0 0 8px var(--shift-amber); z-index: 3; }
.tl-now-dot { position: absolute; top: -3px; left: 50%; transform: translateX(-50%); width: 7px; height: 7px; border-radius: 50%; background: var(--shift-amber-bright); box-shadow: 0 0 8px var(--shift-amber); animation: shift-ring-pulse 1.8s ease-out infinite; }
.tl-ruler { display: flex; justify-content: space-between; }
.tl-ruler span { font-family: var(--shift-mono); font-size: 8px; color: var(--shift-text-dim); }

.sc-meta { display: flex; flex-wrap: wrap; gap: 12px; }
.sc-meta span { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--shift-text-muted); }
.sc-meta svg { color: var(--accent); }
.sc-chips { display: flex; flex-wrap: wrap; gap: 6px; min-height: 18px; }

.sc-assign { margin-top: auto; display: flex; align-items: center; gap: 9px; padding: 10px 12px; border-radius: 12px; cursor: pointer;
  background: rgba(251,191,36,0.07); border: 1px dashed var(--shift-border); color: var(--shift-amber); font-size: 12.5px; font-weight: 600; transition: 0.2s; }
.sc-assign.active { background: color-mix(in srgb, var(--accent) 10%, transparent); border-style: solid; border-color: color-mix(in srgb, var(--accent) 30%, transparent); color: var(--shift-text); }
.sc-assign:hover { background: rgba(251,191,36,0.15); }
.sc-assign.active:hover { background: color-mix(in srgb, var(--accent) 16%, transparent); }
.sc-assign.archived { background: rgba(148,163,184,0.08); border-style: dashed; border-color: var(--shift-border-soft); color: var(--shift-text-muted); }
.sc-assign.archived:hover { background: var(--shift-ok-soft); color: var(--shift-ok); border-color: color-mix(in srgb, var(--shift-ok) 32%, transparent); }
.sa-left { display: grid; place-items: center; }
.sa-text { flex: 1; text-align: left; }
.sa-text b { color: var(--accent); font-family: var(--shift-mono); }
.sa-arrow { opacity: 0; transform: translateX(-4px); transition: 0.22s; }
.sc-assign:hover .sa-arrow { opacity: 1; transform: translateX(0); }

.spin :deep(svg), .spin { animation: shift-spin 0.85s linear infinite; }

@media (max-width: 1100px) { .kpi-ribbon { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 720px) {
  .console-top { flex-direction: column; }
  .console-side { align-items: flex-start; width: 100%; }
  .console-actions { width: 100%; }
}

/* ════════════════════ LIGHT THEME OVERRIDES ════════════════════ */
[data-theme="light"] .tl-start, [data-theme="light"] .tl-end { color: #2a1c08; }
[data-theme="light"] .tl-break { background: repeating-linear-gradient(45deg, rgba(40,28,12,0.30), rgba(40,28,12,0.30) 3px, transparent 3px, transparent 6px); }
[data-theme="light"] .tl-track { background: rgba(40,32,20,0.07); }
[data-theme="light"] .sc-assign { background: rgba(217,119,6,0.08); color: var(--shift-amber-strong); }
[data-theme="light"] .sc-assign:hover { background: rgba(217,119,6,0.14); }
[data-theme="light"] .console-scan { background: linear-gradient(180deg, rgba(217,119,6,0.08), transparent); }
[data-theme="light"] .btn-danger { color: #fff; }
</style>
