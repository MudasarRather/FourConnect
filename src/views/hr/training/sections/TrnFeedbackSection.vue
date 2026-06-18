<template>
  <div class="trn-sec">
    <!-- ─────────── loading ─────────── -->
    <template v-if="loading">
      <div class="trn-skel" style="height: 330px; border-radius: 24px" />
      <div class="fb-breakdown">
        <div class="trn-skel" style="height: 250px; border-radius: 20px" />
        <div class="trn-skel" style="height: 250px; border-radius: 20px" />
      </div>
      <div class="fb-stream-grid">
        <div v-for="n in 4" :key="n" class="trn-skel" style="height: 150px; border-radius: 18px" />
      </div>
    </template>

    <!-- ─────────── empty (no feedback at all) ─────────── -->
    <TrnEmptyState v-else-if="!hasAny" :icon="MessageSquareHeart" title="No feedback has resonated yet"
      sub="When learners complete a training and rate it from self-service, their voices light up this chamber.">
      <Motion as="button" type="button" class="trn-btn trn-btn-primary"
        :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }" @click="$emit('go', 'enrollment')">
        <UsersRound :size="15" /> View employee trainings
      </Motion>
    </TrnEmptyState>

    <!-- ─────────── content ─────────── -->
    <template v-else>
      <FeedbackResonanceHero
        :overall-avg="overallAvg" :total="total" :recommend-rate="recommendRate"
        :programs-rated="programsRated" :trainers-rated="trainersRated"
        :distribution="distribution" :dist-total="distTotal"
        v-model:search="search" v-model:programFilter="programFilter" v-model:trainerFilter="trainerFilter"
        v-model:sort="sort" v-model:recommendOnly="recommendOnly"
        :program-options="programOptions" :trainer-options="trainerOptions" :sort-options="SORT_OPTIONS"
        @go="$emit('go', $event)" />

      <!-- breakdown: dimension resonance + program leaderboard -->
      <div class="fb-breakdown">
        <!-- dimension resonance -->
        <section class="trn-card fb-dim" ref="dimRef" :class="{ 'is-in': dimIn }">
          <header class="fb-card-head">
            <h3><SlidersHorizontal :size="15" /> Dimension resonance</h3>
            <span class="fb-card-sub">How the three signals compare</span>
          </header>
          <div class="fb-dim-list">
            <div v-for="(d, i) in dimensions" :key="d.key" class="fb-dim-row" :style="{ '--c': d.color }">
              <div class="fb-dim-label">
                <span class="fb-dim-ic"><component :is="d.icon" :size="14" /></span>
                <span class="fb-dim-name">{{ d.label }}</span>
              </div>
              <div class="fb-dim-bar">
                <span class="fb-dim-fill" :style="{ width: dimIn ? (d.value / 5 * 100) + '%' : '0%', transitionDelay: (i * 0.12) + 's' }" />
                <span class="fb-dim-ghost" :style="{ left: (overallAvg / 5 * 100) + '%' }" :title="`Overall ${overallAvg.toFixed(1)}`" />
              </div>
              <div class="fb-dim-val">
                <span class="trn-mono">{{ d.value ? d.value.toFixed(1) : '—' }}</span>
                <span v-if="d.value" class="fb-dim-delta" :class="d.delta >= 0 ? 'up' : 'down'">
                  <component :is="d.delta >= 0 ? TrendingUp : TrendingDown" :size="11" />{{ Math.abs(d.delta).toFixed(1) }}
                </span>
              </div>
            </div>
          </div>
          <p class="fb-dim-foot"><span class="fb-dim-foot-dot" /> tick marks the overall average ({{ overallAvg.toFixed(1) }})</p>
        </section>

        <!-- program leaderboard -->
        <section class="trn-card fb-board" ref="boardRef" :class="{ 'is-in': boardIn }">
          <header class="fb-card-head">
            <h3><Trophy :size="15" /> Program resonance</h3>
            <span class="fb-card-sub">{{ leaderboard.length }} program{{ leaderboard.length === 1 ? '' : 's' }} · best first</span>
          </header>
          <div v-if="leaderboard.length" class="fb-board-list">
            <button v-for="(p, i) in leaderboard" :key="p.key" type="button" class="fb-board-row"
              :class="{ active: programFilter === p.key }" :style="{ '--c': rateColor(p.avg) }"
              @click="toggleProgram(p.key)">
              <span class="fb-board-rank trn-mono">{{ i + 1 }}</span>
              <div class="fb-board-info">
                <span class="fb-board-name">{{ p.name }}</span>
                <span class="fb-board-meta">
                  <FbStarMeter :rating="p.avg" :size="11" :gap="1.5" />
                  <i class="fvc-dot" />{{ p.count }} response{{ p.count === 1 ? '' : 's' }}
                  <template v-if="p.recommend != null"><i class="fvc-dot" />{{ Math.round(p.recommend) }}% rec</template>
                </span>
                <span class="fb-board-track">
                  <span class="fb-board-fill" :style="{ width: boardIn ? (p.avg / 5 * 100) + '%' : '0%', transitionDelay: (0.1 + i * 0.07) + 's' }" />
                </span>
              </div>
              <span class="fb-board-score trn-mono">{{ p.avg.toFixed(1) }}</span>
            </button>
          </div>
          <div v-else class="fb-board-empty">No program-level breakdown yet.</div>
        </section>
      </div>

      <!-- voice stream -->
      <section class="fb-stream">
        <header class="fb-stream-head">
          <div class="fb-stream-title">
            <h3><MessagesSquare :size="16" /> Voice stream</h3>
            <span class="fb-stream-count trn-mono">{{ filtered.length }}<i v-if="filtered.length !== feedback.length"> / {{ feedback.length }}</i></span>
          </div>
          <div class="fb-stream-tools">
            <div class="fb-chips">
              <button type="button" class="fb-chip" :class="{ on: ratingFilter === 0 }" @click="ratingFilter = 0">All</button>
              <button v-for="r in [5, 4, 3, 2, 1]" :key="r" type="button" class="fb-chip star"
                :class="{ on: ratingFilter === r }" :style="{ '--c': rateColor(r) }" @click="ratingFilter = ratingFilter === r ? 0 : r">
                {{ r }}<Star :size="11" />
              </button>
            </div>
            <button type="button" class="fb-refresh" @click="load" :disabled="refreshing" title="Refresh">
              <RefreshCw :size="14" :class="{ spin: refreshing }" />
            </button>
          </div>
        </header>

        <div v-if="hasActiveFilter" class="fb-active">
          <span class="fb-active-lab">Filtered</span>
          <button type="button" class="fb-active-clear" @click="clearFilters"><X :size="12" /> Clear all</button>
        </div>

        <TransitionGroup v-if="visible.length" name="trn-list" tag="div" class="fb-stream-grid">
          <FeedbackVoiceCard v-for="(f, i) in visible" :key="f.id" :entry="f" :index="i"
            @pick-program="programFilter = $event ? String($event) : '__none__'"
            @pick-trainer="trainerFilter = $event ? String($event) : trainerFilter" />
        </TransitionGroup>

        <div v-else class="fb-stream-empty">
          <SearchX :size="26" />
          <p>No feedback matches your filters.</p>
          <button type="button" class="trn-btn trn-btn-ghost" @click="clearFilters"><X :size="14" /> Clear filters</button>
        </div>

        <div v-if="filtered.length > visibleCount" class="fb-more">
          <Motion as="button" type="button" class="trn-btn trn-btn-ghost"
            :whileHover="{ y: -2 }" :whileTap="{ scale: 0.97 }" @click="visibleCount += STEP">
            <ChevronDown :size="15" /> Show {{ Math.min(STEP, filtered.length - visibleCount) }} more
          </Motion>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Motion } from 'motion-v'
import { useToast } from 'vue-toastification'
import {
  Star, SlidersHorizontal, Trophy, MessagesSquare, MessageSquareHeart, UsersRound, RefreshCw,
  SearchX, ChevronDown, X, TrendingUp, TrendingDown, FileText, Presentation, Target,
} from 'lucide-vue-next'
import FeedbackResonanceHero from '../components/FeedbackResonanceHero.vue'
import FeedbackVoiceCard from '../components/FeedbackVoiceCard.vue'
import FbStarMeter from '../components/FbStarMeter.vue'
import TrnEmptyState from '../components/TrnEmptyState.vue'
import { useInView } from '@/composables/useShiftMotion'
import { fetchFeedbackSummary, fetchFeedback } from '@/composables/useTraining'

defineEmits(['go'])

const toast = useToast()
const loading = ref(true)
const refreshing = ref(false)
const summary = ref({})
const feedback = ref([])

const dimRef = ref(null)
const { visible: dimIn } = useInView(dimRef, { threshold: 0.3 })
const boardRef = ref(null)
const { visible: boardIn } = useInView(boardRef, { threshold: 0.25 })

// ── filters ───────────────────────────────────────────────────────────────────
const search = ref('')
const programFilter = ref('')
const trainerFilter = ref('')
const ratingFilter = ref(0)
const recommendOnly = ref(false)
const sort = ref('recent')
const visibleCount = ref(18)
const STEP = 18

const SORT_OPTIONS = [
  { value: 'recent', label: 'Most recent' },
  { value: 'highest', label: 'Highest rated' },
  { value: 'lowest', label: 'Lowest rated' },
]

// ── load ───────────────────────────────────────────────────────────────────────
const load = async () => {
  if (feedback.value.length) refreshing.value = true
  else loading.value = true
  try {
    const [sum, list] = await Promise.all([
      fetchFeedbackSummary().catch(() => ({})),
      fetchFeedback().catch(() => []),
    ])
    summary.value = sum || {}
    feedback.value = Array.isArray(list) ? list : (list?.items || [])
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load feedback')
  } finally {
    loading.value = false
    refreshing.value = false
  }
}
onMounted(load)

// ── derived: overview ───────────────────────────────────────────────────────────
const byProgram = computed(() => summary.value.by_program || [])
const hasAny = computed(() => (summary.value.total_responses || 0) > 0 || feedback.value.length > 0)
const overallAvg = computed(() => Number(summary.value.overall_avg) || 0)
const total = computed(() => Number(summary.value.total_responses) || feedback.value.length)
const programsRated = computed(() => byProgram.value.filter(r => r.program_id).length)
const trainersRated = computed(() => new Set(feedback.value.filter(f => f.trainer_id).map(f => String(f.trainer_id))).size)

// response-weighted org figures
const weighted = (field) => {
  let sum = 0, w = 0
  for (const r of byProgram.value) {
    const v = r[field]
    const c = Number(r.response_count) || 0
    if (v != null && c > 0) { sum += Number(v) * c; w += c }
  }
  return w ? sum / w : 0
}
const recommendRate = computed(() => Math.round(weighted('recommend_rate')))

// rating distribution from the loaded stream
const distTotal = computed(() => feedback.value.length)
const distribution = computed(() => {
  const out = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const f of feedback.value) {
    const r = Math.round(Number(f.rating) || 0)
    if (r >= 1 && r <= 5) out[r]++
  }
  return out
})

// dimension resonance (response-weighted)
const dimensions = computed(() => {
  const c = weighted('avg_content'), t = weighted('avg_trainer'), rel = weighted('avg_relevance')
  const o = overallAvg.value
  return [
    { key: 'content', label: 'Content', value: c, delta: c - o, icon: FileText, color: 'var(--trn-amber)' },
    { key: 'trainer', label: 'Trainer', value: t, delta: t - o, icon: Presentation, color: 'var(--trn-ember)' },
    { key: 'relevance', label: 'Relevance', value: rel, delta: rel - o, icon: Target, color: 'var(--trn-amber-strong)' },
  ]
})

// ── program leaderboard ─────────────────────────────────────────────────────────
const leaderboard = computed(() =>
  byProgram.value
    .map(r => ({
      key: r.program_id ? String(r.program_id) : '__none__',
      name: r.program_name || 'Unattributed',
      avg: Number(r.avg_rating) || 0,
      count: Number(r.response_count) || 0,
      recommend: r.recommend_rate,
    }))
    .sort((a, b) => b.avg - a.avg || b.count - a.count))

// ── filter option lists ─────────────────────────────────────────────────────────
const programOptions = computed(() => {
  const opts = byProgram.value
    .filter(r => r.program_id)
    .map(r => ({ value: String(r.program_id), label: r.program_name || 'Untitled', hint: `${r.response_count} · ${(Number(r.avg_rating) || 0).toFixed(1)}★` }))
    .sort((a, b) => a.label.localeCompare(b.label))
  const hasNone = byProgram.value.some(r => !r.program_id)
  return [
    { value: '', label: 'All programs' },
    ...opts,
    ...(hasNone ? [{ value: '__none__', label: 'Unattributed' }] : []),
  ]
})
const trainerOptions = computed(() => {
  const seen = new Map()
  for (const f of feedback.value) {
    if (f.trainer_id && !seen.has(String(f.trainer_id))) seen.set(String(f.trainer_id), f.trainer_name || 'Trainer')
  }
  return [
    { value: '', label: 'All trainers' },
    ...[...seen.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label)),
  ]
})

// ── filtered + sorted stream ──────────────────────────────────────────────────────
const hasActiveFilter = computed(() =>
  !!search.value || !!programFilter.value || !!trainerFilter.value || ratingFilter.value !== 0 || recommendOnly.value)

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  let rows = feedback.value.filter(f => {
    if (programFilter.value) {
      if (programFilter.value === '__none__') { if (f.program_id) return false }
      else if (String(f.program_id) !== programFilter.value) return false
    }
    if (trainerFilter.value && String(f.trainer_id) !== trainerFilter.value) return false
    if (ratingFilter.value && Math.round(Number(f.rating) || 0) !== ratingFilter.value) return false
    if (recommendOnly.value && f.would_recommend !== true) return false
    if (q) {
      const hay = `${f.program_name || ''} ${f.trainer_name || ''} ${f.is_anonymous ? 'anonymous' : (f.employee_name || '')} ${f.comments || ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
  const ts = (f) => { const d = new Date(f.created_at); return Number.isNaN(d.getTime()) ? 0 : d.getTime() }
  if (sort.value === 'highest') rows = [...rows].sort((a, b) => (b.rating - a.rating) || (ts(b) - ts(a)))
  else if (sort.value === 'lowest') rows = [...rows].sort((a, b) => (a.rating - b.rating) || (ts(b) - ts(a)))
  else rows = [...rows].sort((a, b) => ts(b) - ts(a))
  return rows
})
const visible = computed(() => filtered.value.slice(0, visibleCount.value))

// reset pagination whenever the filtered set changes shape
watch([search, programFilter, trainerFilter, ratingFilter, recommendOnly, sort], () => { visibleCount.value = STEP })

const toggleProgram = (key) => { programFilter.value = programFilter.value === key ? '' : key }
const clearFilters = () => {
  search.value = ''; programFilter.value = ''; trainerFilter.value = ''
  ratingFilter.value = 0; recommendOnly.value = false
}

const rateColor = (v) =>
  v >= 4 ? 'var(--trn-st-completed)' : v >= 3 ? 'var(--trn-amber)' : v >= 2 ? 'var(--trn-st-waived)' : v > 0 ? 'var(--trn-st-failed)' : 'var(--trn-st-not-started)'
</script>

<style scoped>
.trn-sec { display: flex; flex-direction: column; gap: 16px; }

/* breakdown */
.fb-breakdown { display: grid; grid-template-columns: 1fr 1.15fr; gap: 14px; }
.fb-card-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 14px; }
.fb-card-head h3 { display: inline-flex; align-items: center; gap: 8px; margin: 0; font-size: 15px; font-weight: 750; color: var(--trn-text); }
.fb-card-head h3 :deep(svg) { color: var(--trn-amber-strong); }
.fb-card-sub { font-size: 11px; color: var(--trn-text-dim); }

/* dimension resonance */
.fb-dim { padding: 18px 20px; }
.fb-dim-list { display: flex; flex-direction: column; gap: 16px; }
.fb-dim-row { display: grid; grid-template-columns: 110px 1fr auto; align-items: center; gap: 12px; }
.fb-dim-label { display: flex; align-items: center; gap: 9px; min-width: 0; }
.fb-dim-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0; color: var(--c);
  background: color-mix(in srgb, var(--c) 14%, transparent); border: 1px solid color-mix(in srgb, var(--c) 26%, transparent); }
.fb-dim-name { font-size: 13px; font-weight: 650; color: var(--trn-text-secondary); }
.fb-dim-bar { position: relative; height: 9px; border-radius: 999px; background: var(--trn-border-soft); overflow: visible; }
.fb-dim-fill { display: block; height: 100%; border-radius: 999px; width: 0;
  background: linear-gradient(90deg, color-mix(in srgb, var(--c) 55%, transparent), var(--c));
  box-shadow: 0 0 12px -2px var(--c); transition: width 1s var(--trn-spring); }
.fb-dim-ghost { position: absolute; top: -3px; bottom: -3px; width: 2px; border-radius: 2px; background: var(--trn-text);
  opacity: 0.55; transform: translateX(-50%); }
.fb-dim-val { display: flex; align-items: center; gap: 7px; }
.fb-dim-val .trn-mono { font-size: 17px; font-weight: 800; color: var(--trn-text); }
.fb-dim-delta { display: inline-flex; align-items: center; gap: 2px; font-size: 10.5px; font-weight: 700; padding: 1px 5px; border-radius: 6px; }
.fb-dim-delta.up { color: var(--trn-st-completed); background: var(--trn-st-completed-soft); }
.fb-dim-delta.down { color: var(--trn-st-failed); background: var(--trn-st-failed-soft); }
.fb-dim-foot { display: flex; align-items: center; gap: 7px; margin: 16px 0 0; padding-top: 12px; border-top: 1px solid var(--trn-border-soft);
  font-size: 11px; color: var(--trn-text-muted); }
.fb-dim-foot-dot { width: 2px; height: 12px; border-radius: 2px; background: var(--trn-text); opacity: 0.55; }

/* program leaderboard */
.fb-board { padding: 18px 20px; }
.fb-board-list { display: flex; flex-direction: column; gap: 6px; }
.fb-board-row { display: flex; align-items: center; gap: 12px; width: 100%; text-align: left; font: inherit; cursor: pointer;
  padding: 9px 11px; border-radius: 13px; border: 1px solid transparent; background: transparent; transition: background 0.2s, border-color 0.2s; }
.fb-board-row:hover { background: var(--trn-surface); }
.fb-board-row.active { background: color-mix(in srgb, var(--c) 12%, transparent); border-color: color-mix(in srgb, var(--c) 36%, transparent); }
.fb-board-rank { font-size: 12px; font-weight: 800; color: var(--trn-text-dim); width: 16px; text-align: center; flex-shrink: 0; }
.fb-board-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.fb-board-name { font-size: 13px; font-weight: 700; color: var(--trn-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fb-board-meta { display: flex; align-items: center; gap: 7px; flex-wrap: wrap; font-size: 11px; color: var(--trn-text-muted); }
.fb-board-track { height: 6px; border-radius: 999px; background: var(--trn-border-soft); overflow: hidden; margin-top: 1px; }
.fb-board-fill { display: block; height: 100%; width: 0; border-radius: 999px;
  background: linear-gradient(90deg, color-mix(in srgb, var(--c) 50%, transparent), var(--c)); transition: width 0.9s var(--trn-spring); }
.fb-board-score { font-size: 17px; font-weight: 850; color: var(--c); flex-shrink: 0; }
.fb-board-empty { padding: 24px; text-align: center; font-size: 12.5px; color: var(--trn-text-dim); }
.fvc-dot { width: 3px; height: 3px; border-radius: 50%; background: var(--trn-text-dim); flex-shrink: 0; }

/* voice stream */
.fb-stream { display: flex; flex-direction: column; gap: 12px; }
.fb-stream-head { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
.fb-stream-title { display: flex; align-items: center; gap: 10px; }
.fb-stream-title h3 { display: inline-flex; align-items: center; gap: 8px; margin: 0; font-size: 16px; font-weight: 750; color: var(--trn-text); }
.fb-stream-title h3 :deep(svg) { color: var(--trn-amber-strong); }
.fb-stream-count { font-size: 11px; font-weight: 700; padding: 2px 9px; border-radius: 999px; color: var(--trn-text-muted);
  background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.fb-stream-count i { font-style: normal; color: var(--trn-text-dim); }
.fb-stream-tools { display: flex; align-items: center; gap: 10px; }
.fb-chips { display: inline-flex; gap: 5px; padding: 4px; border-radius: 12px; background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.fb-chip { display: inline-flex; align-items: center; gap: 3px; font: inherit; font-size: 12px; font-weight: 700; padding: 5px 11px; border-radius: 8px;
  border: 0; cursor: pointer; color: var(--trn-text-muted); background: transparent; transition: all 0.18s; }
.fb-chip:hover { color: var(--trn-text); background: var(--trn-surface-elevated); }
.fb-chip.on { color: var(--trn-text); background: var(--trn-surface-elevated); }
.fb-chip.star.on { color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent); }
.fb-chip.star :deep(svg) { color: currentColor; }
.fb-refresh { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; cursor: pointer; flex-shrink: 0;
  color: var(--trn-text-muted); background: var(--trn-surface); border: 1px solid var(--trn-border-soft); transition: color 0.2s, border-color 0.2s; }
.fb-refresh:hover:not(:disabled) { color: var(--trn-amber-strong); border-color: color-mix(in srgb, var(--trn-amber) 36%, transparent); }
.fb-refresh:disabled { opacity: 0.6; cursor: default; }
.fb-refresh .spin { animation: fb-spin 0.8s linear infinite; }
@keyframes fb-spin { to { transform: rotate(360deg); } }

.fb-active { display: flex; align-items: center; gap: 10px; }
.fb-active-lab { font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--trn-amber-strong); }
.fb-active-clear { display: inline-flex; align-items: center; gap: 5px; font: inherit; font-size: 11.5px; font-weight: 600; padding: 4px 10px;
  border-radius: 999px; cursor: pointer; color: var(--trn-text-muted); background: var(--trn-surface); border: 1px solid var(--trn-border-soft); }
.fb-active-clear:hover { color: var(--trn-text); }

.fb-stream-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.fb-stream-empty { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 50px 24px; text-align: center;
  border: 1.5px dashed var(--trn-border-strong); border-radius: 18px; color: var(--trn-text-muted); background: var(--trn-surface); }
.fb-stream-empty :deep(svg) { color: var(--trn-text-dim); }
.fb-stream-empty p { margin: 0; font-size: 13px; }
.fb-more { display: flex; justify-content: center; margin-top: 4px; }

/* list transitions */
.trn-list-move { transition: transform 0.4s var(--trn-spring); }
.trn-list-enter-active { transition: all 0.4s var(--trn-spring); }
.trn-list-leave-active { transition: all 0.3s var(--trn-spring); position: absolute; }
.trn-list-enter-from { opacity: 0; transform: translateY(12px) scale(0.98); }
.trn-list-leave-to { opacity: 0; transform: scale(0.96); }

@media (max-width: 920px) {
  .fb-breakdown { grid-template-columns: 1fr; }
  .fb-stream-grid { grid-template-columns: 1fr; }
}
@media (max-width: 560px) {
  .fb-stream-head { align-items: flex-start; flex-direction: column; }
  .fb-dim-row { grid-template-columns: 92px 1fr auto; gap: 9px; }
}
@media (prefers-reduced-motion: reduce) {
  .fb-dim-fill, .fb-board-fill { transition: none !important; }
}
</style>
