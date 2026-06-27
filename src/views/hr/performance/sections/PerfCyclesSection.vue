<template>
  <div class="pc-sec">
    <PerfHero eyebrow="People · Cycles" title="Review" accent="Cadence" :icon="CalendarRange"
      sub="Each cycle is one rubric opened across a cohort for a period. Watch every cohort mature toward sign-off, then drive its merit budget — launched here, scored in Reviews, paid through Merit.">
      <template #actions>
        <button class="perf-btn" type="button" :disabled="loading" @click="reload"><RefreshCw :size="14" :class="{ 'perf-spin': loading }" /></button>
        <button class="perf-btn perf-btn-primary" type="button" @click="modalOpen = true"><Rocket :size="15" /> Launch cycle</button>
      </template>

      <template #lenses>
        <div class="pc-lenses">
          <button class="pc-lens" :class="{ on: !fStatus }" @click="setStatus(null)">
            <span class="pc-lens-ic all"><Layers :size="15" /></span>
            <span class="pc-lens-body"><b>{{ cycles.length }}</b><i>All cycles</i></span><span class="pc-lens-bar" />
          </button>
          <button class="pc-lens" :class="{ on: fStatus === 'live' }" :style="{ '--c': 'var(--perf-gold)' }" @click="setStatus('live')">
            <span class="pc-lens-ic"><Loader :size="15" /></span>
            <span class="pc-lens-body"><b>{{ inProgress }}</b><i>In progress</i></span><span class="pc-lens-bar" />
          </button>
          <button class="pc-lens" :class="{ on: fStatus === 'done' }" :style="{ '--c': 'var(--perf-ok)' }" @click="setStatus('done')">
            <span class="pc-lens-ic"><BadgeCheck :size="15" /></span>
            <span class="pc-lens-body"><b>{{ matured }}</b><i>Matured</i></span><span class="pc-lens-bar" />
          </button>
          <div class="pc-lens stat"><span class="pc-lens-ic"><Users :size="15" /></span><span class="pc-lens-body"><b>{{ totalReviews }}</b><i>Reviews</i></span></div>
          <div class="pc-lens stat"><span class="pc-lens-ic"><Gauge :size="15" /></span><span class="pc-lens-body"><b>{{ avgDone }}%</b><i>Avg done</i></span></div>
          <div class="pc-lens stat"><span class="pc-lens-ic"><Star :size="15" /></span><span class="pc-lens-body"><b>{{ avgScore != null ? avgScore.toFixed(1) : '—' }}</b><i>Avg score</i></span></div>
        </div>
      </template>
    </PerfHero>

    <div v-if="loading" class="pc-loading"><Loader2 :size="20" class="perf-spin" /> Loading cycles…</div>
    <div v-else-if="!cycles.length" class="pc-empty">
      <span class="pc-empty-ic"><CalendarRange :size="26" /></span>
      <b>No review cycles yet</b>
      <p>Launch your first cycle — pick an appraisal rubric and a cohort, and a review opens for each person.</p>
      <button class="perf-btn perf-btn-primary" type="button" @click="modalOpen = true"><Rocket :size="14" /> Launch a cycle</button>
    </div>

    <template v-else>
      <!-- signature instrument -->
      <CycleCadence :cycles="filtered" :active-key="activeKey" @pick="onPick" @go="(t) => $emit('go', t)" />

      <!-- type filter -->
      <div class="pc-filters">
        <span class="pc-filters-lab">Showing {{ filtered.length }} of {{ cycles.length }}</span>
        <div class="pc-cyc-wrap"><PerfSelect v-model="fType" :options="typeOptions" placeholder="All cycle types" /></div>
      </div>

      <div v-if="!filtered.length" class="pc-empty mini">
        <b>No cycles match</b><button class="perf-btn perf-btn-steel" type="button" @click="clearFilters">Clear filters</button>
      </div>
      <div v-else class="pc-grid">
        <CycleCard v-for="(c, i) in filtered" :key="cycleKey(c)" :cycle="c" :index="i" :picked="cycleKey(c) === activeKey"
          @open-reviews="openReviews(c)" @merit="$emit('go', 'merit')" @retire="openRetire(c)" @rubric="goSettings('appraisal-templates')" />
      </div>

      <!-- connectivity bus -->
      <div class="pc-bus">
        <span class="pc-bus-h"><GitMerge :size="13" /> The cadence pipeline</span>
        <div class="pc-bus-row">
          <button class="pc-wire settings" type="button" @click="goSettings('appraisal-templates')"><FileText :size="13" /><b>Appraisal Templates</b><i>the rubric each cycle scores against</i></button>
          <ArrowRight :size="14" class="pc-wire-arr" />
          <button class="pc-wire" type="button" @click="$emit('go', 'reviews')"><ClipboardList :size="13" /><b>Reviews</b><i>score &amp; advance each one</i></button>
          <ArrowRight :size="14" class="pc-wire-arr" />
          <button class="pc-wire" type="button" @click="$emit('go', 'calibration')"><Grid3x3 :size="13" /><b>Calibration</b><i>moderate scores</i></button>
          <ArrowRight :size="14" class="pc-wire-arr" />
          <button class="pc-wire" type="button" @click="$emit('go', 'merit')"><Coins :size="13" /><b>Merit</b><i>approve hikes vs budget</i></button>
          <ArrowRight :size="14" class="pc-wire-arr" />
          <button class="pc-wire settings" type="button" @click="goSettings('merit-policy')"><Coins :size="13" /><b>Merit Policy</b><i>bands that set hikes</i></button>
        </div>
      </div>
    </template>

    <PerfReviewModal :open="modalOpen" mode="launch" :templates="templates" :saving="saving" @close="modalOpen = false" @save="onLaunch" />
    <CycleRetireModal :open="retireOpen" :cycle="retireTarget" @close="retireOpen = false" @done="onRetired" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { CalendarRange, Rocket, Loader2, Loader, RefreshCw, Layers, BadgeCheck, Users, Gauge, Star, GitMerge, ArrowRight, FileText, ClipboardList, Grid3x3, Coins } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import PerfHero from '../components/PerfHero.vue'
import PerfSelect from '../components/PerfSelect.vue'
import PerfReviewModal from '../components/PerfReviewModal.vue'
import CycleCadence from '../components/CycleCadence.vue'
import CycleCard from '../components/CycleCard.vue'
import CycleRetireModal from '../components/CycleRetireModal.vue'
import { fetchCycles, bulkCreateReviews } from '@/composables/usePerformance'
import { listAppraisalTemplates } from '@/views/hr/settings/composables/useHrSettings'
import { cycleMeta } from '@/views/hr/settings/composables/appraisalVocab'

defineEmits(['go'])
const toast = useToast()
const router = useRouter()

const cycles = ref([])
const loading = ref(false)
const templates = ref([])
const modalOpen = ref(false)
const saving = ref(false)
const fStatus = ref(null)        // null | 'live' | 'done'
const fType = ref(null)          // null | cycle key
const activeKey = ref(null)

const cycleKey = (c) => `${c.cycle || ''}::${c.period_label || ''}`
const isMatured = (c) => Number(c.progress || 0) >= 100 && (c.total || 0) > 0

const inProgress = computed(() => cycles.value.filter(c => !isMatured(c)).length)
const matured = computed(() => cycles.value.filter(isMatured).length)
const totalReviews = computed(() => cycles.value.reduce((a, c) => a + (c.total || 0), 0))
const avgDone = computed(() => cycles.value.length ? Math.round(cycles.value.reduce((a, c) => a + Number(c.progress || 0), 0) / cycles.value.length) : 0)
const avgScore = computed(() => {
  const v = cycles.value.filter(c => c.avg != null)
  return v.length ? v.reduce((a, c) => a + Number(c.avg), 0) / v.length : null
})

const usedTypes = computed(() => [...new Set(cycles.value.map(c => c.cycle).filter(Boolean))])
const typeOptions = computed(() => [{ value: null, label: 'All cycle types' }, ...usedTypes.value.map(t => ({ value: t, label: cycleMeta(t).label }))])

const filtered = computed(() => cycles.value.filter(c => {
  if (fStatus.value === 'live' && isMatured(c)) return false
  if (fStatus.value === 'done' && !isMatured(c)) return false
  if (fType.value && c.cycle !== fType.value) return false
  return true
}))

const setStatus = (s) => { fStatus.value = fStatus.value === s ? null : s }
const clearFilters = () => { fStatus.value = null; fType.value = null }
const onPick = (c) => { activeKey.value = activeKey.value === cycleKey(c) ? null : cycleKey(c) }

async function reload() {
  loading.value = true
  try { const d = await fetchCycles(); cycles.value = d.items || [] }
  catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load cycles') }
  finally { loading.value = false }
}
async function onLaunch(payload) {
  saving.value = true
  try {
    const res = await bulkCreateReviews(payload)
    toast.success(`Launched ${res.created} review${res.created === 1 ? '' : 's'}${res.skipped ? ` · ${res.skipped} skipped` : ''}`)
    modalOpen.value = false
    await reload()
  } catch (e) { toast.error(e?.response?.data?.detail || 'Launch failed') }
  finally { saving.value = false }
}

// retire
const retireOpen = ref(false)
const retireTarget = ref(null)
const openRetire = (c) => { retireTarget.value = c; retireOpen.value = true }
async function onRetired() { retireOpen.value = false; await reload() }

// connectivity
function openReviews(c) { router.push({ name: 'HrPerformanceTab', params: { tab: 'reviews' }, query: { cycle: c.cycle } }) }
function goSettings(t) { router.push(`/admin/hr/settings/${t}`) }

onMounted(async () => {
  reload()
  try { const t = await listAppraisalTemplates(); templates.value = (t || []).filter(x => x.is_active !== false && (x.sections || []).length) }
  catch { templates.value = [] }
})
</script>

<style scoped>
.pc-sec { display: flex; flex-direction: column; gap: 16px; }

/* telemetry lenses */
.pc-lenses { display: grid; grid-template-columns: repeat(6, 1fr); gap: 9px; }
.pc-lens { position: relative; overflow: hidden; display: flex; align-items: center; gap: 9px; padding: 10px 12px; border-radius: 14px; cursor: pointer; font: inherit; text-align: left;
  background: var(--perf-surface); border: 1px solid var(--perf-border); transition: border-color 0.22s var(--perf-spring), transform 0.22s var(--perf-spring), background 0.22s; --c: var(--perf-gold); }
.pc-lens:not(.stat):hover { transform: translateY(-2px); border-color: var(--perf-border-strong); }
.pc-lens.stat { cursor: default; }
.pc-lens.on { border-color: color-mix(in srgb, var(--c) 42%, transparent); background: color-mix(in srgb, var(--c) 9%, var(--perf-surface)); }
.pc-lens-ic { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0; color: var(--c);
  background: color-mix(in srgb, var(--c) 13%, transparent); border: 1px solid color-mix(in srgb, var(--c) 26%, transparent); }
.pc-lens-ic.all { color: var(--perf-gold); }
.pc-lens.stat .pc-lens-ic { color: var(--perf-text-muted); background: var(--perf-track); border-color: var(--perf-border); }
.pc-lens-body { display: flex; flex-direction: column; min-width: 0; line-height: 1.1; }
.pc-lens-body b { font-size: 18px; font-weight: 900; color: var(--perf-text); font-variant-numeric: tabular-nums; }
.pc-lens-body i { font-size: 9.5px; font-weight: 700; font-style: normal; color: var(--perf-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pc-lens.on .pc-lens-body i { color: var(--c); }
.pc-lens-bar { position: absolute; left: 0; bottom: 0; height: 2px; width: 100%; background: var(--c); transform: scaleX(0); transform-origin: left; transition: transform 0.3s var(--perf-spring); }
.pc-lens.on .pc-lens-bar { transform: scaleX(1); }

.pc-filters { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
.pc-filters-lab { font-size: 11.5px; font-weight: 650; color: var(--perf-text-muted); }
.pc-cyc-wrap { width: 220px; }

.pc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 13px; }
.pc-loading { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 40px; color: var(--perf-text-muted); font-size: 13px; }
.pc-empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 9px; padding: 44px 24px; border-radius: 18px; background: var(--perf-surface); border: 1px dashed var(--perf-border-strong); }
.pc-empty.mini { padding: 24px; gap: 12px; }
.pc-empty-ic { display: grid; place-items: center; width: 60px; height: 60px; border-radius: 18px; color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 12%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 26%, transparent); }
.pc-empty b { font-size: 15px; font-weight: 800; color: var(--perf-text); margin-top: 4px; }
.pc-empty p { margin: 0 0 6px; font-size: 12.5px; color: var(--perf-text-muted); max-width: 44ch; line-height: 1.5; }

/* connectivity bus */
.pc-bus { display: flex; flex-direction: column; gap: 11px; padding: 15px 17px; border-radius: 16px; background: var(--perf-surface); border: 1px solid var(--perf-border); }
.pc-bus-h { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--perf-text-secondary); }
.pc-bus-h :deep(svg) { color: var(--perf-gold); }
.pc-bus-row { display: flex; align-items: stretch; gap: 6px; flex-wrap: wrap; }
.pc-wire { flex: 1; min-width: 130px; display: flex; flex-direction: column; gap: 1px; padding: 9px 12px; border-radius: 12px; cursor: pointer; font: inherit; text-align: left;
  background: var(--perf-surface-elevated); border: 1px solid var(--perf-border); transition: all 0.18s var(--perf-spring); }
.pc-wire:hover { transform: translateY(-2px); border-color: var(--perf-border-warm); }
.pc-wire :deep(svg) { color: var(--perf-gold); }
.pc-wire b { font-size: 12px; font-weight: 750; color: var(--perf-text); margin-top: 3px; }
.pc-wire i { font-size: 9.5px; font-style: normal; color: var(--perf-text-dim); }
.pc-wire.settings { background: color-mix(in srgb, var(--perf-gold) 7%, var(--perf-surface-elevated)); border-style: dashed; border-color: var(--perf-border-warm); }
.pc-wire-arr { align-self: center; color: var(--perf-text-dim); flex-shrink: 0; }

@media (max-width: 1080px) { .pc-lenses { grid-template-columns: repeat(3, 1fr); } .pc-wire-arr { display: none; } }
@media (max-width: 560px) { .pc-lenses { grid-template-columns: repeat(2, 1fr); } .pc-cyc-wrap { width: 100%; } }
@media (prefers-reduced-motion: reduce) { .pc-lens:hover, .pc-wire:hover { transform: none; } }
</style>
