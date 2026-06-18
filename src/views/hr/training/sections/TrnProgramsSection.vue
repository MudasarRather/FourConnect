<template>
  <div class="trn-sec">
    <!-- ── mini-hero: catalog console ───────────────────────────────── -->
    <section class="pg-hero" ref="heroRef">
      <div class="pg-grain trn-grain" aria-hidden="true" />
      <div class="pg-spot trn-spotlight" aria-hidden="true" />
      <div class="pg-hero-in">
        <div class="pg-head">
          <Motion as="span" class="pg-eyebrow"
            :initial="{ opacity: 0, y: -8 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
            <BookOpen :size="13" /> Catalog · Programs
          </Motion>
          <Motion as="h2" class="pg-title"
            :initial="{ opacity: 0, y: 18, filter: 'blur(8px)' }" :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
            :transition="{ duration: 0.7, delay: 0.08, ease: [0.16, 1, 0.3, 1] }">
            The program <span class="grad">constellation</span>
          </Motion>
          <Motion as="p" class="pg-sub"
            :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }">
            The master catalog of trainings — every program here is shared live with the Onboarding module.
          </Motion>
        </div>
        <Motion as="button" class="trn-btn trn-btn-primary pg-cta"
          :initial="{ opacity: 0, scale: 0.9 }" :animate="{ opacity: 1, scale: 1 }"
          :transition="{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }"
          :whileHover="{ y: -3, scale: 1.03 }" :whileTap="{ scale: 0.96 }" @click="openCreate">
          <Plus :size="16" /> New program
        </Motion>
      </div>

      <!-- live stat constellation -->
      <Motion as="div" class="pg-stats"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.6, delay: 0.38, ease: [0.16, 1, 0.3, 1] }">
        <div v-for="(st, i) in heroStats" :key="st.key" class="pg-stat" :style="{ '--c': st.color }">
          <span class="ps-dot" :style="{ '--d': (i * 0.3) + 's' }" />
          <span class="ps-val"><TrnCountUp :value="st.value" /></span>
          <span class="ps-lab">{{ st.label }}</span>
        </div>
      </Motion>
    </section>

    <!-- ── toolbar ──────────────────────────────────────────────────── -->
    <div class="pg-tools">
      <div class="pg-search" :class="{ focus: searchFocus }">
        <Search :size="15" />
        <input v-model="search" placeholder="Search by name or code…" @focus="searchFocus = true" @blur="searchFocus = false" />
        <button v-if="search" class="pg-clear" @click="search = ''" aria-label="Clear"><X :size="13" /></button>
      </div>
      <TrnSelect v-model="typeFilter" :options="typeOptions" class="pg-filter" />
      <TrnSelect v-model="sortKey" :options="sortOptions" class="pg-filter" />
      <span class="pg-result trn-mono">{{ filtered.length }} / {{ programs.length }}</span>
    </div>

    <!-- ── grid ─────────────────────────────────────────────────────── -->
    <div v-if="loading" class="pg-grid">
      <div v-for="n in 6" :key="n" class="trn-skel" style="height: 200px; border-radius: 18px;" />
    </div>

    <TrnEmptyState v-else-if="!filtered.length" :icon="BookOpen" title="No programs in view"
      :sub="search || typeFilter ? 'No programs match your filters — try clearing them.' : 'Create your first reusable training program to start enrolling employees.'">
      <button v-if="search || typeFilter" class="trn-btn trn-btn-ghost" @click="clearFilters" style="margin-top:14px"><X :size="14" /> Clear filters</button>
      <button v-else class="trn-btn trn-btn-primary" @click="openCreate" style="margin-top:14px"><Plus :size="15" /> New program</button>
    </TrnEmptyState>

    <TransitionGroup v-else name="cap-list" tag="div" class="pg-grid">
      <TrnProgramCapsule v-for="(p, i) in filtered" :key="p.id" :program="p" :index="i" interactive
        @view="openDetail(p)" @edit="openEdit(p)" @delete="openDelete(p)" />
    </TransitionGroup>

    <ProgramFormModal :open="modalOpen" :program="editing" @close="modalOpen = false" @saved="onSaved" />
    <ProgramDetailDrawer :open="drawerOpen" :program="viewing" @close="drawerOpen = false"
      @edit="openEdit" @delete="openDelete" @assign="goAssign(viewing)" />
    <DeleteProgramModal :open="deleteOpen" :program="deleting" @close="deleteOpen = false" @deleted="onDeleted" @assign="goAssign(deleting)" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import { Search, Plus, BookOpen, X, Clock, ArrowDownAZ, Users } from 'lucide-vue-next'
import TrnEmptyState from '../components/TrnEmptyState.vue'
import TrnCountUp from '../components/TrnCountUp.vue'
import TrnSelect from '../components/TrnSelect.vue'
import TrnProgramCapsule from '../components/TrnProgramCapsule.vue'
import ProgramFormModal from '../modals/ProgramFormModal.vue'
import ProgramDetailDrawer from '../drawers/ProgramDetailDrawer.vue'
import DeleteProgramModal from '../modals/DeleteProgramModal.vue'
import { TRAINING_TYPES, typeMeta, fetchTrainingPrograms } from '@/composables/useTraining'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const emit = defineEmits(['refresh-stats', 'go'])
const toast = useToast()

const programs = ref([])
const loading = ref(true)
const search = ref('')
const searchFocus = ref(false)
const typeFilter = ref('')
const sortKey = ref('recent')
const modalOpen = ref(false)
const editing = ref(null)
const drawerOpen = ref(false)
const viewing = ref(null)
const deleteOpen = ref(false)
const deleting = ref(null)

const heroRef = ref(null)
usePointerSpotlight(heroRef)

const typeOptions = computed(() => [
  { value: '', label: 'All types' },
  ...TRAINING_TYPES.map(t => ({ value: t, label: typeMeta(t).label, dot: `var(${typeMeta(t).cssVar})` })),
])
const sortOptions = [
  { value: 'recent', label: 'Newest first', icon: Clock },
  { value: 'name', label: 'Name A–Z', icon: ArrowDownAZ },
  { value: 'enrolled', label: 'Most enrolled', icon: Users },
]

const filtered = computed(() => {
  let rows = [...programs.value]
  if (typeFilter.value) rows = rows.filter(p => p.training_type === typeFilter.value)
  if (search.value) {
    const q = search.value.toLowerCase()
    rows = rows.filter(p => (p.name || '').toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q))
  }
  if (sortKey.value === 'name') rows.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  else if (sortKey.value === 'enrolled') rows.sort((a, b) => (b.enrollment_count || 0) - (a.enrollment_count || 0))
  return rows
})

const heroStats = computed(() => {
  const p = programs.value
  return [
    { key: 'total', label: 'Programs', value: p.length, color: 'var(--trn-amber)' },
    { key: 'cert', label: 'Certified', value: p.filter(x => x.certification_required).length, color: 'var(--trn-st-completed)' },
    { key: 'comp', label: 'Compliance', value: p.filter(x => x.is_compliance).length, color: 'var(--trn-ember)' },
    { key: 'joiner', label: 'Joiner-mandatory', value: p.filter(x => x.is_mandatory_for_new_joiners).length, color: 'var(--trn-amber-strong)' },
    { key: 'enr', label: 'Total enrollments', value: p.reduce((s, x) => s + (x.enrollment_count || 0), 0), color: 'var(--trn-star)' },
  ]
})

const load = async () => {
  loading.value = true
  try { programs.value = await fetchTrainingPrograms() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load programs') }
  finally { loading.value = false }
}
onMounted(load)

const clearFilters = () => { search.value = ''; typeFilter.value = '' }
const openCreate = () => { editing.value = null; modalOpen.value = true }
const openEdit = (p) => { drawerOpen.value = false; editing.value = p; modalOpen.value = true }
const openDetail = (p) => { viewing.value = p; drawerOpen.value = true }
const openDelete = (p) => { drawerOpen.value = false; deleting.value = p; deleteOpen.value = true }
const goAssign = (program) => {
  drawerOpen.value = false; deleteOpen.value = false
  const p = program && program.id ? program : null
  emit('go', p ? { tab: 'enrollment', programId: p.id, programName: p.name } : 'enrollment')
}
const onSaved = () => { load(); emit('refresh-stats') }
const onDeleted = () => { deleteOpen.value = false; load(); emit('refresh-stats') }
</script>

<style scoped>
.trn-sec { display: flex; flex-direction: column; gap: 16px; }

/* ── mini-hero ── */
.pg-hero { position: relative; overflow: hidden; border-radius: 24px; padding: 26px 28px 22px;
  background: var(--trn-dome); border: 1px solid var(--trn-border-soft); box-shadow: var(--trn-card-shadow); }
.pg-hero::before { content: ''; position: absolute; inset: 0; background: var(--trn-grad-hero); z-index: 0; }
.pg-grain { z-index: 1; }
.pg-spot { z-index: 1; }
.pg-hero-in { position: relative; z-index: 2; display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
.pg-head { min-width: 0; }
.pg-eyebrow { display: inline-flex; align-items: center; gap: 7px; padding: 5px 11px; border-radius: 999px;
  background: color-mix(in srgb, var(--trn-amber) 12%, transparent); border: 1px solid var(--trn-border-strong);
  font-family: var(--trn-mono); font-size: 10px; letter-spacing: 0.13em; text-transform: uppercase; color: var(--trn-amber-strong); }
.pg-title { margin: 13px 0 0; font-size: 30px; line-height: 1.04; font-weight: 850; letter-spacing: -0.03em; color: var(--trn-text); }
.pg-title .grad { background: linear-gradient(110deg, #fbbf24, #fde68a 42%, #fb923c); -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; background-size: 220% auto; animation: trn-sheen 5s linear infinite; }
.pg-sub { margin: 10px 0 0; max-width: 540px; font-size: 13.5px; line-height: 1.55; color: var(--trn-text-secondary); }
.pg-cta { flex-shrink: 0; }

.pg-stats { position: relative; z-index: 2; display: flex; gap: 26px; flex-wrap: wrap; margin-top: 22px; padding-top: 18px;
  border-top: 1px solid var(--trn-border-soft); }
.pg-stat { position: relative; display: flex; flex-direction: column; gap: 1px; padding-left: 12px; }
.ps-dot { position: absolute; top: 5px; left: 0; width: 7px; height: 7px; border-radius: 50%; background: var(--c);
  box-shadow: 0 0 8px var(--c); animation: trn-pulse-dot 2.6s ease-out infinite; animation-delay: var(--d); }
.ps-val { font-family: var(--trn-mono); font-size: 24px; font-weight: 800; line-height: 1.1; color: var(--trn-text); }
.ps-lab { font-size: 10.5px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--trn-text-dim); }

/* ── toolbar ── */
.pg-tools { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.pg-search { display: flex; align-items: center; gap: 8px; padding: 0 10px 0 12px; border-radius: 11px; flex: 1; min-width: 220px;
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); color: var(--trn-text-muted);
  transition: border-color 0.2s, box-shadow 0.2s; }
.pg-search.focus { border-color: color-mix(in srgb, var(--trn-amber) 55%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--trn-amber) 14%, transparent); }
.pg-search input { flex: 1; border: 0; background: transparent; padding: 10px 0; color: var(--trn-text); font: inherit; font-size: 13.5px; }
.pg-search input:focus { outline: none; }
.pg-clear { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 7px;
  border: 0; background: var(--trn-surface-elevated); color: var(--trn-text-muted); cursor: pointer; transition: color 0.2s; }
.pg-clear:hover { color: var(--trn-text); }
.pg-filter { min-width: 168px; }
.pg-result { margin-left: auto; font-size: 12px; color: var(--trn-text-dim); padding: 0 4px; }

/* ── grid ── */
.pg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 14px; }

/* list transitions — entrance handled by the capsule's own Motion */
.cap-list-move { transition: transform 0.45s var(--trn-spring); }
.cap-list-leave-active { transition: all 0.3s var(--trn-spring); position: absolute; width: calc(33.333% - 10px); }
.cap-list-leave-to { opacity: 0; transform: scale(0.94); }

@media (max-width: 760px) {
  .pg-title { font-size: 24px; }
  .pg-cta { width: 100%; }
  .pg-stats { gap: 18px; }
  .pg-filter { flex: 1; min-width: 140px; }
}
@media (prefers-reduced-motion: reduce) {
  .pg-title .grad { animation: none; }
  .ps-dot { animation: none; }
}
</style>
