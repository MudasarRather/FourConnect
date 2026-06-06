<template>
  <div class="rev-stage">
    <!-- ░░░░░░░░░░ CONSOLE — foil headline + animated KPI ledger + increment pulse ░░░░░░░░░░ -->
    <Motion as="header" class="console"
      :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }">
      <span class="console-aurora" aria-hidden="true" />
      <span class="console-grid" aria-hidden="true" />

      <div class="console-top">
        <div class="title-wrap">
          <span class="eyebrow"><span class="live-dot" /> COMPENSATION&nbsp;·&nbsp;LEDGER</span>
          <h2 class="foil-head pay-foil-text">Salary Revisions</h2>
          <p class="sub">Every increment, promotion &amp; structural change — minted across the organisation.</p>
        </div>

        <!-- increment pulse sparkline -->
        <div class="pulse-card">
          <div class="pulse-head">
            <Activity :size="13" />
            <span>Increment pulse</span>
            <em>last {{ pulseValues.length }}</em>
          </div>
          <PaySparkline :values="pulseValues" :key="`spk-${pulseValues.length}-${theme}`"
            color="#fbbf24" :delay="160" />
          <div class="pulse-foot">
            <span>CTC trajectory</span>
            <span class="pulse-net">{{ inrShort(latestCtc) }}</span>
          </div>
        </div>
      </div>

      <!-- KPI ledger -->
      <div class="kpis">
        <Motion v-for="(k, i) in kpis" :key="k.key" as="div" class="kpi" :class="`k-${k.tone}`"
          @pointermove="spot" @pointerleave="unspot"
          :initial="{ opacity: 0, y: 16, scale: 0.96 }" :animate="{ opacity: 1, y: 0, scale: 1 }"
          :whileHover="{ y: -4, scale: 1.025 }"
          :transition="{ duration: 0.55, delay: 0.12 + i * 0.07, ease: [0.16, 1, 0.3, 1] }">
          <span class="spot" aria-hidden="true" />
          <span class="kpi-sheen" aria-hidden="true" />
          <div class="kpi-glyph"><component :is="k.icon" :size="15" /></div>
          <div class="kpi-body">
            <span class="kpi-label">{{ k.label }}</span>
            <div class="kpi-val">
              <PayMoneyValue v-if="k.money" :value="k.value" short :tone="k.tone === 'net' ? 'net' : ''" />
              <template v-else>
                <span v-if="k.sign && k.value > 0" class="kpi-sign">▲</span>
                <PayCountUp :value="k.value" :decimals="k.decimals || 0" />
                <span v-if="k.suffix" class="kpi-suffix">{{ k.suffix }}</span>
              </template>
            </div>
          </div>
        </Motion>
      </div>
    </Motion>

    <!-- ░░░░░░░░░░ CONTROL BAR — search · status reel · sort ░░░░░░░░░░ -->
    <Motion as="div" class="ctrl"
      :initial="{ opacity: 0, y: 10 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, delay: 0.34, ease: [0.16, 1, 0.3, 1] }">
      <div class="search" :class="{ on: searchFocused }">
        <Search :size="15" />
        <input v-model="q" placeholder="Search employee, reason, structure…"
          @focus="searchFocused = true" @blur="searchFocused = false" />
        <span class="search-glow" aria-hidden="true" />
      </div>

      <div class="ctrl-right">
        <div class="reel" role="tablist">
          <Motion class="reel-hl" as="span" aria-hidden="true"
            :animate="{ x: statusHlX, width: statusHlW }"
            :transition="{ type: 'spring', stiffness: 380, damping: 32 }" />
          <button v-for="(s, i) in statusOpts" :key="s.v" ref="statusBtns" class="reel-btn"
            :class="{ on: statusFilter === s.v }" @click="statusFilter = s.v">{{ s.label }}</button>
        </div>
        <button class="sort" @click="cycleSort" :title="sortMeta.title">
          <component :is="sortMeta.icon" :size="14" />
          <span>{{ sortMeta.label }}</span>
        </button>
      </div>
    </Motion>

    <!-- ░░░░░░░░░░ LOADING ░░░░░░░░░░ -->
    <div v-if="loading" class="ledger loading">
      <div v-for="i in 6" :key="i" class="skel-row">
        <span class="skel-node" />
        <div class="pay-skel" style="height:84px; border-radius:18px; flex:1" />
      </div>
    </div>

    <!-- ░░░░░░░░░░ EMPTY ░░░░░░░░░░ -->
    <PayEmptyState v-else-if="!filtered.length" :icon="TrendingUp"
      :title="all.length ? 'No revisions match your filters' : 'No revisions yet'"
      :sub="all.length ? 'Try clearing the search or the status filter.' : 'Compensation changes across the organisation will appear here as they are minted.'" />

    <!-- ░░░░░░░░░░ LEDGER — minted revision receipts on a gold-pour spine ░░░░░░░░░░ -->
    <ul v-else class="ledger" :key="`pg-${page}`">
      <span class="spine" aria-hidden="true"><span class="spine-flow" /></span>

      <Motion v-for="(r, i) in pageItems" :key="r.id" as="li" class="row"
        :initial="{ opacity: 0, x: -22, scale: 0.98 }" :animate="{ opacity: 1, x: 0, scale: 1 }"
        :whileHover="{ y: -4 }"
        :transition="{ type: 'spring', stiffness: 240, damping: 26, mass: 0.85, delay: Math.min(i * 0.06, 0.5) }">

        <!-- spine node -->
        <span class="node" :class="statusClass(r.status)">
          <span class="node-halo" aria-hidden="true" />
        </span>

        <article class="card" :class="{ open: isOpen(r.id) }" @click="toggle(r.id)"
          @pointermove="spot" @pointerleave="unspot">
          <span class="spot" aria-hidden="true" />
          <span class="foil" aria-hidden="true" />
          <span v-if="r.status === 'ACTIVE'" class="seal">ACTIVE</span>

          <!-- HEAD -->
          <div class="head">
            <div class="av-wrap">
              <span class="av-ring" aria-hidden="true" />
              <span class="av">{{ initials(r.employee_name) }}</span>
            </div>
            <div class="who">
              <div class="name">{{ r.employee_name || '—' }}</div>
              <div class="meta-line">
                <span class="eff"><Calendar :size="11" /> eff. {{ fmtDate(r.effective_from) }}</span>
                <span v-if="r.structure_name" class="chip-soft"><Layers :size="10" /> {{ r.structure_name }}</span>
                <span class="regime" :class="isNew(r) ? 'r-new' : 'r-old'">{{ isNew(r) ? 'NEW' : 'OLD' }}</span>
              </div>
            </div>
          </div>

          <!-- MONEY -->
          <div class="money">
            <div class="ctc">
              <PayMoneyValue :value="r.annual_ctc" tone="net" :animate="false" />
              <span class="per">/yr</span>
            </div>
            <div class="delta-line">
              <span v-if="r.isNew" class="delta new"><Sparkles :size="11" /> new structure</span>
              <span v-else class="morph">
                <span class="from">{{ inrShort(r.prevCtc) }}</span>
                <span class="arrow" :class="r.dir"><ArrowRight :size="12" /></span>
                <span class="to">{{ inrShort(r.annual_ctc) }}</span>
                <span class="delta" :class="r.dir">
                  <component :is="r.dir === 'up' ? TrendingUp : TrendingDown" :size="11" />
                  {{ r.deltaPct > 0 ? '+' : '' }}{{ r.deltaPct.toFixed(1) }}%
                </span>
              </span>
            </div>
          </div>

          <!-- RIGHT -->
          <div class="right">
            <PayStatusChip :status="r.status" :pulse="r.status === 'ACTIVE'" />
            <button class="exp" :class="{ open: isOpen(r.id) }" @click.stop="toggle(r.id)"
              :aria-label="isOpen(r.id) ? 'Collapse' : 'Expand'">
              <ChevronDown :size="16" />
            </button>
          </div>

          <!-- EXPANDABLE DETAIL -->
          <div class="detail" :class="{ show: isOpen(r.id) }">
            <div class="detail-inner">
              <div class="d-grid">
                <div class="d-cell"><span>Monthly CTC</span><b>{{ inr(r.monthly_ctc) }}</b></div>
                <div class="d-cell"><span>Monthly gross</span><b>{{ r.monthly_gross ? inr(r.monthly_gross) : '—' }}</b></div>
                <div class="d-cell"><span>Basic</span><b>{{ r.basic_amount ? inr(r.basic_amount) : '—' }}</b></div>
                <div class="d-cell"><span>Tax regime</span><b>{{ (r.tax_regime || 'NEW').toUpperCase() }}</b></div>
                <div class="d-cell"><span>Effective from</span><b>{{ fmtDate(r.effective_from) }}</b></div>
                <div class="d-cell"><span>Effective to</span><b>{{ r.effective_to ? fmtDate(r.effective_to) : 'Open' }}</b></div>
              </div>
              <div v-if="r.revision_reason || r.revision_ref" class="d-reason">
                <FileText :size="12" />
                <span>{{ r.revision_reason || 'No reason recorded' }}</span>
                <em v-if="r.revision_ref">· ref {{ r.revision_ref }}</em>
              </div>
            </div>
          </div>
        </article>
      </Motion>
    </ul>

    <!-- ░░░░░░░░░░ ULTRA-MODERN PAGINATION ░░░░░░░░░░ -->
    <Motion v-if="!loading && filtered.length" as="nav" class="pager"
      :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }">
      <div class="pg-left">
        <span class="pg-led" />
        <span class="pg-range">SHOWING <strong>{{ rangeLabel }}</strong></span>
        <span class="pg-total">· {{ filtered.length }} revision{{ filtered.length === 1 ? '' : 's' }}</span>
        <div class="pg-progress"><span class="pg-progress-fill" :style="{ transform: `scaleX(${pageProgress})` }" /></div>
      </div>

      <div class="pg-reel">
        <Motion as="button" class="pg-arrow" :disabled="page <= 1" @click="go(page - 1)"
          :whileTap="{ scale: 0.86 }" :whileHover="page > 1 ? { x: -2 } : {}">
          <ChevronLeft :size="16" />
        </Motion>

        <div class="pg-tiles" ref="tilesEl">
          <Motion class="pg-tile-hl" as="span" aria-hidden="true"
            :animate="{ x: tileHlX }" :transition="{ type: 'spring', stiffness: 420, damping: 30 }" />
          <button v-for="p in windowPages" :key="p" class="pg-tile" :class="{ on: p === page }"
            @click="go(p)">{{ p }}</button>
        </div>

        <Motion as="button" class="pg-arrow" :disabled="page >= totalPages" @click="go(page + 1)"
          :whileTap="{ scale: 0.86 }" :whileHover="page < totalPages ? { x: 2 } : {}">
          <ChevronRight :size="16" />
        </Motion>
      </div>

      <div class="pg-size">
        <span>per page</span>
        <button v-for="n in sizes" :key="n" class="pg-sz" :class="{ on: n === pageSize }"
          @click="setSize(n)">{{ n }}</button>
      </div>
    </Motion>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { Motion } from 'motion-v'
import {
  TrendingUp, TrendingDown, Search, Calendar, Layers, Sparkles, ArrowRight,
  ChevronDown, ChevronLeft, ChevronRight, FileText, Activity,
  Users, BadgeCheck, Flame, Clock, ArrowDownUp, Percent,
} from 'lucide-vue-next'
import { useToast } from 'vue-toastification'
import PayEmptyState from '../components/PayEmptyState.vue'
import PayMoneyValue from '../components/PayMoneyValue.vue'
import PayCountUp from '../components/PayCountUp.vue'
import PaySparkline from '../components/PaySparkline.vue'
import PayStatusChip from '../components/PayStatusChip.vue'
import { inr, inrShort } from '@/composables/usePayroll'
import { fetchRevisions } from '@/composables/usePayrollExtra'

const toast = useToast()

/* ─── data ─── */
const all = ref([])           // full enriched dataset (chronological deltas computed)
const loading = ref(false)

/* ─── theme observer (re-key sparkline on toggle) ─── */
const theme = ref(document.documentElement.getAttribute('data-theme') || 'dark')
let themeObs = null

/* ─── view state ─── */
const q = ref('')
const searchFocused = ref(false)
const statusFilter = ref('all')
const sortMode = ref('recent')   // 'recent' | 'ctc' | 'hike'
const open = ref(new Set())
const page = ref(1)
const pageSize = ref(10)
const sizes = [10, 25, 50]

/* ─── status reel ─── */
const statusOpts = [
  { v: 'all', label: 'All' },
  { v: 'ACTIVE', label: 'Active' },
  { v: 'DRAFT', label: 'Draft' },
  { v: 'SUPERSEDED', label: 'Past' },
  { v: 'CANCELLED', label: 'Cancelled' },
]
const statusBtns = ref([])
const statusHlX = ref(0)
const statusHlW = ref(0)
const measureReel = async () => {
  await nextTick()
  const idx = statusOpts.findIndex(s => s.v === statusFilter.value)
  const el = statusBtns.value?.[idx]
  if (el) { statusHlX.value = el.offsetLeft; statusHlW.value = el.offsetWidth }
}

/* ─── sort meta ─── */
const sortMeta = computed(() => ({
  recent: { label: 'Newest', icon: Clock, title: 'Sorted by most recent' },
  ctc:    { label: 'CTC', icon: ArrowDownUp, title: 'Sorted by annual CTC (high → low)' },
  hike:   { label: 'Hike %', icon: Percent, title: 'Sorted by increment (high → low)' },
}[sortMode.value]))
const cycleSort = () => {
  sortMode.value = sortMode.value === 'recent' ? 'ctc' : sortMode.value === 'ctc' ? 'hike' : 'recent'
}

/* ─── helpers ─── */
const initials = (n) => (n || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
const isNew = (r) => String(r.tax_regime || 'NEW').toUpperCase() !== 'OLD'
const statusClass = (s) => ({ ACTIVE: 'ok', DRAFT: 'draft', SUPERSEDED: 'mut', CANCELLED: 'mut' }[s] || 'mut')
const fmtDate = (d) => {
  if (!d) return '—'
  const dt = new Date(d)
  if (isNaN(dt)) return d
  return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}
/* pointer-tracking spotlight glow (replaces the 3D tilt) */
const spot = (e) => {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${e.clientX - r.left}px`)
  el.style.setProperty('--my', `${e.clientY - r.top}px`)
  el.style.setProperty('--spot', '1')
}
const unspot = (e) => { e.currentTarget.style.setProperty('--spot', '0') }

const isOpen = (id) => open.value.has(id)
const toggle = (id) => {
  const s = new Set(open.value)
  s.has(id) ? s.delete(id) : s.add(id)
  open.value = s
}

/* ─── derive per-employee chronological deltas ─── */
const enrich = (rows) => {
  // group by employee, order ascending by effective_from then created_at
  const byEmp = new Map()
  for (const r of rows) {
    const k = r.employee_id || r.id
    if (!byEmp.has(k)) byEmp.set(k, [])
    byEmp.get(k).push(r)
  }
  const prevMap = new Map()  // revision id -> prev annual_ctc
  for (const list of byEmp.values()) {
    const sorted = [...list].sort((a, b) => {
      const da = new Date(a.effective_from || a.created_at || 0)
      const db = new Date(b.effective_from || b.created_at || 0)
      if (da - db !== 0) return da - db
      return new Date(a.created_at || 0) - new Date(b.created_at || 0)
    })
    for (let i = 0; i < sorted.length; i++) {
      prevMap.set(sorted[i].id, i > 0 ? Number(sorted[i - 1].annual_ctc || 0) : null)
    }
  }
  return rows.map(r => {
    const cur = Number(r.annual_ctc || 0)
    const prev = prevMap.get(r.id)
    const hasPrev = prev != null && prev > 0
    const deltaPct = hasPrev ? ((cur - prev) / prev) * 100 : 0
    return {
      ...r,
      isNew: !hasPrev,
      prevCtc: prev || 0,
      deltaPct,
      dir: deltaPct >= 0 ? 'up' : 'down',
    }
  })
}

/* ─── KPIs ─── */
const kpis = computed(() => {
  const list = all.value
  const emps = new Set(list.map(r => r.employee_id)).size
  const active = list.filter(r => r.status === 'ACTIVE').length
  const hikes = list.filter(r => !r.isNew && r.deltaPct > 0).map(r => r.deltaPct)
  const avg = hikes.length ? hikes.reduce((s, v) => s + v, 0) / hikes.length : 0
  const top = hikes.length ? Math.max(...hikes) : 0
  return [
    { key: 'total', label: 'Total revisions', icon: Layers, value: list.length, tone: 'gold' },
    { key: 'emps', label: 'Employees revised', icon: Users, value: emps, tone: 'gold' },
    { key: 'active', label: 'Active raises', icon: BadgeCheck, value: active, tone: 'net' },
    { key: 'avg', label: 'Avg uplift', icon: TrendingUp, value: avg, suffix: '%', decimals: 1, sign: true, tone: 'net' },
    { key: 'top', label: 'Largest hike', icon: Flame, value: top, suffix: '%', decimals: 1, sign: true, tone: 'ember' },
  ]
})

/* ─── increment pulse (chronological CTC trajectory) ─── */
const pulseValues = computed(() => {
  const chrono = [...all.value].sort((a, b) =>
    new Date(a.effective_from || a.created_at || 0) - new Date(b.effective_from || b.created_at || 0))
  return chrono.slice(-22).map(r => Number(r.annual_ctc || 0))
})
const latestCtc = computed(() => pulseValues.value.length ? pulseValues.value[pulseValues.value.length - 1] : 0)

/* ─── filter + sort + paginate ─── */
const filtered = computed(() => {
  let list = all.value
  if (statusFilter.value !== 'all') list = list.filter(r => r.status === statusFilter.value)
  const term = q.value.trim().toLowerCase()
  if (term) {
    list = list.filter(r =>
      (r.employee_name || '').toLowerCase().includes(term) ||
      (r.revision_reason || '').toLowerCase().includes(term) ||
      (r.structure_name || '').toLowerCase().includes(term))
  }
  if (sortMode.value === 'ctc') {
    list = [...list].sort((a, b) => Number(b.annual_ctc || 0) - Number(a.annual_ctc || 0))
  } else if (sortMode.value === 'hike') {
    list = [...list].sort((a, b) => (b.isNew ? -1e9 : b.deltaPct) - (a.isNew ? -1e9 : a.deltaPct))
  }
  // 'recent' keeps the server's created_at desc order
  return list
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const pageItems = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})
const rangeLabel = computed(() => {
  const t = filtered.value.length
  if (!t) return '0'
  const a = (page.value - 1) * pageSize.value + 1
  const b = Math.min(page.value * pageSize.value, t)
  return `${a}–${b}`
})
const pageProgress = computed(() => totalPages.value ? page.value / totalPages.value : 0)

const windowStart = computed(() => {
  const tp = totalPages.value
  return Math.max(1, Math.min(page.value - 2, tp - 4))
})
const windowPages = computed(() => {
  const tp = totalPages.value, start = windowStart.value
  const end = Math.min(tp, start + 4)
  const out = []
  for (let i = start; i <= end; i++) out.push(i)
  return out
})
const TILE = 38, GAP = 6
const tileHlX = computed(() => (page.value - windowStart.value) * (TILE + GAP))

const go = (p) => {
  if (p < 1 || p > totalPages.value || p === page.value) return
  page.value = p
  open.value = new Set()
}
const setSize = (n) => { pageSize.value = n; page.value = 1 }

/* reset to page 1 whenever the result set changes shape */
watch([q, statusFilter, sortMode], () => { page.value = 1; open.value = new Set() })
watch(statusFilter, measureReel)

/* ─── load ─── */
const reload = async () => {
  loading.value = true
  try {
    const res = await fetchRevisions(300)
    all.value = enrich(res.items || [])
  } catch { toast.error('Failed to load revisions') }
  finally { loading.value = false; measureReel() }
}

onMounted(() => {
  reload()
  measureReel()
  themeObs = new MutationObserver(() => {
    theme.value = document.documentElement.getAttribute('data-theme') || 'dark'
  })
  themeObs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
})
onBeforeUnmount(() => themeObs?.disconnect())
</script>

<style scoped>
.rev-stage { display: flex; flex-direction: column; gap: 18px; padding-top: 8px; }

/* ░░░░░░░░░░░░░░░░ CONSOLE ░░░░░░░░░░░░░░░░ */
.console {
  position: relative; overflow: hidden; isolation: isolate;
  border-radius: 22px; padding: 22px 24px 20px;
  background: linear-gradient(155deg, var(--pay-surface), var(--pay-surface-2));
  border: 1px solid var(--pay-border-soft);
  box-shadow: 0 1px 0 rgba(255,255,255,0.04) inset, 0 18px 50px -34px rgba(0,0,0,0.8);
}
.console::before {
  content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1px;
  background: linear-gradient(140deg, rgba(251,191,36,0.5), transparent 36%, transparent 64%, rgba(184,134,11,0.34));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none; opacity: 0.7;
}
.console-aurora {
  position: absolute; top: -50%; right: -10%; width: 60%; height: 200%; z-index: -1; pointer-events: none;
  background: radial-gradient(closest-side, rgba(251,191,36,0.16), transparent 70%);
  animation: pay-aurora-drift 11s ease-in-out infinite;
}
.console-grid {
  position: absolute; inset: 0; z-index: -1; pointer-events: none; opacity: 0.4;
  background-image: linear-gradient(var(--pay-border-soft) 1px, transparent 1px),
    linear-gradient(90deg, var(--pay-border-soft) 1px, transparent 1px);
  background-size: 30px 30px;
  -webkit-mask: radial-gradient(120% 90% at 0% 0%, #000, transparent 70%);
  mask: radial-gradient(120% 90% at 0% 0%, #000, transparent 70%);
}

.console-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 22px; flex-wrap: wrap; }
.title-wrap { min-width: 0; }
.eyebrow {
  display: inline-flex; align-items: center; gap: 7px; font-size: 10px; font-weight: 800;
  letter-spacing: 0.14em; color: var(--pay-treasury); margin-bottom: 7px;
}
.live-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--pay-net);
  box-shadow: 0 0 0 0 var(--pay-net); animation: pay-node-halo 2s ease-in-out infinite; }
.foil-head { margin: 0; font-size: 30px; font-weight: 850; letter-spacing: -0.02em; line-height: 1.04; }
.sub { margin: 8px 0 0; font-size: 12.5px; color: var(--pay-text-2); max-width: 46ch; line-height: 1.5; }

/* increment pulse */
.pulse-card {
  flex: none; width: 230px; max-width: 100%; padding: 13px 15px; border-radius: 16px;
  background: var(--pay-surface); border: 1px solid var(--pay-border-soft);
  box-shadow: inset 0 0 30px rgba(251,191,36,0.05);
}
.pulse-head { display: flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.05em; color: var(--pay-text-muted); margin-bottom: 9px; }
.pulse-head svg { color: var(--pay-treasury); }
.pulse-head em { margin-left: auto; font-style: normal; font-size: 9.5px; opacity: 0.7; letter-spacing: 0; text-transform: none; }
.pulse-foot { display: flex; align-items: baseline; justify-content: space-between; margin-top: 8px;
  font-size: 10.5px; color: var(--pay-text-muted); }
.pulse-net { font-family: var(--pay-mono); font-weight: 800; font-size: 14px; color: var(--pay-net); }

/* KPI ledger */
.kpis { display: grid; grid-template-columns: repeat(5, 1fr); gap: 11px; margin-top: 20px; }
.kpi {
  position: relative; overflow: hidden; isolation: isolate;
  display: flex; align-items: center; gap: 11px; padding: 13px 14px; border-radius: 15px;
  background: var(--pay-surface); border: 1px solid var(--pay-border-soft);
  box-shadow: 0 1px 0 rgba(255,255,255,0.03) inset; cursor: default;
  transition: border-color 0.35s var(--pay-ease), box-shadow 0.35s var(--pay-ease);
}
.kpi:hover { border-color: var(--pay-border); box-shadow: 0 1px 0 rgba(255,255,255,0.05) inset, 0 18px 40px -24px rgba(234,88,12,0.4); }

/* cursor-following spotlight — shared by KPI tiles + receipt cards */
.spot {
  position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: -1;
  opacity: var(--spot, 0); transition: opacity 0.4s var(--pay-ease);
  background: radial-gradient(220px circle at var(--mx, 50%) var(--my, 50%),
    rgba(251,191,36,0.18), rgba(245,158,11,0.06) 40%, transparent 65%);
}
.kpi-sheen {
  position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 2;
  background: linear-gradient(105deg, transparent 32%, rgba(253,230,138,0.2) 48%, transparent 64%);
  transform: translateX(-130%); transition: transform 0.85s var(--pay-ease);
}
.kpi:hover .kpi-sheen { transform: translateX(130%); }
.kpi-glyph { width: 34px; height: 34px; flex: none; border-radius: 10px; display: grid; place-items: center;
  color: var(--pay-treasury); background: rgba(251,191,36,0.12); border: 1px solid var(--pay-border-soft); }
.kpi.k-net .kpi-glyph { color: var(--pay-net); background: var(--pay-net-soft); }
.kpi.k-ember .kpi-glyph { color: var(--pay-ember); background: rgba(234,88,12,0.13); }
.kpi-body { min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.kpi-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: var(--pay-text-muted); white-space: nowrap; }
.kpi-val { font-family: var(--pay-mono); font-variant-numeric: tabular-nums; font-weight: 850; font-size: 19px;
  color: var(--pay-text); line-height: 1.05; display: flex; align-items: baseline; gap: 2px; }
.kpi.k-net .kpi-val { color: var(--pay-net); }
.kpi.k-ember .kpi-val { color: var(--pay-ember); }
.kpi-suffix { font-size: 12px; opacity: 0.7; }
.kpi-sign { font-size: 11px; margin-right: 1px; }

/* ░░░░░░░░░░░░░░░░ CONTROL BAR ░░░░░░░░░░░░░░░░ */
.ctrl { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; }
.search {
  position: relative; display: flex; align-items: center; gap: 9px; padding: 9px 14px; border-radius: 12px;
  background: var(--pay-surface); border: 1px solid var(--pay-border-soft); color: var(--pay-text-muted);
  transition: border-color 0.3s var(--pay-ease), box-shadow 0.3s var(--pay-ease);
  min-width: 240px; flex: 1; max-width: 380px;
}
.search.on { border-color: var(--pay-amber); box-shadow: 0 0 0 4px rgba(245,158,11,0.12); }
.search input { background: none; border: none; outline: none; color: var(--pay-text); font-size: 13px; width: 100%; }
.search-glow { position: absolute; inset: -1px; border-radius: inherit; pointer-events: none; opacity: 0;
  background: radial-gradient(120px 60px at 14px 50%, rgba(245,158,11,0.16), transparent 70%);
  transition: opacity 0.3s var(--pay-ease); }
.search.on .search-glow { opacity: 1; }

.ctrl-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.reel { position: relative; display: inline-flex; padding: 3px; border-radius: 12px;
  background: var(--pay-surface); border: 1px solid var(--pay-border-soft); }
.reel-hl { position: absolute; top: 3px; bottom: 3px; left: 0; border-radius: 9px;
  background: var(--pay-grad-cta); box-shadow: 0 4px 14px -6px rgba(234,88,12,0.55); z-index: 0; }
.reel-btn { position: relative; z-index: 1; padding: 6px 13px; border: none; background: transparent; cursor: pointer;
  font-size: 12px; font-weight: 600; color: var(--pay-text-muted); transition: color 0.25s var(--pay-ease); white-space: nowrap; }
.reel-btn.on { color: #1a1206; }
.sort { display: inline-flex; align-items: center; gap: 6px; padding: 8px 13px; border-radius: 11px;
  background: var(--pay-surface); border: 1px solid var(--pay-border-soft); color: var(--pay-text-2);
  cursor: pointer; font-size: 12px; font-weight: 600; transition: border-color 0.25s, color 0.25s; }
.sort:hover { border-color: var(--pay-amber); color: var(--pay-text); }

/* ░░░░░░░░░░░░░░░░ LEDGER ░░░░░░░░░░░░░░░░ */
.ledger { list-style: none; margin: 0; padding: 0 0 0 36px; position: relative;
  display: flex; flex-direction: column; gap: 12px; }
.ledger.loading { gap: 14px; }
.skel-row { display: flex; align-items: center; gap: 14px; }
.skel-node { width: 16px; height: 16px; border-radius: 50%; flex: none; margin-left: -28px;
  background: var(--pay-border); }

/* gold-pour spine */
.spine { position: absolute; left: 13px; top: 10px; bottom: 10px; width: 2px; border-radius: 2px;
  background: var(--pay-grad-rail); opacity: 0.35; overflow: hidden; }
.spine-flow { position: absolute; left: -1px; right: -1px; top: 0; height: 40%;
  background: linear-gradient(180deg, transparent, var(--pay-mint-bright), transparent);
  animation: pay-edge-scan 3.4s var(--pay-ease) infinite; }

.row { position: relative; }
.node { position: absolute; left: -30px; top: 28px; width: 16px; height: 16px; border-radius: 50%;
  background: var(--pay-surface-2); border: 2px solid var(--pay-text-muted); z-index: 2; }
.node.ok { border-color: var(--pay-net); background: var(--pay-net); }
.node.draft { border-color: var(--pay-st-draft); }
.node-halo { position: absolute; inset: -3px; border-radius: 50%; }
.node.ok .node-halo { animation: pay-node-halo 2.2s ease-in-out infinite; }

/* ── minted revision receipt card ── */
.card {
  position: relative; overflow: hidden; isolation: isolate; cursor: pointer;
  display: grid; grid-template-columns: 1fr auto auto; grid-template-areas: "head money right";
  align-items: center; gap: 16px;
  padding: 15px 18px; border-radius: 18px;
  background: linear-gradient(165deg, var(--pay-surface), var(--pay-surface-2));
  border: 1px solid var(--pay-border-soft);
  box-shadow: 0 1px 0 rgba(255,255,255,0.03) inset, 0 12px 30px -24px rgba(0,0,0,0.7);
  transition: border-color 0.35s var(--pay-ease), box-shadow 0.35s var(--pay-ease);
}
.card:hover { border-color: var(--pay-border); box-shadow: 0 1px 0 rgba(255,255,255,0.05) inset, 0 20px 46px -26px rgba(234,88,12,0.42); }
.foil { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 3;
  background: linear-gradient(110deg, transparent 33%, rgba(253,230,138,0.16) 47%, rgba(255,255,255,0.08) 50%, rgba(253,230,138,0.14) 53%, transparent 67%);
  transform: translateX(-130%); transition: transform 1s var(--pay-ease); }
.card:hover .foil { transform: translateX(130%); }
.seal { position: absolute; top: 9px; right: 14px; z-index: 4; font-family: var(--pay-mono); font-size: 9px;
  font-weight: 800; letter-spacing: 0.12em; color: var(--pay-net); padding: 3px 8px; border-radius: 6px;
  border: 1px dashed color-mix(in srgb, var(--pay-net) 55%, transparent); background: var(--pay-net-soft);
  transform: rotate(-9deg); animation: pay-seal-press 0.6s var(--pay-spring) both; }

/* head */
.head { grid-area: head; display: flex; align-items: center; gap: 13px; min-width: 0; }
.av-wrap { position: relative; width: 44px; height: 44px; flex: none; display: grid; place-items: center; }
.av-ring { position: absolute; inset: 0; border-radius: 13px; padding: 2px;
  background: conic-gradient(from 0deg, var(--pay-treasury), var(--pay-mint), var(--pay-amber), var(--pay-ember), var(--pay-treasury));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude; opacity: 0.85; transition: transform 0.6s var(--pay-ease); }
.card:hover .av-ring { transform: rotate(120deg); opacity: 1; }
.av { position: relative; width: 36px; height: 36px; border-radius: 10px; display: grid; place-items: center;
  font-family: var(--pay-mono); font-size: 12.5px; font-weight: 800; z-index: 1;
  background: rgba(251,191,36,0.14); color: var(--pay-treasury); }
.who { min-width: 0; }
.name { color: var(--pay-text); font-weight: 700; font-size: 14px; line-height: 1.2;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.meta-line { display: flex; align-items: center; gap: 8px; margin-top: 5px; flex-wrap: wrap; }
.eff { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--pay-text-muted); }
.chip-soft { display: inline-flex; align-items: center; gap: 4px; font-size: 10.5px; color: var(--pay-text-2);
  padding: 2px 7px; border-radius: 6px; background: rgba(251,191,36,0.08); border: 1px solid var(--pay-border-soft); }
.regime { font-family: var(--pay-mono); font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 5px; letter-spacing: 0.04em; }
.r-new { color: var(--pay-treasury); background: rgba(251,191,36,0.12); }
.r-old { color: var(--pay-statutory); background: var(--pay-statutory-soft); }

/* money */
.money { grid-area: money; display: flex; flex-direction: column; align-items: flex-end; gap: 5px; }
.ctc { display: flex; align-items: baseline; gap: 5px; }
.ctc :deep(.pay-money) { font-size: 21px; letter-spacing: -0.01em; }
.per { font-family: var(--pay-mono); font-size: 11px; color: var(--pay-text-muted); }
.delta-line { font-size: 11px; }
.morph { display: inline-flex; align-items: center; gap: 6px; font-family: var(--pay-mono); }
.from { color: var(--pay-text-muted); text-decoration: line-through; opacity: 0.7; }
.to { color: var(--pay-text-2); }
.arrow { display: inline-flex; }
.arrow.up { color: var(--pay-net); }
.arrow.down { color: var(--pay-deduction); }
.delta { display: inline-flex; align-items: center; gap: 3px; font-weight: 800; padding: 1px 6px; border-radius: 6px; font-family: var(--pay-mono); }
.delta.up { color: var(--pay-net); background: var(--pay-net-soft); }
.delta.down { color: var(--pay-deduction); background: var(--pay-deduction-soft); }
.delta.new { color: var(--pay-treasury); background: rgba(251,191,36,0.12); }

/* right */
.right { grid-area: right; display: flex; align-items: center; gap: 10px; }
.exp { width: 30px; height: 30px; flex: none; display: grid; place-items: center; border-radius: 9px;
  border: 1px solid var(--pay-border-soft); background: var(--pay-surface-2); color: var(--pay-text-2);
  cursor: pointer; transition: transform 0.35s var(--pay-spring), color 0.25s, border-color 0.25s; }
.exp:hover { color: var(--pay-text); border-color: var(--pay-border); }
.exp.open { transform: rotate(180deg); color: var(--pay-treasury); border-color: var(--pay-border); }

/* expandable detail */
.detail { grid-area: 2 / 1 / 3 / -1; display: grid; grid-template-rows: 0fr;
  transition: grid-template-rows 0.45s var(--pay-ease); }
.detail.show { grid-template-rows: 1fr; }
.detail-inner { overflow: hidden; min-height: 0; }
.detail.show .detail-inner { padding-top: 14px; }
.d-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
  padding-top: 14px; border-top: 1px dashed var(--pay-border-soft); }
.d-cell { display: flex; flex-direction: column; gap: 3px; padding: 9px 11px; border-radius: 11px;
  background: var(--pay-surface); border: 1px solid var(--pay-border-soft); }
.d-cell span { font-size: 9.5px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--pay-text-muted); }
.d-cell b { font-family: var(--pay-mono); font-size: 13px; font-weight: 700; color: var(--pay-text); }
.d-reason { display: flex; align-items: center; gap: 7px; margin-top: 11px; padding: 9px 12px; border-radius: 10px;
  background: rgba(251,191,36,0.06); border: 1px solid var(--pay-border-soft); font-size: 12px; color: var(--pay-text-2); }
.d-reason svg { color: var(--pay-treasury); flex: none; }
.d-reason em { font-style: normal; color: var(--pay-text-muted); font-family: var(--pay-mono); font-size: 11px; }

/* ░░░░░░░░░░░░░░░░ PAGINATION ░░░░░░░░░░░░░░░░ */
.pager { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;
  margin-top: 6px; padding: 13px 18px; border-radius: 16px;
  background: linear-gradient(150deg, var(--pay-surface), var(--pay-surface-2));
  border: 1px solid var(--pay-border-soft); box-shadow: 0 1px 0 rgba(255,255,255,0.03) inset; }
.pg-left { display: flex; align-items: center; gap: 9px; font-family: var(--pay-mono); font-size: 11px; color: var(--pay-text-muted); }
.pg-led { width: 7px; height: 7px; border-radius: 50%; background: var(--pay-net); box-shadow: 0 0 8px var(--pay-net);
  animation: pay-glow-breathe 2s ease-in-out infinite; }
.pg-range strong { color: var(--pay-text); }
.pg-total { opacity: 0.8; }
.pg-progress { width: 70px; height: 4px; border-radius: 99px; overflow: hidden; margin-left: 4px;
  background: var(--pay-border-soft); }
.pg-progress-fill { display: block; height: 100%; width: 100%; transform-origin: left center; border-radius: 99px;
  background: var(--pay-grad-cta); transition: transform 0.5s var(--pay-ease); box-shadow: 0 0 10px -2px rgba(245,158,11,0.6); }

.pg-reel { display: inline-flex; align-items: center; gap: 8px; }
.pg-arrow { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 10px;
  border: 1px solid var(--pay-border-soft); background: var(--pay-surface-2); color: var(--pay-text-2); cursor: pointer;
  transition: border-color 0.2s, color 0.2s; }
.pg-arrow:hover:not(:disabled) { border-color: var(--pay-border); color: var(--pay-text); }
.pg-arrow:disabled { opacity: 0.35; cursor: not-allowed; }
.pg-tiles { position: relative; display: inline-flex; gap: 6px; padding: 3px; border-radius: 12px;
  background: var(--pay-surface); border: 1px solid var(--pay-border-soft); }
.pg-tile-hl { position: absolute; top: 3px; left: 3px; width: 38px; height: 34px; border-radius: 9px;
  background: var(--pay-grad-cta); box-shadow: 0 6px 18px -6px rgba(234,88,12,0.6); z-index: 0; }
.pg-tile { position: relative; z-index: 1; width: 38px; height: 34px; border: none; background: transparent;
  border-radius: 9px; cursor: pointer; font-family: var(--pay-mono); font-size: 13px; font-weight: 700;
  color: var(--pay-text-2); transition: color 0.25s var(--pay-ease); }
.pg-tile:hover { color: var(--pay-text); }
.pg-tile.on { color: #1a1206; }
.pg-size { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--pay-text-muted); }
.pg-sz { padding: 5px 10px; border-radius: 9px; border: 1px solid var(--pay-border-soft);
  background: var(--pay-surface-2); color: var(--pay-text-2); cursor: pointer; font-family: var(--pay-mono);
  font-size: 11px; transition: 0.2s; }
.pg-sz:hover { border-color: var(--pay-border); color: var(--pay-text); }
.pg-sz.on { color: var(--pay-treasury); border-color: var(--pay-border); background: rgba(251,191,36,0.12); }

/* ░░░░░░░░░░░░░░░░ RESPONSIVE ░░░░░░░░░░░░░░░░ */
@media (max-width: 1040px) { .kpis { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 720px) {
  .console-top { flex-direction: column; }
  .pulse-card { width: 100%; }
  .kpis { grid-template-columns: repeat(2, 1fr); }
  .card { grid-template-columns: 1fr auto; grid-template-areas: "head right" "money money"; row-gap: 12px; }
  .money { align-items: flex-start; }
  .detail { grid-area: 3 / 1 / 4 / -1; }
}
@media (max-width: 460px) { .kpis { grid-template-columns: 1fr; } .d-grid { grid-template-columns: 1fr 1fr; } }

/* ░░░░░░░░░░░░░░░░ LIGHT THEME ░░░░░░░░░░░░░░░░ */
[data-theme="light"] .reel-btn.on { color: #2a1a06; }
[data-theme="light"] .pg-tile.on { color: #2a1a06; }
[data-theme="light"] .av { color: var(--pay-ember); }
[data-theme="light"] .seal { color: var(--pay-net-strong); }
[data-theme="light"] .console-grid { opacity: 0.55; }

/* ░░░░░░░░░░░░░░░░ REDUCED MOTION ░░░░░░░░░░░░░░░░ */
@media (prefers-reduced-motion: reduce) {
  .console-aurora, .spine-flow, .live-dot, .node.ok .node-halo, .pg-led { animation: none !important; }
  .kpi-sheen, .foil, .av-ring, .spot { transition: none !important; transform: none !important; }
  .seal { animation: none !important; }
  .card:hover .foil, .kpi:hover .kpi-sheen, .card:hover .av-ring { transform: none !important; }
}
</style>
