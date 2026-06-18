<template>
  <div class="trn-sec">
    <!-- cinematic loading -->
    <div v-if="loading" class="sm-loading">
      <div class="trn-skel" style="height: 300px; border-radius: 24px;" />
      <div class="sm-insight">
        <div class="trn-skel" style="height: 240px; border-radius: 18px;" />
        <div class="trn-skel" style="height: 240px; border-radius: 18px;" />
      </div>
      <div class="trn-skel" style="height: 320px; border-radius: 18px;" />
    </div>

    <template v-else>
      <!-- ── command deck ── -->
      <SkillMatrixHero
        v-model:deptId="deptId"
        :mastery-pct="masteryPct" :met-count="metCount" :total="total"
        :gap-count="gapCount" :gap-share="gapShare"
        :people-count="peopleCount" :skill-count="skillCount" :avg-gap="avgGap"
        :band-counts="bandCounts" :departments="reference.departments || []"
        @manage="catalogOpen = true" @assess="openAssess" />

      <!-- ── insight band ── -->
      <div class="sm-insight">
        <div class="trn-card sm-gap-card">
          <SkillGapRibbon :items="gap" />
        </div>

        <div class="trn-card sm-connect">
          <header class="smc-head">
            <span class="smc-eyebrow trn-mono"><Workflow :size="12" /> Close the loop</span>
            <h3>Turn gaps into action</h3>
          </header>
          <ul class="smc-list">
            <Motion v-for="(a, i) in connectActions" :key="a.key" as="li"
              :initial="reduced ? false : { opacity: 0, x: 8 }" :animate="{ opacity: 1, x: 0 }"
              :transition="{ duration: 0.45, delay: 0.08 + i * 0.08, ease: [0.16, 1, 0.3, 1] }">
              <button type="button" class="smc-row" @click="a.run">
                <span class="smc-ic" :style="{ '--c': a.color }"><component :is="a.icon" :size="16" /></span>
                <span class="smc-body">
                  <span class="smc-title">{{ a.title }}</span>
                  <span class="smc-sub">{{ a.sub }}</span>
                </span>
                <ChevronRight :size="16" class="smc-chev" />
              </button>
            </Motion>
          </ul>
        </div>
      </div>

      <!-- ── constellation ── -->
      <TrnEmptyState v-if="!rows.length" :icon="Grid3x3"
        title="Map competencies to light up the constellation"
        :sub="deptId ? 'No skill data for this department yet.' : 'Assess your first competency to see employees and skills bloom into a star grid.'">
        <button v-if="!deptId" class="trn-btn trn-btn-primary" @click="openAssess" style="margin-top:14px">
          <Plus :size="15" /> Assess competency
        </button>
      </TrnEmptyState>

      <div v-else class="sm-mapwrap">
        <div class="sm-map-head">
          <div class="sm-map-titles">
            <h3>The constellation</h3>
            <span class="sm-map-sub">{{ filteredRows.length }} of {{ rows.length }} cells lit</span>
          </div>
          <div class="sm-search">
            <Search :size="15" />
            <input v-model="query" type="text" placeholder="Filter by person or skill…" />
            <button v-if="query" class="sm-search-x" @click="query = ''" aria-label="Clear"><X :size="14" /></button>
          </div>
        </div>
        <div class="trn-card sm-map-card">
          <TrnConstellationMap v-if="filteredRows.length" :key="deptId || 'all'" :rows="filteredRows" @cell="onCell" />
          <div v-else class="sm-nomatch trn-mono">No people or skills match “{{ query }}”.</div>
        </div>
      </div>
    </template>

    <SkillEditModal :open="editOpen" :entry="editing" @close="editOpen = false" @saved="onSaved" @manage="openCatalogFromAssess" />
    <SkillCatalogModal :open="catalogOpen" :initial-tab="catalogTab" @close="catalogOpen = false" @saved="onSaved" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import { Grid3x3, Plus, Search, X, Workflow, ChevronRight, UsersRound, Target, Award } from 'lucide-vue-next'
import TrnEmptyState from '../components/TrnEmptyState.vue'
import TrnConstellationMap from '../components/TrnConstellationMap.vue'
import SkillMatrixHero from '../components/SkillMatrixHero.vue'
import SkillGapRibbon from '../components/SkillGapRibbon.vue'
import SkillEditModal from '../modals/SkillEditModal.vue'
import SkillCatalogModal from '../modals/SkillCatalogModal.vue'
import { fetchSkillMatrix, fetchSkillGap } from '@/composables/useTraining'
import { useHrReference } from '@/composables/useEmployees'
import { prefersReduced } from '@/composables/useShiftMotion'

const emit = defineEmits(['refresh-stats', 'go'])
const toast = useToast()
const reduced = prefersReduced()

const { reference, loadReferenceData } = useHrReference()

const rows = ref([])
const gap = ref([])
const loading = ref(true)
const deptId = ref('')
const query = ref('')

const editOpen = ref(false)
const editing = ref(null)
const catalogOpen = ref(false)
const catalogTab = ref('skills')

// ── client-side search (focus the grid) ──────────────────────────────────────
const filteredRows = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return rows.value
  return rows.value.filter(r =>
    (r.employee_name || '').toLowerCase().includes(q) ||
    (r.skill_name || '').toLowerCase().includes(q) ||
    (r.skill_category || '').toLowerCase().includes(q) ||
    (r.department_name || '').toLowerCase().includes(q))
})

// ── derived summary (off the visible rows) ───────────────────────────────────
const rowGap = (r) => r.gap != null
  ? Number(r.gap)
  : Math.max((Number(r.required_level) || 0) - (Number(r.current_level) || 0), 0)

const coverageBand = (r) => {
  const cur = Number(r.current_level) || 0
  const req = Number(r.required_level) || 0
  const cov = cur / Math.max(req, cur, 1)
  if (cov <= 0) return 0
  if (cov >= 1) return 4
  if (cov >= 0.75) return 3
  if (cov >= 0.5) return 2
  return 1
}

const total = computed(() => filteredRows.value.length)
const gapCount = computed(() => filteredRows.value.filter(r => rowGap(r) > 0).length)
const metCount = computed(() => total.value - gapCount.value)
const masteryPct = computed(() => total.value ? Math.round((metCount.value / total.value) * 100) : 0)
const gapShare = computed(() => total.value ? Math.round((gapCount.value / total.value) * 100) : 0)
const peopleCount = computed(() => new Set(filteredRows.value.map(r => r.employee_id ?? r.employee_name)).size)
const skillCount = computed(() => new Set(filteredRows.value.map(r => r.skill_id ?? r.skill_name)).size)
const avgGap = computed(() => {
  const gaps = filteredRows.value.map(rowGap).filter(g => g > 0)
  return gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0
})
const bandCounts = computed(() => {
  const c = { emerging: 0, developing: 0, proficient: 0, mastery: 0 }
  const keys = { 1: 'emerging', 2: 'developing', 3: 'proficient', 4: 'mastery' }
  for (const r of filteredRows.value) {
    const b = coverageBand(r)
    if (keys[b]) c[keys[b]]++
  }
  return c
})

// ── cross-page workflow links ────────────────────────────────────────────────
const connectActions = computed(() => [
  { key: 'assign', icon: UsersRound, color: 'var(--trn-amber)', title: 'Assign training',
    sub: 'Enroll people into programs that build the thin skills', run: () => emit('go', 'enrollment') },
  { key: 'reqs', icon: Target, color: 'var(--trn-ember)', title: 'Tune role requirements',
    sub: 'Raise or relax the proficiency bar per designation / grade', run: () => { catalogTab.value = 'reqs'; catalogOpen.value = true } },
  { key: 'certs', icon: Award, color: 'var(--trn-st-completed)', title: 'Log certifications',
    sub: 'Credentials that evidence a competency', run: () => emit('go', 'certifications') },
])

// ── loaders ──────────────────────────────────────────────────────────────────
const loadMatrix = async () => {
  const params = deptId.value ? { department_id: deptId.value } : {}
  const data = await fetchSkillMatrix(params)
  rows.value = Array.isArray(data) ? data : (data?.rows || [])
}
const loadGap = async () => {
  const params = deptId.value ? { department_id: deptId.value } : {}
  const data = await fetchSkillGap(params)
  gap.value = Array.isArray(data) ? data : (data?.items || [])
}
const load = async () => {
  loading.value = true
  try {
    await Promise.all([loadMatrix(), loadGap()])
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load skill matrix')
  } finally {
    loading.value = false
  }
}

// department filter is server-side → both matrix + gap stay consistent
let deptDebounce = null
watch(deptId, () => {
  clearTimeout(deptDebounce)
  deptDebounce = setTimeout(load, 60)
})

onMounted(() => {
  loadReferenceData()
  load()
})

// ── interactions ──────────────────────────────────────────────────────────────
const openAssess = () => { editing.value = null; editOpen.value = true }
const onCell = (entry) => { editing.value = entry; editOpen.value = true }
// from the assess modal when the skill catalog is empty → jump to manage skills
const openCatalogFromAssess = () => { editOpen.value = false; catalogTab.value = 'skills'; catalogOpen.value = true }
const onSaved = () => { load(); emit('refresh-stats') }
watch(catalogOpen, (o) => { if (!o) catalogTab.value = 'skills' })
</script>

<style scoped>
.trn-sec { display: flex; flex-direction: column; gap: 16px; }
.sm-loading { display: flex; flex-direction: column; gap: 16px; }

/* insight band */
.sm-insight { display: grid; grid-template-columns: 1.55fr 1fr; gap: 14px; align-items: stretch; }
.sm-gap-card { padding: 0; display: flex; }
.sm-gap-card > * { width: 100%; }

.sm-connect { padding: 18px 20px; display: flex; flex-direction: column; gap: 14px; }
.smc-head { display: flex; flex-direction: column; gap: 4px; }
.smc-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10px; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--trn-amber-strong); }
.smc-head h3 { margin: 0; font-size: 15px; font-weight: 700; color: var(--trn-text); }
.smc-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 9px; }
.smc-row { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; cursor: pointer;
  padding: 11px 13px; border-radius: 14px; border: 1px solid var(--trn-border-soft); background: var(--trn-surface);
  transition: border-color 0.2s, background 0.2s, transform 0.2s var(--trn-spring); }
.smc-row:hover { border-color: color-mix(in srgb, var(--trn-amber) 38%, transparent);
  background: var(--trn-surface-elevated); transform: translateX(3px); }
.smc-ic { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 12px; flex-shrink: 0;
  color: var(--c); background: color-mix(in srgb, var(--c) 14%, transparent);
  border: 1px solid color-mix(in srgb, var(--c) 26%, transparent); }
.smc-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.smc-title { font-size: 13px; font-weight: 700; color: var(--trn-text); }
.smc-sub { font-size: 11px; color: var(--trn-text-muted); line-height: 1.4; }
.smc-chev { color: var(--trn-text-dim); flex-shrink: 0; transition: transform 0.2s, color 0.2s; }
.smc-row:hover .smc-chev { color: var(--trn-amber-strong); transform: translateX(3px); }

/* constellation wrap */
.sm-mapwrap { display: flex; flex-direction: column; gap: 12px; }
.sm-map-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
.sm-map-titles { display: flex; flex-direction: column; gap: 2px; }
.sm-map-titles h3 { margin: 0; font-size: 16px; font-weight: 800; letter-spacing: -0.02em; color: var(--trn-text); }
.sm-map-sub { font-size: 11.5px; color: var(--trn-text-muted); }
.sm-search { display: flex; align-items: center; gap: 8px; padding: 0 10px 0 12px; border-radius: 12px;
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); width: 280px; max-width: 100%;
  transition: border-color 0.2s, box-shadow 0.2s; }
.sm-search:focus-within { border-color: color-mix(in srgb, var(--trn-amber) 50%, transparent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--trn-amber) 14%, transparent); }
.sm-search :deep(svg) { color: var(--trn-text-dim); flex-shrink: 0; }
.sm-search input { flex: 1; min-width: 0; border: 0; background: transparent; padding: 9px 0; font: inherit;
  font-size: 13px; color: var(--trn-text); }
.sm-search input:focus { outline: none; }
.sm-search input::placeholder { color: var(--trn-text-dim); }
.sm-search-x { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 7px; border: 0; cursor: pointer;
  background: var(--trn-surface-elevated); color: var(--trn-text-muted); flex-shrink: 0; transition: color 0.2s; }
.sm-search-x:hover { color: var(--trn-text); }

.sm-map-card { padding: 16px 18px; }
.sm-nomatch { padding: 40px 16px; text-align: center; font-size: 12.5px; color: var(--trn-text-dim); }

@media (max-width: 900px) { .sm-insight { grid-template-columns: 1fr; } }
</style>
