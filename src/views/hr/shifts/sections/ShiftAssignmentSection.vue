<template>
  <section class="dep-console">
    <!-- ═══════════════ COMMAND HEADER ═══════════════ -->
    <Motion as="header" class="cmd" :initial="{ opacity: 0, y: -12 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.55, ease: [0.16,1,0.3,1] }">
      <span class="cmd-grid" aria-hidden="true" />
      <span class="cmd-scan shift-scanline" aria-hidden="true" />
      <span class="cmd-glow" aria-hidden="true" />

      <div class="cmd-left">
        <span class="cmd-eyebrow">
          <span class="eye-dot" /> DEPLOYMENT CONSOLE · LIVE
          <span class="cmd-clock">{{ clock }}</span>
        </span>
        <h2 class="cmd-title">Shift Assignment</h2>
        <p class="cmd-sub">Pick a shift from the launch bay to roll it out across a date range. Overlapping crew on a different shift is blocked — the engine returns the conflicting rows so you can resolve them.</p>
      </div>

      <div class="cmd-right">
        <div class="readouts">
          <div class="ro" v-for="(r, i) in readouts" :key="r.key" :data-tone="r.tone">
            <span class="ro-ic"><component :is="r.icon" :size="14" /></span>
            <span class="ro-meta">
              <ShiftCountUp class="ro-val" :value="r.value" />
              <small>{{ r.label }}</small>
            </span>
          </div>
        </div>
        <button class="cmd-refresh" :class="{ spin: loading }" @click="reload" aria-label="Refresh"><RefreshCw :size="15" /></button>
      </div>
    </Motion>

    <!-- ═══════════════ LAUNCH BAY ═══════════════ -->
    <Motion as="div" class="bay" :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, delay: 0.08 }">
      <div class="bay-head">
        <span class="bay-eyebrow"><Rocket :size="12" /> LAUNCH BAY</span>
        <span class="bay-hint">Select a shift to deploy crew</span>
      </div>

      <div class="bay-track" v-if="launchShifts.length">
        <Motion v-for="(s, i) in launchShifts" :key="s.id" as="button" type="button" class="pad"
          :initial="{ opacity: 0, y: 22, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ duration: 0.5, delay: 0.12 + i * 0.05, ease: [0.16,1,0.3,1] }"
          :whileHover="{ y: -5 }" :whileTap="{ scale: 0.98 }"
          :style="{ '--c': shiftTypeMeta(s.shift_type).color }" @click="openAssign(s)">
          <span class="pad-stripe" aria-hidden="true" />
          <span class="pad-glow" aria-hidden="true" />
          <div class="pad-top">
            <span class="pad-code">{{ s.code }}</span>
            <span class="pad-type">{{ s.shift_type }}</span>
          </div>
          <h3 class="pad-name">{{ s.name }}</h3>
          <ShiftMiniTimeline :start="(s.start_time||'').slice(0,5)" :end="(s.end_time||'').slice(0,5)" :color="shiftTypeMeta(s.shift_type).color" show-now :show-labels="false" />
          <div class="pad-foot">
            <span class="pad-count"><UsersRound :size="13" /><b>{{ counts[s.id] || 0 }}</b> deployed</span>
            <span class="pad-deploy">Deploy <ArrowUpRight :size="13" /></span>
          </div>
        </Motion>
      </div>

      <div v-else-if="!loading" class="bay-empty">
        <CalendarClock :size="16" /> No shifts yet — create one in <b>Shift Management</b> first.
      </div>
      <div v-else class="bay-track">
        <span v-for="n in 4" :key="n" class="pad-skel" />
      </div>
    </Motion>

    <!-- ═══════════════ ROSTER ═══════════════ -->
    <div class="roster">
      <div class="roster-head">
        <h3>Active deployments <span class="rh-count">{{ filtered.length }}</span></h3>
        <div class="roster-tools">
          <div class="rt-search"><Search :size="13" /><input v-model="search" placeholder="Search crew / shift…" /></div>
          <div class="view-seg" :data-view="view">
            <span class="seg-slider" />
            <button type="button" class="seg-btn" :class="{ on: view === 'board' }" @click="view = 'board'"><LayoutGrid :size="13" /> Board</button>
            <button type="button" class="seg-btn" :class="{ on: view === 'ledger' }" @click="view = 'ledger'"><Rows3 :size="13" /> Ledger</button>
          </div>
        </div>
      </div>

      <template v-if="filtered.length">
        <!-- BOARD -->
        <transition name="view-swap" mode="out-in">
          <div v-if="view === 'board'" key="board" class="board">
            <Motion v-for="(g, gi) in groups" :key="g.shift_id" as="section" class="col"
              :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.45, delay: gi * 0.05, ease: [0.16,1,0.3,1] }"
              :style="{ '--c': g.color }">
              <header class="col-head">
                <span class="col-bar" aria-hidden="true" />
                <span class="col-code">{{ g.code }}</span>
                <span class="col-name">{{ g.name }}</span>
                <span class="col-count">{{ g.rows.length }}</span>
              </header>
              <TransitionGroup tag="div" class="col-body" name="crew" appear>
                <article v-for="(a, ri) in g.rows" :key="a.id" class="crew-card" :style="{ '--i': Math.min(ri, 12) }">
                  <span class="cc-av">{{ initials(a.employee_name) }}</span>
                  <div class="cc-meta">
                    <b>{{ a.employee_name || 'Employee' }}</b>
                    <small><CalendarClock :size="10" /> {{ fmtDate(a.effective_from) }} → {{ a.effective_until ? fmtDate(a.effective_until) : 'open' }}</small>
                  </div>
                  <button class="cc-rm" :disabled="removing === a.id" @click="askRemove(a, g)" title="Stand down">
                    <Loader2 v-if="removing === a.id" :size="13" class="spin" /><UserMinus v-else :size="13" />
                  </button>
                </article>
              </TransitionGroup>
              <button class="col-add" @click="openAssignById(g.shift_id)"><Plus :size="13" /> Add crew</button>
            </Motion>
          </div>

          <!-- LEDGER -->
          <div v-else key="ledger" class="ledger-wrap">
            <table class="ledger">
              <thead><tr><th>Crew</th><th>Shift</th><th>Window</th><th>Status</th><th></th></tr></thead>
              <TransitionGroup tag="tbody" name="crew" appear>
                <tr v-for="(a, i) in filtered" :key="a.id" class="lrow" :style="{ '--i': Math.min(i, 18) }">
                  <td>
                    <div class="lc-emp"><span class="lc-av">{{ initials(a.employee_name) }}</span><span class="lc-name">{{ a.employee_name || '—' }}</span></div>
                  </td>
                  <td>
                    <span class="lc-shift" :style="{ '--c': colorFor(a.shift_id) }"><span class="lc-dot" /><span class="lc-code">{{ a.shift_code }}</span> {{ a.shift_name }}</span>
                  </td>
                  <td class="mono lc-win">{{ fmtDate(a.effective_from) }} <ArrowRight :size="11" /> {{ a.effective_until ? fmtDate(a.effective_until) : '— open' }}</td>
                  <td><span class="lc-pill" :data-open="!a.effective_until">{{ a.effective_until ? 'Ends ' + fmtDate(a.effective_until) : 'Open-ended' }}</span></td>
                  <td class="lc-act">
                    <button class="cc-rm" :disabled="removing === a.id" @click="askRemove(a, groupFor(a))" title="Stand down">
                      <Loader2 v-if="removing === a.id" :size="13" class="spin" /><UserMinus v-else :size="13" />
                    </button>
                  </td>
                </tr>
              </TransitionGroup>
            </table>
          </div>
        </transition>
      </template>

      <ShiftEmptyState v-else-if="!loading" :icon="UsersRound" title="No active deployments"
        sub="Pick a shift from the launch bay above to start placing crew on it." />
    </div>

    <ShiftAssignModal :open="showAssign" :shift="assignTarget" @close="showAssign = false" @assigned="onAssigned" />
    <ShiftRemoveModal :open="showRemove" :assignment="removeTarget" :shift-meta="removeMeta" :busy="!!removing"
      @cancel="closeRemove" @confirm="confirmRemove" />
  </section>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import {
  RefreshCw, Search, UserMinus, UsersRound, Rocket, ArrowUpRight, ArrowRight,
  CalendarClock, LayoutGrid, Rows3, Plus, Loader2, Layers3, Infinity as InfinityIcon,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import ShiftAssignModal from '../modals/ShiftAssignModal.vue'
import ShiftRemoveModal from '../modals/ShiftRemoveModal.vue'
import ShiftEmptyState from '../components/ShiftEmptyState.vue'
import ShiftCountUp from '../components/ShiftCountUp.vue'
import ShiftMiniTimeline from '../components/ShiftMiniTimeline.vue'
import { fetchShifts, fetchShiftAssignments, unassignShift, shiftTypeMeta, todayIso } from '@/composables/useShifts'

const emit = defineEmits(['refresh-stats'])
const toast = useToast()

const shifts = ref([])
const assignments = ref([])
const counts = reactive({})
const loading = ref(false)
const search = ref('')
const view = ref('board')

const showAssign = ref(false)
const assignTarget = ref(null)

const showRemove = ref(false)
const removeTarget = ref(null)
const removeMeta = ref(null)
const removing = ref(null)

// ── live clock ──
const now = ref(new Date())
let clockTimer = null
const clock = computed(() => {
  const d = now.value
  const p = (n) => String(n).padStart(2, '0')
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
})

// ── derived ──
const shiftMap = computed(() => Object.fromEntries(shifts.value.map(s => [s.id, s])))
const colorFor = (id) => shiftTypeMeta(shiftMap.value[id]?.shift_type).color
// archived shifts (is_active === false) can't accept new deployments — keep them
// out of the launch bay (the board still shows their existing crew for stand-down).
const launchShifts = computed(() => shifts.value.filter(s => s.is_active !== false))

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return assignments.value
  return assignments.value.filter(a =>
    (a.employee_name || '').toLowerCase().includes(q) ||
    (a.shift_name || '').toLowerCase().includes(q) ||
    (a.shift_code || '').toLowerCase().includes(q))
})

const groups = computed(() => {
  const order = new Map(shifts.value.map((s, i) => [s.id, i]))
  const m = new Map()
  for (const a of filtered.value) {
    if (!m.has(a.shift_id)) {
      m.set(a.shift_id, {
        shift_id: a.shift_id, code: a.shift_code, name: a.shift_name,
        color: colorFor(a.shift_id), rows: [],
      })
    }
    m.get(a.shift_id).rows.push(a)
  }
  return [...m.values()].sort((x, y) => (order.get(x.shift_id) ?? 999) - (order.get(y.shift_id) ?? 999))
})
const groupFor = (a) => ({ shift_id: a.shift_id, code: a.shift_code, name: a.shift_name, color: colorFor(a.shift_id) })

const readouts = computed(() => {
  const crew = new Set(assignments.value.map(a => a.employee_id)).size
  const live = new Set(assignments.value.map(a => a.shift_id)).size
  const open = assignments.value.filter(a => !a.effective_until).length
  return [
    { key: 'dep', label: 'Deployments', value: assignments.value.length, icon: Layers3, tone: 'gold' },
    { key: 'crew', label: 'Crew placed', value: crew, icon: UsersRound, tone: 'ok' },
    { key: 'live', label: 'Shifts live', value: live, icon: Rocket, tone: 'gold' },
    { key: 'open', label: 'Open-ended', value: open, icon: InfinityIcon, tone: 'warn' },
  ]
})

const initials = (n) => (n || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || '?'
const fmtDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  if (isNaN(d)) return iso
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// ── data ──
const reload = async () => {
  loading.value = true
  try {
    const [sh, as] = await Promise.all([
      fetchShifts({ limit: 100 }),
      fetchShiftAssignments({ active_on: todayIso(), upcoming: true }),
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

onMounted(() => {
  reload()
  clockTimer = setInterval(() => { now.value = new Date() }, 1000)
})
onBeforeUnmount(() => { if (clockTimer) clearInterval(clockTimer) })

// ── assign ──
const openAssign = (s) => {
  if (!s) return
  if (s.is_active === false) {
    toast.warning(`${s.code} is archived — reactivate it in Shift Management before deploying crew.`)
    return
  }
  assignTarget.value = s; showAssign.value = true
}
const openAssignById = (id) => { const s = shiftMap.value[id]; if (s) openAssign(s) }
const onAssigned = async () => { await reload(); emit('refresh-stats') }

// ── remove (stand-down) ──
const askRemove = (a, g) => {
  removeTarget.value = a
  const s = shiftMap.value[a.shift_id]
  removeMeta.value = { color: g?.color || colorFor(a.shift_id), start_time: s?.start_time, end_time: s?.end_time }
  showRemove.value = true
}
const closeRemove = () => { if (!removing.value) showRemove.value = false }
const confirmRemove = async ({ reason }) => {
  const a = removeTarget.value
  if (!a) return
  removing.value = a.id
  try {
    await unassignShift(a.id)
    // optimistic leave-animation, then resync
    assignments.value = assignments.value.filter(x => x.id !== a.id)
    counts[a.shift_id] = Math.max(0, (counts[a.shift_id] || 1) - 1)
    toast.success(`${a.employee_name || 'Employee'} stood down from ${a.shift_code}${reason ? ` · ${reason}` : ''}`)
    showRemove.value = false
    await reload()
    emit('refresh-stats')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not stand down')
  } finally { removing.value = null }
}
</script>

<style scoped>
.dep-console { display: flex; flex-direction: column; gap: 16px; }

/* ═══ COMMAND HEADER ═══ */
.cmd { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 22px 26px; border-radius: 22px; overflow: hidden;
  background: var(--shift-surface); border: 1px solid var(--shift-border); }
.cmd-grid { position: absolute; inset: 0; pointer-events: none; background-image: radial-gradient(var(--shift-grid-line) 1px, transparent 1px); background-size: 24px 24px; opacity: 0.5; mask-image: linear-gradient(120deg, #000, transparent 70%); animation: shift-grid-pan 24s linear infinite; }
.cmd-scan { position: absolute; left: 0; right: 0; top: 0; height: 55%; background: linear-gradient(180deg, transparent, rgba(251,191,36,0.05), transparent); pointer-events: none; }
.cmd-glow { position: absolute; inset: 0; pointer-events: none; background: var(--shift-grad-hero); }
.cmd-left { position: relative; z-index: 1; max-width: 640px; }
.cmd-eyebrow { display: inline-flex; align-items: center; gap: 8px; font-family: var(--shift-mono); font-size: 10px; font-weight: 700; letter-spacing: 0.13em; color: var(--shift-amber-strong); }
.eye-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--shift-ok); box-shadow: 0 0 0 0 var(--shift-ok); animation: shift-ring-pulse 2.4s ease-in-out infinite; }
.cmd-clock { margin-left: 6px; padding: 2px 8px; border-radius: 6px; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); font-size: 10.5px; letter-spacing: 0.08em; font-variant-numeric: tabular-nums; }
.cmd-title { margin: 8px 0 5px; font-size: 24px; font-weight: 800; letter-spacing: -0.02em; color: var(--shift-text); }
.cmd-sub { margin: 0; font-size: 12.5px; line-height: 1.55; color: var(--shift-text-muted); }
.cmd-right { position: relative; z-index: 1; display: flex; align-items: center; gap: 14px; flex-shrink: 0; }
.readouts { display: grid; grid-template-columns: repeat(2, auto); gap: 9px; }
.ro { display: flex; align-items: center; gap: 9px; padding: 9px 13px; border-radius: 13px; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); }
.ro-ic { width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center; flex-shrink: 0; background: rgba(251,191,36,0.12); color: var(--shift-amber); }
.ro[data-tone="ok"] .ro-ic { background: var(--shift-ok-soft); color: var(--shift-ok); }
.ro[data-tone="warn"] .ro-ic { background: var(--shift-warn-soft); color: var(--shift-ember-strong); }
.ro-meta { display: flex; flex-direction: column; line-height: 1.1; }
.ro-val { font-size: 17px; font-weight: 800; color: var(--shift-text); }
.ro-meta small { font-size: 9.5px; color: var(--shift-text-muted); white-space: nowrap; }
.cmd-refresh { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; cursor: pointer; flex-shrink: 0; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); color: var(--shift-text-2); transition: 0.2s; }
.cmd-refresh:hover { color: var(--shift-amber); border-color: var(--shift-border); }
.cmd-refresh.spin :deep(svg) { animation: shift-spin 0.85s linear infinite; }

/* ═══ LAUNCH BAY ═══ */
.bay { display: flex; flex-direction: column; gap: 11px; }
.bay-head { display: flex; align-items: center; gap: 10px; }
.bay-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-family: var(--shift-mono); font-size: 10px; font-weight: 700; letter-spacing: 0.12em; color: var(--shift-amber-strong); }
.bay-hint { font-size: 11.5px; color: var(--shift-text-muted); }
.bay-track { display: flex; gap: 13px; overflow-x: auto; padding: 4px 2px 10px; scroll-snap-type: x proximity;
  scrollbar-width: thin; scrollbar-color: rgba(251,191,36,0.25) transparent; }
.bay-track::-webkit-scrollbar { height: 6px; }
.bay-track::-webkit-scrollbar-thumb { background: rgba(251,191,36,0.25); border-radius: 3px; }
.pad { position: relative; flex: 0 0 248px; scroll-snap-align: start; display: flex; flex-direction: column; gap: 11px; padding: 15px 16px 14px; border-radius: 18px; cursor: pointer; text-align: left; overflow: hidden;
  background: var(--shift-surface); border: 1px solid var(--shift-border-soft); transition: border-color 0.25s, box-shadow 0.25s; }
.pad:hover { border-color: color-mix(in srgb, var(--c) 50%, transparent); box-shadow: 0 18px 40px -22px color-mix(in srgb, var(--c) 70%, transparent); }
.pad-stripe { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: linear-gradient(180deg, var(--c), transparent); opacity: 0.85; }
.pad-glow { position: absolute; inset: 0; pointer-events: none; opacity: 0; background: radial-gradient(120% 80% at 100% 0%, color-mix(in srgb, var(--c) 20%, transparent), transparent 60%); transition: opacity 0.3s; }
.pad:hover .pad-glow { opacity: 1; }
.pad-top { display: flex; align-items: center; justify-content: space-between; }
.pad-code { font-family: var(--shift-mono); font-size: 12px; font-weight: 800; padding: 3px 9px; border-radius: 7px; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 32%, transparent); }
.pad-type { font-family: var(--shift-mono); font-size: 8.5px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--shift-text-dim); }
.pad-name { margin: 0; font-size: 14.5px; font-weight: 700; color: var(--shift-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pad-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 2px; }
.pad-count { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--shift-text-muted); }
.pad-count svg { color: var(--c); }
.pad-count b { font-family: var(--shift-mono); font-size: 13px; font-weight: 800; color: var(--shift-text); }
.pad-deploy { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; color: var(--c); opacity: 0; transform: translateX(-6px); transition: opacity 0.25s, transform 0.25s; }
.pad:hover .pad-deploy { opacity: 1; transform: translateX(0); }
.pad-skel { flex: 0 0 248px; height: 152px; border-radius: 18px; background: linear-gradient(100deg, var(--shift-surface), var(--shift-surface-2), var(--shift-surface)); background-size: 200% 100%; animation: shift-shimmer 1.4s linear infinite; }
@keyframes shift-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.bay-empty { display: flex; align-items: center; gap: 8px; padding: 22px; border-radius: 16px; font-size: 12.5px; color: var(--shift-text-muted); background: var(--shift-surface); border: 1px dashed var(--shift-border-soft); }
.bay-empty svg { color: var(--shift-amber); }
.bay-empty b { color: var(--shift-text-2); }

/* ═══ ROSTER ═══ */
.roster { border-radius: 18px; background: var(--shift-surface); border: 1px solid var(--shift-border-soft); overflow: hidden; }
.roster-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 18px; border-bottom: 1px solid var(--shift-border-soft); flex-wrap: wrap; }
.roster-head h3 { margin: 0; font-size: 14px; font-weight: 700; color: var(--shift-text); display: inline-flex; align-items: center; gap: 8px; }
.rh-count { font-family: var(--shift-mono); font-size: 11px; padding: 2px 8px; border-radius: 999px; background: rgba(251,191,36,0.14); color: var(--shift-amber); }
.roster-tools { display: flex; align-items: center; gap: 10px; }
.rt-search { display: flex; align-items: center; gap: 7px; padding: 7px 11px; border-radius: 10px; background: var(--hr-input-bg); border: 1px solid var(--hr-input-border); color: var(--shift-text-muted); transition: border-color 0.2s; }
.rt-search:focus-within { border-color: var(--shift-amber); }
.rt-search input { background: transparent; border: 0; outline: none; color: var(--shift-text); font: inherit; font-size: 12.5px; width: 170px; }

.view-seg { position: relative; display: flex; gap: 2px; padding: 3px; border-radius: 11px; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); }
.seg-slider { position: absolute; top: 3px; bottom: 3px; left: 3px; width: calc(50% - 3px); border-radius: 8px; background: var(--shift-grad-cta); box-shadow: 0 4px 12px -4px rgba(251,146,60,0.6); transition: transform 0.32s var(--shift-spring); }
.view-seg[data-view="ledger"] .seg-slider { transform: translateX(100%); }
.seg-btn { position: relative; z-index: 1; display: inline-flex; align-items: center; gap: 5px; padding: 6px 13px; border: 0; background: none; cursor: pointer; font-size: 12px; font-weight: 700; color: var(--shift-text-muted); transition: color 0.25s; }
.seg-btn.on { color: #1f1408; }

/* board */
.board { display: flex; gap: 13px; overflow-x: auto; padding: 16px 18px; scrollbar-width: thin; scrollbar-color: rgba(251,191,36,0.25) transparent; }
.board::-webkit-scrollbar { height: 7px; }
.board::-webkit-scrollbar-thumb { background: rgba(251,191,36,0.25); border-radius: 4px; }
.col { flex: 0 0 268px; display: flex; flex-direction: column; gap: 9px; padding: 12px; border-radius: 16px; background: var(--shift-surface-2); border: 1px solid var(--shift-border-soft); }
.col-head { position: relative; display: flex; align-items: center; gap: 8px; padding: 4px 4px 10px; border-bottom: 1px solid var(--shift-border-soft); }
.col-bar { position: absolute; left: 0; bottom: -1px; height: 2px; width: 100%; background: linear-gradient(90deg, var(--c), transparent); }
.col-code { font-family: var(--shift-mono); font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 6px; color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 30%, transparent); }
.col-name { font-size: 12.5px; font-weight: 600; color: var(--shift-text-2); flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.col-count { font-family: var(--shift-mono); font-size: 11px; padding: 1px 7px; border-radius: 999px; background: var(--shift-surface); color: var(--shift-text-muted); }
.col-body { display: flex; flex-direction: column; gap: 7px; }
.crew-card { display: flex; align-items: center; gap: 9px; padding: 8px 9px; border-radius: 11px; background: var(--shift-surface); border: 1px solid var(--shift-border-soft); transition: border-color 0.18s, transform 0.18s, box-shadow 0.18s; }
.crew-card:hover { border-color: var(--shift-border); transform: translateY(-2px); box-shadow: 0 10px 24px -16px rgba(0,0,0,0.6); }
.cc-av { width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0; display: grid; place-items: center; font-size: 10.5px; font-weight: 800; font-family: var(--shift-mono); background: color-mix(in srgb, var(--c) 16%, transparent); color: var(--c); }
.cc-meta { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.cc-meta b { font-size: 12px; color: var(--shift-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cc-meta small { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-family: var(--shift-mono); color: var(--shift-text-muted); }
.cc-rm { width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0; display: grid; place-items: center; cursor: pointer; background: transparent; border: 1px solid var(--shift-border-soft); color: var(--shift-text-muted); transition: 0.18s; }
.cc-rm:hover:not(:disabled) { background: var(--shift-warn-soft); border-color: color-mix(in srgb, var(--shift-ember) 36%, transparent); color: var(--shift-ember-strong); }
.cc-rm:disabled { opacity: 0.5; cursor: default; }
.col-add { display: inline-flex; align-items: center; justify-content: center; gap: 5px; padding: 8px; border-radius: 10px; cursor: pointer; font-size: 11.5px; font-weight: 600;
  background: transparent; border: 1px dashed var(--shift-border-soft); color: var(--shift-text-muted); transition: 0.18s; margin-top: 2px; }
.col-add:hover { border-color: var(--shift-border); color: var(--shift-amber); }

/* ledger */
.ledger-wrap { overflow-x: auto; }
.ledger { width: 100%; border-collapse: collapse; }
.ledger th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--shift-text-dim); padding: 11px 18px; border-bottom: 1px solid var(--shift-border-soft); font-weight: 600; }
.ledger td { padding: 10px 18px; border-bottom: 1px solid var(--shift-border-soft); font-size: 13px; color: var(--shift-text-2); }
.ledger tbody tr:hover td { background: rgba(251,191,36,0.04); }
.lc-emp { display: flex; align-items: center; gap: 9px; }
.lc-av { width: 28px; height: 28px; border-radius: 50%; flex-shrink: 0; display: grid; place-items: center; font-size: 10px; font-weight: 800; font-family: var(--shift-mono); background: rgba(251,191,36,0.14); color: var(--shift-amber); }
.lc-name { color: var(--shift-text); font-weight: 600; }
.lc-shift { display: inline-flex; align-items: center; gap: 7px; }
.lc-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--c, var(--shift-amber)); }
.lc-code { font-family: var(--shift-mono); font-size: 10px; padding: 2px 7px; border-radius: 6px; background: color-mix(in srgb, var(--c, var(--shift-amber)) 12%, transparent); color: var(--c, var(--shift-amber)); }
.lc-win { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--shift-text-muted); }
.lc-win svg { color: var(--shift-text-dim); }
.lc-pill { font-size: 10px; font-weight: 700; padding: 3px 9px; border-radius: 999px; background: var(--shift-ok-soft); color: var(--shift-ok); border: 1px solid color-mix(in srgb, var(--shift-ok) 28%, transparent); }
.lc-pill[data-open="true"] { background: rgba(251,191,36,0.12); color: var(--shift-amber); border-color: var(--shift-border); }
.lc-act { text-align: right; }

/* list transitions (board cards + ledger rows) */
.crew-enter-active { transition: opacity .4s var(--shift-ease), transform .4s var(--shift-ease); transition-delay: calc(var(--i, 0) * 0.03s); }
.crew-enter-from { opacity: 0; transform: translateY(12px) scale(0.97); }
.crew-leave-active { transition: opacity .3s var(--shift-ease), transform .3s var(--shift-ease); }
.crew-leave-to { opacity: 0; transform: translateX(24px); }
.crew-move { transition: transform .4s var(--shift-ease); }

.view-swap-enter-active { transition: opacity .3s var(--shift-ease), transform .3s var(--shift-ease); }
.view-swap-leave-active { transition: opacity .18s ease; }
.view-swap-enter-from { opacity: 0; transform: translateY(10px); }
.view-swap-leave-to { opacity: 0; }

.mono { font-family: var(--shift-mono); }
.spin :deep(svg), .spin { animation: shift-spin 0.9s linear infinite; }

@media (max-width: 980px) {
  .cmd { flex-direction: column; align-items: flex-start; }
  .cmd-right { width: 100%; justify-content: space-between; }
}
@media (max-width: 620px) {
  .readouts { grid-template-columns: 1fr 1fr; }
  .rt-search input { width: 110px; }
}
@media (prefers-reduced-motion: reduce) {
  .cmd-grid, .eye-dot { animation: none; }
}

/* ═══════════ LIGHT THEME ═══════════ */
[data-theme="light"] .cmd-scan { background: linear-gradient(180deg, transparent, rgba(217,119,6,0.06), transparent); }
[data-theme="light"] .ro-ic { background: rgba(217,119,6,0.14); color: var(--shift-amber-strong); }
[data-theme="light"] .seg-btn.on { color: #1f1408; }
[data-theme="light"] .crew-card:hover { box-shadow: 0 10px 24px -16px rgba(40,25,10,0.4); }
[data-theme="light"] .ledger tbody tr:hover td { background: rgba(217,119,6,0.05); }
[data-theme="light"] .cmd-clock { background: var(--shift-surface-2); }
</style>
