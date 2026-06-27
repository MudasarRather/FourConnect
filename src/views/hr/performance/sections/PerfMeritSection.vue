<template>
  <!-- ═══════════════════════════ MERIT & INCREMENTS · The Mint ═══════════════════════════
       Performance struck into pay. The signature MeritMint treasury reactor visualises the
       cycle's merit-budget burn; the roster is the strike line — raw reviews → recommended
       blanks → minted coins. HR drives the WHOLE pipeline here (recommend → approve & apply,
       or decline) via the MeritStrikeModal, without leaving the Arena. Cross-links the
       upstream rubric (Appraisal Templates) and the band table (Merit Policy). -->
  <div class="pm-sec">
    <PerfHero eyebrow="Review cycle · Merit & increments" title="Increment" accent="Mint" :icon="Coins"
      sub="Strike performance into pay. Recommend hikes inside each score's merit band, then approve to commit an effective-dated salary revision to payroll — all weighed against the cycle's budget pool.">
      <template #actions>
        <button class="perf-btn" type="button" :disabled="loading" @click="reload"><RefreshCw :size="14" :class="{ 'perf-spin': loading }" /></button>
        <button class="perf-btn perf-btn-steel" type="button" @click="goSettings('merit-policy')"><Coins :size="14" /> Policy</button>
      </template>

      <template #lenses>
        <div class="pm-lenses">
          <button class="pm-lens" :class="{ on: !activeFilter }" @click="setFilter(null)">
            <span class="pm-lens-ic all"><Layers :size="15" /></span>
            <span class="pm-lens-body"><b>{{ meritPop }}</b><i>In the mint</i></span><span class="pm-lens-bar" />
          </button>
          <button class="pm-lens" :class="{ on: activeFilter === 'recommended' }" :style="{ '--c': 'var(--perf-amber)' }" @click="setFilter('recommended')">
            <span class="pm-lens-ic"><TrendingUp :size="15" /></span>
            <span class="pm-lens-body"><b>{{ pendingRows.length }}</b><i>Awaiting approval</i></span><span class="pm-lens-bar" />
          </button>
          <button class="pm-lens" :class="{ on: activeFilter === 'queue' }" :style="{ '--c': 'var(--perf-orange)' }" @click="setFilter('queue')">
            <span class="pm-lens-ic"><PencilRuler :size="15" /></span>
            <span class="pm-lens-body"><b>{{ queueRows.length }}</b><i>To recommend</i></span><span class="pm-lens-bar" />
          </button>
          <button class="pm-lens" :class="{ on: activeFilter === 'applied' }" :style="{ '--c': 'var(--perf-ok)' }" @click="setFilter('applied')">
            <span class="pm-lens-ic"><BadgeIndianRupee :size="15" /></span>
            <span class="pm-lens-body"><b>{{ appliedRows.length }}</b><i>Minted</i></span><span class="pm-lens-bar" />
          </button>
          <div class="pm-lens stat"><span class="pm-lens-ic"><Wallet :size="15" /></span><span class="pm-lens-body"><b>{{ inrShort(budget?.committed_amount) }}</b><i>Committed</i></span></div>
          <div class="pm-lens stat" :class="{ danger: budget?.over_budget }"><span class="pm-lens-ic"><Gauge :size="15" /></span><span class="pm-lens-body"><b>{{ budgetUsed }}</b><i>Budget used</i></span></div>
        </div>
      </template>
    </PerfHero>

    <!-- cycle selector -->
    <div v-if="cycles.length" class="pm-cycles">
      <button v-for="c in cycles" :key="cycKey(c)" class="pm-cyc" :class="{ on: isActiveCycle(c) }" @click="selectCycle(c)">
        <span class="pm-cyc-dot" />
        <span class="pm-cyc-txt"><b>{{ c.period_label || c.cycle }}</b><span>{{ c.template_name || c.cycle }} · {{ c.completed }}/{{ c.total }} done</span></span>
      </button>
    </div>

    <div v-if="loading" class="pm-load"><Loader2 :size="20" class="perf-spin" /> Loading the mint…</div>
    <div v-else-if="!cycles.length" class="pm-empty">
      <span class="pm-empty-ic"><Coins :size="26" /></span>
      <b>No review cycles yet</b>
      <p>Launch a review cycle from the Reviews tab. Once managers complete reviews, their merit increments queue here to be struck against the budget.</p>
      <button class="perf-btn perf-btn-primary" type="button" @click="$emit('go', 'reviews')"><ClipboardList :size="14" /> Go to Reviews</button>
    </div>

    <template v-else>
      <!-- signature instrument -->
      <MeritMint :budget="budget" :pending="pendingRows.length" :needs-rec="queueRows.length" :applied="appliedRows.length"
        :active-filter="activeFilter" @pick="setFilter" />

      <!-- roster -->
      <div class="pm-roster-head">
        <span class="pm-roster-lab"><component :is="filterMeta.icon" :size="13" /> {{ filterMeta.label }} <i>· {{ visibleRows.length }}</i></span>
        <button v-if="activeFilter" class="pm-clear" type="button" @click="setFilter(null)">Show all</button>
      </div>

      <div v-if="!visibleRows.length" class="pm-empty mini">
        <span class="pm-empty-ic sm"><component :is="filterMeta.icon" :size="20" /></span>
        <b>{{ filterMeta.emptyTitle }}</b>
        <p>{{ filterMeta.emptyBody }}</p>
      </div>
      <div v-else class="pm-rows">
        <MintRow v-for="(r, i) in visibleRows" :key="r.id" :review="r" :band="resolveBand(r)" :index="i" :busy="busy === r.id"
          @recommend="openStrike(r)" @approve="openStrike(r)" @decline="openStrike(r, 'decline')" @open="openProfile(r)" />
      </div>

      <!-- connectivity bus -->
      <div class="pm-bus">
        <span class="pm-bus-h"><GitMerge :size="13" /> From rating to raise</span>
        <div class="pm-bus-row">
          <button class="pm-wire settings" type="button" @click="goSettings('appraisal-templates')"><FileText :size="13" /><b>Appraisal Rubric</b><i>scores each review</i></button>
          <ArrowRight :size="14" class="pm-wire-arr" />
          <button class="pm-wire" type="button" @click="$emit('go', 'reviews')"><ClipboardList :size="13" /><b>Reviews</b><i>finalise the score</i></button>
          <ArrowRight :size="14" class="pm-wire-arr" />
          <button class="pm-wire" type="button" @click="$emit('go', 'calibration')"><Grid3x3 :size="13" /><b>Calibration</b><i>moderate ratings</i></button>
          <ArrowRight :size="14" class="pm-wire-arr" />
          <button class="pm-wire here" type="button"><Coins :size="13" /><b>Merit · here</b><i>recommend &amp; approve</i></button>
          <ArrowRight :size="14" class="pm-wire-arr" />
          <button class="pm-wire settings" type="button" @click="goSettings('merit-policy')"><Scale :size="13" /><b>Merit Policy</b><i>bands &amp; budget pool</i></button>
        </div>
      </div>
    </template>

    <MeritStrikeModal :open="strikeOpen" :review="strikeTarget" :budget="budget" :intent="strikeIntent"
      @close="strikeOpen = false" @done="onStruck" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  Coins, RefreshCw, Loader2, Layers, TrendingUp, PencilRuler, BadgeIndianRupee, Wallet, Gauge,
  ClipboardList, GitMerge, ArrowRight, FileText, Grid3x3, Scale, CheckCircle2,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import PerfHero from '../components/PerfHero.vue'
import MeritMint from '../components/MeritMint.vue'
import MintRow from '../components/MintRow.vue'
import MeritStrikeModal from '../components/MeritStrikeModal.vue'
import { fetchCycles, fetchReviews, fetchMeritBudget, fetchMeritPolicies, bandTone } from '@/composables/usePerformance'
import { bandAtFrac } from '@/views/hr/settings/composables/meritBands'

const emit = defineEmits(['go'])
const toast = useToast()
const router = useRouter()

const loading = ref(true)
const busy = ref(null)
const cycles = ref([])
const active = ref(null)
const reviews = ref([])
const budget = ref(null)
const policyBands = ref([])
const activeFilter = ref(null)   // null | 'recommended' | 'queue' | 'applied'

const strikeOpen = ref(false)
const strikeTarget = ref(null)
const strikeIntent = ref(null)

const cycKey = (c) => `${c.cycle || ''}::${c.period_label || ''}`
const isActiveCycle = (c) => active.value && active.value.cycle === c.cycle && (active.value.period_label || '') === (c.period_label || '')
const inActive = (r) => active.value && r.cycle === active.value.cycle && (r.period_label || '') === (active.value.period_label || '')

const pendingRows = computed(() => reviews.value.filter(r => inActive(r) && r.hike_status === 'RECOMMENDED'))
const queueRows = computed(() => reviews.value.filter(r => inActive(r) && ['COMPLETED', 'ACKNOWLEDGED'].includes(r.status) && ['NONE', 'REJECTED', null, undefined].includes(r.hike_status)))
const appliedRows = computed(() => reviews.value.filter(r => inActive(r) && r.hike_status === 'APPLIED'))
const meritPop = computed(() => pendingRows.value.length + queueRows.value.length + appliedRows.value.length)

const FILTER_META = {
  recommended: { label: 'Awaiting approval', icon: TrendingUp, emptyTitle: 'Nothing to approve', emptyBody: "No recommended hikes in this cycle yet — recommend one from the queue, or managers can recommend from a profile." },
  queue: { label: 'To recommend', icon: PencilRuler, emptyTitle: 'Queue is clear', emptyBody: 'Every completed review in this cycle already has a hike decision.' },
  applied: { label: 'Minted increments', icon: CheckCircle2, emptyTitle: 'Nothing minted yet', emptyBody: 'Approved hikes will appear here once committed to payroll.' },
}
const filterMeta = computed(() => activeFilter.value ? FILTER_META[activeFilter.value] : { label: 'In the mint', icon: Layers, emptyTitle: 'Nothing in the mint', emptyBody: 'No completed reviews in this cycle have reached the merit stage yet.' })
const visibleRows = computed(() => {
  if (activeFilter.value === 'recommended') return pendingRows.value
  if (activeFilter.value === 'queue') return queueRows.value
  if (activeFilter.value === 'applied') return appliedRows.value
  return [...pendingRows.value, ...queueRows.value, ...appliedRows.value]
})

const budgetUsed = computed(() => {
  const b = budget.value
  if (!b || b.budget_amount == null || !b.budget_amount) return '—'
  return Math.round((b.committed_amount / b.budget_amount) * 100) + '%'
})

// resolve a review's band locally (from the active policy) for display chips
function resolveBand(r) {
  if (!policyBands.value.length || r.overall_score == null) {
    return r.final_rating_band ? { label: r.final_rating_band, color: 'var(--perf-gold)', hmin: null, hmax: null } : null
  }
  const frac = r.overall_score / (r.rating_max || 5)
  const b = bandAtFrac(policyBands.value, frac)
  if (!b) return null
  return { label: r.final_rating_band || b.label, color: bandTone(b.key) || 'var(--perf-gold)', hmin: b.hmin, hmax: b.hmax }
}

function setFilter(f) { activeFilter.value = activeFilter.value === f ? null : f }

async function loadCycles() {
  const d = await fetchCycles()
  cycles.value = d.items || []
  if (cycles.value.length && !active.value) active.value = cycles.value[0]
}
async function loadCycleData() {
  if (!active.value) return
  const [revs, bud] = await Promise.all([
    fetchReviews({ cycle: active.value.cycle, limit: 100 }),
    fetchMeritBudget({ cycle: active.value.cycle, period_label: active.value.period_label || undefined }),
  ])
  reviews.value = revs.items || []
  budget.value = bud
}
async function loadPolicy() {
  try {
    const list = await fetchMeritPolicies()
    const arr = Array.isArray(list) ? list : (list?.items || [])
    const pick = arr.find(p => p.is_default && p.is_active) || arr.find(p => p.is_active) || arr[0]
    policyBands.value = pick?.bands || []
  } catch { policyBands.value = [] }
}
async function reload() {
  loading.value = true
  try { await Promise.all([loadCycles().then(loadCycleData), loadPolicy()]) }
  catch (e) { toast.error(e?.response?.data?.detail || 'Failed to load') }
  finally { loading.value = false }
}
onMounted(reload)

async function selectCycle(c) {
  if (isActiveCycle(c)) return
  active.value = c
  activeFilter.value = null
  loading.value = true
  try { await loadCycleData() } finally { loading.value = false }
}

function openStrike(r, intent = null) { strikeTarget.value = r; strikeIntent.value = intent; strikeOpen.value = true }
async function onStruck() {
  strikeOpen.value = false
  busy.value = strikeTarget.value?.id || true
  try { await loadCycleData() } finally { busy.value = null }
}
function openProfile(r) { router.push(`/admin/hr/employees/profile/${r.employee_id}`) }
function goSettings(t) { router.push(`/admin/hr/settings/${t}`) }

const inrShort = (v) => {
  if (v == null) return '—'
  const n = Number(v)
  if (n >= 1e7) return '₹' + (n / 1e7).toFixed(n >= 1e8 ? 0 : 1) + 'Cr'
  if (n >= 1e5) return '₹' + (n / 1e5).toFixed(n >= 1e6 ? 0 : 1) + 'L'
  if (n >= 1e3) return '₹' + (n / 1e3).toFixed(0) + 'k'
  return '₹' + Math.round(n)
}
</script>

<style scoped>
.pm-sec { display: flex; flex-direction: column; gap: 16px; }

/* lenses */
.pm-lenses { display: grid; grid-template-columns: repeat(6, 1fr); gap: 9px; }
.pm-lens { position: relative; overflow: hidden; display: flex; align-items: center; gap: 9px; padding: 10px 12px; border-radius: 14px; cursor: pointer; font: inherit; text-align: left;
  background: var(--perf-surface); border: 1px solid var(--perf-border); transition: border-color 0.22s var(--perf-spring), transform 0.22s var(--perf-spring), background 0.22s; --c: var(--perf-gold); }
.pm-lens:not(.stat):hover { transform: translateY(-2px); border-color: var(--perf-border-strong); }
.pm-lens.stat { cursor: default; }
.pm-lens.on { border-color: color-mix(in srgb, var(--c) 42%, transparent); background: color-mix(in srgb, var(--c) 9%, var(--perf-surface)); }
.pm-lens-ic { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 10px; flex-shrink: 0; color: var(--c);
  background: color-mix(in srgb, var(--c) 13%, transparent); border: 1px solid color-mix(in srgb, var(--c) 26%, transparent); }
.pm-lens-ic.all { color: var(--perf-gold); }
.pm-lens.stat .pm-lens-ic { color: var(--perf-text-muted); background: var(--perf-track); border-color: var(--perf-border); }
.pm-lens.stat.danger .pm-lens-ic { color: var(--perf-conflict); background: var(--perf-conflict-soft); border-color: color-mix(in srgb, var(--perf-conflict) 28%, transparent); }
.pm-lens-body { display: flex; flex-direction: column; min-width: 0; line-height: 1.1; }
.pm-lens-body b { font-size: 17px; font-weight: 900; color: var(--perf-text); font-variant-numeric: tabular-nums; white-space: nowrap; }
.pm-lens.stat.danger .pm-lens-body b { color: var(--perf-conflict); }
.pm-lens-body i { font-size: 9.5px; font-weight: 700; font-style: normal; color: var(--perf-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.pm-lens.on .pm-lens-body i { color: var(--c); }
.pm-lens-bar { position: absolute; left: 0; bottom: 0; height: 2px; width: 100%; background: var(--c); transform: scaleX(0); transform-origin: left; transition: transform 0.3s var(--perf-spring); }
.pm-lens.on .pm-lens-bar { transform: scaleX(1); }

/* cycles */
.pm-cycles { display: flex; gap: 9px; flex-wrap: wrap; }
.pm-cyc { display: flex; align-items: center; gap: 9px; padding: 9px 14px; border-radius: 13px; cursor: pointer; font: inherit; text-align: left;
  background: var(--perf-surface); border: 1px solid var(--perf-border); transition: all 0.2s var(--perf-spring); }
.pm-cyc:hover { border-color: var(--perf-border-warm); transform: translateY(-1px); }
.pm-cyc.on { border-color: color-mix(in srgb, var(--perf-gold) 45%, transparent); background: color-mix(in srgb, var(--perf-gold) 9%, var(--perf-surface)); }
.pm-cyc-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--perf-text-dim); flex-shrink: 0; transition: all 0.2s; }
.pm-cyc.on .pm-cyc-dot { background: var(--perf-gold); box-shadow: 0 0 9px var(--perf-gold); }
.pm-cyc-txt { display: flex; flex-direction: column; gap: 1px; }
.pm-cyc-txt b { font-size: 13px; font-weight: 800; color: var(--perf-text); }
.pm-cyc-txt span { font-size: 10px; color: var(--perf-text-muted); }

.pm-load { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 44px; color: var(--perf-text-muted); font-size: 13px; }
.pm-empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; padding: 48px 24px; border-radius: 18px; background: var(--perf-surface); border: 1px dashed var(--perf-border-strong); }
.pm-empty.mini { padding: 34px 24px; gap: 7px; }
.pm-empty-ic { display: grid; place-items: center; width: 58px; height: 58px; border-radius: 18px; color: var(--perf-gold); background: color-mix(in srgb, var(--perf-gold) 12%, transparent); border: 1px solid color-mix(in srgb, var(--perf-gold) 26%, transparent); }
.pm-empty-ic.sm { width: 46px; height: 46px; border-radius: 14px; }
.pm-empty b { font-size: 15.5px; font-weight: 850; color: var(--perf-text); }
.pm-empty p { margin: 0 0 4px; font-size: 12.5px; color: var(--perf-text-muted); max-width: 48ch; line-height: 1.5; }

/* roster */
.pm-roster-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 2px; }
.pm-roster-lab { display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 800; color: var(--perf-text-secondary); }
.pm-roster-lab :deep(svg) { color: var(--perf-gold); }
.pm-roster-lab i { font-style: normal; font-weight: 650; color: var(--perf-text-muted); }
.pm-clear { font: inherit; font-size: 11px; font-weight: 700; cursor: pointer; padding: 5px 12px; border-radius: 999px; color: var(--perf-text-muted);
  background: var(--perf-surface); border: 1px solid var(--perf-border); transition: all 0.18s; }
.pm-clear:hover { color: var(--perf-gold); border-color: var(--perf-border-warm); }
.pm-rows { display: flex; flex-direction: column; gap: 9px; }

/* connectivity bus */
.pm-bus { display: flex; flex-direction: column; gap: 11px; padding: 15px 17px; border-radius: 16px; background: var(--perf-surface); border: 1px solid var(--perf-border); }
.pm-bus-h { display: inline-flex; align-items: center; gap: 6px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: var(--perf-text-secondary); }
.pm-bus-h :deep(svg) { color: var(--perf-gold); }
.pm-bus-row { display: flex; align-items: stretch; gap: 6px; flex-wrap: wrap; }
.pm-wire { flex: 1; min-width: 132px; display: flex; flex-direction: column; gap: 1px; padding: 9px 12px; border-radius: 12px; cursor: pointer; font: inherit; text-align: left;
  background: var(--perf-surface-elevated); border: 1px solid var(--perf-border); transition: all 0.18s var(--perf-spring); }
.pm-wire:hover { transform: translateY(-2px); border-color: var(--perf-border-warm); }
.pm-wire :deep(svg) { color: var(--perf-gold); }
.pm-wire b { font-size: 12px; font-weight: 750; color: var(--perf-text); margin-top: 3px; }
.pm-wire i { font-size: 9.5px; font-style: normal; color: var(--perf-text-dim); }
.pm-wire.settings { background: color-mix(in srgb, var(--perf-gold) 7%, var(--perf-surface-elevated)); border-style: dashed; border-color: var(--perf-border-warm); }
.pm-wire.here { background: color-mix(in srgb, var(--perf-gold) 13%, var(--perf-surface-elevated)); border-color: color-mix(in srgb, var(--perf-gold) 40%, transparent); cursor: default; }
.pm-wire.here:hover { transform: none; }
.pm-wire-arr { align-self: center; color: var(--perf-text-dim); flex-shrink: 0; }

@media (max-width: 1080px) { .pm-lenses { grid-template-columns: repeat(3, 1fr); } .pm-wire-arr { display: none; } }
@media (max-width: 560px) { .pm-lenses { grid-template-columns: repeat(2, 1fr); } }
@media (prefers-reduced-motion: reduce) { .pm-lens:hover, .pm-cyc:hover, .pm-wire:hover { transform: none; } }
</style>
