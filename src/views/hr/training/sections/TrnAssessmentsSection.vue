<template>
  <div class="trn-sec">
    <AssessmentLabHero
      :assessments="scoped"
      :programs="programs"
      v-model:search="search"
      v-model:programFilter="programFilter"
      @create="openCreate" />

    <!-- filter bar -->
    <div class="as-bar">
      <div class="as-chips">
        <button v-for="t in TYPE_CHIPS" :key="t.value" type="button" class="as-chip" :class="[`t-${t.key}`, { on: typeFilter === t.value }]"
          @click="typeFilter = typeFilter === t.value ? '' : t.value">
          <component v-if="t.icon" :is="t.icon" :size="13" />{{ t.label }}
          <span class="as-chip-n trn-mono">{{ t.count }}</span>
        </button>
      </div>
      <button type="button" class="as-toggle" :class="{ on: activeOnly }" @click="activeOnly = !activeOnly">
        <span class="as-toggle-dot" /> Active only
      </button>
    </div>

    <div v-if="loading" class="as-grid"><div v-for="n in 6" :key="n" class="trn-skel" style="height: 248px; border-radius: 18px" /></div>

    <TrnEmptyState v-else-if="!filtered.length" :icon="ClipboardCheck" title="No assessments yet"
      :sub="hasFilter ? 'No assessments match the current filters.' : 'Attach a quiz or exam to a program; a passing result auto-completes the enrolment and mints its certificate.'">
      <button v-if="!hasFilter" class="trn-btn trn-btn-primary" @click="openCreate" style="margin-top:14px"><Plus :size="15" /> New assessment</button>
    </TrnEmptyState>

    <TransitionGroup v-else name="as-flow" tag="div" class="as-grid">
      <AssessmentCard v-for="(a, i) in filtered" :key="a.id" :assessment="a" :index="i"
        @record="openRecord" @results="openResults" @edit="openEdit" @delete="askDelete"
        @toggle-active="toggleActive" @program="goProgram" />
    </TransitionGroup>

    <AssessmentFormModal :open="formOpen" :assessment="editing" :programs="programs" @close="formOpen=false" @saved="onSaved" />
    <RecordResultModal :open="recordOpen" :assessment="recording" @close="recordOpen=false" @saved="onSaved" />
    <AssessmentResultsDrawer :open="drawerOpen" :assessment="viewing" @close="drawerOpen=false" @record="onDrawerRecord" />
    <TrnDeleteModal :open="deleteOpen" :loading="deleting" title="Delete assessment"
      :item-name="deleteTarget?.title" :item-meta="deleteTarget?.program_name" :icon="ClipboardCheck"
      :reasons="DELETE_REASONS" require-reason
      :consequences="['The assessment is removed from its program.', 'Recorded attempts stay in the audit trail.', 'Enrolments already completed are unaffected.']"
      confirm-label="Delete assessment" @close="deleteOpen=false" @confirm="doDelete" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from 'vue-toastification'
import { Plus, ClipboardCheck, ListChecks, ScrollText, Wrench, MessagesSquare, LayoutGrid } from 'lucide-vue-next'
import TrnEmptyState from '../components/TrnEmptyState.vue'
import TrnDeleteModal from '../components/TrnDeleteModal.vue'
import AssessmentLabHero from '../components/AssessmentLabHero.vue'
import AssessmentCard from '../components/AssessmentCard.vue'
import AssessmentFormModal from '../modals/AssessmentFormModal.vue'
import RecordResultModal from '../modals/RecordResultModal.vue'
import AssessmentResultsDrawer from '../drawers/AssessmentResultsDrawer.vue'
import { fetchAssessments, deleteAssessment, patchAssessment, fetchTrainingPrograms } from '@/composables/useTraining'

const emit = defineEmits(['refresh-stats', 'go'])
const toast = useToast()

const assessments = ref([])
const programs = ref([])
const loading = ref(true)
const search = ref('')
const programFilter = ref('')
const typeFilter = ref('')
const activeOnly = ref(false)

const formOpen = ref(false)
const editing = ref(null)
const recordOpen = ref(false)
const recording = ref(null)
const drawerOpen = ref(false)
const viewing = ref(null)
const deleteOpen = ref(false)
const deleteTarget = ref(null)
const deleting = ref(false)

const DELETE_REASONS = ['Created by mistake', 'Replaced by a new version', 'Program retired', 'No longer assessed', 'Other']

// scoped = program + search (drives the hero headline); list adds type/active chips
const scoped = computed(() => {
  let rows = assessments.value
  if (programFilter.value) rows = rows.filter(a => a.program_id === programFilter.value)
  if (search.value) {
    const q = search.value.toLowerCase()
    rows = rows.filter(a => (a.title || '').toLowerCase().includes(q) || (a.program_name || '').toLowerCase().includes(q))
  }
  return rows
})
const filtered = computed(() => {
  let rows = scoped.value
  if (typeFilter.value) rows = rows.filter(a => a.assessment_type === typeFilter.value)
  if (activeOnly.value) rows = rows.filter(a => a.is_active !== false)
  return [...rows].sort((a, b) => (b.is_active !== false) - (a.is_active !== false))
})
const hasFilter = computed(() => !!search.value || !!programFilter.value || !!typeFilter.value || activeOnly.value)

const TYPE_CHIPS = computed(() => {
  const defs = [
    { value: '', key: 'all', label: 'All', icon: LayoutGrid },
    { value: 'QUIZ', key: 'quiz', label: 'Quiz', icon: ListChecks },
    { value: 'EXAM', key: 'exam', label: 'Exam', icon: ScrollText },
    { value: 'PRACTICAL', key: 'practical', label: 'Practical', icon: Wrench },
    { value: 'SURVEY', key: 'survey', label: 'Survey', icon: MessagesSquare },
  ]
  return defs.map(d => ({ ...d, count: d.value ? scoped.value.filter(a => a.assessment_type === d.value).length : scoped.value.length }))
})

const load = async () => {
  loading.value = true
  try { assessments.value = await fetchAssessments() }
  catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load assessments') }
  finally { loading.value = false }
}
onMounted(async () => {
  load()
  try { programs.value = await fetchTrainingPrograms({ limit: 100 }) } catch { programs.value = [] }
})

const openCreate = () => { editing.value = null; formOpen.value = true }
const openEdit = (a) => { editing.value = a; formOpen.value = true }
const openRecord = (a) => { recording.value = a; recordOpen.value = true }
const openResults = (a) => { viewing.value = a; drawerOpen.value = true }
const onDrawerRecord = (a) => { drawerOpen.value = false; openRecord(a) }
const goProgram = () => emit('go', 'programs')
const onSaved = () => { load(); emit('refresh-stats') }

const toggleActive = async (a) => {
  const next = a.is_active === false
  try {
    await patchAssessment(a.id, { is_active: next })
    a.is_active = next // optimistic
    toast.success(next ? 'Assessment activated' : 'Assessment archived')
    emit('refresh-stats')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not update') }
}

const askDelete = (a) => { deleteTarget.value = a; deleteOpen.value = true }
const doDelete = async () => {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await deleteAssessment(deleteTarget.value.id)
    toast.success('Assessment deleted')
    deleteOpen.value = false
    load(); emit('refresh-stats')
  } catch (e) { toast.error(e?.response?.data?.detail || 'Could not delete') }
  finally { deleting.value = false }
}
</script>

<style scoped>
.trn-sec { display: flex; flex-direction: column; gap: 18px; }

.as-bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.as-chips { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.as-chip { --c: var(--trn-amber); display: inline-flex; align-items: center; gap: 6px; font: inherit; font-size: 12px; font-weight: 600;
  padding: 7px 12px; border-radius: 999px; cursor: pointer; color: var(--trn-text-muted); background: var(--trn-surface); border: 1px solid var(--trn-border-soft); transition: all 0.2s; }
.as-chip.t-quiz { --c: var(--trn-amber); } .as-chip.t-exam { --c: var(--trn-ember); }
.as-chip.t-practical { --c: var(--trn-amber-strong); } .as-chip.t-survey { --c: var(--trn-star-dim); } .as-chip.t-all { --c: var(--trn-amber); }
.as-chip :deep(svg) { color: var(--c); }
.as-chip:hover { color: var(--trn-text); border-color: color-mix(in srgb, var(--c) 32%, transparent); }
.as-chip.on { color: var(--c); border-color: color-mix(in srgb, var(--c) 50%, transparent); background: color-mix(in srgb, var(--c) 12%, transparent); }
.as-chip-n { font-size: 10.5px; font-weight: 700; padding: 0 6px; border-radius: 999px; background: color-mix(in srgb, var(--c) 16%, transparent); color: var(--c); }

.as-toggle { display: inline-flex; align-items: center; gap: 7px; font: inherit; font-size: 12px; font-weight: 600; padding: 7px 12px; border-radius: 999px;
  cursor: pointer; color: var(--trn-text-muted); background: var(--trn-surface); border: 1px solid var(--trn-border-soft); transition: all 0.2s; }
.as-toggle-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--trn-text-dim); transition: all 0.2s; }
.as-toggle.on { color: var(--trn-st-completed); border-color: color-mix(in srgb, var(--trn-st-completed) 34%, transparent); }
.as-toggle.on .as-toggle-dot { background: var(--trn-st-completed); box-shadow: 0 0 7px var(--trn-st-completed); }

.as-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 14px; position: relative; }

.as-flow-move { transition: transform 0.45s var(--trn-spring); }
.as-flow-enter-active { transition: all 0.42s var(--trn-spring); }
.as-flow-leave-active { transition: all 0.32s var(--trn-spring); position: absolute; width: 100%; }
.as-flow-enter-from { opacity: 0; transform: translateY(14px) scale(0.98); }
.as-flow-leave-to { opacity: 0; transform: scale(0.96); }

@media (prefers-reduced-motion: reduce) {
  .as-flow-move, .as-flow-enter-active, .as-flow-leave-active { transition: none; }
}
</style>
