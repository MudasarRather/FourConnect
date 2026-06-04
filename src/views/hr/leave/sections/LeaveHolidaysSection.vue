<template>
  <div class="alm">
    <!-- ═══════════════════════════════════════════════════════════════════
         AMBIENT — warm aurora + rising festive sparks (unique to this page:
         no dot-grid blueprint, no flow-lanes, no orbital dial)
    ═══════════════════════════════════════════════════════════════════ -->
    <div class="alm-bg" aria-hidden="true">
      <span class="alm-aura a" /><span class="alm-aura b" />
      <span v-for="s in sparks" :key="s.id" class="alm-spark"
        :style="{ left: s.x + '%', bottom: s.y + '%', '--d': s.delay + 's', '--sz': s.size + 'px' }" />
    </div>

    <!-- ═══════════════════════════════════════════════════════════════════
         00 · HERO — Countdown plate + horizontal YEAR TIMELINE of holidays
    ═══════════════════════════════════════════════════════════════════ -->
    <Motion class="alm-hero" as="section"
      :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }"
    >
      <!-- LEFT — the next-holiday "almanac plate" -->
      <div class="alm-plate">
        <div class="alm-eye leave-mono">
          <span class="alm-eye-led" /> ALMANAC <span class="alm-eye-sep">/</span> FY {{ selectedYear }}
        </div>

        <!-- year stepper -->
        <div class="alm-ynav">
          <button class="alm-ynav-btn" @click="stepYear(-1)" aria-label="Previous year"><ChevronLeft :size="14" /></button>
          <button class="alm-ynav-now" :class="{ on: selectedYear === thisYear }" @click="goThisYear">This year</button>
          <button class="alm-ynav-btn" @click="stepYear(1)" aria-label="Next year"><ChevronRight :size="14" /></button>
        </div>

        <template v-if="nextHoliday">
          <span class="alm-plate-tag leave-mono">{{ countdownLabel }}</span>
          <div class="alm-count">
            <strong class="alm-count-num leave-mono">{{ countdownText.value }}</strong>
            <span class="alm-count-unit">{{ countdownText.unit }}</span>
          </div>
          <div class="alm-next">
            <span class="alm-next-seal" :style="{ '--c': tmeta(nextHoliday.holiday_type).hex }">
              <component :is="tmeta(nextHoliday.holiday_type).icon" :size="15" />
            </span>
            <div class="alm-next-meta">
              <strong class="alm-next-name">{{ nextHoliday.name }}</strong>
              <span class="alm-next-sub leave-mono">
                {{ fmtFull(nextHoliday.date) }}
                <span v-if="nextHoliday.location_name"> · {{ nextHoliday.location_name }}</span>
              </span>
            </div>
          </div>
          <!-- year progress -->
          <div class="alm-prog">
            <div class="alm-prog-bar"><span :style="{ width: (loaded ? yearProgress : 0) + '%' }" /></div>
            <span class="alm-prog-lbl leave-mono">{{ Math.round(yearProgress) }}% of {{ selectedYear }} elapsed</span>
          </div>
        </template>

        <div v-else class="alm-plate-empty">
          <PartyPopper :size="26" />
          <strong>No more holidays in {{ selectedYear }}</strong>
          <span class="leave-mono">{{ holidays.length }} celebrated this year</span>
        </div>
      </div>

      <!-- RIGHT — the full year as a single timeline ribbon w/ holiday flag-pins -->
      <div class="alm-yearwrap">
        <div class="alm-yearwrap-head">
          <span class="leave-mono">THE YEAR AT A GLANCE</span>
          <span class="alm-yearwrap-meta leave-mono">{{ holidays.length }} holidays plotted</span>
        </div>

        <div class="alm-timeline" ref="tlRef">
          <!-- month gridlines + labels -->
          <span v-for="mo in monthMarks" :key="`mm-${mo.m}`" class="alm-tl-month"
            :style="{ left: mo.x + '%' }">
            <span class="alm-tl-month-line" />
            <span class="alm-tl-month-lbl leave-mono">{{ mo.label }}</span>
          </span>

          <!-- today playhead -->
          <span v-if="todayX !== null" class="alm-tl-now" :style="{ left: todayX + '%' }">
            <span class="alm-tl-now-orb" />
          </span>

          <!-- baseline -->
          <span class="alm-tl-base" />

          <!-- holiday flag-pins -->
          <Motion v-for="(p, i) in pins" :key="p.id" as="button" type="button"
            class="alm-pin" :class="{ past: p._past, today: p._today, dim: typeFilter && typeFilter !== p.holiday_type }"
            :style="{ left: p.x + '%', '--c': tmeta(p.holiday_type).hex }"
            :initial="{ scaleY: 0, opacity: 0 }"
            :animate="{ scaleY: 1, opacity: 1 }"
            :transition="{ duration: 0.5, delay: 0.3 + Math.min(i * 0.018, 0.5), ease: [0.34, 1.56, 0.64, 1] }"
            :title="`${p.name} · ${fmtFull(p.date)}`"
            @click="scrollToMonth(p.monthKey)"
          >
            <span class="alm-pin-stem" />
            <span class="alm-pin-head"><span class="alm-pin-core" /></span>
          </Motion>
        </div>

        <!-- legend -->
        <div class="alm-legend">
          <button v-for="t in TYPE_KEYS" :key="t"
            class="alm-leg" :class="{ active: typeFilter === t, mute: typeFilter && typeFilter !== t }"
            :style="{ '--c': tmeta(t).hex }"
            @click="toggleType(t)"
          >
            <span class="alm-leg-dot" />
            {{ tmeta(t).label }}
            <span class="alm-leg-n leave-mono">{{ typeCounts[t] || 0 }}</span>
          </button>
        </div>
      </div>
    </Motion>

    <!-- ═══════════════════════════════════════════════════════════════════
         01 · STAMP STRIP — aggregate almanac stamps
    ═══════════════════════════════════════════════════════════════════ -->
    <Motion class="alm-stamps" as="div"
      :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, delay: 0.18 }"
    >
      <Motion v-for="(s, i) in stamps" :key="s.key" as="div" class="alm-stamp" :data-tone="s.tone"
        :initial="{ opacity: 0, scale: 0.92 }" :animate="{ opacity: 1, scale: 1 }"
        :transition="{ duration: 0.4, delay: 0.24 + i * 0.06, ease: [0.34, 1.56, 0.64, 1] }"
        :whileHover="{ y: -3 }"
      >
        <span class="alm-stamp-ic"><component :is="s.icon" :size="14" /></span>
        <div class="alm-stamp-body">
          <strong class="alm-stamp-val leave-mono">{{ s.display }}</strong>
          <span class="alm-stamp-lbl">{{ s.label }}</span>
        </div>
        <span class="alm-stamp-perf" aria-hidden="true" />
      </Motion>
    </Motion>

    <!-- ═══════════════════════════════════════════════════════════════════
         02 · RAIL — search · scope · manage
    ═══════════════════════════════════════════════════════════════════ -->
    <Motion class="alm-rail" as="div"
      :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.45, delay: 0.24 }"
    >
      <div class="alm-search">
        <Search :size="14" class="ic" />
        <input v-model.trim="query" placeholder="Search holidays…" />
        <button v-if="query" class="alm-search-x" @click="query = ''" aria-label="Clear"><X :size="11" /></button>
      </div>

      <div class="alm-scope">
        <button v-for="sc in SCOPES" :key="sc.key"
          class="alm-scope-btn" :class="{ on: scope === sc.key }" @click="scope = sc.key"
        >{{ sc.label }}</button>
        <span class="alm-scope-slider" :class="`s-${scope}`" />
      </div>

      <button class="leave-btn leave-btn-sm alm-refresh" :disabled="loading" @click="reload">
        <RefreshCw :size="13" :class="{ spin: loading }" /> Refresh
      </button>
      <router-link to="/admin/hr/attendance/holidays" class="leave-btn leave-btn-sm leave-btn-primary alm-manage">
        <Settings2 :size="13" /> Manage holidays
      </router-link>
    </Motion>

    <!-- ═══════════════════════════════════════════════════════════════════
         03 · MONTH SPINE — vertical timeline of holiday plates
    ═══════════════════════════════════════════════════════════════════ -->
    <div v-if="loading && !holidays.length" class="alm-spine">
      <div v-for="i in 4" :key="`sk-${i}`" class="leave-skel alm-sk" />
    </div>

    <Motion v-else-if="!filtered.length" as="div" class="leave-empty alm-empty"
      :initial="{ opacity: 0, scale: 0.96 }" :animate="{ opacity: 1, scale: 1 }"
      :transition="{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }"
    >
      <PartyPopper :size="40" style="color: var(--leave-special)" />
      <strong>{{ holidays.length ? 'No holidays match' : 'No active holidays yet' }}</strong>
      <span>{{ holidays.length
        ? 'Try a different scope, type or search term.'
        : 'Holidays are curated in the Attendance module — import or add custom dates there and they will surface here automatically.' }}</span>
    </Motion>

    <div v-else class="alm-spine">
      <div v-for="(grp, gi) in grouped" :key="grp.key" class="alm-mgroup" :ref="el => setMonthRef(grp.key, el)">
        <!-- month node on the spine -->
        <Motion as="div" class="alm-mnode"
          :initial="{ opacity: 0, x: -16 }" :animate="{ opacity: 1, x: 0 }"
          :transition="{ duration: 0.5, delay: 0.05 + gi * 0.06, ease: [0.16, 1, 0.3, 1] }"
        >
          <span class="alm-mnode-medal">
            <span class="alm-mnode-mo leave-mono">{{ grp.short }}</span>
            <span class="alm-mnode-yr leave-mono">'{{ grp.yy }}</span>
          </span>
          <span class="alm-mnode-line" />
          <span class="alm-mnode-count leave-mono">{{ grp.items.length }} {{ grp.items.length === 1 ? 'holiday' : 'holidays' }}</span>
        </Motion>

        <!-- plates -->
        <div class="alm-plates">
          <Motion v-for="(h, i) in grp.items" :key="h.id" as="article"
            class="alm-tile" :class="{ past: h._past, today: h._today, dim: typeFilter && typeFilter !== h.holiday_type }"
            :style="{ '--c': tmeta(h.holiday_type).hex }"
            :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.45, delay: 0.06 + gi * 0.04 + i * 0.05, ease: [0.16, 1, 0.3, 1] }"
            :whileHover="{ y: -4 }"
          >
            <span class="alm-tile-foil" aria-hidden="true" />
            <span class="alm-tile-perf" aria-hidden="true" />

            <!-- date block -->
            <div class="alm-tile-date">
              <span class="alm-tile-dow leave-mono">{{ fmtDow(h.date) }}</span>
              <span class="alm-tile-num leave-mono">{{ fmtDay(h.date) }}</span>
              <span class="alm-tile-mo leave-mono">{{ fmtMonth(h.date) }}</span>
            </div>

            <!-- body -->
            <div class="alm-tile-body">
              <strong class="alm-tile-name">{{ h.name }}</strong>
              <div class="alm-tile-meta">
                <span class="alm-tile-type" :style="{ '--c': tmeta(h.holiday_type).hex }">
                  <component :is="tmeta(h.holiday_type).icon" :size="10" />
                  {{ tmeta(h.holiday_type).label }}
                </span>
                <span v-if="h.location_name" class="alm-tile-loc"><MapPin :size="10" /> {{ h.location_name }}</span>
                <span v-if="isImported(h)" class="alm-tile-src leave-mono">imported</span>
              </div>
              <p v-if="h.description" class="alm-tile-desc">{{ h.description }}</p>
            </div>

            <!-- countdown / status -->
            <div class="alm-tile-status" :class="h._today ? 'is-today' : h._past ? 'is-past' : 'is-up'">
              <template v-if="h._today"><Sparkles :size="12" /> TODAY</template>
              <template v-else-if="h._past"><Check :size="12" /> passed</template>
              <template v-else>in {{ h._in }}{{ h._in === 1 ? ' day' : ' days' }}</template>
            </div>
          </Motion>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Motion } from 'motion-v'
import {
  PartyPopper, MapPin, Search, X, RefreshCw, Settings2, ChevronLeft, ChevronRight,
  Flag, Building2, Star, Sparkles, Check, CalendarDays, CalendarCheck, CalendarClock,
} from 'lucide-vue-next'
import axios from 'axios'
import { API, authHeader } from '@/utils/api'
import { useToast } from 'vue-toastification'

const toast = useToast()
const holidays = ref([])
const loading = ref(false)
const loaded = ref(false)
const query = ref('')
const typeFilter = ref(null)
const scope = ref('all')          // all | upcoming | past
const thisYear = new Date().getFullYear()
const selectedYear = ref(thisYear)

// ── Holiday-type meta — WARM palette only (the module forbids cool hues) ──
const TYPE_META = {
  NATIONAL:   { label: 'National',   hex: '#fbbf24', icon: Flag },
  COMPANY:    { label: 'Company',    hex: '#f59e0b', icon: Building2 },
  REGIONAL:   { label: 'Regional',   hex: '#fb923c', icon: MapPin },
  RESTRICTED: { label: 'Restricted', hex: '#e34a0a', icon: Star },
}
const TYPE_KEYS = Object.keys(TYPE_META)
const tmeta = (t) => TYPE_META[t] || { label: (t || 'Holiday').replace('_', ' '), hex: '#fbbf24', icon: CalendarDays }

const SCOPES = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' },
]

// ── Festive ambient sparks (deterministic at setup) ──
const sparks = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  x: (i * 61 + 7) % 100,
  y: (i * 37) % 60,
  delay: ((i * 13) % 80) / 10,
  size: 3 + (i % 3),
}))

// ── Date helpers ──
const midnight = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
const todayMid = computed(() => midnight(new Date()))
const yearDays = computed(() => {
  const y = selectedYear.value
  return ((y % 4 === 0 && y % 100 !== 0) || y % 400 === 0) ? 366 : 365
})
const dayOfYear = (d) => {
  const dt = new Date(d)
  const start = new Date(dt.getFullYear(), 0, 0)
  return Math.floor((dt - start) / 86400000)
}
const fmtMonth = (v) => new Date(v).toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()
const fmtDay = (v) => new Date(v).getDate()
const fmtDow = (v) => new Date(v).toLocaleDateString('en-IN', { weekday: 'short' }).toUpperCase()
const fmtFull = (v) => new Date(v).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
const isImported = (h) => typeof h.source === 'string' && h.source.startsWith('import')

// ── Fetch ──
const reload = async () => {
  loading.value = true
  try {
    const y = selectedYear.value
    // Backend GET /hr/holidays/ supports `year` + `page`/`limit` (limit ≤ 200);
    // it has no from/to/is_active params (passing limit=300 → 422). Filter by
    // year server-side, drop tombstoned rows client-side below.
    const { data } = await axios.get(`${API}/hr/holidays/`, {
      headers: authHeader(),
      params: { year: y, limit: 200 },
    })
    holidays.value = (data.items || [])
      .filter(h => !h.is_deleted)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load holidays')
    holidays.value = []
  } finally {
    loading.value = false
    requestAnimationFrame(() => requestAnimationFrame(() => { loaded.value = true }))
  }
}

const stepYear = (n) => { selectedYear.value += n; loaded.value = false; reload() }
const goThisYear = () => { selectedYear.value = thisYear; loaded.value = false; reload() }

// ── Decorated list (past / today / upcoming + days-until) ──
const decorated = computed(() => {
  const t = todayMid.value.getTime()
  return holidays.value.map(h => {
    const dm = midnight(h.date).getTime()
    const inDays = Math.round((dm - t) / 86400000)
    return { ...h, _today: dm === t, _past: dm < t, _in: Math.max(0, inDays) }
  })
})

// ── Counts / next / progress ──
const typeCounts = computed(() => {
  const m = {}
  for (const h of holidays.value) m[h.holiday_type] = (m[h.holiday_type] || 0) + 1
  return m
})
const nextHoliday = computed(() => decorated.value.find(h => !h._past) || null)
const upcomingCount = computed(() => decorated.value.filter(h => !h._past).length)
const countdownDays = computed(() => nextHoliday.value ? nextHoliday.value._in : null)
const countdownLabel = computed(() => {
  if (!nextHoliday.value) return ''
  if (nextHoliday.value._today) return 'HAPPENING NOW'
  return 'NEXT HOLIDAY'
})
const countdownText = computed(() => {
  const n = countdownDays.value
  if (n === null) return { value: '—', unit: '' }
  if (nextHoliday.value._today) return { value: 'Today', unit: 'enjoy it' }
  if (n >= 14) return { value: Math.round(n / 7), unit: n / 7 >= 2 ? 'weeks away' : 'week away' }
  return { value: n, unit: n === 1 ? 'day away' : 'days away' }
})
const yearProgress = computed(() => {
  if (selectedYear.value !== thisYear) return selectedYear.value < thisYear ? 100 : 0
  return Math.max(0, Math.min(100, (dayOfYear(todayMid.value) / yearDays.value) * 100))
})

// ── Hero timeline geometry ──
const monthMarks = computed(() =>
  Array.from({ length: 12 }, (_, m) => ({
    m,
    x: (dayOfYear(new Date(selectedYear.value, m, 1)) / yearDays.value) * 100,
    label: new Date(selectedYear.value, m, 1).toLocaleDateString('en-IN', { month: 'short' })[0],
  })),
)
const pins = computed(() =>
  decorated.value.map(h => ({
    ...h,
    x: (dayOfYear(h.date) / yearDays.value) * 100,
    monthKey: monthKeyOf(h.date),
  })),
)
const todayX = computed(() => {
  if (selectedYear.value !== thisYear) return null
  return (dayOfYear(todayMid.value) / yearDays.value) * 100
})

// ── Filtered + grouped (month spine) ──
const filtered = computed(() => {
  const q = query.value.toLowerCase()
  return decorated.value.filter(h => {
    if (typeFilter.value && h.holiday_type !== typeFilter.value) return false
    if (scope.value === 'upcoming' && h._past) return false
    if (scope.value === 'past' && !h._past) return false
    if (q && !(`${h.name} ${h.location_name || ''} ${tmeta(h.holiday_type).label}`.toLowerCase().includes(q))) return false
    return true
  })
})
const monthKeyOf = (d) => { const dt = new Date(d); return `${dt.getFullYear()}-${dt.getMonth()}` }
const grouped = computed(() => {
  const map = new Map()
  for (const h of filtered.value) {
    const dt = new Date(h.date)
    const key = `${dt.getFullYear()}-${dt.getMonth()}`
    if (!map.has(key)) map.set(key, {
      key,
      short: dt.toLocaleDateString('en-IN', { month: 'long' }),
      yy: String(dt.getFullYear()).slice(-2),
      sort: dt.getFullYear() * 12 + dt.getMonth(),
      items: [],
    })
    map.get(key).items.push(h)
  }
  return Array.from(map.values()).sort((a, b) => a.sort - b.sort)
})

// ── Stamps ──
const stamps = computed(() => [
  { key: 'total', label: 'holidays this year', tone: 'gold',  icon: CalendarDays,  display: String(holidays.value.length) },
  { key: 'up',    label: 'still ahead',         tone: 'amber', icon: CalendarClock, display: String(upcomingCount.value) },
  { key: 'nat',   label: 'national',            tone: 'gold',  icon: Flag,          display: String(typeCounts.value.NATIONAL || 0) },
  { key: 'comp',  label: 'company + regional',  tone: 'ember', icon: Building2,     display: String((typeCounts.value.COMPANY || 0) + (typeCounts.value.REGIONAL || 0)) },
  { key: 'rest',  label: 'restricted',          tone: 'amber', icon: CalendarCheck, display: String(typeCounts.value.RESTRICTED || 0) },
])

// ── Interactions ──
const toggleType = (t) => { typeFilter.value = typeFilter.value === t ? null : t }
const monthRefs = {}
const setMonthRef = (key, el) => { if (el) monthRefs[key] = el }
const scrollToMonth = (key) => {
  const el = monthRefs[key]
  if (el?.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
const tlRef = ref(null)

onMounted(reload)
</script>

<style scoped>
@import '@/styles/leave-theme.css';

.alm { position: relative; display: flex; flex-direction: column; gap: 18px; isolation: isolate; }

/* ── Ambient ── */
.alm-bg { position: absolute; inset: -20px; z-index: -1; overflow: hidden; pointer-events: none; }
.alm-aura { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.5; }
.alm-aura.a { width: 460px; height: 460px; top: -160px; left: -80px; background: radial-gradient(circle, rgba(251,146,60,0.42), transparent 65%); animation: alm-aura-a 26s ease-in-out infinite; }
.alm-aura.b { width: 400px; height: 400px; bottom: -160px; right: -80px; background: radial-gradient(circle, rgba(251,191,36,0.34), transparent 65%); animation: alm-aura-b 30s ease-in-out infinite; }
@keyframes alm-aura-a { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px,34px) scale(1.1); } }
@keyframes alm-aura-b { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-30px,-28px) scale(1.12); } }
.alm-spark {
  position: absolute; width: var(--sz); height: var(--sz); border-radius: 50%;
  background: radial-gradient(circle, #fde68a, #fb923c);
  box-shadow: 0 0 8px rgba(251,191,36,0.7);
  opacity: 0; animation: alm-float 9s ease-in infinite; animation-delay: var(--d);
}
@keyframes alm-float {
  0% { transform: translateY(0) scale(0.5); opacity: 0; }
  15% { opacity: 0.9; }
  80% { opacity: 0.5; }
  100% { transform: translateY(-220px) scale(1); opacity: 0; }
}

/* ════════════════════════════════════════════════════════════════════════
   HERO
   ════════════════════════════════════════════════════════════════════════ */
.alm-hero {
  position: relative; overflow: hidden;
  display: grid; grid-template-columns: minmax(0, 0.82fr) minmax(0, 1.18fr);
  gap: 26px; align-items: stretch;
  padding: 26px 28px;
  border-radius: 24px;
  background:
    radial-gradient(70% 90% at 0% 0%, rgba(251,146,60,0.18), transparent 58%),
    radial-gradient(60% 80% at 100% 100%, rgba(251,191,36,0.14), transparent 60%),
    linear-gradient(180deg, #0b0704, #140b05);
  border: 1px solid var(--leave-border);
  min-height: 280px;
}
[data-theme="light"] .alm-hero {
  background:
    radial-gradient(70% 90% at 0% 0%, rgba(251,146,60,0.18), transparent 58%),
    radial-gradient(60% 80% at 100% 100%, rgba(251,191,36,0.2), transparent 60%),
    linear-gradient(180deg, #fffdf5, #fff5e6);
  border-color: rgba(180,83,9,0.2);
}
@media (max-width: 1040px) { .alm-hero { grid-template-columns: 1fr; } }

/* LEFT plate */
.alm-plate { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.alm-eye {
  display: inline-flex; align-items: center; gap: 8px; width: max-content;
  padding: 6px 12px; border-radius: 999px;
  background: rgba(251,146,60,0.1); border: 1px solid rgba(251,146,60,0.3);
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.14em; color: var(--leave-text-secondary);
}
[data-theme="light"] .alm-eye { background: rgba(251,146,60,0.16); border-color: rgba(180,83,9,0.26); }
.alm-eye-led { width: 7px; height: 7px; border-radius: 50%; background: var(--leave-special); box-shadow: 0 0 10px var(--leave-special); animation: leave-eyebrow-pulse 1.6s ease-in-out infinite; }
.alm-eye-sep { opacity: 0.5; }

.alm-ynav { display: inline-flex; align-items: center; gap: 6px; }
.alm-ynav-btn, .alm-ynav-now {
  height: 26px; border-radius: 8px; cursor: pointer; font: inherit;
  background: rgba(251,191,36,0.07); border: 1px solid var(--leave-border);
  color: var(--leave-text-secondary); display: inline-grid; place-items: center;
  transition: border-color .2s, background .2s, color .2s;
}
.alm-ynav-btn { width: 28px; }
.alm-ynav-now { padding: 0 11px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.04em; }
.alm-ynav-btn:hover, .alm-ynav-now:hover { border-color: var(--leave-brand); color: var(--leave-text); }
.alm-ynav-now.on { background: rgba(251,191,36,0.16); border-color: var(--leave-brand); color: var(--leave-text); }

.alm-plate-tag { font-size: 9px; font-weight: 800; letter-spacing: 0.2em; color: var(--leave-special); margin-top: 2px; }
.alm-count { display: flex; align-items: baseline; gap: 10px; }
.alm-count-num {
  font-size: clamp(40px, 6vw, 64px); font-weight: 900; line-height: 0.9; letter-spacing: -0.03em;
  background: linear-gradient(135deg, #fde047, #fb923c 55%, #ea580c);
  background-clip: text; -webkit-background-clip: text; color: transparent;
}
.alm-count-unit { font-size: 13px; font-weight: 700; color: var(--leave-text-secondary); }

.alm-next { display: flex; align-items: center; gap: 11px; margin-top: 2px; }
.alm-next-seal {
  --c: #fbbf24; flex-shrink: 0; display: grid; place-items: center;
  width: 40px; height: 40px; border-radius: 13px;
  background: color-mix(in srgb, var(--c) 18%, transparent);
  border: 1px solid color-mix(in srgb, var(--c) 45%, transparent);
  color: var(--c); box-shadow: 0 0 18px -6px color-mix(in srgb, var(--c) 70%, transparent);
}
.alm-next-meta { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.alm-next-name { font-size: 16px; font-weight: 800; color: var(--leave-text); letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.alm-next-sub { font-size: 10.5px; color: var(--leave-text-muted); }

.alm-prog { margin-top: auto; padding-top: 8px; display: flex; flex-direction: column; gap: 5px; }
.alm-prog-bar { height: 5px; border-radius: 999px; overflow: hidden; background: rgba(251,191,36,0.12); }
.alm-prog-bar span { display: block; height: 100%; border-radius: 999px; background: var(--leave-grad-cta); transition: width 1.2s cubic-bezier(0.16,1,0.3,1); }
.alm-prog-lbl { font-size: 9px; font-weight: 700; letter-spacing: 0.08em; color: var(--leave-text-muted); }

.alm-plate-empty { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; padding: 14px 0; color: var(--leave-text-muted); }
.alm-plate-empty strong { font-size: 16px; color: var(--leave-text); }
.alm-plate-empty svg { color: var(--leave-special); }

/* RIGHT — year timeline */
.alm-yearwrap {
  position: relative; z-index: 1; display: flex; flex-direction: column; gap: 12px;
  padding: 16px 18px 14px; border-radius: 18px;
  background: rgba(16,11,6,0.5); border: 1px solid var(--leave-border);
}
[data-theme="light"] .alm-yearwrap { background: rgba(255,250,235,0.6); }
.alm-yearwrap-head { display: flex; align-items: baseline; justify-content: space-between; }
.alm-yearwrap-head span:first-child { font-size: 9.5px; font-weight: 800; letter-spacing: 0.18em; color: var(--leave-text-secondary); }
.alm-yearwrap-meta { font-size: 9px; color: var(--leave-text-muted); }

.alm-timeline { position: relative; height: 150px; margin: 6px 4px 2px; }
.alm-tl-base {
  position: absolute; left: 0; right: 0; bottom: 26px; height: 2px; border-radius: 2px;
  background: linear-gradient(90deg, transparent, rgba(251,191,36,0.4) 12%, rgba(251,146,60,0.4) 88%, transparent);
}
.alm-tl-month { position: absolute; bottom: 0; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; }
.alm-tl-month-line { position: absolute; bottom: 26px; top: 8px; width: 1px; background: var(--leave-grid-line); }
.alm-tl-month-lbl { font-size: 8.5px; font-weight: 800; color: var(--leave-text-muted); margin-top: 4px; }

.alm-tl-now { position: absolute; top: 6px; bottom: 22px; width: 1.5px; transform: translateX(-50%); background: linear-gradient(180deg, rgba(251,191,36,0.85), rgba(251,146,60,0.1)); z-index: 3; }
.alm-tl-now-orb { position: absolute; top: -3px; left: 50%; transform: translateX(-50%); width: 7px; height: 7px; border-radius: 50%; background: #fde68a; box-shadow: 0 0 10px #fbbf24; animation: leave-eyebrow-pulse 1.8s ease-in-out infinite; }

.alm-pin {
  --c: #fbbf24;
  position: absolute; bottom: 26px; transform-origin: bottom center;
  width: 14px; height: 96px; margin-left: -7px;
  background: transparent; border: 0; cursor: pointer; padding: 0;
  display: flex; flex-direction: column-reverse; align-items: center;
  transition: opacity .25s;
}
.alm-pin.dim { opacity: 0.2; }
.alm-pin.past { opacity: 0.5; }
.alm-pin.past.dim { opacity: 0.14; }
.alm-pin-stem { width: 2px; flex: 1; background: linear-gradient(180deg, color-mix(in srgb, var(--c) 90%, transparent), color-mix(in srgb, var(--c) 20%, transparent)); border-radius: 2px; }
.alm-pin-head {
  width: 11px; height: 11px; border-radius: 50%; margin-bottom: -2px;
  display: grid; place-items: center;
  background: color-mix(in srgb, var(--c) 22%, rgba(20,13,7,0.8));
  border: 1.5px solid var(--c);
  box-shadow: 0 0 10px -2px color-mix(in srgb, var(--c) 80%, transparent);
  transition: transform .25s cubic-bezier(0.34,1.56,0.64,1), box-shadow .25s;
}
.alm-pin-core { width: 4px; height: 4px; border-radius: 50%; background: var(--c); }
.alm-pin:hover .alm-pin-head { transform: scale(1.5); box-shadow: 0 0 16px color-mix(in srgb, var(--c) 90%, transparent); }
.alm-pin.today .alm-pin-head { animation: alm-pin-pulse 1.6s ease-in-out infinite; }
@keyframes alm-pin-pulse { 0%,100% { box-shadow: 0 0 8px color-mix(in srgb, var(--c) 70%, transparent); } 50% { box-shadow: 0 0 18px 2px color-mix(in srgb, var(--c) 90%, transparent); } }

.alm-legend { display: flex; flex-wrap: wrap; gap: 6px; }
.alm-leg {
  --c: #fbbf24; display: inline-flex; align-items: center; gap: 7px;
  height: 26px; padding: 0 10px; border-radius: 999px; cursor: pointer; font: inherit;
  font-size: 10.5px; font-weight: 700; color: var(--leave-text-secondary);
  background: transparent; border: 1px solid var(--leave-border);
  transition: border-color .2s, color .2s, background .2s, opacity .2s;
}
.alm-leg:hover { color: var(--leave-text); border-color: color-mix(in srgb, var(--c) 55%, transparent); }
.alm-leg.active { background: color-mix(in srgb, var(--c) 14%, transparent); border-color: color-mix(in srgb, var(--c) 60%, transparent); color: var(--leave-text); }
.alm-leg.mute { opacity: 0.45; }
.alm-leg-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--c); box-shadow: 0 0 7px color-mix(in srgb, var(--c) 70%, transparent); }
.alm-leg-n { font-size: 9px; font-weight: 800; opacity: 0.8; }

/* ════════════════════════════════════════════════════════════════════════
   STAMP STRIP
   ════════════════════════════════════════════════════════════════════════ */
.alm-stamps { display: grid; grid-template-columns: repeat(5, minmax(0,1fr)); gap: 10px; }
@media (max-width: 760px) { .alm-stamps { grid-template-columns: repeat(2, 1fr); } }
.alm-stamp {
  position: relative; overflow: hidden;
  display: flex; align-items: center; gap: 11px;
  padding: 12px 14px; border-radius: 14px;
  background: var(--leave-surface); border: 1px solid var(--leave-border);
  transition: border-color .22s, box-shadow .22s;
}
.alm-stamp:hover { border-color: var(--leave-brand); box-shadow: 0 10px 24px -14px rgba(251,191,36,0.45); }
.alm-stamp-ic {
  display: grid; place-items: center; width: 34px; height: 34px; border-radius: 10px; flex-shrink: 0;
  background: rgba(251,191,36,0.12); border: 1px solid rgba(251,191,36,0.28); color: var(--leave-brand);
}
.alm-stamp[data-tone="ember"] .alm-stamp-ic { background: rgba(234,88,12,0.14); border-color: rgba(234,88,12,0.3); color: var(--w-ember-400); }
.alm-stamp-body { display: flex; flex-direction: column; min-width: 0; }
.alm-stamp-val { font-size: 22px; font-weight: 900; line-height: 1; letter-spacing: -0.02em; color: var(--leave-text); font-variant-numeric: tabular-nums; }
.alm-stamp-lbl { font-size: 9.5px; font-weight: 700; letter-spacing: 0.04em; color: var(--leave-text-muted); margin-top: 3px; text-transform: uppercase; }
/* perforated stamp edge */
.alm-stamp-perf {
  position: absolute; right: 0; top: 0; bottom: 0; width: 8px;
  background: radial-gradient(circle at left, transparent 0 2.5px, var(--leave-surface) 2.5px) 0 0 / 8px 9px repeat-y;
  opacity: 0.8; pointer-events: none;
}
[data-theme="light"] .alm-stamp-perf { background: radial-gradient(circle at left, transparent 0 2.5px, rgba(255,250,235,0.92) 2.5px) 0 0 / 8px 9px repeat-y; }

/* ════════════════════════════════════════════════════════════════════════
   RAIL
   ════════════════════════════════════════════════════════════════════════ */
.alm-rail {
  display: flex; flex-wrap: wrap; gap: 12px; align-items: center;
  padding: 11px 14px; border-radius: 14px;
  background: var(--leave-surface); border: 1px solid var(--leave-border); backdrop-filter: blur(14px);
}
.alm-search {
  position: relative; display: flex; align-items: center; gap: 8px;
  padding: 0 12px; height: 38px; border-radius: 10px;
  background: rgba(251,191,36,0.06); border: 1px solid var(--leave-border);
  flex: 1; min-width: 200px; max-width: 360px;
  transition: border-color .22s, box-shadow .22s;
}
.alm-search:focus-within { border-color: var(--leave-brand); box-shadow: 0 0 0 3px rgba(251,191,36,0.16); }
[data-theme="light"] .alm-search { background: rgba(255,248,225,0.92); }
.alm-search .ic { color: var(--leave-text-muted); flex-shrink: 0; }
.alm-search input { flex: 1; min-width: 0; height: 100%; background: transparent; border: 0; outline: 0; font: inherit; font-size: 13px; color: var(--leave-text); }
.alm-search input::placeholder { color: var(--leave-text-placeholder); }
.alm-search-x { width: 20px; height: 20px; flex-shrink: 0; display: grid; place-items: center; border-radius: 50%; border: 1px solid var(--leave-border); background: transparent; color: var(--leave-text-muted); cursor: pointer; }
.alm-search-x:hover { color: var(--leave-text); border-color: var(--leave-brand); }

.alm-scope { position: relative; display: inline-flex; padding: 3px; border-radius: 999px; background: rgba(251,191,36,0.06); border: 1px solid var(--leave-border); }
.alm-scope-btn { position: relative; z-index: 1; height: 28px; padding: 0 14px; border: 0; background: transparent; cursor: pointer; font: inherit; font-size: 11.5px; font-weight: 700; color: var(--leave-text-secondary); transition: color .25s; }
.alm-scope-btn.on { color: #2a1100; }
[data-theme="light"] .alm-scope-btn.on { color: #2a1100; }
.alm-scope-slider { position: absolute; top: 3px; bottom: 3px; width: calc((100% - 6px) / 3); border-radius: 999px; background: var(--leave-grad-cta); box-shadow: 0 6px 16px -8px rgba(234,88,12,0.6); transition: transform .35s cubic-bezier(0.34,1.56,0.64,1); }
.alm-scope-slider.s-all { transform: translateX(0); }
.alm-scope-slider.s-upcoming { transform: translateX(100%); }
.alm-scope-slider.s-past { transform: translateX(200%); }

.alm-refresh { margin-left: auto; }
.alm-manage { text-decoration: none; }

/* ════════════════════════════════════════════════════════════════════════
   MONTH SPINE
   ════════════════════════════════════════════════════════════════════════ */
.alm-spine { display: flex; flex-direction: column; gap: 4px; position: relative; }
.alm-sk { height: 96px; border-radius: 16px; }
.alm-empty { flex-direction: column; }
.alm-empty strong { font-size: 15px; font-weight: 800; color: var(--leave-text); }
.alm-empty span { font-size: 12px; max-width: 48ch; }

.alm-mgroup {
  position: relative;
  display: grid; grid-template-columns: 150px 1fr; gap: 18px;
  padding: 14px 0;
}
@media (max-width: 720px) { .alm-mgroup { grid-template-columns: 1fr; gap: 10px; } }
/* the vertical spine line connecting month medallions */
.alm-mgroup::before {
  content: ''; position: absolute; left: 27px; top: 0; bottom: 0; width: 2px;
  background: linear-gradient(180deg, transparent, var(--leave-border-strong) 10%, var(--leave-border-strong) 90%, transparent);
}
@media (max-width: 720px) { .alm-mgroup::before { display: none; } }

.alm-mnode { position: relative; display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
.alm-mnode-medal {
  position: relative; z-index: 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  width: 56px; height: 56px; border-radius: 16px;
  background: radial-gradient(120% 120% at 30% 20%, rgba(251,191,36,0.22), rgba(234,88,12,0.12));
  border: 1px solid rgba(251,146,60,0.5);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.3), 0 8px 20px -12px rgba(234,88,12,0.6);
}
.alm-mnode-mo { font-size: 11px; font-weight: 900; letter-spacing: 0.02em; background: linear-gradient(135deg,#fde68a,#fb923c); background-clip: text; -webkit-background-clip: text; color: transparent; text-transform: uppercase; }
[data-theme="light"] .alm-mnode-mo { background: linear-gradient(135deg,#92400e,#c2410c); background-clip: text; -webkit-background-clip: text; color: transparent; }
.alm-mnode-yr { font-size: 8px; font-weight: 800; color: var(--leave-text-muted); margin-top: 1px; }
.alm-mnode-line { display: none; }
.alm-mnode-count { font-size: 9.5px; font-weight: 700; letter-spacing: 0.04em; color: var(--leave-text-muted); padding-left: 4px; }

.alm-plates { display: flex; flex-direction: column; gap: 9px; min-width: 0; }
.alm-tile {
  --c: #fbbf24;
  position: relative; overflow: hidden;
  display: grid; grid-template-columns: 64px 1fr auto; align-items: center; gap: 14px;
  padding: 12px 14px; border-radius: 16px;
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--c) 9%, transparent), transparent 38%),
    var(--leave-surface);
  border: 1px solid var(--leave-border);
  backdrop-filter: blur(12px);
  transition: border-color .24s, box-shadow .24s;
}
[data-theme="light"] .alm-tile {
  background: linear-gradient(90deg, color-mix(in srgb, var(--c) 14%, transparent), transparent 38%), rgba(255,250,240,0.9);
  border-color: rgba(180,83,9,0.16);
}
.alm-tile:hover { border-color: color-mix(in srgb, var(--c) 55%, transparent); box-shadow: 0 16px 36px -22px color-mix(in srgb, var(--c) 70%, transparent); }
.alm-tile.past { opacity: 0.62; }
.alm-tile.dim { opacity: 0.32; }
.alm-tile.today { border-color: color-mix(in srgb, var(--c) 70%, transparent); box-shadow: 0 0 24px -10px color-mix(in srgb, var(--c) 75%, transparent); }
/* left accent rail */
.alm-tile::before { content: ''; position: absolute; left: 0; top: 8px; bottom: 8px; width: 3px; border-radius: 999px; background: var(--c); box-shadow: 0 0 10px color-mix(in srgb, var(--c) 70%, transparent); }
/* foil shimmer sweep on hover */
.alm-tile-foil { position: absolute; inset: 0; background: linear-gradient(115deg, transparent 38%, rgba(255,255,255,0.16) 50%, transparent 62%); background-size: 250% 100%; background-position: 200% 0; pointer-events: none; }
.alm-tile:hover .alm-tile-foil { animation: alm-foil 0.9s ease forwards; }
@keyframes alm-foil { to { background-position: -60% 0; } }
.alm-tile-perf { position: absolute; left: 56px; top: 0; bottom: 0; width: 1px; background: repeating-linear-gradient(180deg, var(--leave-border-strong) 0 3px, transparent 3px 7px); opacity: 0.6; }

.alm-tile-date { display: flex; flex-direction: column; align-items: center; line-height: 1; }
.alm-tile-dow { font-size: 8px; font-weight: 800; letter-spacing: 0.1em; color: var(--leave-text-muted); }
.alm-tile-num { font-size: 26px; font-weight: 900; letter-spacing: -0.03em; color: var(--leave-text); margin: 2px 0; }
.alm-tile.today .alm-tile-num { background: linear-gradient(135deg, #fde047, var(--c)); background-clip: text; -webkit-background-clip: text; color: transparent; }
.alm-tile-mo { font-size: 8px; font-weight: 800; letter-spacing: 0.12em; color: var(--c); }

.alm-tile-body { min-width: 0; display: flex; flex-direction: column; gap: 5px; }
.alm-tile-name { font-size: 14px; font-weight: 800; color: var(--leave-text); letter-spacing: -0.01em; }
.alm-tile-meta { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; }
.alm-tile-type {
  --c: #fbbf24; display: inline-flex; align-items: center; gap: 4px;
  padding: 2px 8px; border-radius: 999px; font-size: 9.5px; font-weight: 800; letter-spacing: 0.04em;
  background: color-mix(in srgb, var(--c) 16%, transparent); color: color-mix(in srgb, var(--c) 92%, white);
  border: 1px solid color-mix(in srgb, var(--c) 40%, transparent);
}
[data-theme="light"] .alm-tile-type { color: color-mix(in srgb, var(--c) 72%, black); }
.alm-tile-loc { display: inline-flex; align-items: center; gap: 4px; font-size: 10px; color: var(--leave-text-muted); }
.alm-tile-src { font-size: 8.5px; font-weight: 700; letter-spacing: 0.08em; color: var(--leave-text-muted); padding: 1px 6px; border-radius: 6px; border: 1px dashed var(--leave-border-strong); text-transform: uppercase; }
.alm-tile-desc { margin: 0; font-size: 11px; line-height: 1.4; color: var(--leave-text-secondary); opacity: 0.85; max-width: 52ch; }

.alm-tile-status { flex-shrink: 0; display: inline-flex; align-items: center; gap: 5px; padding: 5px 11px; border-radius: 999px; font-size: 10.5px; font-weight: 800; letter-spacing: 0.02em; font-variant-numeric: tabular-nums; }
.alm-tile-status.is-up { background: rgba(251,191,36,0.14); color: var(--leave-special); border: 1px solid rgba(251,146,60,0.4); }
.alm-tile-status.is-today { background: var(--leave-grad-cta); color: #2a1100; box-shadow: 0 6px 16px -8px rgba(234,88,12,0.6); }
.alm-tile-status.is-past { background: rgba(255,255,255,0.04); color: var(--leave-text-muted); border: 1px solid var(--leave-border); }
[data-theme="light"] .alm-tile-status.is-past { background: rgba(180,83,9,0.05); }

.spin { animation: alm-spin 0.9s linear infinite; }
@keyframes alm-spin { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .alm-aura, .alm-spark, .alm-eye-led, .alm-tl-now-orb, .alm-tile-foil, .alm-pin.today .alm-pin-head { animation: none !important; }
}
</style>
