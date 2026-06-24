<template>
  <div class="vault">
    <!-- ═══════════════════════════════════════════════════════════════════
         00 · HERO — "The Reserve" liquid tank-farm
         A row of glass tanks, each filled with animated liquid (wavy surface
         + rising bubbles) to the org-wide available/quota ratio of one leave
         type. Deliberately unlike the Applications flow-lanes and the
         Approvals orbital dial — this page speaks "treasury / reservoir".
    ═══════════════════════════════════════════════════════════════════ -->
    <Motion class="rv-hero" as="section"
      :initial="{ opacity: 0, y: 14 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }"
    >
      <!-- Measurement ruler along the top edge — fits the "measured to the day" idea -->
      <div class="rv-ruler" aria-hidden="true">
        <span v-for="n in 48" :key="n" class="rv-tick" :class="{ major: n % 6 === 0 }" />
      </div>

      <!-- LEFT — copy + aggregate meters -->
      <div class="rv-copy">
        <Motion as="div" class="rv-eye"
          :initial="{ opacity: 0, x: -10 }" :animate="{ opacity: 1, x: 0 }"
          :transition="{ duration: 0.5, delay: 0.08 }"
        >
          <span class="rv-eye-led" />
          <span class="leave-mono">RESERVES</span>
          <span class="rv-eye-sep">/</span>
          <span class="leave-mono">FY {{ fyLabel }}</span>
          <span class="rv-eye-sep">/</span>
          <span class="leave-mono rv-eye-live">LIVE LEDGER</span>
        </Motion>

        <h1 class="rv-title">
          Every day off, <em>poured</em>,
          <span class="rv-title-line2">drawn, and accounted.</span>
        </h1>
        <p class="rv-sub">
          The running reserve for the whole organisation — opening, accrual, carry-forward,
          encashment and every manual adjustment, distilled into one fill level per leave type.
        </p>

        <!-- Aggregate meters — tweened count-ups with thin fill bars -->
        <div class="rv-meters">
          <Motion v-for="(m, i) in heroMeters" :key="m.key" as="div"
            class="rv-meter" :data-tone="m.tone"
            :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
            :transition="{ duration: 0.45, delay: 0.28 + i * 0.08, ease: [0.16, 1, 0.3, 1] }"
            :whileHover="{ y: -3 }"
          >
            <header class="rv-meter-head">
              <component :is="m.icon" :size="12" />
              <span class="leave-mono">{{ m.label }}</span>
            </header>
            <div class="rv-meter-val leave-mono">
              {{ m.display }}<span v-if="m.suffix" class="rv-meter-suf">{{ m.suffix }}</span>
            </div>
            <div class="rv-meter-bar">
              <span class="rv-meter-fill" :style="{ width: (loaded ? m.pct : 0) + '%' }" />
            </div>
          </Motion>
        </div>
      </div>

      <!-- RIGHT — tank farm -->
      <div class="rv-farm-wrap">
        <div v-if="loading && !rows.length" class="rv-farm-skel">
          <div v-for="i in 5" :key="i" class="leave-skel rv-tank-skel" />
        </div>
        <div v-else-if="!tanks.length" class="rv-farm-empty leave-mono">NO RESERVE DATA</div>
        <div v-else class="rv-farm">
          <Motion v-for="(t, i) in tanks" :key="t.key" as="div"
            class="rv-tank" :class="{ dimmed: focusType && focusType !== t.key }"
            :style="{ '--tk-c': t.color }"
            :initial="{ opacity: 0, y: 18, scale: 0.94 }"
            :animate="{ opacity: 1, y: 0, scale: 1 }"
            :transition="{ duration: 0.55, delay: 0.34 + i * 0.07, ease: [0.34, 1.56, 0.64, 1] }"
            :whileHover="{ y: -4 }"
            @click="toggleFocus(t.key)"
            role="button"
            :title="`${t.label}: ${fmt(t.avail)} of ${fmt(t.quota)} days available org-wide`"
          >
            <div class="tk-glass">
              <!-- The liquid body — height transitions from 0 on mount -->
              <div class="tk-liquid" :style="{ height: (loaded ? t.pct : 0) + '%' }">
                <!-- Wavy surface — two offset waves translating for parallax depth -->
                <svg class="tk-surface" viewBox="0 0 120 28" preserveAspectRatio="none" aria-hidden="true">
                  <path class="tk-wave tk-wave-back"
                    d="M0 14 Q15 6 30 14 T60 14 T90 14 T120 14 V28 H0 Z" />
                  <path class="tk-wave tk-wave-front"
                    d="M0 14 Q15 22 30 14 T60 14 T90 14 T120 14 V28 H0 Z" />
                </svg>
                <!-- Rising bubbles -->
                <span class="tk-bubble b1" />
                <span class="tk-bubble b2" />
                <span class="tk-bubble b3" />
              </div>
              <!-- Glass measurement ticks -->
              <span class="tk-mark m25" /><span class="tk-mark m50" /><span class="tk-mark m75" />
              <!-- Low-reserve warning glow -->
              <span v-if="t.pct < 22" class="tk-low" aria-hidden="true" />
            </div>
            <div class="tk-foot">
              <LeaveTypeIcon :type="t.key" :size="13" ambient />
              <div class="tk-meta">
                <span class="tk-val leave-mono">{{ fmt(t.avail) }}</span>
                <span class="tk-lbl">{{ t.label }}</span>
              </div>
            </div>
          </Motion>
        </div>
      </div>
    </Motion>

    <!-- ═══════════════════════════════════════════════════════════════════
         Control rail — search · sort · type-focus
    ═══════════════════════════════════════════════════════════════════ -->
    <Motion class="rv-rail" as="div"
      :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.45, delay: 0.2 }"
    >
      <div class="rv-search">
        <Search :size="14" class="ic" />
        <input v-model.trim="query" placeholder="Find employee, code or department…" />
        <button v-if="query" class="rv-search-clear" @click="query = ''" aria-label="Clear">
          <X :size="11" />
        </button>
      </div>

      <div class="rv-sort">
        <Motion v-for="s in SORTS" :key="s.key" as="button"
          class="rv-sort-btn" :class="{ 'is-active': sortKey === s.key }"
          :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }"
          @click="sortKey = s.key"
        >
          <component :is="s.icon" :size="12" />
          {{ s.label }}
        </Motion>
      </div>

      <Motion as="button" class="leave-btn leave-btn-sm rv-grant" type="button"
        :whileHover="{ y: -2, scale: 1.02 }" :whileTap="{ scale: 0.97 }"
        @click="grantDrawer = true">
        <Gift :size="13" /> Grant per policy
      </Motion>
      <button class="leave-btn leave-btn-sm rv-refresh" :disabled="loading" @click="reload">
        <RefreshCw :size="13" :class="{ spin: loading }" /> Refresh
      </button>
    </Motion>

    <!-- Type-focus chips — clicking dims every non-matching gauge + tank -->
    <Motion v-if="tanks.length" class="rv-chips" as="div"
      :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
      :transition="{ duration: 0.4, delay: 0.26 }"
    >
      <button class="rv-chip" :class="{ 'is-active': !focusType }" @click="focusType = null">
        All types
      </button>
      <Motion v-for="t in tanks" :key="t.key" as="button"
        class="rv-chip" :class="{ 'is-active': focusType === t.key }"
        :style="{ '--chip-c': t.color }"
        :whileHover="{ y: -2 }" :whileTap="{ scale: 0.95 }"
        @click="toggleFocus(t.key)"
      >
        <span class="rv-chip-dot" />
        {{ t.label }}
      </Motion>
    </Motion>

    <!-- ═══════════════════════════════════════════════════════════════════
         01 · VAULT GRID — per-employee reserve cards
    ═══════════════════════════════════════════════════════════════════ -->
    <div v-if="loading && !rows.length" class="rv-grid">
      <div v-for="i in 4" :key="i" class="leave-skel rv-card-skel" />
    </div>

    <Motion v-else-if="!visibleEmployees.length" as="div" class="leave-empty rv-empty"
      :initial="{ opacity: 0, scale: 0.96 }" :animate="{ opacity: 1, scale: 1 }"
      :transition="{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }"
    >
      <Droplets :size="42" style="color: var(--leave-approved)" />
      <div class="rv-empty-title">{{ rows.length ? 'No matches' : 'The reserve is empty' }}</div>
      <div class="rv-empty-sub">
        {{ rows.length
          ? 'No employee matches your search or focus. Clear the filters to see everyone.'
          : 'Balances appear automatically when an employee first submits a leave or accrual runs.' }}
      </div>
    </Motion>

    <div v-else class="rv-grid">
      <Motion v-for="(emp, i) in pagedEmployees" :key="emp.id" as="article"
        class="vcard"
        :initial="{ opacity: 0, y: 18 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="{ duration: 0.45, delay: Math.min(i * 0.05, 0.4), ease: [0.16, 1, 0.3, 1] }"
        :whileHover="{ y: -4 }"
      >
        <span class="vc-aura" aria-hidden="true" />

        <header class="vc-head">
          <div class="vc-avatar">{{ initials(emp.name) }}<span class="vc-avatar-ring" /></div>
          <div class="vc-meta">
            <div class="vc-name">{{ emp.name }}</div>
            <div class="vc-sub leave-mono">{{ emp.code }}<span v-if="emp.dept"> · {{ emp.dept }}</span></div>
          </div>
          <div class="vc-total" :title="`${fmt(emp.totalAvail)} days available across all types`">
            <span class="vc-total-num leave-mono">{{ fmt(emp.totalAvail) }}</span>
            <span class="vc-total-lbl">days<br>reserve</span>
          </div>
          <button class="vc-adjust" @click="openAdjust(emp)" title="Adjust balance">
            <PencilLine :size="13" />
          </button>
        </header>

        <!-- per-type reserve gauges -->
        <div class="vc-gauges">
          <div v-for="(b, j) in emp.balances" :key="b.id"
            class="rg" :class="{ dimmed: focusType && focusType !== b.leave_type, 'is-low': gaugePct(b) < 22, 'is-empty': Number(b.available) <= 0 }"
            :style="{ '--rg-c': typeHex(b.leave_type) }"
          >
            <span class="rg-ic"><LeaveTypeIcon :type="b.leave_type" :size="13" /></span>
            <div class="rg-main">
              <div class="rg-top">
                <span class="rg-lbl">{{ typeMeta(b.leave_type).label }}</span>
                <span class="rg-val leave-mono">
                  {{ fmt(b.available) }}<span class="rg-quota">/{{ fmtQuota(b.quota) }}</span>
                </span>
              </div>
              <div class="rg-track">
                <span class="rg-fill" :style="{ width: (loaded ? gaugePct(b) : 0) + '%', transitionDelay: (0.1 + j * 0.05) + 's' }">
                  <span class="rg-fill-shine" />
                </span>
                <!-- used marker -->
                <span v-if="Number(b.used) > 0 && Number(b.quota) > 0"
                  class="rg-used" :style="{ left: usedMarker(b) + '%' }"
                  :title="`${fmt(b.used)} used`"
                />
              </div>
              <div class="rg-foot leave-mono">
                <span>used {{ fmt(b.used) }}</span>
                <span v-if="Number(b.carry_forward_in) > 0">· cf {{ fmt(b.carry_forward_in) }}</span>
                <span v-if="Number(b.adjustments) !== 0" :class="Number(b.adjustments) > 0 ? 'adj-pos' : 'adj-neg'">
                  · adj {{ Number(b.adjustments) > 0 ? '+' : '' }}{{ fmt(b.adjustments) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Motion>
    </div>

    <!-- Ultra-modern pager — only appears once the reserve outgrows one page -->
    <LeavePagination
      :page="page"
      :page-size="pageSize"
      :total-items="visibleEmployees.length"
      :page-size-options="[3, 6, 9, 12]"
      persist-on-fit
      @update:page="page = $event"
      @update:pageSize="pageSize = $event"
    />

    <LeaveBalanceAdjustDrawer
      :open="adjustDrawer.open"
      :employee="adjustDrawer.employee"
      @close="adjustDrawer.open = false"
      @saved="onAdjusted"
    />

    <LeaveBulkGrantDrawer
      :open="grantDrawer"
      :employees="byEmployee"
      @close="grantDrawer = false"
      @granted="onGranted"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  RefreshCw, PencilLine, Search, X, Droplets, Gauge, Users, TrendingDown,
  ArrowDownAZ, Waves, Flame, Gift,
} from 'lucide-vue-next'
import LeaveTypeIcon from '../components/LeaveTypeIcon.vue'
import LeaveBalanceAdjustDrawer from '../drawers/LeaveBalanceAdjustDrawer.vue'
import LeaveBulkGrantDrawer from '../drawers/LeaveBulkGrantDrawer.vue'
import LeavePagination from '../components/LeavePagination.vue'
import { fetchLeaveBalances, typeMeta, LEAVE_TYPES } from '@/composables/useLeaves'
import { useToast } from 'vue-toastification'

const toast = useToast()
const rows = ref([])
const loading = ref(false)
const loaded = ref(false)          // flips true after first paint → drives fill-in animations
const fy = ref('')
const query = ref('')
const sortKey = ref('reserve')
const focusType = ref(null)
const adjustDrawer = ref({ open: false, employee: null })
const grantDrawer = ref(false)

// Client-side pagination — kicks in once there are more than `pageSize`
// employees so the vault doesn't turn into an endless scroll. Default 3.
const page = ref(1)
const pageSize = ref(3)

// Warm, on-brand colour per leave type (the typeMeta hex is the legacy
// blue/pink palette; the leave module is warm-only — mirror Applications).
const TYPE_HEX = {
  CASUAL: '#fde047', SICK: '#e34a0a', EARNED: '#f59e0b', MATERNITY: '#fdba74',
  PATERNITY: '#b45309', BEREAVEMENT: '#854d0e', COMP_OFF: '#f97316', LWP: '#ea580c',
  STUDY: '#ca8a04', SPECIAL: '#fb923c',
}
const typeHex = (k) => TYPE_HEX[k] || '#fbbf24'
const TYPE_ORDER = LEAVE_TYPES.map(t => t.key)

const SORTS = [
  { key: 'reserve', label: 'Most reserve', icon: Waves },
  { key: 'used',    label: 'Most used',    icon: Flame },
  { key: 'low',     label: 'Lowest',       icon: TrendingDown },
  { key: 'name',    label: 'A–Z',          icon: ArrowDownAZ },
]

// ─── Fetch ─────────────────────────────────────────────────────────────
const reload = async () => {
  loading.value = true
  try {
    const data = await fetchLeaveBalances({ limit: 300 })
    rows.value = data.items || []
    fy.value = data.fiscal_year || ''
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load balances')
    rows.value = []
  } finally {
    loading.value = false
    // Defer one frame so the 0 → target fill transitions actually animate.
    requestAnimationFrame(() => requestAnimationFrame(() => { loaded.value = true }))
  }
}

const num = (v) => Number(v) || 0
const fmt = (v) => {
  const n = num(v)
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}
const fmtQuota = (v) => { const n = num(v); return n <= 0 ? '∞' : fmt(n) }

const gaugePct = (b) => {
  const q = num(b.quota)
  if (q <= 0) return num(b.available) > 0 ? 100 : 0
  return Math.max(0, Math.min(100, (num(b.available) / q) * 100))
}
const usedMarker = (b) => {
  const q = num(b.quota)
  if (q <= 0) return 0
  return Math.max(0, Math.min(100, (num(b.used) / q) * 100))
}

// ─── Group by employee (+ per-employee rollups) ─────────────────────────
const byEmployee = computed(() => {
  const m = new Map()
  for (const r of rows.value) {
    if (!m.has(r.employee_id)) {
      m.set(r.employee_id, {
        id: r.employee_id, name: r.employee_name || '—', code: r.employee_code || '',
        dept: r.department_name || '', lifecycle_state: r.lifecycle_state || null, balances: [],
        totalAvail: 0, totalUsed: 0, totalQuota: 0,
      })
    }
    const e = m.get(r.employee_id)
    e.balances.push(r)
    e.totalAvail += num(r.available)
    e.totalUsed += num(r.used)
    e.totalQuota += num(r.quota)
  }
  // Stable per-card ordering of the gauges by canonical type order.
  for (const e of m.values()) {
    e.balances.sort((a, b) => TYPE_ORDER.indexOf(a.leave_type) - TYPE_ORDER.indexOf(b.leave_type))
  }
  return Array.from(m.values())
})

const visibleEmployees = computed(() => {
  const q = query.value.trim().toLowerCase()
  let list = byEmployee.value
  if (q) {
    list = list.filter(e =>
      e.name.toLowerCase().includes(q) ||
      e.code.toLowerCase().includes(q) ||
      e.dept.toLowerCase().includes(q)
    )
  }
  const sorted = [...list]
  if (sortKey.value === 'reserve') sorted.sort((a, b) => b.totalAvail - a.totalAvail)
  else if (sortKey.value === 'used') sorted.sort((a, b) => b.totalUsed - a.totalUsed)
  else if (sortKey.value === 'low') sorted.sort((a, b) => a.totalAvail - b.totalAvail)
  else sorted.sort((a, b) => a.name.localeCompare(b.name))
  return sorted
})

// ─── Pagination slice ───────────────────────────────────────────────────
const totalPages = computed(() =>
  Math.max(1, Math.ceil(visibleEmployees.value.length / pageSize.value)),
)
const pagedEmployees = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return visibleEmployees.value.slice(start, start + pageSize.value)
})
// Any change to the filtered set or its size jumps back to a valid page.
watch([query, sortKey, focusType, pageSize], () => { page.value = 1 })
watch([() => visibleEmployees.value.length, totalPages], () => {
  if (page.value > totalPages.value) page.value = totalPages.value
})

// ─── Tank-farm aggregates (per leave type, org-wide) ────────────────────
const tanks = computed(() => {
  const m = new Map()
  for (const r of rows.value) {
    const k = r.leave_type
    if (!m.has(k)) m.set(k, { key: k, label: typeMeta(k).label, color: typeHex(k), avail: 0, quota: 0, used: 0 })
    const t = m.get(k)
    t.avail += num(r.available)
    t.quota += num(r.quota)
    t.used += num(r.used)
  }
  const out = Array.from(m.values()).map(t => ({
    ...t,
    pct: t.quota > 0 ? Math.max(4, Math.min(100, (t.avail / t.quota) * 100)) : (t.avail > 0 ? 100 : 4),
  }))
  out.sort((a, b) => TYPE_ORDER.indexOf(a.key) - TYPE_ORDER.indexOf(b.key))
  return out.slice(0, 8)
})

// ─── Hero aggregate meters (tweened) ────────────────────────────────────
const totals = computed(() => {
  let avail = 0, quota = 0, used = 0
  for (const r of rows.value) { avail += num(r.available); quota += num(r.quota); used += num(r.used) }
  const avgUtil = quota > 0 ? (used / quota) * 100 : 0
  return { avail, quota, used, avgUtil, emp: byEmployee.value.length }
})

// Tiny easing tween — eases a ref toward its source over `duration`ms.
function useTween(source, { duration = 1100 } = {}) {
  const out = ref(0)
  let raf = null
  const run = (to) => {
    if (raf) cancelAnimationFrame(raf)
    const from = out.value
    const start = performance.now()
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration)
      const e = 1 - Math.pow(1 - t, 3)   // easeOutCubic
      out.value = from + (to - from) * e
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
  }
  watch(source, (v) => run(Number(v) || 0), { immediate: true })
  onBeforeUnmount(() => { if (raf) cancelAnimationFrame(raf) })
  return out
}

const tAvail = useTween(() => totals.value.avail)
const tUsed  = useTween(() => totals.value.used)
const tUtil  = useTween(() => totals.value.avgUtil)
const tEmp   = useTween(() => totals.value.emp, { duration: 900 })

const heroMeters = computed(() => {
  const t = totals.value
  return [
    {
      key: 'reserve', label: 'TOTAL RESERVE', icon: Droplets, tone: 'gold',
      display: fmt(tAvail.value), suffix: 'd',
      pct: t.quota > 0 ? Math.min(100, (t.avail / t.quota) * 100) : 100,
    },
    {
      key: 'used', label: 'DAYS DRAWN', icon: TrendingDown, tone: 'ember',
      display: fmt(tUsed.value), suffix: 'd',
      pct: t.quota > 0 ? Math.min(100, (t.used / t.quota) * 100) : 0,
    },
    {
      key: 'util', label: 'AVG UTILISATION', icon: Gauge, tone: 'amber',
      display: tUtil.value.toFixed(1), suffix: '%',
      pct: Math.min(100, t.avgUtil),
    },
    {
      key: 'emp', label: 'EMPLOYEES', icon: Users, tone: 'gold',
      display: String(Math.round(tEmp.value)), suffix: '',
      pct: t.emp > 0 ? 100 : 0,
    },
  ]
})

const fyLabel = computed(() => {
  if (fy.value) return fy.value
  const d = new Date()
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1
  return `${y}–${String(y + 1).slice(-2)}`
})

// ─── Interactions ───────────────────────────────────────────────────────
const toggleFocus = (k) => { focusType.value = focusType.value === k ? null : k }
const initials = (name) => {
  if (!name) return '?'
  const p = String(name).trim().split(/\s+/).filter(Boolean)
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase()
}
const openAdjust = (emp) => { adjustDrawer.value = { open: true, employee: emp } }
const onAdjusted = () => { adjustDrawer.value.open = false; reload() }
const onGranted = () => { reload() }

onMounted(reload)
</script>

<style scoped>
@import '@/styles/leave-theme.css';

.vault { display: flex; flex-direction: column; gap: 20px; }

/* ════════════════════════════════════════════════════════════════════════
   HERO — The Reserve
   ──────────────────────────────────────────────────────────────────────── */
.rv-hero {
  position: relative; overflow: hidden;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
  gap: 30px;
  align-items: center;
  padding: 30px 32px 26px;
  border-radius: 24px;
  background:
    radial-gradient(60% 90% at 100% 100%, rgba(234, 88, 12, 0.16), transparent 55%),
    radial-gradient(50% 70% at 0% 0%, rgba(251, 191, 36, 0.14), transparent 55%),
    linear-gradient(180deg, #0a0604 0%, #130a05 100%);
  border: 1px solid var(--leave-border);
  isolation: isolate;
  min-height: 300px;
}
[data-theme="light"] .rv-hero {
  background:
    radial-gradient(60% 90% at 100% 100%, rgba(234, 88, 12, 0.12), transparent 55%),
    radial-gradient(50% 70% at 0% 0%, rgba(251, 191, 36, 0.20), transparent 55%),
    linear-gradient(180deg, #fffdf5, #fff5e3);
  border-color: rgba(180, 83, 9, 0.20);
}
@media (max-width: 1040px) { .rv-hero { grid-template-columns: 1fr; gap: 26px; } }

/* Top ruler — evenly spaced measurement ticks */
.rv-ruler {
  position: absolute; top: 0; left: 0; right: 0; height: 14px;
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: 0 18px; pointer-events: none; opacity: 0.6;
}
.rv-tick { width: 1px; height: 5px; background: rgba(251, 191, 36, 0.35); }
.rv-tick.major { height: 9px; background: rgba(251, 191, 36, 0.6); }
[data-theme="light"] .rv-tick { background: rgba(180, 83, 9, 0.35); }
[data-theme="light"] .rv-tick.major { background: rgba(180, 83, 9, 0.6); }

/* ─── Left copy ─── */
.rv-copy { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.rv-eye {
  display: inline-flex; align-items: center; gap: 8px;
  width: max-content; max-width: 100%;
  padding: 6px 12px; border-radius: 999px;
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid rgba(251, 191, 36, 0.28);
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.14em;
  color: var(--leave-text-secondary);
}
[data-theme="light"] .rv-eye { background: rgba(251, 191, 36, 0.16); border-color: rgba(180, 83, 9, 0.26); }
.rv-eye-led {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--leave-approved);
  box-shadow: 0 0 10px var(--leave-approved);
  animation: leave-eyebrow-pulse 1.6s ease-in-out infinite;
}
.rv-eye-sep { color: var(--leave-text-muted); opacity: 0.5; }
.rv-eye-live { color: var(--leave-brand); }
[data-theme="light"] .rv-eye-live { color: var(--w-gold-700); }

.rv-title {
  margin: 0;
  font-size: clamp(28px, 3.4vw, 42px);
  font-weight: 800; letter-spacing: -0.028em; line-height: 1.05;
  color: #fff8dc;
  text-wrap: balance;
}
[data-theme="light"] .rv-title { color: #2a1100; }
.rv-title em {
  font-style: italic;
  background: linear-gradient(135deg, #fde047 0%, #f59e0b 50%, #ea580c 100%);
  background-clip: text; -webkit-background-clip: text; color: transparent;
}
.rv-title-line2 { display: block; }

.rv-sub {
  margin: 0; max-width: 54ch;
  font-size: 13px; line-height: 1.6;
  color: var(--w-gold-100); opacity: 0.85;
}
[data-theme="light"] .rv-sub { color: #6b3d12; opacity: 1; }

/* Aggregate meters */
.rv-meters {
  display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px;
  margin-top: 6px;
}
@media (max-width: 560px) { .rv-meters { grid-template-columns: repeat(2, 1fr); } }
.rv-meter {
  display: flex; flex-direction: column; gap: 6px;
  padding: 11px 13px; border-radius: 13px;
  background: rgba(20, 13, 7, 0.6);
  border: 1px solid var(--leave-border);
  cursor: default;
  transition: border-color .24s, box-shadow .24s;
}
[data-theme="light"] .rv-meter { background: rgba(255, 248, 230, 0.82); }
.rv-meter:hover { border-color: var(--leave-brand); box-shadow: 0 8px 22px -12px rgba(251, 191, 36, 0.4); }
.rv-meter-head {
  display: flex; align-items: center; gap: 6px;
  color: var(--w-gold-200);
}
[data-theme="light"] .rv-meter-head { color: var(--w-gold-700); }
.rv-meter[data-tone="ember"] .rv-meter-head { color: var(--w-ember-300); }
[data-theme="light"] .rv-meter[data-tone="ember"] .rv-meter-head { color: var(--w-ember-600); }
.rv-meter-head span { font-size: 8px; font-weight: 800; letter-spacing: 0.12em; white-space: nowrap; }
.rv-meter-val {
  font-size: 22px; font-weight: 800; line-height: 1;
  letter-spacing: -0.02em; font-variant-numeric: tabular-nums;
  background: linear-gradient(135deg, #fde047, #fbbf24 55%, #ea580c);
  background-clip: text; -webkit-background-clip: text; color: transparent;
}
.rv-meter[data-tone="ember"] .rv-meter-val { background: linear-gradient(135deg, #ff8a4c, #e34a0a); background-clip: text; -webkit-background-clip: text; color: transparent; }
.rv-meter-suf { font-size: 11px; margin-left: 2px; -webkit-text-fill-color: var(--leave-text-muted); }
.rv-meter-bar {
  height: 4px; border-radius: 4px; overflow: hidden;
  background: rgba(251, 191, 36, 0.12);
}
.rv-meter-fill {
  display: block; height: 100%;
  background: var(--leave-grad-cta);
  border-radius: 4px;
  transition: width 1.1s cubic-bezier(0.16, 1, 0.3, 1);
}
.rv-meter[data-tone="ember"] .rv-meter-fill { background: var(--leave-grad-ember); }

/* ─── Tank farm ─── */
.rv-farm-wrap { position: relative; z-index: 1; min-width: 0; }
.rv-farm {
  display: flex; align-items: flex-end; justify-content: center;
  gap: 12px; flex-wrap: wrap;
}
.rv-farm-skel { display: flex; gap: 12px; align-items: flex-end; justify-content: center; }
.rv-tank-skel { width: 52px; height: 180px; border-radius: 16px; }
.rv-farm-empty {
  display: grid; place-items: center; min-height: 200px;
  font-size: 11px; letter-spacing: 0.16em; color: var(--leave-text-muted);
}

.rv-tank {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  cursor: pointer;
  transition: opacity .3s;
}
.rv-tank.dimmed { opacity: 0.28; }

.tk-glass {
  position: relative; overflow: hidden;
  width: 52px; height: 188px;
  border-radius: 16px 16px 13px 13px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(0, 0, 0, 0.12));
  border: 1.5px solid color-mix(in srgb, var(--tk-c) 30%, transparent);
  box-shadow:
    inset 0 2px 8px rgba(0, 0, 0, 0.35),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05),
    0 14px 30px -16px rgba(0, 0, 0, 0.7);
}
[data-theme="light"] .tk-glass {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.5), rgba(180, 83, 9, 0.05));
  box-shadow: inset 0 2px 8px rgba(124, 45, 18, 0.10), 0 14px 30px -18px rgba(124, 45, 18, 0.4);
}
/* Glass vertical sheen */
.tk-glass::before {
  content: ''; position: absolute; top: 6px; left: 7px; bottom: 6px; width: 5px;
  border-radius: 4px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.04));
  opacity: 0.5; z-index: 3; pointer-events: none;
}

.tk-liquid {
  position: absolute; left: 0; right: 0; bottom: 0;
  height: 0;
  background: linear-gradient(180deg,
    color-mix(in srgb, var(--tk-c) 78%, #fff7ed) 0%,
    var(--tk-c) 60%,
    color-mix(in srgb, var(--tk-c) 75%, #7c2d12) 100%);
  transition: height 1.4s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 0 18px color-mix(in srgb, var(--tk-c) 50%, transparent);
}

/* Wavy surface — two SVG waves translating in opposite phase */
.tk-surface {
  position: absolute; left: 0; top: -13px;
  width: 200%; height: 18px;
}
.tk-wave { fill: var(--tk-c); }
.tk-wave-back {
  opacity: 0.55;
  animation: tk-wave-x 3.4s linear infinite;
}
.tk-wave-front {
  opacity: 0.9;
  animation: tk-wave-x 2.3s linear infinite reverse;
}
@keyframes tk-wave-x {
  0%   { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}

/* Rising bubbles */
.tk-bubble {
  position: absolute; bottom: 6%;
  width: 5px; height: 5px; border-radius: 50%;
  background: rgba(255, 247, 237, 0.5);
  filter: blur(0.3px);
  animation: tk-bubble-rise 4.5s ease-in infinite;
}
.tk-bubble.b1 { left: 28%; animation-delay: 0s;   width: 4px; height: 4px; }
.tk-bubble.b2 { left: 56%; animation-delay: 1.4s; width: 6px; height: 6px; }
.tk-bubble.b3 { left: 42%; animation-delay: 2.8s; width: 3px; height: 3px; }
@keyframes tk-bubble-rise {
  0%   { transform: translateY(0) scale(0.6); opacity: 0; }
  15%  { opacity: 0.7; }
  80%  { opacity: 0.55; }
  100% { transform: translateY(-150px) scale(1); opacity: 0; }
}

/* Glass measurement marks */
.tk-mark {
  position: absolute; right: 0; width: 8px; height: 1px;
  background: rgba(255, 247, 237, 0.22); z-index: 2;
}
[data-theme="light"] .tk-mark { background: rgba(124, 45, 18, 0.2); }
.tk-mark.m25 { bottom: 25%; }
.tk-mark.m50 { bottom: 50%; width: 11px; }
.tk-mark.m75 { bottom: 75%; }

/* Low-reserve warning pulse on the glass */
.tk-low {
  position: absolute; inset: 0; border-radius: inherit; z-index: 4; pointer-events: none;
  box-shadow: inset 0 0 0 1.5px var(--w-ember-500);
  animation: leave-ember-flicker 2.2s ease-in-out infinite;
}

.tk-foot {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  text-align: center;
}
.tk-meta { display: flex; flex-direction: column; align-items: center; gap: 0; }
.tk-val {
  font-size: 14px; font-weight: 800; line-height: 1.1;
  color: var(--leave-text); font-variant-numeric: tabular-nums;
}
.tk-lbl {
  font-size: 8.5px; font-weight: 800; letter-spacing: 0.08em;
  text-transform: uppercase; color: var(--leave-text-muted);
}

/* ════════════════════════════════════════════════════════════════════════
   Control rail
   ──────────────────────────────────────────────────────────────────────── */
.rv-rail {
  display: flex; flex-wrap: wrap; gap: 12px; align-items: center;
  padding: 11px 14px; border-radius: 14px;
  background: var(--leave-surface);
  border: 1px solid var(--leave-border);
  backdrop-filter: blur(14px);
}
.rv-search {
  position: relative; display: flex; align-items: center; gap: 8px;
  padding: 0 12px; height: 38px; border-radius: 10px;
  background: rgba(251, 191, 36, 0.06);
  border: 1px solid var(--leave-border);
  flex: 1; min-width: 240px; max-width: 380px;
  transition: border-color .22s, box-shadow .22s;
}
.rv-search:focus-within { border-color: var(--leave-brand); box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.16); }
[data-theme="light"] .rv-search { background: rgba(255, 248, 225, 0.92); }
.rv-search .ic { color: var(--leave-text-muted); flex-shrink: 0; }
.rv-search input {
  flex: 1; min-width: 0; height: 100%;
  background: transparent; border: 0; outline: 0;
  font: inherit; font-size: 13px; color: var(--leave-text);
}
.rv-search input::placeholder { color: var(--leave-text-placeholder); }
.rv-search-clear {
  width: 20px; height: 20px; flex-shrink: 0; display: grid; place-items: center;
  border-radius: 50%; border: 1px solid var(--leave-border);
  background: transparent; color: var(--leave-text-muted); cursor: pointer;
  transition: color .15s, border-color .15s;
}
.rv-search-clear:hover { color: var(--leave-text); border-color: var(--leave-brand); }

.rv-sort { display: flex; gap: 5px; flex-wrap: wrap; }
.rv-sort-btn {
  display: inline-flex; align-items: center; gap: 6px;
  height: 32px; padding: 0 11px; border-radius: 999px;
  font-size: 11.5px; font-weight: 700;
  background: transparent; border: 1px solid var(--leave-border);
  color: var(--leave-text-secondary); cursor: pointer;
  transition: background .22s, color .22s, border-color .22s, box-shadow .22s;
}
.rv-sort-btn:hover { color: var(--leave-text); border-color: var(--leave-brand); }
.rv-sort-btn.is-active {
  border-color: var(--leave-brand);
  background: rgba(251, 191, 36, 0.14);
  color: var(--w-gold-100);
  box-shadow: 0 6px 18px -10px rgba(251, 191, 36, 0.55);
}
[data-theme="light"] .rv-sort-btn.is-active { color: var(--w-gold-700); }
.rv-grant {
  margin-left: auto;
  color: #2a1100; font-weight: 800;
  background: var(--leave-grad-cta); background-size: 200% 100%;
  border: 1px solid rgba(251, 146, 60, 0.6);
  box-shadow: 0 10px 24px -12px rgba(234, 88, 12, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.4);
}
.rv-grant:hover { filter: brightness(1.04); }
.rv-refresh { margin-left: 0; }

/* Type-focus chips */
.rv-chips { display: flex; flex-wrap: wrap; gap: 7px; align-items: center; }
.rv-chip {
  --chip-c: var(--leave-brand);
  display: inline-flex; align-items: center; gap: 7px;
  height: 30px; padding: 0 12px; border-radius: 999px;
  font-size: 11.5px; font-weight: 700;
  background: var(--leave-surface);
  border: 1px solid var(--leave-border);
  color: var(--leave-text-secondary); cursor: pointer;
  transition: border-color .22s, color .22s, background .22s, box-shadow .22s;
}
.rv-chip:hover { color: var(--leave-text); border-color: color-mix(in srgb, var(--chip-c) 60%, transparent); }
.rv-chip-dot {
  width: 7px; height: 7px; border-radius: 50%;
  background: var(--chip-c);
  box-shadow: 0 0 8px color-mix(in srgb, var(--chip-c) 70%, transparent);
}
.rv-chip.is-active {
  border-color: color-mix(in srgb, var(--chip-c) 60%, transparent);
  background: color-mix(in srgb, var(--chip-c) 14%, transparent);
  color: var(--leave-text);
  box-shadow: 0 6px 18px -10px color-mix(in srgb, var(--chip-c) 70%, transparent);
}

/* ════════════════════════════════════════════════════════════════════════
   Vault grid + cards
   ──────────────────────────────────────────────────────────────────────── */
.rv-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 14px;
}
@media (max-width: 460px) { .rv-grid { grid-template-columns: 1fr; } }
.rv-card-skel { height: 240px; border-radius: 20px; }

.rv-empty { flex-direction: column; }
.rv-empty-title { font-size: 14px; font-weight: 800; color: var(--leave-text); }
.rv-empty-sub { font-size: 12px; max-width: 44ch; }

.vcard {
  position: relative; overflow: hidden;
  display: flex; flex-direction: column; gap: 14px;
  padding: 16px 18px;
  border-radius: 20px;
  background:
    radial-gradient(80% 60% at 100% 0%, rgba(251, 191, 36, 0.07), transparent 55%),
    var(--leave-surface);
  border: 1px solid var(--leave-border);
  backdrop-filter: blur(14px) saturate(140%);
  transition: border-color .26s var(--leave-ease), box-shadow .26s var(--leave-ease);
}
[data-theme="light"] .vcard {
  background:
    radial-gradient(80% 60% at 100% 0%, rgba(251, 191, 36, 0.12), transparent 55%),
    rgba(255, 250, 240, 0.9);
  border-color: rgba(180, 83, 9, 0.18);
}
.vcard:hover { border-color: var(--leave-brand); box-shadow: var(--leave-shadow-lift); }
.vc-aura {
  position: absolute; inset: -30% -20% auto auto; width: 50%; height: 70%;
  background: radial-gradient(50% 50% at 50% 50%, rgba(251, 191, 36, 0.14), transparent 65%);
  filter: blur(34px); z-index: -1; opacity: 0; transition: opacity .3s; pointer-events: none;
}
.vcard:hover .vc-aura { opacity: 0.9; }

.vc-head { display: flex; align-items: center; gap: 11px; }
.vc-avatar {
  position: relative; flex-shrink: 0;
  display: inline-grid; place-items: center;
  width: 40px; height: 40px; border-radius: 13px;
  background: linear-gradient(135deg, var(--leave-approved), var(--leave-compoff));
  color: #2a1100; font-weight: 800; font-size: 13px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.4);
}
.vc-avatar-ring {
  position: absolute; inset: -3px; border-radius: 50%;
  border: 1px solid var(--leave-brand); opacity: 0.35;
  animation: leave-orb-spin 22s linear infinite;
}
.vc-meta { flex: 1; min-width: 0; }
.vc-name {
  font-size: 14px; font-weight: 800; color: var(--leave-text);
  letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.vc-sub { font-size: 10.5px; color: var(--leave-text-muted); }

.vc-total {
  flex-shrink: 0; display: flex; align-items: center; gap: 6px;
  padding: 5px 10px; border-radius: 11px;
  background: rgba(251, 191, 36, 0.10);
  border: 1px solid rgba(251, 191, 36, 0.28);
}
[data-theme="light"] .vc-total { background: rgba(251, 191, 36, 0.16); border-color: rgba(180, 83, 9, 0.26); }
.vc-total-num {
  font-size: 18px; font-weight: 800; line-height: 1;
  font-variant-numeric: tabular-nums;
  background: linear-gradient(135deg, #fde047, #fbbf24 60%, #ea580c);
  background-clip: text; -webkit-background-clip: text; color: transparent;
}
.vc-total-lbl {
  font-size: 7.5px; font-weight: 800; line-height: 1.05;
  letter-spacing: 0.08em; text-transform: uppercase; color: var(--leave-text-muted);
}

.vc-adjust {
  flex-shrink: 0; display: grid; place-items: center;
  width: 32px; height: 32px; border-radius: 10px;
  background: transparent; border: 1px solid var(--leave-border-strong);
  color: var(--leave-text-secondary); cursor: pointer;
  transition: background .22s, border-color .22s, color .22s, transform .22s;
}
.vc-adjust:hover {
  background: rgba(251, 191, 36, 0.12); border-color: var(--leave-brand);
  color: var(--leave-text); transform: translateY(-2px);
}

/* ─── Reserve gauges ─── */
.vc-gauges { display: flex; flex-direction: column; gap: 9px; }
.rg {
  --rg-c: var(--leave-brand);
  display: flex; align-items: center; gap: 10px;
  transition: opacity .3s;
}
.rg.dimmed { opacity: 0.26; }
.rg-ic { flex-shrink: 0; }
.rg-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.rg-top { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.rg-lbl {
  font-size: 11px; font-weight: 700; color: var(--leave-text-secondary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.rg-val { font-size: 12.5px; font-weight: 800; color: var(--rg-c); font-variant-numeric: tabular-nums; }
.rg.is-empty .rg-val { color: var(--leave-cancelled); }
.rg-quota { font-size: 10px; font-weight: 700; color: var(--leave-text-muted); }

.rg-track {
  position: relative;
  height: 8px; border-radius: 6px; overflow: hidden;
  background: color-mix(in srgb, var(--rg-c) 12%, rgba(20, 13, 7, 0.55));
  border: 1px solid color-mix(in srgb, var(--rg-c) 20%, transparent);
}
[data-theme="light"] .rg-track { background: color-mix(in srgb, var(--rg-c) 14%, rgba(255, 248, 230, 0.8)); }
.rg-fill {
  position: relative; display: block; height: 100%; width: 0;
  border-radius: 6px;
  background: linear-gradient(90deg,
    color-mix(in srgb, var(--rg-c) 80%, #7c2d12),
    var(--rg-c) 70%,
    color-mix(in srgb, var(--rg-c) 75%, #fff7ed));
  box-shadow: 0 0 12px color-mix(in srgb, var(--rg-c) 45%, transparent);
  transition: width 1.2s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}
.rg.is-low .rg-fill {
  background: linear-gradient(90deg, var(--w-ember-600), var(--w-ember-400));
}
/* Liquid shine sweeping across the fill — echoes the tank waves */
.rg-fill-shine {
  position: absolute; inset: 0;
  background: linear-gradient(100deg, transparent, rgba(255, 255, 255, 0.45), transparent);
  background-size: 220% 100%; background-position: -120% 0;
  animation: leave-gradient-pan 3.2s linear infinite;
  mix-blend-mode: overlay;
}
.rg-used {
  position: absolute; top: -2px; bottom: -2px; width: 2px;
  background: var(--leave-text); opacity: 0.55;
  border-radius: 2px;
  transition: left 1.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.rg-foot {
  display: flex; flex-wrap: wrap; gap: 5px;
  font-size: 9px; font-weight: 700; letter-spacing: 0.04em;
  color: var(--leave-text-muted);
}
.rg-foot .adj-pos { color: var(--leave-approved); }
.rg-foot .adj-neg { color: var(--w-ember-400); }
[data-theme="light"] .rg-foot .adj-neg { color: var(--w-ember-600); }

/* Spinning refresh icon */
.spin { animation: rv-spin 0.9s linear infinite; }
@keyframes rv-spin { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .tk-wave-back, .tk-wave-front, .tk-bubble, .vc-avatar-ring, .rg-fill-shine, .rv-eye-led, .tk-low {
    animation: none !important;
  }
}
</style>
