<template>
  <div class="ex-iv">
    <!-- ───────── hero: Candor Console ───────── -->
    <Motion as="header" class="ivh ex-grain" :initial="reduced ? false : { opacity: 0, y: 16 }"
      :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }">
      <span class="ivh-aura" aria-hidden="true" />
      <div class="ivh-top">
        <div class="ivh-lead">
          <span class="ivh-eyebrow"><MessagesSquare :size="12" /> Exit Management · Separation</span>
          <h2 class="ivh-title">Exit <span class="grad">Interviews</span></h2>
          <p class="ivh-sub">Confidential candour from those leaving — the signal that quietly prevents the next exit. Listen, capture, and act on the voiceprint of every departure.</p>
        </div>
        <div class="ivh-cta">
          <Motion as="button" class="ivh-btn ghost" type="button" @click="load" :title="'Refresh'"
            :whileHover="{ y: -2 }" :whileTap="{ scale: 0.94, rotate: 90 }"><RefreshCw :size="14" :class="{ spin: loading }" /></Motion>
        </div>
      </div>

      <InterviewResonance :items="items" />

      <div class="ivh-lenses">
        <button v-for="l in lenses" :key="l.key" class="lens" :class="{ on: lens === l.key }" type="button"
          @click="lens = l.key" :style="{ '--c': l.hex }">
          <span class="lens-ic"><component :is="l.icon" :size="13" /></span>
          <span class="lens-meta"><b><ExCountUp :value="l.count" /></b><i>{{ l.label }}</i></span>
          <span class="lens-bar" />
        </button>
      </div>
    </Motion>

    <!-- ───────── command bar ───────── -->
    <Motion as="div" class="cmd ex-grain" :initial="reduced ? false : { opacity: 0, y: 12 }"
      :animate="{ opacity: 1, y: 0 }" :transition="{ duration: 0.45, delay: 0.08, ease: [0.16, 1, 0.3, 1] }">
      <div class="cmd-search" :class="{ focus: searchFocus }">
        <Search :size="15" />
        <input v-model="q" type="text" placeholder="Search name / case…" @focus="searchFocus = true" @blur="searchFocus = false" />
        <button v-if="q" class="cmd-x" @click="q = ''" type="button"><X :size="13" /></button>
      </div>
      <ExSelect v-model="modeF" :options="modeOpts" size="sm" />
      <div class="cmd-right">
        <span class="cmd-count ex-mono">{{ visible.length }} {{ visible.length === 1 ? 'interview' : 'interviews' }}</span>
      </div>
    </Motion>

    <!-- ───────── body ───────── -->
    <div v-if="loading && !items.length" class="iv-grid">
      <div v-for="n in 4" :key="n" class="skel ex-grain"><span class="skel-sh" /></div>
    </div>
    <ExEmptyState v-else-if="!items.length" :icon="MessagesSquare" title="No interviews yet"
      subtitle="An exit-interview slot opens automatically the moment a separation is accepted — it will surface here ready to schedule and conduct." />
    <ExEmptyState v-else-if="!visible.length" :icon="Search" title="No interviews match"
      subtitle="Try a different lens, mode, or clear the search.">
      <template #action><button class="iv-clear" @click="clearFilters" type="button"><X :size="14" /> Clear filters</button></template>
    </ExEmptyState>
    <template v-else>
      <div class="iv-grid">
        <InterviewCard v-for="(c, i) in pagedVisible" :key="c.id" :c="c" :index="i"
          @conduct="openConduct" @schedule="openSchedule" @view="openFeedback" @go="$emit('go', $event)" />
      </div>
      <ExPager :page="ivPage" :total-pages="ivPages" :total="ivTotal" :limit="10" @update:page="ivPage = $event" />
    </template>

    <InterviewConductModal :open="conductOpen" :case-info="active" :questions="active?.interview?.questions || []"
      :initial="active?.interview" :busy="busy" @close="conductOpen = false" @submit="onConductSubmit" />
    <InterviewScheduleModal :open="scheduleOpen" :case-info="active" :initial="active?.interview" :busy="busy"
      @close="scheduleOpen = false" @submit="onScheduleSubmit" />
    <InterviewFeedbackModal :open="feedbackOpen" :case-info="active" :iv="active?.interview || {}"
      @close="feedbackOpen = false" @edit="onFeedbackEdit" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { MessagesSquare, RefreshCw, Search, X, AudioLines, Mic, Check, CalendarPlus } from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import InterviewResonance from '../components/InterviewResonance.vue'
import InterviewCard from '../components/InterviewCard.vue'
import ExSelect from '../components/ExSelect.vue'
import ExCountUp from '../components/ExCountUp.vue'
import ExEmptyState from '../components/ExEmptyState.vue'
import ExPager from '../components/ExPager.vue'
import InterviewConductModal from '../modals/InterviewConductModal.vue'
import InterviewScheduleModal from '../modals/InterviewScheduleModal.vue'
import InterviewFeedbackModal from '../modals/InterviewFeedbackModal.vue'
import { fetchCases, fetchCase, scheduleInterview, completeInterview, errText, useClientPage } from '@/composables/useExit'
import { prefersReduced } from '@/composables/useShiftMotion'

const emit = defineEmits(['go', 'refresh-stats'])
const toast = useToast()
const reduced = prefersReduced()

const items = ref([])
const loading = ref(false)
const q = ref('')
const lens = ref('')
const modeF = ref('')
const searchFocus = ref(false)

const modeOpts = [
  { value: '', label: 'All modes' }, { value: 'IN_PERSON', label: 'In person' },
  { value: 'VIDEO', label: 'Video call' }, { value: 'FORM', label: 'Form' },
]
const ivStatus = (c) => c.interview?.status || 'PENDING'
const isToSchedule = (c) => ivStatus(c) === 'PENDING'                      // awaiting HR scheduling
const isToConduct = (c) => ['SCHEDULED', 'IN_PROGRESS'].includes(ivStatus(c))
const isCompleted = (c) => ivStatus(c) === 'COMPLETED'

const lenses = computed(() => [
  { key: '', label: 'All', icon: AudioLines, count: items.value.length, hex: 'var(--ex-violet)' },
  { key: 'toschedule', label: 'To schedule', icon: CalendarPlus, count: items.value.filter(isToSchedule).length, hex: '#a8a29e' },
  { key: 'toconduct', label: 'To conduct', icon: Mic, count: items.value.filter(isToConduct).length, hex: '#fbbf24' },
  { key: 'completed', label: 'Completed', icon: Check, count: items.value.filter(isCompleted).length, hex: '#34d399' },
])

const visible = computed(() => {
  const term = q.value.trim().toLowerCase()
  return items.value.filter(c => {
    if (lens.value === 'toschedule' && !isToSchedule(c)) return false
    if (lens.value === 'toconduct' && !isToConduct(c)) return false
    if (lens.value === 'completed' && !isCompleted(c)) return false
    // Mode filter only matches an actually-chosen mode — PENDING slots (no mode) are excluded.
    if (modeF.value && c.interview?.mode !== modeF.value) return false
    if (term) {
      const hay = `${c.employee_name || ''} ${c.employee_code || ''} ${c.case_number || ''}`.toLowerCase()
      if (!hay.includes(term)) return false
    }
    return true
  })
})
const clearFilters = () => { q.value = ''; lens.value = ''; modeF.value = '' }
const { page: ivPage, total: ivTotal, totalPages: ivPages, paged: pagedVisible } = useClientPage(visible, 10)
watch([q, lens, modeF], () => { ivPage.value = 1 })

// parallelised load — fixes the prior sequential N+1 fetch storm
const load = async () => {
  loading.value = true
  try {
    const statuses = ['ACCEPTED', 'NOTICE_PERIOD', 'CLEARANCE', 'SETTLEMENT', 'COMPLETED']
    const lists = await Promise.all(statuses.map(st => fetchCases({ status: st, limit: 100 }).catch(() => ({ items: [] }))))
    const map = new Map()
    lists.forEach(d => (d.items || []).forEach(c => map.set(c.id, c)))
    const cases = [...map.values()].slice(0, 80)
    const details = await Promise.all(cases.map(c => fetchCase(c.id).catch(() => null)))
    items.value = details.filter(d => d && d.interview)
  } catch (e) { toast.error(errText(e, 'Failed to load interviews')) }
  finally { loading.value = false }
}
onMounted(load)

// modals
const active = ref(null)
const conductOpen = ref(false)
const scheduleOpen = ref(false)
const feedbackOpen = ref(false)
const busy = ref(false)

const openConduct = (c) => { active.value = c; conductOpen.value = true }
const openSchedule = (c) => { active.value = c; scheduleOpen.value = true }
const openFeedback = (c) => { active.value = c; feedbackOpen.value = true }
const onFeedbackEdit = () => { feedbackOpen.value = false; conductOpen.value = true }

const onConductSubmit = async (payload) => {
  busy.value = true
  try {
    await completeInterview(active.value.id, payload)
    toast.success('Interview captured')
    conductOpen.value = false
    await load(); emit('refresh-stats')
  } catch (e) { toast.error(errText(e, 'Save failed')) }
  finally { busy.value = false }
}
const onScheduleSubmit = async (payload) => {
  busy.value = true
  try {
    await scheduleInterview(active.value.id, payload)
    toast.success('Interview scheduled')
    scheduleOpen.value = false
    await load(); emit('refresh-stats')
  } catch (e) { toast.error(errText(e, 'Schedule failed')) }
  finally { busy.value = false }
}
</script>

<style scoped>
.ex-iv { color: var(--ex-text); }

/* hero */
.ivh { position: relative; overflow: hidden; padding: 20px 22px 18px; border-radius: 24px; margin-bottom: 16px;
  background: var(--ex-surface-elevated); border: 1px solid var(--ex-border); box-shadow: var(--ex-shadow); }
.ivh-aura { position: absolute; inset: -50% 30% 40% -10%; pointer-events: none; animation: ex-aura-drift 11s ease-in-out infinite;
  background: radial-gradient(60% 80% at 18% 0%, rgba(251, 146, 60, 0.16), transparent 70%); }
.ivh-top { position: relative; display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
.ivh-eyebrow { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--ex-violet); padding: 4px 11px; border-radius: 999px; background: var(--ex-violet-soft); border: 1px solid var(--ex-violet-border); }
.ivh-title { font-size: clamp(22px, 3.2vw, 30px); font-weight: 850; margin: 11px 0 4px; color: var(--ex-text); line-height: 1.08; }
.ivh-title .grad { background: var(--ex-grad-hero); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.ivh-sub { font-size: 13px; color: var(--ex-text-secondary); margin: 0; max-width: 600px; }
.ivh-cta { display: flex; gap: 8px; flex-shrink: 0; }
.ivh-btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 11px; border-radius: 12px; font-size: 13px; font-weight: 750; cursor: pointer; font-family: inherit; }
.ivh-btn.ghost { background: transparent; border: 1px solid var(--ex-border); color: var(--ex-text-muted); }
.ivh-btn.ghost:hover { color: var(--ex-violet); border-color: var(--ex-violet-border); }
.spin { animation: ex-spin-slow 0.9s linear infinite; }

.ivh-lenses { position: relative; display: grid; grid-template-columns: repeat(4, 1fr); gap: 9px; margin-top: 15px; }
.lens { position: relative; overflow: hidden; display: flex; align-items: center; gap: 9px; padding: 10px 11px; border-radius: 14px; cursor: pointer; text-align: left;
  background: var(--ex-surface); border: 1px solid var(--ex-border); transition: transform 0.28s var(--ex-spring), border-color 0.28s, background 0.28s; }
.lens:hover { transform: translateY(-3px); border-color: var(--ex-border-strong); }
.lens.on { border-color: color-mix(in srgb, var(--c) 45%, transparent); background: color-mix(in srgb, var(--c) 9%, var(--ex-surface)); }
.lens-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0;
  color: var(--c); background: color-mix(in srgb, var(--c) 15%, transparent); border: 1px solid color-mix(in srgb, var(--c) 28%, transparent); }
.lens-meta { display: flex; flex-direction: column; line-height: 1.12; }
.lens-meta b { font-size: 17px; font-weight: 850; color: var(--ex-text); font-family: var(--ex-mono); }
.lens-meta i { font-size: 9.5px; font-style: normal; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: var(--ex-text-muted); }
.lens-bar { position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: var(--c); transform: scaleX(0); transform-origin: left; transition: transform 0.35s var(--ex-spring); }
.lens.on .lens-bar, .lens:hover .lens-bar { transform: scaleX(1); }

/* command bar */
.cmd { position: relative; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 16px;
  padding: 11px 13px; border-radius: 16px; background: var(--ex-surface); border: 1px solid var(--ex-border); box-shadow: var(--ex-card-shadow); }
.cmd-search { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 200px; padding: 9px 12px; border-radius: 11px;
  background: rgba(0, 0, 0, 0.28); border: 1px solid var(--ex-border); color: var(--ex-text-muted); transition: border-color 0.25s, box-shadow 0.3s; }
.cmd-search.focus { border-color: var(--ex-violet-border); box-shadow: 0 0 0 3px rgba(251, 146, 60, 0.12); color: var(--ex-violet); }
.cmd-search input { flex: 1; min-width: 0; background: none; border: none; outline: none; font-size: 13px; font-family: inherit; color: var(--ex-text); }
.cmd-search input::placeholder { color: var(--ex-text-dim); }
.cmd-x { display: grid; place-items: center; width: 20px; height: 20px; border-radius: 6px; cursor: pointer; background: var(--ex-steel-soft); border: none; color: var(--ex-text-muted); }
[data-theme="light"] .cmd-search { background: rgba(255, 250, 242, 0.72); }
.cmd :deep(.exs) { min-width: 150px; }
.cmd-right { display: flex; align-items: center; gap: 12px; margin-left: auto; }
.cmd-count { font-size: 12px; font-weight: 700; color: var(--ex-text-muted); white-space: nowrap; }

/* grid + skeleton */
.iv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 14px; }
.skel { position: relative; overflow: hidden; height: 210px; border-radius: 18px; background: var(--ex-surface); border: 1px solid var(--ex-border); }
.skel-sh { position: absolute; inset: 0; background: linear-gradient(100deg, transparent 30%, rgba(251, 146, 60, 0.08) 50%, transparent 70%); animation: ex-sheen-pass 1.4s ease-in-out infinite; }
.iv-clear { display: inline-flex; align-items: center; gap: 6px; margin-top: 6px; padding: 9px 15px; border-radius: 11px; font-size: 13px; font-weight: 750; cursor: pointer;
  background: var(--ex-surface); border: 1px solid var(--ex-border-strong); color: var(--ex-text); font-family: inherit; }

@media (max-width: 760px) { .ivh-lenses { grid-template-columns: repeat(2, 1fr); } .cmd-right { width: 100%; margin-left: 0; } .iv-grid { grid-template-columns: 1fr; } }
@media (prefers-reduced-motion: reduce) { .ivh-aura, .spin, .skel-sh { animation: none; } .lens:hover { transform: none; } }
</style>
