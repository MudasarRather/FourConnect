<template>
  <div class="trn-sec">
    <!-- ── mini-hero: enrollment console ── -->
    <section class="en-hero" ref="heroRef">
      <div class="en-grain trn-grain" aria-hidden="true" />
      <div class="en-spot trn-spotlight" aria-hidden="true" />
      <div class="en-in">
        <div class="en-head">
          <Motion as="span" class="en-eyebrow"
            :initial="{ opacity: 0, y: -8 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
            <UsersRound :size="13" /> People · Enrollments
          </Motion>
          <Motion as="h2" class="en-title"
            :initial="{ opacity: 0, y: 18, filter: 'blur(8px)' }" :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
            :transition="{ duration: 0.7, delay: 0.08, ease: [0.16, 1, 0.3, 1] }">
            Every learner <span class="grad">in flight</span>
          </Motion>
          <Motion as="p" class="en-sub"
            :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }">
            Who's learning what, and how far along — across the whole organisation.
          </Motion>
        </div>
        <Motion as="button" class="trn-btn trn-btn-primary en-cta"
          :initial="{ opacity: 0, scale: 0.9 }" :animate="{ opacity: 1, scale: 1 }" :transition="{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }"
          :whileHover="{ y: -3, scale: 1.03 }" :whileTap="{ scale: 0.96 }" @click="openAssign">
          <Plus :size="16" /> Assign training
        </Motion>
      </div>

      <Motion as="div" class="en-stats"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.6, delay: 0.38, ease: [0.16, 1, 0.3, 1] }">
        <div v-for="(st, i) in heroStats" :key="st.key" class="en-stat" :style="{ '--c': st.color }">
          <span class="es-dot" :style="{ '--d': (i * 0.3) + 's' }" />
          <span class="es-val"><TrnCountUp :value="st.value" :suffix="st.suffix || ''" /></span>
          <span class="es-lab">{{ st.label }}</span>
        </div>
      </Motion>
    </section>

    <!-- ── program scope chip (from "Manage enrollees") ── -->
    <Motion v-if="programFilter" as="div" class="en-progscope"
      :initial="{ opacity: 0, y: -6 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }">
      <BookOpen :size="14" />
      <span>Scoped to <strong>{{ programFilterName || 'selected program' }}</strong> — unassign in-progress learners here to free the program for archiving.</span>
      <button class="en-pf-clear" @click="clearProgramFilter"><X :size="13" /> Show all</button>
    </Motion>

    <!-- ── status tabs + search ── -->
    <div class="en-bar">
      <div class="en-tabs">
        <Motion v-for="(t, i) in statusTabs" :key="t.value" as="button" class="en-tab" :class="{ on: statusFilter === t.value }"
          :style="{ '--c': t.color }"
          :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.34, delay: 0.04 * i, ease: [0.16, 1, 0.3, 1] }"
          :whileTap="{ scale: 0.95 }" @click="statusFilter = t.value">
          {{ t.label }} <span class="en-tab-n">{{ t.count }}</span>
        </Motion>
      </div>
      <div class="en-search" :class="{ focus: searchFocus }">
        <Search :size="15" />
        <input v-model="search" placeholder="Search employee or program…" @focus="searchFocus = true" @blur="searchFocus = false" />
        <button v-if="search" class="en-clear" @click="search = ''" aria-label="Clear"><X :size="13" /></button>
      </div>
    </div>

    <!-- loading -->
    <div v-if="loading" class="en-rows">
      <div v-for="n in 6" :key="n" class="trn-skel" style="height: 72px; border-radius: 16px" />
    </div>

    <!-- empty -->
    <TrnEmptyState v-else-if="!filtered.length" :icon="UsersRound" title="No enrollments in view"
      :sub="hasFilters ? 'No enrollments match your filters — try clearing them.' : 'Assign your first employee to a training program to start tracking progress.'">
      <button v-if="hasFilters" class="trn-btn trn-btn-ghost" @click="clearFilters"><X :size="14" /> Clear filters</button>
      <button v-else class="trn-btn trn-btn-primary" @click="openAssign"><Plus :size="15" /> Assign training</button>
    </TrnEmptyState>

    <!-- trajectory rows -->
    <TransitionGroup v-else name="en-list" tag="div" class="en-rows">
      <Motion v-for="(row, i) in filtered" :key="row.id" as="article" class="er" :class="{ overdue: isOverdue(row) }"
        :style="{ '--sc': rowColor(row) }"
        :initial="{ opacity: 0, y: 14, filter: 'blur(6px)' }" :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
        :transition="{ duration: 0.5, delay: Math.min(i * 0.04, 0.4), ease: [0.16, 1, 0.3, 1] }"
        :whileHover="{ y: -3, scale: 1.008 }">
        <span class="er-rail" aria-hidden="true" />
        <span class="er-aura" aria-hidden="true" />
        <span class="er-sheen" aria-hidden="true" />

        <button class="er-emp" @click="openDetail(row)">
          <span class="er-avatar" aria-hidden="true">
            {{ initialOf(row.employee_name) }}
            <span class="er-av-dot" />
          </span>
          <span class="er-emp-name">{{ row.employee_name || '—' }}</span>
        </button>

        <button class="er-prog" @click="openDetail(row)">
          <span class="er-prog-name">{{ row.program_name || '—' }}</span>
          <TrnTypeBadge :type="row.program_type" />
        </button>

        <div class="er-traj">
          <TrnTrajectory :status="row.status" :overdue="isOverdue(row)" compact />
        </div>

        <TrnStatusStamp class="er-status" :status="row.status" kind="assignment" />

        <div class="er-when">
          <span v-if="row.completion_date" class="er-done"><CheckCircle2 :size="13" /> {{ fmtDate(row.completion_date) }}</span>
          <span v-else-if="row.due_date" class="er-due" :class="{ overdue: isOverdue(row) }">
            <CalendarClock :size="13" /> Due {{ fmtDate(row.due_date) }}
          </span>
          <span v-else class="er-nodate">No due date</span>
          <span v-if="row.score != null && row.score !== ''" class="er-score">Score {{ row.score }}</span>
        </div>

        <div class="er-acts">
          <Motion as="button" class="er-act" title="View" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.9 }" @click="openDetail(row)"><Eye :size="15" /></Motion>
          <Motion as="button" class="er-act" title="Update progress" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.9 }" @click="openUpdate(row)"><Pencil :size="15" /></Motion>
          <Motion as="button" class="er-act danger" title="Remove" :whileHover="{ y: -2 }" :whileTap="{ scale: 0.9 }" @click="openDelete(row)"><Trash2 :size="15" /></Motion>
        </div>
      </Motion>
    </TransitionGroup>

    <AssignTrainingModal :open="assignOpen" :programs="programs" :existing="rows" @close="assignOpen = false" @saved="onSaved" />
    <UpdateProgressModal :open="updateOpen" :assignment="active" @close="updateOpen = false" @saved="onSaved" />
    <AssignmentDetailDrawer :open="drawerOpen" :assignment="active" :programs="programs" @close="drawerOpen = false" @update="openUpdate" @delete="openDelete" />

    <TrnDeleteModal
      :open="deleteOpen"
      title="Remove enrollment"
      :item-name="deleteTarget?.employee_name || ''"
      :item-meta="deleteTarget ? `${deleteTarget.program_name || ''} · ${statusMeta(deleteTarget.status).label}` : ''"
      :icon="UsersRound"
      :reasons="DELETE_REASONS"
      require-reason
      :consequences="['Removes this learner from the program', 'Their progress and any score on it are discarded', 'They lose access to it in self-service']"
      confirm-label="Remove enrollment"
      :loading="deleting"
      @close="deleteOpen = false"
      @confirm="doDelete" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import { Search, Plus, X, UsersRound, Eye, Pencil, Trash2, CalendarClock, CheckCircle2, BookOpen } from 'lucide-vue-next'
import TrnEmptyState from '../components/TrnEmptyState.vue'
import TrnCountUp from '../components/TrnCountUp.vue'
import TrnTypeBadge from '../components/TrnTypeBadge.vue'
import TrnStatusStamp from '../components/TrnStatusStamp.vue'
import TrnTrajectory from '../components/TrnTrajectory.vue'
import TrnDeleteModal from '../components/TrnDeleteModal.vue'
import AssignTrainingModal from '../modals/AssignTrainingModal.vue'
import UpdateProgressModal from '../modals/UpdateProgressModal.vue'
import AssignmentDetailDrawer from '../drawers/AssignmentDetailDrawer.vue'
import {
  fetchTrainingAssignments, deleteTrainingAssignment, fetchTrainingPrograms,
  ASSIGNMENT_STATUSES, statusMeta,
} from '@/composables/useTraining'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const emit = defineEmits(['refresh-stats'])
const toast = useToast()
const route = useRoute()
const router = useRouter()

const rows = ref([])
const programs = ref([])
const loading = ref(true)
const search = ref('')
const searchFocus = ref(false)
const statusFilter = ref('')
// Program scope arriving from "Manage enrollees" on a program card (route query).
const programFilter = ref(route.query.program || '')
const programFilterName = ref(route.query.programName || '')

const assignOpen = ref(false)
const updateOpen = ref(false)
const drawerOpen = ref(false)
const active = ref(null)
const deleteOpen = ref(false)
const deleteTarget = ref(null)
const deleting = ref(false)

const heroRef = ref(null)
usePointerSpotlight(heroRef)

const DELETE_REASONS = ['Enrolled by mistake', 'Employee left', 'Program cancelled', 'Duplicate enrollment', 'Other']

const OPEN_STATUSES = new Set(['NOT_STARTED', 'IN_PROGRESS'])
const isOverdue = (r) => {
  if (!r.due_date || !OPEN_STATUSES.has(r.status)) return false
  const due = new Date(r.due_date)
  if (Number.isNaN(due.getTime())) return false
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return due < today
}

const STATUS_COLORS = {
  NOT_STARTED: 'var(--trn-st-not-started)', IN_PROGRESS: 'var(--trn-st-in-progress)',
  COMPLETED: 'var(--trn-st-completed)', FAILED: 'var(--trn-st-failed)', WAIVED: 'var(--trn-st-waived)',
}
const rowColor = (r) => (isOverdue(r) ? 'var(--trn-st-failed)' : (STATUS_COLORS[r.status] || 'var(--trn-amber)'))
const statusTabs = computed(() => [
  { value: '', label: 'All', count: rows.value.length, color: 'var(--trn-amber)' },
  ...ASSIGNMENT_STATUSES.map(s => ({
    value: s, label: statusMeta(s).label, color: STATUS_COLORS[s],
    count: rows.value.filter(r => r.status === s).length,
  })),
])

const hasFilters = computed(() => !!(search.value || statusFilter.value || programFilter.value))

const filtered = computed(() => {
  let list = rows.value
  if (statusFilter.value) list = list.filter(r => r.status === statusFilter.value)
  if (search.value) {
    const q = search.value.toLowerCase()
    list = list.filter(r => (r.employee_name || '').toLowerCase().includes(q) || (r.program_name || '').toLowerCase().includes(q))
  }
  return list
})

const heroStats = computed(() => {
  const total = rows.value.length
  const completed = rows.value.filter(r => r.status === 'COMPLETED').length
  return [
    { key: 'total', label: 'Enrollments', value: total, color: 'var(--trn-amber)' },
    { key: 'prog', label: 'In progress', value: rows.value.filter(r => r.status === 'IN_PROGRESS').length, color: 'var(--trn-st-in-progress)' },
    { key: 'done', label: 'Completed', value: completed, color: 'var(--trn-st-completed)' },
    { key: 'over', label: 'Overdue', value: rows.value.filter(isOverdue).length, color: 'var(--trn-st-failed)' },
    { key: 'rate', label: 'Completion', value: total ? Math.round((completed / total) * 100) : 0, suffix: '%', color: 'var(--trn-star)' },
  ]
})

const initialOf = (n) => (n ? n.trim().charAt(0).toUpperCase() : '?')
const fmtDate = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return '—'
  return dt.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

const load = async () => {
  loading.value = true
  try {
    const params = {}
    if (programFilter.value) params.program_id = programFilter.value
    const [assignments, progs] = await Promise.all([fetchTrainingAssignments(params), fetchTrainingPrograms()])
    rows.value = Array.isArray(assignments) ? assignments : []
    programs.value = Array.isArray(progs) ? progs : []
    // Resolve the program name if we only arrived with an id.
    if (programFilter.value && !programFilterName.value) {
      const p = programs.value.find(x => String(x.id) === String(programFilter.value))
      if (p) programFilterName.value = p.name
    }
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load enrollments')
  } finally {
    loading.value = false
  }
}
onMounted(load)

// Re-scope if the user deep-links again while already on this tab.
watch(() => route.query.program, (v) => {
  programFilter.value = v || ''
  programFilterName.value = route.query.programName || ''
  load()
})

const clearProgramFilter = () => {
  programFilter.value = ''
  programFilterName.value = ''
  if (route.query.program || route.query.programName) {
    const q = { ...route.query }
    delete q.program; delete q.programName
    router.replace({ query: q })
  }
  load()
}
const clearFilters = () => { search.value = ''; statusFilter.value = ''; clearProgramFilter() }
const openAssign = () => { assignOpen.value = true }
const openDetail = (r) => { active.value = r; drawerOpen.value = true }
const openUpdate = (r) => { drawerOpen.value = false; active.value = r; updateOpen.value = true }
const openDelete = (r) => { drawerOpen.value = false; deleteTarget.value = r; deleteOpen.value = true }
const onSaved = () => { load(); emit('refresh-stats') }

const doDelete = async ({ reason } = {}) => {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await deleteTrainingAssignment(deleteTarget.value.id, { reason })
    toast.success('Enrollment removed')
    deleteOpen.value = false
    load(); emit('refresh-stats')
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Could not remove enrollment')
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.trn-sec { display: flex; flex-direction: column; gap: 16px; }

/* ── mini-hero ── */
.en-hero { position: relative; overflow: hidden; border-radius: 24px; padding: 26px 28px 22px;
  background: var(--trn-dome); border: 1px solid var(--trn-border-soft); box-shadow: var(--trn-card-shadow); }
.en-hero::before { content: ''; position: absolute; inset: 0; background: var(--trn-grad-hero); z-index: 0; }
.en-grain { z-index: 1; }
.en-spot { z-index: 1; }
.en-in { position: relative; z-index: 2; display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
.en-head { min-width: 0; }
.en-eyebrow { display: inline-flex; align-items: center; gap: 7px; padding: 5px 11px; border-radius: 999px;
  background: color-mix(in srgb, var(--trn-amber) 12%, transparent); border: 1px solid var(--trn-border-strong);
  font-family: var(--trn-mono); font-size: 10px; letter-spacing: 0.13em; text-transform: uppercase; color: var(--trn-amber-strong); }
.en-title { margin: 13px 0 0; font-size: 30px; line-height: 1.04; font-weight: 850; letter-spacing: -0.03em; color: var(--trn-text); }
.en-title .grad { background: linear-gradient(110deg, #fbbf24, #fde68a 42%, #fb923c); -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; background-size: 220% auto; animation: trn-sheen 5s linear infinite; }
.en-sub { margin: 10px 0 0; max-width: 540px; font-size: 13.5px; line-height: 1.55; color: var(--trn-text-secondary); }
.en-cta { flex-shrink: 0; }

.en-stats { position: relative; z-index: 2; display: flex; gap: 26px; flex-wrap: wrap; margin-top: 22px; padding-top: 18px; border-top: 1px solid var(--trn-border-soft); }
.en-stat { position: relative; display: flex; flex-direction: column; gap: 1px; padding-left: 12px; }
.es-dot { position: absolute; top: 5px; left: 0; width: 7px; height: 7px; border-radius: 50%; background: var(--c);
  box-shadow: 0 0 8px var(--c); animation: trn-pulse-dot 2.6s ease-out infinite; animation-delay: var(--d); }
.es-val { font-family: var(--trn-mono); font-size: 24px; font-weight: 800; line-height: 1.1; color: var(--trn-text); }
.es-lab { font-size: 10.5px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--trn-text-dim); }

/* ── program scope chip ── */
.en-progscope { display: flex; align-items: center; gap: 10px; padding: 11px 14px; border-radius: 14px;
  background: color-mix(in srgb, var(--trn-amber) 9%, var(--trn-surface));
  border: 1px solid color-mix(in srgb, var(--trn-amber) 30%, transparent); font-size: 12.5px; color: var(--trn-text-secondary); }
.en-progscope > :deep(svg) { color: var(--trn-amber-strong); flex-shrink: 0; }
.en-progscope strong { color: var(--trn-text); font-weight: 700; }
.en-pf-clear { display: inline-flex; align-items: center; gap: 5px; margin-left: auto; flex-shrink: 0; font: inherit; font-size: 11.5px;
  font-weight: 600; padding: 6px 11px; border-radius: 9px; cursor: pointer; color: var(--trn-amber-strong);
  background: color-mix(in srgb, var(--trn-amber) 12%, transparent); border: 1px solid color-mix(in srgb, var(--trn-amber) 32%, transparent);
  transition: background 0.2s, color 0.2s; }
.en-pf-clear:hover { background: color-mix(in srgb, var(--trn-amber) 20%, transparent); color: var(--trn-text); }

/* ── status tabs + search ── */
.en-bar { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
.en-tabs { display: flex; gap: 7px; flex-wrap: wrap; }
.en-tab { display: inline-flex; align-items: center; gap: 7px; padding: 7px 13px; border-radius: 999px; cursor: pointer; font: inherit;
  font-size: 12px; font-weight: 600; color: var(--trn-text-muted); background: var(--trn-surface); border: 1px solid var(--trn-border-soft);
  transition: color 0.22s, background 0.22s, border-color 0.22s, box-shadow 0.22s; }
.en-tab:hover { color: var(--trn-text); border-color: color-mix(in srgb, var(--c) 38%, transparent); }
.en-tab.on { color: var(--c); background: color-mix(in srgb, var(--c) 15%, transparent);
  border-color: color-mix(in srgb, var(--c) 42%, transparent); box-shadow: 0 0 16px -6px var(--c); }
.en-tab-n { font-family: var(--trn-mono); font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 999px;
  background: color-mix(in srgb, var(--trn-text) 8%, transparent); }
.en-tab.on .en-tab-n { background: color-mix(in srgb, var(--c) 24%, transparent); color: var(--c); }

.en-search { display: flex; align-items: center; gap: 8px; padding: 0 10px 0 13px; border-radius: 11px; min-width: 230px;
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); color: var(--trn-text-muted); transition: border-color 0.25s, box-shadow 0.25s; }
.en-search.focus { border-color: color-mix(in srgb, var(--trn-amber) 55%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--trn-amber) 14%, transparent); }
.en-search input { flex: 1; border: 0; background: transparent; padding: 10px 0; color: var(--trn-text); font: inherit; font-size: 13.5px; }
.en-search input:focus { outline: none; }
.en-clear { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 7px; border: 0;
  background: var(--trn-surface-elevated); color: var(--trn-text-muted); cursor: pointer; transition: color 0.2s; }
.en-clear:hover { color: var(--trn-text); }

/* ── rows ── */
.en-rows { display: flex; flex-direction: column; gap: 10px; }
.er { position: relative; overflow: hidden; isolation: isolate;
  display: grid; grid-template-columns: minmax(140px, 1.2fr) minmax(150px, 1.4fr) minmax(110px, 1.1fr) auto minmax(140px, 0.9fr) auto;
  align-items: center; gap: 14px; padding: 14px 18px 14px 22px; border-radius: 18px; border: 1px solid var(--trn-border-soft);
  background: var(--trn-surf-card); box-shadow: var(--trn-card-shadow);
  transition: box-shadow 0.3s var(--trn-spring), border-color 0.3s var(--trn-spring); }
.er > *:not(.er-rail):not(.er-aura):not(.er-sheen) { position: relative; z-index: 1; }
.er:hover { box-shadow: var(--trn-card-shadow-hover); border-color: color-mix(in srgb, var(--sc) 40%, transparent); }

/* status accent rail (left edge) */
.er-rail { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; z-index: 0; opacity: 0.6;
  background: linear-gradient(180deg, transparent, color-mix(in srgb, var(--sc) 75%, transparent) 50%, transparent);
  transition: opacity 0.3s, width 0.3s var(--trn-spring), box-shadow 0.3s; }
.er:hover .er-rail { opacity: 1; width: 4px; box-shadow: 0 0 16px -1px var(--sc); }

/* hover aura — radial wash from the rail side */
.er-aura { position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: 0; transition: opacity 0.4s;
  background: radial-gradient(130% 150% at 0% 50%, color-mix(in srgb, var(--sc) 13%, transparent), transparent 52%); }
.er:hover .er-aura { opacity: 1; }

/* one-shot light sweep on hover */
.er-sheen { position: absolute; inset: 0; z-index: 0; pointer-events: none; opacity: 0; background-repeat: no-repeat; background-size: 250% 100%; background-position: 150% 0;
  background-image: linear-gradient(110deg, transparent 38%, color-mix(in srgb, var(--sc) 18%, rgba(255, 255, 255, 0.1)) 50%, transparent 62%); }
.er:hover .er-sheen { opacity: 1; animation: er-sheen 0.85s var(--trn-spring); }
@keyframes er-sheen { from { background-position: 150% 0; } to { background-position: -60% 0; } }

.er.overdue { border-color: color-mix(in srgb, var(--trn-st-failed) 34%, transparent); }
.er.overdue .er-rail { opacity: 0.95; animation: er-rail-pulse 2.6s ease-in-out infinite; }
@keyframes er-rail-pulse { 0%, 100% { box-shadow: 0 0 0 0 transparent; } 50% { box-shadow: 0 0 13px -1px var(--trn-st-failed); } }

.er-emp { display: flex; align-items: center; gap: 11px; min-width: 0; border: 0; background: transparent; cursor: pointer; padding: 0; text-align: left; font: inherit; }
.er-avatar { position: relative; display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%;
  font-family: var(--trn-mono); font-size: 13px; font-weight: 700; color: #1a1206; flex-shrink: 0;
  background: var(--trn-grad-rail); box-shadow: 0 3px 10px -4px rgba(251, 146, 60, 0.5);
  transition: transform 0.3s var(--trn-spring), box-shadow 0.3s var(--trn-spring); }
.er:hover .er-avatar { transform: scale(1.07); box-shadow: 0 0 0 2px color-mix(in srgb, var(--sc) 55%, transparent), 0 6px 18px -5px var(--sc); }
.er-av-dot { position: absolute; right: -1px; bottom: -1px; width: 11px; height: 11px; border-radius: 50%;
  background: var(--sc); border: 2px solid var(--trn-canvas); box-shadow: 0 0 8px -1px var(--sc); }
.er-emp-name { font-size: 13.5px; font-weight: 700; color: var(--trn-text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.er-prog { display: flex; flex-direction: column; align-items: flex-start; gap: 5px; min-width: 0; cursor: pointer; border: 0; background: transparent; padding: 0; text-align: left; font: inherit; }
.er-prog-name { max-width: 100%; font-size: 13px; font-weight: 600; color: var(--trn-text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; transition: color 0.25s; }
.er:hover .er-prog-name { color: var(--trn-text); }

.er-traj { min-width: 0; padding: 0 4px; }
.er-status { justify-self: start; }

.er-when { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.er-done, .er-due, .er-nodate { display: inline-flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; white-space: nowrap; }
.er-done { color: var(--trn-st-completed); }
.er-due { color: var(--trn-text-muted); }
.er-due.overdue { color: var(--trn-st-failed); font-weight: 700; }
.er-nodate { color: var(--trn-text-dim); }
.er-score { font-family: var(--trn-mono); font-size: 11px; font-weight: 600; color: var(--trn-text-dim); }

/* actions — recede until the row is hovered, then resolve in */
.er-acts { display: flex; gap: 5px; justify-self: end; opacity: 0.5; transform: translateX(6px);
  transition: opacity 0.3s var(--trn-spring), transform 0.3s var(--trn-spring); }
.er:hover .er-acts { opacity: 1; transform: none; }
.er-act { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 9px;
  border: 1px solid var(--trn-border-soft); background: var(--trn-surface); color: var(--trn-text-secondary); cursor: pointer;
  transition: color 0.2s, background 0.2s, border-color 0.2s; }
.er-act:hover { color: var(--trn-text); background: var(--trn-surface-elevated); border-color: color-mix(in srgb, var(--trn-amber) 35%, transparent); }
.er-act.danger { color: var(--trn-st-failed); }
.er-act.danger:hover { background: var(--trn-st-failed-soft); border-color: color-mix(in srgb, var(--trn-st-failed) 38%, transparent); }

.en-list-move { transition: transform 0.4s var(--trn-spring); }
.en-list-enter-active { transition: all 0.4s var(--trn-spring); }
.en-list-leave-active { transition: all 0.3s var(--trn-spring); position: absolute; width: 100%; }
.en-list-enter-from { opacity: 0; transform: translateY(10px); }
.en-list-leave-to { opacity: 0; transform: scale(0.98); }

@media (max-width: 900px) {
  .er { grid-template-columns: 1fr auto; grid-auto-rows: auto; row-gap: 10px; }
  .er-emp { grid-column: 1; }
  .er-acts { grid-column: 2; grid-row: 1; opacity: 1; transform: none; }
  .er-prog, .er-traj, .er-status, .er-when { grid-column: 1 / -1; }
}
@media (max-width: 760px) { .en-title { font-size: 24px; } .en-cta { width: 100%; } .en-search { flex: 1; min-width: 0; } }
@media (prefers-reduced-motion: reduce) {
  .en-title .grad { animation: none; } .es-dot { animation: none; }
  .er-sheen, .er.overdue .er-rail { animation: none !important; }
  .er:hover .er-avatar { transform: none; }
}
</style>
