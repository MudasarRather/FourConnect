<template>
  <div class="forge">
    <!-- ═══════════════════════════════════════════════════════════════════
         00 · HERO — "The Molten Reserve"
         A foundry vessel of banked compensatory time. Liquid gold whose level
         tracks the active balance; bubbles rise, sparks pop upward as time is
         "earned", embers flicker around the rim as credits near expiry.
         Deliberately NOT the horizontal flow-lanes of Applications nor the
         circular orbital dial of My-Approvals — this reads "foundry / reserve".
    ═══════════════════════════════════════════════════════════════════ -->
    <Motion class="fg-hero" as="section"
      :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }"
    >
      <span class="fg-emberfield" aria-hidden="true">
        <span v-for="n in 14" :key="n" class="fg-mote" :style="moteStyle(n)" />
      </span>
      <span class="fg-edge tl" aria-hidden="true" /><span class="fg-edge tr" aria-hidden="true" />
      <span class="fg-edge bl" aria-hidden="true" /><span class="fg-edge br" aria-hidden="true" />

      <!-- LEFT — copy + reserve readout -->
      <div class="fg-copy">
        <Motion as="div" class="fg-eye"
          :initial="{ opacity: 0, x: -10 }" :animate="{ opacity: 1, x: 0 }"
          :transition="{ duration: 0.5, delay: 0.08 }"
        >
          <span class="fg-eye-ember" />
          <span class="leave-mono">COMPENSATORY RESERVE</span><span class="fg-eye-sep">/</span>
          <span class="leave-mono">FY {{ fyLabel }}</span><span class="fg-eye-sep">/</span>
          <span class="leave-mono fg-eye-clock">{{ clock }}</span>
        </Motion>

        <h1 class="fg-title">
          Time you worked,
          <span class="fg-title-l2">banked back as <em>molten</em> days.</span>
        </h1>
        <p class="fg-sub">
          Work a holiday or week-off and a credit is forged automatically — or grant one by hand.
          Each pour cools over <b>{{ EXPIRY_DAYS }} days</b>; spend it before the ember dies.
        </p>

        <!-- Reserve readout — gauge chips, NOT plain tiles -->
        <div class="fg-readout">
          <Motion v-for="(g, i) in gauges" :key="g.key" as="div"
            class="fg-gauge" :data-tone="g.tone"
            :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.45, delay: 0.22 + i * 0.07, ease: [0.16, 1, 0.3, 1] }"
            :whileHover="{ y: -3 }"
          >
            <span class="fg-gauge-ic"><component :is="g.icon" :size="13" /></span>
            <div class="fg-gauge-body">
              <span class="fg-gauge-val leave-mono">{{ display(g.value) }}<i v-if="g.unit">{{ g.unit }}</i></span>
              <span class="fg-gauge-lbl">{{ g.label }}</span>
            </div>
            <span class="fg-gauge-spark" />
          </Motion>
        </div>
      </div>

      <!-- RIGHT — the molten reserve vessel -->
      <div class="fg-vessel-wrap">
        <div class="fg-vessel" :class="{ dormant: !hasReserve }">
          <!-- rising spark glyphs (earning) -->
          <span class="fg-sparks" aria-hidden="true">
            <span v-for="n in 5" :key="n" class="fg-spark" :style="sparkStyle(n)">+1</span>
          </span>

          <svg class="fg-flask" viewBox="0 0 220 240" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="fgMolten" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stop-color="#fff3c4" />
                <stop offset="28%" stop-color="#fde047" />
                <stop offset="62%" stop-color="#f97316" />
                <stop offset="100%" stop-color="#c2410c" />
              </linearGradient>
              <linearGradient id="fgGlass" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="rgba(251,191,36,0.18)" />
                <stop offset="100%" stop-color="rgba(234,88,12,0.05)" />
              </linearGradient>
              <clipPath id="fgClip"><rect x="22" y="14" width="176" height="212" rx="26" /></clipPath>
            </defs>

            <!-- glass body -->
            <rect x="22" y="14" width="176" height="212" rx="26" fill="url(#fgGlass)"
              stroke="var(--leave-border-strong)" stroke-width="1.5" />

            <!-- liquid -->
            <g clip-path="url(#fgClip)">
              <g class="fg-liquid" :style="{ transform: `translateY(${liquidTop}px)` }">
                <!-- back wave (slower) -->
                <path class="fg-wave fg-wave-b" :d="WAVE_PATH" fill="url(#fgMolten)" opacity="0.55" />
                <!-- front wave -->
                <path class="fg-wave fg-wave-f" :d="WAVE_PATH" fill="url(#fgMolten)" />
                <!-- body fill below the waves -->
                <rect x="0" y="34" width="240" height="320" fill="url(#fgMolten)" />
                <!-- meniscus shine -->
                <rect x="0" y="30" width="240" height="3" fill="#fff7e6" opacity="0.7" />
              </g>
              <!-- bubbles -->
              <circle v-for="n in 7" :key="n" class="fg-bubble" :style="bubbleStyle(n)" r="3" cx="0" cy="0" />
            </g>

            <!-- tick scale -->
            <g class="fg-ticks">
              <g v-for="t in 4" :key="t">
                <line :x1="22" :x2="34" :y1="14 + t * 42.4" :y2="14 + t * 42.4" />
              </g>
            </g>
          </svg>

          <!-- center readout -->
          <div class="fg-vessel-core">
            <span class="fg-core-num leave-mono">{{ display(reserveActive) }}</span>
            <span class="fg-core-unit">active day{{ reserveActive === 1 ? '' : 's' }}</span>
            <span class="fg-core-sub leave-mono">{{ fillPct }}% of {{ display(reserveEarned) }} forged</span>
          </div>
        </div>
        <div class="fg-vessel-cap leave-mono">RESERVE · LIVE</div>
      </div>
    </Motion>

    <!-- ═══════════════════════════════════════════════════════════════════
         01 · EXPIRY BURN HORIZON — a decay meter, hot (imminent) → cool (far)
    ═══════════════════════════════════════════════════════════════════ -->
    <Motion class="fg-horizon" as="section"
      :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, delay: 0.2 }"
    >
      <header class="fg-hz-head">
        <div class="fg-hz-title">
          <Flame :size="14" />
          <span>Expiry burn horizon</span>
          <span class="fg-hz-count leave-mono">{{ activeWithExpiry.length }}</span>
        </div>
        <div class="fg-hz-legend leave-mono">
          <span><i class="dot d-hot" /> ≤7d</span>
          <span><i class="dot d-warm" /> ≤30d</span>
          <span><i class="dot d-cool" /> ≤90d</span>
        </div>
      </header>

      <div class="fg-hz-track">
        <span class="fg-hz-burn" aria-hidden="true" />
        <span class="fg-hz-axis" aria-hidden="true" />
        <span v-for="m in HZ_MARKS" :key="m.d" class="fg-hz-mark" :style="{ left: m.x + '%' }">
          <span class="fg-hz-mark-lbl leave-mono">{{ m.label }}</span>
        </span>

        <Motion v-for="(e, i) in activeWithExpiry" :key="e.id" as="button"
          class="fg-hz-ember" :style="emberStyle(e)"
          :initial="{ opacity: 0, scale: 0 }" :animate="{ opacity: 1, scale: 1 }"
          :transition="{ duration: 0.4, delay: 0.3 + Math.min(i * 0.03, 0.4), ease: [0.34, 1.56, 0.64, 1] }"
          :whileHover="{ scale: 1.5 }"
          :title="`${e.employee_name} · ${e.days}d · expires ${fmtDate(e.expires_on)} (${e.days_until_expiry}d)`"
          @click="focusEntry(e.id)"
        />
        <div v-if="!activeWithExpiry.length" class="fg-hz-empty leave-mono">NO DATED CREDITS IN RESERVE</div>
      </div>
    </Motion>

    <!-- ═══════════════════════════════════════════════════════════════════
         02 · LEDGER TOOLBAR — segmented decay filter + source + search
    ═══════════════════════════════════════════════════════════════════ -->
    <Motion class="fg-bar" as="div"
      :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.45, delay: 0.26 }"
    >
      <div class="fg-segs">
        <button v-for="s in SEGMENTS" :key="s.key"
          class="fg-seg" :class="{ on: segment === s.key }" :data-tone="s.tone"
          @click="segment = s.key"
        >
          <component :is="s.icon" :size="12" />{{ s.label }}
          <span class="fg-seg-n leave-mono">{{ segCount(s.key) }}</span>
        </button>
      </div>

      <div class="fg-bar-right">
        <div class="fg-search">
          <Search :size="13" />
          <input v-model="query" type="text" placeholder="Search employee / code…" />
          <button v-if="query" class="fg-search-x" @click="query = ''"><X :size="12" /></button>
        </div>
        <div class="fg-source-toggle">
          <button :class="{ on: source === 'all' }" @click="source = 'all'">All</button>
          <button :class="{ on: source === 'auto' }" @click="source = 'auto'"><Zap :size="11" /> Auto</button>
          <button :class="{ on: source === 'manual' }" @click="source = 'manual'"><UserCheck :size="11" /> Manual</button>
        </div>
        <button class="leave-btn leave-btn-sm" :disabled="loading" @click="reload">
          <RefreshCw :size="13" :class="{ spin: loading }" /> Refresh
        </button>
        <button class="leave-btn leave-btn-sm leave-btn-primary" @click="grantModal = true">
          <Plus :size="13" /> Grant
        </button>
      </div>
    </Motion>

    <!-- ═══════════════════════════════════════════════════════════════════
         03 · RESERVE CELLS — each credit is an energy cell with a decay bar
    ═══════════════════════════════════════════════════════════════════ -->
    <div v-if="loading" class="fg-grid">
      <div v-for="i in 6" :key="i" class="leave-skel fg-cell-skel" />
    </div>

    <div v-else-if="!filtered.length" class="fg-empty">
      <div class="fg-empty-orb"><Coffee :size="34" /></div>
      <h4>{{ entries.length ? 'No credits match this view' : 'The reserve is dormant' }}</h4>
      <p v-if="entries.length">Try a different segment, source, or clear the search.</p>
      <p v-else>Auto-credits forge when an employee works a Holiday or Week-Off ≥ half-shift. You can also grant one by hand.</p>
      <button v-if="!entries.length" class="leave-btn leave-btn-sm leave-btn-primary" @click="grantModal = true">
        <Plus :size="13" /> Grant the first
      </button>
    </div>

    <div v-else class="fg-grid">
      <Motion v-for="(e, i) in filtered" :key="e.id" as="article"
        class="fg-cell"
        :id="`co-${e.id}`"
        :data-state="cellState(e)"
        :class="{ focused: focusedId === e.id }"
        :style="{ '--life': lifeFrac(e), '--hot': hotHex(e) }"
        :initial="{ opacity: 0, y: 18, scale: 0.98 }"
        :animate="{ opacity: 1, y: 0, scale: 1 }"
        :transition="{ duration: 0.42, delay: Math.min(i * 0.04, 0.4), ease: [0.16, 1, 0.3, 1] }"
        :whileHover="{ y: -5 }"
      >
        <span class="fg-cell-sweep" aria-hidden="true" />
        <span class="fg-cell-coreglow" aria-hidden="true" />

        <header class="fg-cell-head">
          <span class="fg-cell-ava">{{ initials(e.employee_name) }}</span>
          <div class="fg-cell-id">
            <span class="fg-cell-name">{{ e.employee_name || '—' }}</span>
            <span class="fg-cell-meta leave-mono">{{ e.employee_code }}<template v-if="e.department_name"> · {{ e.department_name }}</template></span>
          </div>
          <span class="fg-cell-src" :data-auto="e.is_auto_generated">
            <component :is="e.is_auto_generated ? Zap : UserCheck" :size="10" />
            {{ e.is_auto_generated ? 'Auto' : 'Manual' }}
          </span>
          <button class="fg-cell-del" @click.stop="openDelete(e)" aria-label="Revoke credit" title="Revoke this credit">
            <Trash2 :size="13" />
          </button>
        </header>

        <!-- charge readout + vertical decay column -->
        <div class="fg-cell-core">
          <div class="fg-charge">
            <span class="fg-charge-num leave-mono">{{ e.days }}</span>
            <span class="fg-charge-unit">day{{ Number(e.days) === 1 ? '' : 's' }} charged</span>
          </div>

          <div class="fg-decay" :title="decayLabel(e)">
            <div class="fg-decay-fill" :style="{ height: (lifeFrac(e) * 100) + '%' }">
              <span class="fg-decay-cap" />
            </div>
            <span class="fg-decay-pct leave-mono">{{ Math.round(lifeFrac(e) * 100) }}%</span>
          </div>
        </div>

        <!-- earned → expires rail -->
        <div class="fg-rail">
          <div class="fg-rail-node">
            <span class="fg-rail-eye leave-mono">FORGED</span>
            <span class="fg-rail-val">{{ fmtDate(e.earned_on) }}</span>
          </div>
          <div class="fg-rail-line"><span :style="{ width: (lifeFrac(e) * 100) + '%' }" /></div>
          <div class="fg-rail-node end">
            <span class="fg-rail-eye leave-mono">{{ e.is_expired ? 'EXPIRED' : 'EXPIRES' }}</span>
            <span class="fg-rail-val" :data-state="cellState(e)">
              {{ fmtDate(e.expires_on) }}
              <em v-if="!e.is_expired && e.days_until_expiry != null">· {{ e.days_until_expiry }}d</em>
            </span>
          </div>
        </div>

        <p v-if="e.note" class="fg-cell-note">{{ e.note }}</p>
        <div v-if="e.actor_name" class="fg-cell-actor leave-mono">by {{ e.actor_name }}</div>
      </Motion>
    </div>

    <LeaveCompOffGrantModal :open="grantModal" @cancel="grantModal=false" @saved="onGranted" />
    <LeaveCompOffDeleteModal :open="remover.open" :entry="remover.entry" @cancel="remover.open=false" @deleted="onDeleted" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { Motion } from 'motion-v'
import {
  RefreshCw, Plus, Coffee, Zap, UserCheck, Hourglass, Flame, Search, X,
  Layers, CheckCircle2, AlertTriangle, Sparkles, Trash2,
} from 'lucide-vue-next'
import LeaveCompOffGrantModal from '../modals/LeaveCompOffGrantModal.vue'
import LeaveCompOffDeleteModal from '../modals/LeaveCompOffDeleteModal.vue'
import { fetchCompOffList, fetchCompOffStats, COMP_OFF_EXPIRY_DEFAULT_DAYS } from '@/composables/useLeaves'
import { useToast } from 'vue-toastification'

const toast = useToast()
const EXPIRY_DAYS = COMP_OFF_EXPIRY_DEFAULT_DAYS

const entries = ref([])
const stats = ref(null)
const loading = ref(false)
const grantModal = ref(false)
const remover = ref({ open: false, entry: null })
const segment = ref('active')   // all | active | soon | expired
const source = ref('all')       // all | auto | manual
const query = ref('')
const focusedId = ref(null)

// ── live clock for the hero eyebrow ──
const clock = ref('')
let clockTimer = null
const tickClock = () => {
  const d = new Date()
  clock.value = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}
const fyLabel = computed(() => {
  const d = new Date(); const y = d.getFullYear()
  // Apr-start fiscal year, matching backend _current_fy convention.
  const start = d.getMonth() >= 3 ? y : y - 1
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`
})

// ── helpers ──
const num = (v) => Number(v) || 0
const display = (v) => {
  const n = num(v)
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}
const initials = (name) => {
  if (!name) return '?'
  const p = String(name).trim().split(/\s+/).filter(Boolean)
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase()
}
const fmtDate = (v) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'

const lifeFrac = (e) => {
  if (e.is_expired) return 0
  const d = e.days_until_expiry
  if (d == null) return 1
  return Math.max(0.02, Math.min(1, d / EXPIRY_DAYS))
}
const HOT_RAMP = (d) => d <= 7 ? '#ea580c' : d <= 14 ? '#f97316' : d <= 30 ? '#fb923c' : d <= 60 ? '#fbbf24' : '#fde047'
const hotHex = (e) => e.is_expired ? '#7c2d12' : HOT_RAMP(e.days_until_expiry ?? 90)
const cellState = (e) => e.is_expired ? 'expired'
  : (e.days_until_expiry != null && e.days_until_expiry <= 7) ? 'critical'
  : (e.days_until_expiry != null && e.days_until_expiry <= 30) ? 'warm' : 'cool'
const decayLabel = (e) => e.is_expired ? 'Expired — charge lost'
  : `${Math.round(lifeFrac(e) * 100)}% of life remaining · ${e.days_until_expiry}d left`

// ── reserve gauges (hero readout) ──
const reserveActive = computed(() => num(stats.value?.balance_active))
const reserveEarned = computed(() => Math.max(num(stats.value?.total_earned), reserveActive.value))
const hasReserve = computed(() => reserveActive.value > 0)
const fillPct = computed(() => reserveEarned.value > 0
  ? Math.round((reserveActive.value / reserveEarned.value) * 100) : 0)
const liquidTop = computed(() => {
  // vessel inner height ≈ 212px (y 14..226); map fill% → translateY of liquid group
  const frac = Math.max(0.04, Math.min(1, (fillPct.value || (hasReserve.value ? 8 : 0)) / 100))
  return Math.round((1 - frac) * 196)
})

const gauges = computed(() => {
  const s = stats.value || {}
  return [
    { key: 'active',   icon: CheckCircle2,  label: 'Active reserve',   value: s.balance_active ?? 0,  unit: 'd', tone: 'gold' },
    { key: 'expiring', icon: Hourglass,     label: 'Expiring · 30d',   value: s.expiring_in_30d ?? 0, unit: '',  tone: 'ember' },
    { key: 'earned',   icon: Sparkles,      label: 'Forged · FY',      value: s.total_earned ?? 0,    unit: 'd', tone: 'amber' },
    { key: 'used',     icon: Layers,        label: 'Spent · FY',       value: s.total_used ?? 0,      unit: 'd', tone: 'amber' },
    { key: 'expired',  icon: AlertTriangle, label: 'Lost · FY',        value: s.total_expired ?? 0,   unit: 'd', tone: 'ash' },
    { key: 'auto',     icon: Zap,           label: 'Auto-forged',      value: s.auto_generated_count ?? 0, unit: '', tone: 'gold' },
  ]
})

// ── segments + filtering ──
const SEGMENTS = [
  { key: 'all',     label: 'All',          icon: Layers,        tone: 'amber' },
  { key: 'active',  label: 'Active',       icon: CheckCircle2,  tone: 'gold' },
  { key: 'soon',    label: 'Expiring',     icon: Hourglass,     tone: 'ember' },
  { key: 'expired', label: 'Expired',      icon: AlertTriangle, tone: 'ash' },
]
const matchSeg = (e, key) => {
  if (key === 'all') return true
  if (key === 'expired') return !!e.is_expired
  if (key === 'active') return !e.is_expired
  if (key === 'soon') return !e.is_expired && e.days_until_expiry != null && e.days_until_expiry <= 30
  return true
}
const matchSrc = (e) => source.value === 'all'
  || (source.value === 'auto' && e.is_auto_generated)
  || (source.value === 'manual' && !e.is_auto_generated)
const matchQuery = (e) => {
  const q = query.value.trim().toLowerCase()
  if (!q) return true
  return [e.employee_name, e.employee_code, e.department_name, e.note]
    .filter(Boolean).some(v => String(v).toLowerCase().includes(q))
}
const segCount = (key) => entries.value.filter(e => matchSeg(e, key) && matchSrc(e) && matchQuery(e)).length
const filtered = computed(() =>
  entries.value.filter(e => matchSeg(e, segment.value) && matchSrc(e) && matchQuery(e)))

// ── burn horizon ──
const activeWithExpiry = computed(() =>
  entries.value.filter(e => !e.is_expired && e.days_until_expiry != null)
    .slice().sort((a, b) => a.days_until_expiry - b.days_until_expiry))
const HZ_MARKS = [
  { d: 0,  x: 1,  label: 'NOW' },
  { d: 30, x: 33, label: '30d' },
  { d: 60, x: 66, label: '60d' },
  { d: 90, x: 98, label: '90d' },
]
const emberStyle = (e) => {
  const d = Math.max(0, Math.min(EXPIRY_DAYS, e.days_until_expiry ?? EXPIRY_DAYS))
  const left = (d / EXPIRY_DAYS) * 100
  const size = 9 + Math.min(num(e.days), 3) * 2
  return {
    left: `${left}%`,
    '--ec': HOT_RAMP(e.days_until_expiry ?? 90),
    width: `${size}px`, height: `${size}px`,
    animationDelay: `${(d % 7) * 0.18}s`,
  }
}

// ── decorative particle styles (deterministic, no Math.random in render) ──
const moteStyle = (n) => {
  const x = (n * 67) % 100
  const dur = 7 + (n % 5) * 1.3
  const delay = (n % 7) * 0.8
  const size = 2 + (n % 3)
  return { left: `${x}%`, width: `${size}px`, height: `${size}px`,
    animationDuration: `${dur}s`, animationDelay: `-${delay}s` }
}
const sparkStyle = (n) => ({ left: `${18 + n * 14}%`, animationDelay: `-${n * 1.1}s`,
  animationDuration: `${3.4 + (n % 3) * 0.6}s` })
const bubbleStyle = (n) => ({
  '--bx': `${28 + (n * 27) % 160}px`,
  animationDelay: `-${(n % 5) * 0.9}s`,
  animationDuration: `${3 + (n % 4) * 0.8}s`,
})

// Static wave path (one period across vessel width), reused for both layers.
const WAVE_PATH = 'M0 36 q 30 -16 60 0 t 60 0 t 60 0 t 60 0 t 60 0 V 320 H0 Z'

const focusEntry = (id) => {
  segment.value = 'all'
  focusedId.value = id
  // let the grid re-render under "all", then scroll
  requestAnimationFrame(() => {
    const el = document.getElementById(`co-${id}`)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => { if (focusedId.value === id) focusedId.value = null }, 2400)
  })
}

// ── fetch ──
const reload = async () => {
  loading.value = true
  try {
    // Pull everything (incl. expired) once → snappy client-side segmenting.
    const [list, st] = await Promise.all([
      fetchCompOffList({ only_active: false, limit: 200 }),
      fetchCompOffStats(),
    ])
    entries.value = list.items || []
    stats.value = st
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load comp-off data')
    entries.value = []
  } finally { loading.value = false }
}

const onGranted = () => { grantModal.value = false; reload() }
const openDelete = (e) => { remover.value = { open: true, entry: e } }
const onDeleted = () => { remover.value.open = false; reload() }

onMounted(() => {
  tickClock(); clockTimer = setInterval(tickClock, 1000)
  reload()
})
onBeforeUnmount(() => { if (clockTimer) clearInterval(clockTimer) })
</script>

<style scoped>
@import '@/styles/leave-theme.css';

.forge { display: flex; flex-direction: column; gap: 16px; }

/* ════════════════════════════════════════════════════════════════════════
   HERO — The Molten Reserve
   ════════════════════════════════════════════════════════════════════════ */
.fg-hero {
  position: relative; overflow: hidden; isolation: isolate;
  display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 0.75fr);
  gap: 26px; align-items: center;
  padding: 28px 30px; border-radius: 24px; min-height: 312px;
  background:
    radial-gradient(70% 100% at 100% 50%, rgba(249, 115, 22, 0.18), transparent 60%),
    radial-gradient(60% 90% at 0% 0%, rgba(251, 191, 36, 0.14), transparent 55%),
    linear-gradient(160deg, #0b0603, #150a04 60%, #1c0d05);
  border: 1px solid var(--leave-border);
}
[data-theme="light"] .fg-hero {
  background:
    radial-gradient(70% 100% at 100% 50%, rgba(249, 115, 22, 0.14), transparent 60%),
    radial-gradient(60% 90% at 0% 0%, rgba(251, 191, 36, 0.2), transparent 55%),
    linear-gradient(160deg, #fffdf5, #fff4e0);
  border-color: rgba(180, 83, 9, 0.2);
}
@media (max-width: 940px) { .fg-hero { grid-template-columns: 1fr; } }

/* drifting ember field */
.fg-emberfield { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
.fg-mote {
  position: absolute; bottom: -8px; border-radius: 50%;
  background: radial-gradient(circle, #fdba74, #ea580c 70%, transparent);
  box-shadow: 0 0 8px #f97316; opacity: 0; will-change: transform, opacity;
  animation: fg-rise-mote linear infinite;
}
@keyframes fg-rise-mote {
  0%   { transform: translateY(0) translateX(0) scale(0.6); opacity: 0; }
  12%  { opacity: 0.9; }
  80%  { opacity: 0.7; }
  100% { transform: translateY(-300px) translateX(14px) scale(1.1); opacity: 0; }
}

/* corner ticks */
.fg-edge { position: absolute; width: 20px; height: 20px; z-index: 1; pointer-events: none; opacity: 0.55; }
.fg-edge::before, .fg-edge::after { content: ''; position: absolute; background: var(--leave-brand); }
.fg-edge::before { width: 100%; height: 1.5px; } .fg-edge::after { width: 1.5px; height: 100%; }
.fg-edge.tl { top: 12px; left: 12px; } .fg-edge.tl::before,.fg-edge.tl::after { top: 0; left: 0; }
.fg-edge.tr { top: 12px; right: 12px; } .fg-edge.tr::before { top: 0; right: 0; } .fg-edge.tr::after { top: 0; right: 0; }
.fg-edge.bl { bottom: 12px; left: 12px; } .fg-edge.bl::before { bottom: 0; left: 0; } .fg-edge.bl::after { bottom: 0; left: 0; }
.fg-edge.br { bottom: 12px; right: 12px; } .fg-edge.br::before { bottom: 0; right: 0; } .fg-edge.br::after { bottom: 0; right: 0; }

/* LEFT copy */
.fg-copy { position: relative; z-index: 2; display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.fg-eye {
  display: inline-flex; align-items: center; gap: 8px; width: max-content; max-width: 100%;
  padding: 6px 12px; border-radius: 999px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.13em;
  color: var(--leave-text-secondary);
  background: rgba(249, 115, 22, 0.10); border: 1px solid rgba(249, 115, 22, 0.30);
}
[data-theme="light"] .fg-eye { background: rgba(249, 115, 22, 0.14); border-color: rgba(180, 83, 9, 0.26); }
.fg-eye-ember { width: 7px; height: 7px; border-radius: 50%; background: var(--leave-compoff); box-shadow: 0 0 10px var(--leave-compoff); animation: leave-eyebrow-pulse 1.7s ease-in-out infinite; }
.fg-eye-sep { color: var(--leave-text-muted); opacity: 0.5; }
.fg-eye-clock { color: var(--leave-compoff); }

.fg-title {
  margin: 0; font-size: clamp(26px, 3.1vw, 38px); font-weight: 800;
  letter-spacing: -0.028em; line-height: 1.06; color: #fff3d6; text-wrap: balance;
}
[data-theme="light"] .fg-title { color: #2a1100; }
.fg-title-l2 { display: block; }
.fg-title em {
  font-style: italic;
  background: linear-gradient(135deg, #fde047, #f97316 55%, #ea580c);
  background-clip: text; -webkit-background-clip: text; color: transparent;
}
.fg-sub { margin: 0; max-width: 52ch; font-size: 13px; line-height: 1.6; color: var(--w-gold-100); opacity: 0.86; }
[data-theme="light"] .fg-sub { color: #6b3d12; opacity: 1; }
.fg-sub b { color: var(--leave-compoff); font-weight: 800; }

/* reserve readout — gauge chips */
.fg-readout { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 9px; margin-top: 4px; }
@media (max-width: 560px) { .fg-readout { grid-template-columns: repeat(2, 1fr); } }
.fg-gauge {
  position: relative; overflow: hidden; isolation: isolate;
  display: flex; align-items: center; gap: 9px; padding: 9px 11px; border-radius: 13px;
  background: rgba(28, 16, 8, 0.66); border: 1px solid var(--leave-border);
  transition: border-color .22s, box-shadow .22s;
}
[data-theme="light"] .fg-gauge { background: rgba(255, 248, 233, 0.82); }
.fg-gauge:hover { border-color: var(--leave-compoff); box-shadow: 0 8px 22px -12px rgba(249, 115, 22, 0.5); }
.fg-gauge-ic {
  display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0;
  background: rgba(249, 115, 22, 0.12); color: var(--leave-compoff);
}
.fg-gauge[data-tone="gold"]  .fg-gauge-ic { background: rgba(251, 191, 36, 0.14); color: var(--w-gold-300); }
.fg-gauge[data-tone="ember"] .fg-gauge-ic { background: rgba(234, 88, 12, 0.16); color: var(--w-ember-400); }
.fg-gauge[data-tone="ash"]   .fg-gauge-ic { background: rgba(120, 53, 15, 0.22); color: var(--w-orange-200); }
.fg-gauge-body { display: flex; flex-direction: column; min-width: 0; }
.fg-gauge-val { font-size: 17px; font-weight: 800; line-height: 1; letter-spacing: -0.02em; color: var(--hr-text); font-variant-numeric: tabular-nums; }
.fg-gauge-val i { font-style: normal; font-size: 10px; margin-left: 1px; color: var(--leave-text-muted); }
.fg-gauge-lbl { margin-top: 3px; font-size: 8px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--hr-text-muted); white-space: nowrap; }
.fg-gauge-spark { position: absolute; inset: 0; z-index: -1; background: linear-gradient(115deg, transparent 40%, rgba(251,191,36,0.12) 50%, transparent 60%); background-size: 220% 100%; background-position: 200% 0; }
.fg-gauge:hover .fg-gauge-spark { animation: fg-sweep 0.8s ease forwards; }
@keyframes fg-sweep { to { background-position: -40% 0; } }

/* RIGHT vessel */
.fg-vessel-wrap { position: relative; z-index: 2; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.fg-vessel { position: relative; width: 200px; height: 230px; }
.fg-vessel.dormant { filter: saturate(0.5) brightness(0.85); }
.fg-flask { position: absolute; inset: 0; width: 100%; height: 100%; filter: drop-shadow(0 12px 30px rgba(234, 88, 12, 0.4)); }
.fg-liquid { will-change: transform; transition: transform 1.4s cubic-bezier(0.16, 1, 0.3, 1); }
.fg-wave { will-change: transform; }
.fg-wave-f { animation: fg-wave-pan 4.2s linear infinite; }
.fg-wave-b { animation: fg-wave-pan 6.6s linear infinite reverse; }
@keyframes fg-wave-pan { from { transform: translateX(0); } to { transform: translateX(-120px); } }
.fg-bubble { fill: rgba(255, 247, 230, 0.7); will-change: transform, opacity; animation: fg-bubble-rise linear infinite; transform: translate(var(--bx), 220px); }
@keyframes fg-bubble-rise {
  0%   { transform: translate(var(--bx), 220px) scale(0.5); opacity: 0; }
  20%  { opacity: 0.8; }
  100% { transform: translate(var(--bx), 40px) scale(1); opacity: 0; }
}
.fg-ticks line { stroke: var(--leave-border-strong); stroke-width: 1.4; }

.fg-sparks { position: absolute; inset: 0; z-index: 3; pointer-events: none; }
.fg-spark {
  position: absolute; bottom: 40%; font-size: 11px; font-weight: 800; font-family: 'SF Mono', monospace;
  color: #fff3c4; text-shadow: 0 0 8px #f97316; opacity: 0; will-change: transform, opacity;
  animation: leave-accrue-pop ease-out infinite;
}
.fg-vessel-core {
  position: absolute; inset: 0; z-index: 4; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 2px; text-align: center; pointer-events: none;
}
.fg-core-num {
  font-size: 46px; font-weight: 900; line-height: 1; letter-spacing: -0.04em;
  color: #fff7e6; text-shadow: 0 2px 14px rgba(0, 0, 0, 0.5); font-variant-numeric: tabular-nums;
}
[data-theme="light"] .fg-core-num { color: #3a1f0b; text-shadow: 0 1px 8px rgba(255, 247, 230, 0.7); }
.fg-core-unit { font-size: 11px; font-weight: 700; color: #ffe9c7; }
[data-theme="light"] .fg-core-unit { color: #6b3d12; }
.fg-core-sub { font-size: 8.5px; font-weight: 700; letter-spacing: 0.08em; color: #fdba74; opacity: 0.9; margin-top: 3px; }
.fg-vessel-cap { font-size: 8.5px; font-weight: 800; letter-spacing: 0.2em; color: var(--leave-text-muted); }

/* ════════════════════════════════════════════════════════════════════════
   BURN HORIZON
   ════════════════════════════════════════════════════════════════════════ */
.fg-horizon {
  position: relative; padding: 14px 18px 22px; border-radius: 18px;
  background: var(--leave-surface); border: 1px solid var(--leave-border); backdrop-filter: blur(14px);
}
.fg-hz-head { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px; margin-bottom: 16px; }
.fg-hz-title { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 800; color: var(--hr-text); letter-spacing: -0.01em; }
.fg-hz-title svg { color: var(--leave-compoff); }
.fg-hz-count { display: inline-grid; place-items: center; min-width: 20px; height: 18px; padding: 0 6px; border-radius: 999px; font-size: 10px; font-weight: 800; background: rgba(249, 115, 22, 0.16); color: var(--leave-compoff); }
.fg-hz-legend { display: flex; gap: 12px; font-size: 9px; color: var(--hr-text-muted); }
.fg-hz-legend span { display: inline-flex; align-items: center; gap: 4px; }
.fg-hz-legend .dot { width: 7px; height: 7px; border-radius: 50%; }
.dot.d-hot { background: #ea580c; box-shadow: 0 0 6px #ea580c; }
.dot.d-warm { background: #fb923c; }
.dot.d-cool { background: #fde047; }

.fg-hz-track { position: relative; height: 56px; }
.fg-hz-axis { position: absolute; left: 0; right: 0; top: 50%; height: 2px; border-radius: 2px;
  background: linear-gradient(90deg, #ea580c, #f97316 28%, #fbbf24 64%, #fde047); opacity: 0.5; }
.fg-hz-burn { position: absolute; left: 0; top: 0; bottom: 0; width: 60px; pointer-events: none;
  background: linear-gradient(90deg, rgba(234, 88, 12, 0.4), transparent); border-radius: 18px 0 0 18px;
  animation: fg-burn-flicker 2.4s ease-in-out infinite; }
@keyframes fg-burn-flicker { 0%,100% { opacity: 0.5; } 50% { opacity: 0.9; } }
.fg-hz-mark { position: absolute; top: 50%; transform: translate(-50%, -50%); }
.fg-hz-mark::before { content: ''; position: absolute; left: 50%; top: -7px; width: 1px; height: 14px; background: var(--leave-border-strong); transform: translateX(-50%); }
.fg-hz-mark-lbl { position: absolute; left: 50%; top: 12px; transform: translateX(-50%); font-size: 8px; font-weight: 800; letter-spacing: 0.1em; color: var(--hr-text-muted); white-space: nowrap; }
.fg-hz-ember {
  position: absolute; top: 50%; transform: translate(-50%, -50%);
  border: 0; padding: 0; cursor: pointer; border-radius: 50%;
  background: radial-gradient(circle at 35% 30%, #fff7e6, var(--ec) 55%, color-mix(in srgb, var(--ec) 60%, #7c2d12));
  box-shadow: 0 0 10px var(--ec), 0 0 22px -4px var(--ec);
  animation: fg-ember-pulse 2.2s ease-in-out infinite;
}
@keyframes fg-ember-pulse { 0%,100% { box-shadow: 0 0 8px var(--ec), 0 0 18px -6px var(--ec); } 50% { box-shadow: 0 0 14px var(--ec), 0 0 30px -2px var(--ec); } }
.fg-hz-empty { position: absolute; inset: 0; display: grid; place-items: center; font-size: 10px; letter-spacing: 0.16em; color: var(--hr-text-muted); }

/* ════════════════════════════════════════════════════════════════════════
   TOOLBAR
   ════════════════════════════════════════════════════════════════════════ */
.fg-bar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; }
.fg-segs { display: inline-flex; gap: 4px; padding: 4px; border-radius: 12px; background: var(--leave-surface); border: 1px solid var(--leave-border); }
.fg-seg {
  --st: var(--leave-brand);
  display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px; border-radius: 9px;
  font-size: 11.5px; font-weight: 700; cursor: pointer; white-space: nowrap;
  background: transparent; border: 1px solid transparent; color: var(--hr-text-secondary);
  transition: background .2s, color .2s, border-color .2s;
}
.fg-seg[data-tone="ember"] { --st: var(--leave-compoff); }
.fg-seg[data-tone="ash"]   { --st: var(--w-ember-500); }
.fg-seg:hover { color: var(--hr-text); }
.fg-seg.on { background: color-mix(in srgb, var(--st) 16%, transparent); border-color: color-mix(in srgb, var(--st) 45%, transparent); color: var(--hr-text); box-shadow: 0 4px 14px -8px var(--st); }
.fg-seg-n { display: inline-grid; place-items: center; min-width: 18px; height: 16px; padding: 0 5px; border-radius: 999px; font-size: 9.5px; font-weight: 800; background: rgba(255,255,255,0.08); color: var(--hr-text-muted); }
.fg-seg.on .fg-seg-n { background: color-mix(in srgb, var(--st) 28%, transparent); color: var(--hr-text); }

.fg-bar-right { display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.fg-search { display: inline-flex; align-items: center; gap: 7px; height: 32px; padding: 0 10px; border-radius: 9px; background: var(--leave-surface); border: 1px solid var(--leave-border); color: var(--hr-text-muted); transition: border-color .2s; }
.fg-search:focus-within { border-color: var(--leave-compoff); }
.fg-search input { border: 0; background: transparent; outline: none; color: var(--hr-text); font: inherit; font-size: 12px; width: 168px; min-width: 0; }
.fg-search input::placeholder { color: var(--hr-text-muted); }
.fg-search-x { display: grid; place-items: center; width: 16px; height: 16px; border: 0; border-radius: 50%; background: rgba(255,255,255,0.08); color: var(--hr-text-muted); cursor: pointer; }
.fg-source-toggle { display: inline-flex; gap: 2px; padding: 3px; border-radius: 9px; background: var(--leave-surface); border: 1px solid var(--leave-border); }
.fg-source-toggle button { display: inline-flex; align-items: center; gap: 4px; height: 26px; padding: 0 9px; border-radius: 7px; border: 0; background: transparent; color: var(--hr-text-secondary); font-size: 11px; font-weight: 700; cursor: pointer; transition: background .18s, color .18s; }
.fg-source-toggle button.on { background: rgba(249, 115, 22, 0.16); color: var(--leave-compoff); }

/* ════════════════════════════════════════════════════════════════════════
   RESERVE CELLS
   ════════════════════════════════════════════════════════════════════════ */
.fg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 12px; }
.fg-cell-skel { height: 188px; border-radius: 18px; }

.fg-cell {
  position: relative; overflow: hidden; isolation: isolate;
  display: flex; flex-direction: column; gap: 12px; padding: 15px 16px; border-radius: 18px;
  background:
    radial-gradient(120% 80% at 100% 0%, color-mix(in srgb, var(--hot) 12%, transparent), transparent 55%),
    var(--leave-surface);
  border: 1px solid var(--leave-border); backdrop-filter: blur(14px);
  transition: border-color .24s var(--leave-ease), box-shadow .24s var(--leave-ease), opacity .24s;
}
[data-theme="light"] .fg-cell {
  background:
    radial-gradient(120% 80% at 100% 0%, color-mix(in srgb, var(--hot) 16%, transparent), transparent 55%),
    rgba(255, 250, 240, 0.92);
  border-color: rgba(180, 83, 9, 0.18);
}
.fg-cell::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: var(--hot); box-shadow: 0 0 14px var(--hot); z-index: 1;
}
.fg-cell[data-state="critical"] { border-color: color-mix(in srgb, var(--w-ember-500) 50%, transparent); }
.fg-cell[data-state="expired"] { opacity: 0.72; filter: saturate(0.6); }
.fg-cell:hover { border-color: color-mix(in srgb, var(--hot) 55%, transparent); box-shadow: 0 26px 56px -30px rgba(0,0,0,0.8), 0 0 28px -12px var(--hot); }
.fg-cell.focused { border-color: var(--hot); box-shadow: 0 0 0 2px color-mix(in srgb, var(--hot) 40%, transparent), 0 0 30px -8px var(--hot); animation: fg-focus-flash 0.6s ease; }
@keyframes fg-focus-flash { 0% { box-shadow: 0 0 0 6px color-mix(in srgb, var(--hot) 50%, transparent); } 100% { box-shadow: 0 0 0 2px color-mix(in srgb, var(--hot) 40%, transparent); } }

.fg-cell-sweep { position: absolute; inset: 0; z-index: -1; pointer-events: none; background: linear-gradient(115deg, transparent 38%, color-mix(in srgb, var(--hot) 20%, transparent) 50%, transparent 62%); background-size: 240% 100%; background-position: 200% 0; opacity: 0; }
.fg-cell:hover .fg-cell-sweep { opacity: 1; animation: fg-sweep 0.9s ease forwards; }
.fg-cell-coreglow { position: absolute; inset: -30% -10% auto auto; width: 55%; height: 130%; z-index: -1; background: radial-gradient(50% 50% at 50% 50%, color-mix(in srgb, var(--hot) 26%, transparent), transparent 70%); filter: blur(34px); opacity: 0; transition: opacity .3s; }
.fg-cell:hover .fg-cell-coreglow { opacity: 0.8; }

.fg-cell-head { display: flex; align-items: center; gap: 10px; }
.fg-cell-ava { display: inline-grid; place-items: center; width: 34px; height: 34px; border-radius: 11px; flex-shrink: 0; background: linear-gradient(135deg, var(--hot), color-mix(in srgb, var(--hot) 60%, #7c2d12)); color: #1a0f06; font-weight: 800; font-size: 11px; }
.fg-cell-id { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 1px; }
.fg-cell-name { font-size: 13.5px; font-weight: 800; color: var(--hr-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fg-cell-meta { font-size: 10px; color: var(--hr-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fg-cell-src { display: inline-flex; align-items: center; gap: 4px; flex-shrink: 0; padding: 3px 8px; border-radius: 999px; font-size: 9px; font-weight: 800; letter-spacing: 0.06em; }
.fg-cell-src[data-auto="true"] { color: var(--leave-approved); background: var(--leave-approved-soft); border: 1px solid color-mix(in srgb, var(--leave-approved) 38%, transparent); }
.fg-cell-src[data-auto="false"] { color: var(--leave-compoff); background: rgba(249, 115, 22, 0.14); border: 1px solid color-mix(in srgb, var(--leave-compoff) 38%, transparent); }
.fg-cell-del {
  display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
  background: transparent; border: 1px solid var(--leave-border); color: var(--hr-text-muted);
  cursor: pointer; opacity: 0; transform: translateX(4px);
  transition: opacity .22s, transform .22s, background .22s, color .22s, border-color .22s;
}
.fg-cell:hover .fg-cell-del { opacity: 1; transform: translateX(0); }
.fg-cell-del:hover { background: rgba(234, 88, 12, 0.16); border-color: var(--leave-rejected); color: var(--leave-rejected); }
@media (hover: none) { .fg-cell-del { opacity: 1; transform: none; } }

.fg-cell-core { display: flex; align-items: stretch; gap: 14px; }
.fg-charge { flex: 1; display: flex; flex-direction: column; justify-content: center; }
.fg-charge-num { font-size: 38px; font-weight: 900; line-height: 0.9; letter-spacing: -0.04em; background: linear-gradient(135deg, #fde047, var(--hot) 75%); background-clip: text; -webkit-background-clip: text; color: transparent; font-variant-numeric: tabular-nums; }
.fg-charge-unit { margin-top: 4px; font-size: 9px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--hr-text-muted); }
.fg-decay { position: relative; width: 26px; flex-shrink: 0; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid var(--leave-border); overflow: hidden; display: flex; align-items: flex-end; }
[data-theme="light"] .fg-decay { background: rgba(120,53,15,0.08); }
.fg-decay-fill { position: relative; width: 100%; border-radius: 0 0 7px 7px; background: linear-gradient(180deg, color-mix(in srgb, var(--hot) 85%, #fff7ed), var(--hot) 60%, color-mix(in srgb, var(--hot) 65%, #7c2d12)); box-shadow: 0 0 14px color-mix(in srgb, var(--hot) 55%, transparent); transition: height 1s cubic-bezier(0.16, 1, 0.3, 1); }
.fg-decay-cap { position: absolute; top: 0; left: 0; right: 0; height: 3px; background: #fff7e6; opacity: 0.85; box-shadow: 0 0 6px #fff7e6; }
.fg-decay-pct { position: absolute; left: 50%; bottom: 5px; transform: translateX(-50%) rotate(-90deg); transform-origin: center; font-size: 8px; font-weight: 800; color: #1a0f06; white-space: nowrap; mix-blend-mode: hard-light; }

.fg-rail { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 8px; }
.fg-rail-node { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.fg-rail-node.end { text-align: right; }
.fg-rail-eye { font-size: 8px; font-weight: 800; letter-spacing: 0.12em; color: var(--hr-text-muted); }
.fg-rail-val { font-size: 11.5px; font-weight: 700; color: var(--hr-text); white-space: nowrap; }
.fg-rail-val em { font-style: normal; font-size: 10px; color: var(--hr-text-muted); }
.fg-rail-val[data-state="critical"] { color: var(--leave-compoff); }
.fg-rail-val[data-state="critical"] em { color: var(--w-ember-400); }
.fg-rail-val[data-state="expired"] { color: var(--leave-rejected); }
.fg-rail-line { position: relative; height: 3px; border-radius: 3px; background: rgba(255,255,255,0.08); overflow: hidden; }
[data-theme="light"] .fg-rail-line { background: rgba(120,53,15,0.12); }
.fg-rail-line span { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 3px; background: linear-gradient(90deg, color-mix(in srgb, var(--hot) 60%, #7c2d12), var(--hot)); box-shadow: 0 0 8px var(--hot); }

.fg-cell-note { margin: 0; padding: 8px 11px; border-radius: 10px; background: rgba(249, 115, 22, 0.07); border-left: 2px solid color-mix(in srgb, var(--hot) 42%, transparent); font-size: 11.5px; line-height: 1.45; color: var(--hr-text-secondary); }
.fg-cell-actor { font-size: 9px; color: var(--hr-text-muted); letter-spacing: 0.04em; }

/* empty state */
.fg-empty { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 10px; padding: 44px 24px; border-radius: 20px; border: 1px dashed var(--leave-border); background: radial-gradient(80% 60% at 50% 0%, rgba(249, 115, 22, 0.10), transparent 60%); }
.fg-empty-orb { display: grid; place-items: center; width: 70px; height: 70px; border-radius: 20px; background: rgba(249, 115, 22, 0.12); border: 1px solid rgba(249, 115, 22, 0.3); color: var(--leave-compoff); animation: leave-glow-breathe 3s ease-in-out infinite; }
.fg-empty h4 { margin: 6px 0 0; font-size: 15px; font-weight: 800; color: var(--hr-text); }
.fg-empty p { margin: 0; max-width: 44ch; font-size: 12.5px; line-height: 1.6; color: var(--hr-text-muted); }

.spin { animation: fg-spin 0.9s linear infinite; }
@keyframes fg-spin { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .fg-mote, .fg-wave-f, .fg-wave-b, .fg-bubble, .fg-spark, .fg-hz-burn, .fg-hz-ember, .fg-eye-ember, .fg-empty-orb { animation: none !important; }
}
</style>
