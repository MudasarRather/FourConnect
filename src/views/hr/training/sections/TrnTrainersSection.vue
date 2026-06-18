<template>
  <div class="trn-sec">
    <!-- ── mini-hero: faculty console ───────────────────────────────── -->
    <section class="fg-hero" ref="heroRef">
      <div class="fg-grain trn-grain" aria-hidden="true" />
      <div class="fg-spot trn-spotlight" aria-hidden="true" />
      <div class="fg-hero-in">
        <div class="fg-head">
          <Motion as="span" class="fg-eyebrow"
            :initial="{ opacity: 0, y: -8 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
            <Presentation :size="13" /> Catalog · Faculty
          </Motion>
          <Motion as="h2" class="fg-title"
            :initial="{ opacity: 0, y: 18, filter: 'blur(8px)' }" :animate="{ opacity: 1, y: 0, filter: 'blur(0px)' }"
            :transition="{ duration: 0.7, delay: 0.08, ease: [0.16, 1, 0.3, 1] }">
            The faculty <span class="grad">roster</span>
          </Motion>
          <Motion as="p" class="fg-sub"
            :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }">
            Internal mentors, external facilitators and partner vendors — the people who deliver every program.
          </Motion>
        </div>
        <Motion as="button" class="trn-btn trn-btn-primary fg-cta"
          :initial="{ opacity: 0, scale: 0.9 }" :animate="{ opacity: 1, scale: 1 }"
          :transition="{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }"
          :whileHover="{ y: -3, scale: 1.03 }" :whileTap="{ scale: 0.96 }" @click="openCreate">
          <Plus :size="16" /> New trainer
        </Motion>
      </div>

      <Motion as="div" class="fg-stats"
        :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.6, delay: 0.38, ease: [0.16, 1, 0.3, 1] }">
        <div v-for="(st, i) in heroStats" :key="st.key" class="fg-stat" :style="{ '--c': st.color }">
          <span class="fs-dot" :style="{ '--d': (i * 0.3) + 's' }" />
          <span class="fs-val"><TrnCountUp :value="st.value" :decimals="st.decimals || 0" /></span>
          <span class="fs-lab">{{ st.label }}</span>
        </div>
      </Motion>
    </section>

    <!-- ── toolbar ──────────────────────────────────────────────────── -->
    <div class="fg-tools">
      <div class="fg-search" :class="{ focus: searchFocus }">
        <Search :size="15" />
        <input v-model="search" placeholder="Search by name or specialization…" @focus="searchFocus = true" @blur="searchFocus = false" />
        <button v-if="search" class="fg-clear" @click="search = ''" aria-label="Clear"><X :size="13" /></button>
      </div>
      <TrnSelect v-model="typeFilter" :options="typeOptions" class="fg-filter" />
      <TrnSelect v-model="sortKey" :options="sortOptions" class="fg-filter" />
      <span class="fg-result trn-mono">{{ filtered.length }} / {{ trainers.length }}</span>
    </div>

    <!-- ── grid ─────────────────────────────────────────────────────── -->
    <div v-if="loading" class="fg-grid">
      <div v-for="n in 6" :key="n" class="trn-skel" style="height: 224px; border-radius: 18px;" />
    </div>

    <TrnEmptyState v-else-if="!filtered.length" :icon="Presentation" title="No trainers in view"
      :sub="search || typeFilter ? 'No trainers match your filters — try clearing them.' : 'Add your first trainer to assign them to programs and capture feedback.'">
      <button v-if="search || typeFilter" class="trn-btn trn-btn-ghost" @click="clearFilters"><X :size="14" /> Clear filters</button>
      <button v-else class="trn-btn trn-btn-primary" @click="openCreate"><Plus :size="15" /> New trainer</button>
    </TrnEmptyState>

    <TransitionGroup v-else name="cap-list" tag="div" class="fg-grid">
      <TrnTrainerCard v-for="(t, i) in filtered" :key="t.id" :trainer="t" :index="i" interactive
        @view="openDetail(t)" @edit="openEdit(t)" @delete="openDelete(t)" />
    </TransitionGroup>

    <TrainerFormModal :open="modalOpen" :trainer="editing" @close="modalOpen = false" @saved="onSaved" />
    <TrainerDetailDrawer :open="drawerOpen" :trainer="viewing" @close="drawerOpen = false" @edit="openEdit" @delete="openDelete" />
    <DeleteTrainerModal :open="deleteOpen" :trainer="deleting" @close="deleteOpen = false" @deleted="onDeleted" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import { Search, Plus, Presentation, X, ArrowDownAZ, Star, BookOpen } from 'lucide-vue-next'
import TrnEmptyState from '../components/TrnEmptyState.vue'
import TrnCountUp from '../components/TrnCountUp.vue'
import TrnSelect from '../components/TrnSelect.vue'
import TrnTrainerCard from '../components/TrnTrainerCard.vue'
import TrainerFormModal from '../modals/TrainerFormModal.vue'
import TrainerDetailDrawer from '../drawers/TrainerDetailDrawer.vue'
import DeleteTrainerModal from '../modals/DeleteTrainerModal.vue'
import { TRAINER_TYPES, fetchTrainers } from '@/composables/useTraining'
import { usePointerSpotlight } from '@/composables/useShiftMotion'

const emit = defineEmits(['refresh-stats'])
const toast = useToast()

const trainers = ref([])
const loading = ref(true)
const search = ref('')
const searchFocus = ref(false)
const typeFilter = ref('')
const sortKey = ref('name')
const modalOpen = ref(false)
const editing = ref(null)
const drawerOpen = ref(false)
const viewing = ref(null)
const deleteOpen = ref(false)
const deleting = ref(null)

const heroRef = ref(null)
usePointerSpotlight(heroRef)

const TYPE_COLORS = { INTERNAL: 'var(--trn-amber)', EXTERNAL: 'var(--trn-ember)', VENDOR: 'var(--trn-amber-strong)' }
const cap = (t) => t ? t.charAt(0) + t.slice(1).toLowerCase() : ''
const typeOptions = computed(() => [
  { value: '', label: 'All types' },
  ...TRAINER_TYPES.map(t => ({ value: t, label: cap(t), dot: TYPE_COLORS[t] })),
])
const sortOptions = [
  { value: 'name', label: 'Name A–Z', icon: ArrowDownAZ },
  { value: 'rating', label: 'Highest rated', icon: Star },
  { value: 'programs', label: 'Most programs', icon: BookOpen },
]

const filtered = computed(() => {
  let rows = [...trainers.value]
  if (typeFilter.value) rows = rows.filter(t => t.trainer_type === typeFilter.value)
  if (search.value) {
    const q = search.value.toLowerCase()
    rows = rows.filter(t => (t.name || '').toLowerCase().includes(q) || (t.specialization || '').toLowerCase().includes(q))
  }
  if (sortKey.value === 'rating') rows.sort((a, b) => (Number(b.rating_avg) || 0) - (Number(a.rating_avg) || 0))
  else if (sortKey.value === 'programs') rows.sort((a, b) => (b.program_count || 0) - (a.program_count || 0))
  else rows.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
  return rows
})

const heroStats = computed(() => {
  const t = trainers.value
  const rated = t.filter(x => Number(x.rating_count) > 0)
  const avg = rated.length ? rated.reduce((s, x) => s + (Number(x.rating_avg) || 0), 0) / rated.length : 0
  return [
    { key: 'total', label: 'Trainers', value: t.length, color: 'var(--trn-amber)' },
    { key: 'int', label: 'Internal', value: t.filter(x => x.trainer_type === 'INTERNAL').length, color: 'var(--trn-amber)' },
    { key: 'ext', label: 'External', value: t.filter(x => x.trainer_type === 'EXTERNAL').length, color: 'var(--trn-ember)' },
    { key: 'ven', label: 'Vendor', value: t.filter(x => x.trainer_type === 'VENDOR').length, color: 'var(--trn-amber-strong)' },
    { key: 'avg', label: 'Avg rating', value: avg, decimals: 1, color: 'var(--trn-star)' },
  ]
})

const load = async () => {
  loading.value = true
  try { trainers.value = await fetchTrainers() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load trainers') }
  finally { loading.value = false }
}
onMounted(load)

const clearFilters = () => { search.value = ''; typeFilter.value = '' }
const openCreate = () => { editing.value = null; modalOpen.value = true }
const openEdit = (t) => { drawerOpen.value = false; editing.value = t; modalOpen.value = true }
const openDetail = (t) => { viewing.value = t; drawerOpen.value = true }
const openDelete = (t) => { drawerOpen.value = false; deleting.value = t; deleteOpen.value = true }
const onSaved = () => { load(); emit('refresh-stats') }
const onDeleted = () => { deleteOpen.value = false; load(); emit('refresh-stats') }
</script>

<style scoped>
.trn-sec { display: flex; flex-direction: column; gap: 16px; }

/* ── mini-hero ── */
.fg-hero { position: relative; overflow: hidden; border-radius: 24px; padding: 26px 28px 22px;
  background: var(--trn-dome); border: 1px solid var(--trn-border-soft); box-shadow: var(--trn-card-shadow); }
.fg-hero::before { content: ''; position: absolute; inset: 0; background: var(--trn-grad-hero); z-index: 0; }
.fg-grain { z-index: 1; }
.fg-spot { z-index: 1; }
.fg-hero-in { position: relative; z-index: 2; display: flex; align-items: flex-end; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
.fg-head { min-width: 0; }
.fg-eyebrow { display: inline-flex; align-items: center; gap: 7px; padding: 5px 11px; border-radius: 999px;
  background: color-mix(in srgb, var(--trn-amber) 12%, transparent); border: 1px solid var(--trn-border-strong);
  font-family: var(--trn-mono); font-size: 10px; letter-spacing: 0.13em; text-transform: uppercase; color: var(--trn-amber-strong); }
.fg-title { margin: 13px 0 0; font-size: 30px; line-height: 1.04; font-weight: 850; letter-spacing: -0.03em; color: var(--trn-text); }
.fg-title .grad { background: linear-gradient(110deg, #fbbf24, #fde68a 42%, #fb923c); -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; background-size: 220% auto; animation: trn-sheen 5s linear infinite; }
.fg-sub { margin: 10px 0 0; max-width: 540px; font-size: 13.5px; line-height: 1.55; color: var(--trn-text-secondary); }
.fg-cta { flex-shrink: 0; }

.fg-stats { position: relative; z-index: 2; display: flex; gap: 26px; flex-wrap: wrap; margin-top: 22px; padding-top: 18px;
  border-top: 1px solid var(--trn-border-soft); }
.fg-stat { position: relative; display: flex; flex-direction: column; gap: 1px; padding-left: 12px; }
.fs-dot { position: absolute; top: 5px; left: 0; width: 7px; height: 7px; border-radius: 50%; background: var(--c);
  box-shadow: 0 0 8px var(--c); animation: trn-pulse-dot 2.6s ease-out infinite; animation-delay: var(--d); }
.fs-val { font-family: var(--trn-mono); font-size: 24px; font-weight: 800; line-height: 1.1; color: var(--trn-text); }
.fs-lab { font-size: 10.5px; letter-spacing: 0.05em; text-transform: uppercase; color: var(--trn-text-dim); }

/* ── toolbar ── */
.fg-tools { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.fg-search { display: flex; align-items: center; gap: 8px; padding: 0 10px 0 12px; border-radius: 11px; flex: 1; min-width: 220px;
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); color: var(--trn-text-muted); transition: border-color 0.2s, box-shadow 0.2s; }
.fg-search.focus { border-color: color-mix(in srgb, var(--trn-amber) 55%, transparent); box-shadow: 0 0 0 3px color-mix(in srgb, var(--trn-amber) 14%, transparent); }
.fg-search input { flex: 1; border: 0; background: transparent; padding: 10px 0; color: var(--trn-text); font: inherit; font-size: 13.5px; }
.fg-search input:focus { outline: none; }
.fg-clear { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 7px;
  border: 0; background: var(--trn-surface-elevated); color: var(--trn-text-muted); cursor: pointer; transition: color 0.2s; }
.fg-clear:hover { color: var(--trn-text); }
.fg-filter { min-width: 168px; }
.fg-result { margin-left: auto; font-size: 12px; color: var(--trn-text-dim); padding: 0 4px; }

/* ── grid ── */
.fg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 14px; }
.cap-list-move { transition: transform 0.45s var(--trn-spring); }
.cap-list-leave-active { transition: all 0.3s var(--trn-spring); position: absolute; width: calc(33.333% - 10px); }
.cap-list-leave-to { opacity: 0; transform: scale(0.94); }

@media (max-width: 760px) {
  .fg-title { font-size: 24px; }
  .fg-cta { width: 100%; }
  .fg-stats { gap: 18px; }
  .fg-filter { flex: 1; min-width: 140px; }
}
@media (prefers-reduced-motion: reduce) { .fg-title .grad { animation: none; } .fs-dot { animation: none; } }
</style>
