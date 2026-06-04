<template>
  <div class="theater">
    <!-- ═════════════════════════════════════════════════════════════════
         00 · HERO — "Now Serving" stage with orbiting type icons
    ═════════════════════════════════════════════════════════════════ -->
    <Motion class="th-stage" as="section"
      :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }"
    >
      <!-- Decorative corner brackets -->
      <span class="th-bracket tl" aria-hidden="true" />
      <span class="th-bracket tr" aria-hidden="true" />
      <span class="th-bracket bl" aria-hidden="true" />
      <span class="th-bracket br" aria-hidden="true" />

      <!-- LEFT — orbital stage with center counter -->
      <div class="th-arena">
        <!-- Outer dial — ticks rotating slowly -->
        <svg class="ar-dial" viewBox="0 0 320 320" aria-hidden="true">
          <defs>
            <linearGradient id="arGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stop-color="#fde047" />
              <stop offset="50%"  stop-color="#fbbf24" />
              <stop offset="100%" stop-color="#ea580c" />
            </linearGradient>
            <filter id="arGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <g class="ar-rot">
            <circle cx="160" cy="160" r="148" fill="none" class="ar-ring-outer" />
            <g v-for="n in 60" :key="n">
              <line :x1="160" :y1="12" :x2="160" :y2="(n % 5 === 0 ? 26 : 20)"
                :transform="`rotate(${(n / 60) * 360} 160 160)`"
                :class="['ar-tick', { 'ar-tick-major': n % 5 === 0 }]"
              />
            </g>
          </g>
          <!-- Inner concentric rings (static) -->
          <circle cx="160" cy="160" r="118" fill="none" class="ar-ring-inner" />
          <circle cx="160" cy="160" r="92"  fill="none" class="ar-ring-inner ar-ring-faint" />
          <!-- Sweep arc that fills based on pending count -->
          <circle cx="160" cy="160" r="118" fill="none"
            class="ar-sweep"
            stroke="url(#arGrad)" stroke-width="3" stroke-linecap="round"
            :stroke-dasharray="sweepDash"
            :stroke-dashoffset="sweepOffset"
            transform="rotate(-90 160 160)"
            filter="url(#arGlow)"
          />
        </svg>

        <!-- Orbiting leave-type satellites — one per unique type in the queue -->
        <!-- IMPORTANT: positioner wraps Motion so motion-v's transform animation
             doesn't override the CSS translate that places each satellite. -->
        <div class="ar-orbits">
          <div v-for="(sat, i) in satellites" :key="sat.key"
            class="ar-sat-pos" :style="satStyle(i, satellites.length)"
          >
            <Motion as="div" class="ar-sat"
              :initial="{ opacity: 0, scale: 0 }"
              :animate="{ opacity: 1, scale: 1 }"
              :transition="{ duration: 0.6, delay: 0.42 + i * 0.08, ease: [0.34, 1.56, 0.64, 1] }"
            >
              <span class="ar-sat-aura" :style="{ background: sat.color }" />
              <LeaveTypeIcon :type="sat.key" :size="14" ambient />
              <span class="ar-sat-count leave-mono">{{ sat.count }}</span>
            </Motion>
          </div>
        </div>

        <!-- Center counter — wrapper handles centering, Motion handles entrance -->
        <div class="ar-core-pos">
          <Motion class="ar-core" as="div"
            :initial="{ opacity: 0, scale: 0.6 }"
            :animate="{ opacity: 1, scale: 1 }"
            :transition="{ duration: 0.7, delay: 0.24, ease: [0.34, 1.56, 0.64, 1] }"
          >
            <span class="ar-core-aura" />
            <span class="ar-core-eye leave-mono">AWAITING</span>
            <span class="ar-core-num">{{ items.length }}</span>
            <span class="ar-core-sub leave-mono">YOUR DECISION</span>
          </Motion>
        </div>
      </div>

      <!-- RIGHT — Status / readout panel -->
      <div class="th-readout">
        <Motion as="div" class="ro-status"
          :initial="{ opacity: 0, x: 12 }" :animate="{ opacity: 1, x: 0 }"
          :transition="{ duration: 0.5, delay: 0.16 }"
        >
          <span class="ro-led" />
          <span class="ro-led-lbl leave-mono">LIVE</span>
          <span class="ro-led-sep">·</span>
          <span class="ro-led-meta leave-mono">DECISION THEATER</span>
        </Motion>

        <Motion as="h1" class="ro-title"
          :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.55, delay: 0.22 }"
        >
          Every <em>verdict</em> begins here.
        </Motion>
        <Motion as="p" class="ro-sub"
          :initial="{ opacity: 0, y: 6 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.5, delay: 0.30 }"
        >
          Requests routed to a stage where you are the named approver — manager, HR,
          or specifically nominated. Approve in one click, or open the reject forge
          to pick a curated reason.
        </Motion>

        <Motion as="div" class="ro-stats"
          :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.55, delay: 0.38 }"
        >
          <Motion v-for="(s, i) in heroStats" :key="s.key" as="div"
            class="ro-stat" :data-tone="s.tone"
            :initial="{ opacity: 0, y: 12, scale: 0.95 }"
            :animate="{ opacity: 1, y: 0, scale: 1 }"
            :transition="{ duration: 0.42, delay: 0.46 + i * 0.06, ease: [0.34, 1.56, 0.64, 1] }"
            :whileHover="{ y: -3 }"
          >
            <header class="rs-head">
              <component :is="s.icon" :size="13" />
              <span class="rs-eye leave-mono">{{ s.eye }}</span>
            </header>
            <div class="rs-val leave-mono">{{ s.value }}<span class="rs-suf">{{ s.suffix }}</span></div>
            <div class="rs-foot leave-mono">{{ s.foot }}</div>
          </Motion>
        </Motion>

      </div>
    </Motion>

    <!-- ═════════════════════════════════════════════════════════════════
         Toolbar — Refresh + filter chips (sits above the dossier queue)
    ═════════════════════════════════════════════════════════════════ -->
    <Motion as="div" class="th-toolbar"
      :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, delay: 0.42 }"
    >
      <button class="leave-btn leave-btn-sm" :disabled="loading" @click="load">
        <RefreshCw :size="13" :class="{ 'spin': loading }" /> Refresh
      </button>
      <div class="th-filter">
        <Motion v-for="f in FILTERS" :key="f.key" as="button" type="button"
          class="th-chip" :class="{ 'is-active': filterKey === f.key }"
          :whileHover="{ y: -2 }" :whileTap="{ scale: 0.96 }"
          @click="filterKey = f.key"
        >
          <span class="th-chip-dot" />
          {{ f.label }}
          <span class="th-chip-count leave-mono">{{ filterCounts[f.key] || 0 }}</span>
        </Motion>
      </div>
    </Motion>

    <!-- ═════════════════════════════════════════════════════════════════
         01 · QUEUE — Decision Dossiers
    ═════════════════════════════════════════════════════════════════ -->
    <section class="th-queue">
      <header class="q-head">
        <span class="q-num leave-mono">01</span>
        <span class="q-rule" />
        <h3 class="q-title">Decision queue</h3>
        <span class="q-meta leave-mono">{{ filteredItems.length }} dossier{{ filteredItems.length === 1 ? '' : 's' }} · {{ filterCurrent.label.toLowerCase() }}</span>
      </header>

      <!-- Loading skeletons -->
      <div v-if="loading && !items.length" class="q-loading">
        <div v-for="i in 3" :key="i" class="leave-skel sk-dossier" />
      </div>

      <!-- Empty state — "all clear" -->
      <Motion v-else-if="!filteredItems.length" as="div" class="q-empty"
        :initial="{ opacity: 0, scale: 0.95 }" :animate="{ opacity: 1, scale: 1 }"
        :transition="{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }"
      >
        <div class="qe-stage">
          <span class="qe-ring qe-ring-1" />
          <span class="qe-ring qe-ring-2" />
          <span class="qe-ring qe-ring-3" />
          <Motion as="div" class="qe-icon"
            :animate="{ scale: [1, 1.06, 1] }"
            :transition="{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }"
          >
            <Check :size="34" />
          </Motion>
        </div>
        <h3 class="qe-title">All clear, captain.</h3>
        <p class="qe-sub">
          {{ items.length ? `No ${filterCurrent.label.toLowerCase()} dossiers match the filter.` : 'When a request lands on a stage where you decide, it appears here in real-time.' }}
        </p>
      </Motion>

      <!-- Dossier cards -->
      <div v-else class="q-list">
        <Motion v-for="(row, i) in pagedDossiers" :key="row.id + '-p' + pgPage" as="article"
          class="dossier" :data-stage="currentStageType(row)" :data-leave-type="row.leave_type"
          :initial="{ opacity: 0, y: 22, rotateX: -6, scale: 0.97 }"
          :animate="{ opacity: 1, y: 0, rotateX: 0, scale: 1 }"
          :transition="{ duration: 0.55, delay: Math.min(i * 0.07, 0.42), ease: [0.16, 1, 0.3, 1] }"
          :whileHover="{ y: -4, scale: 1.005 }"
        >
          <!-- Side-rail accent — leave-type colour -->
          <span class="d-rail" />
          <span class="d-aura" aria-hidden="true" />
          <span class="d-grain" aria-hidden="true" />

          <!-- ═══ Identity column ═══ -->
          <div class="d-col d-identity">
            <div class="d-avatar" :style="avatarStyle(row)">
              <span class="av-initials">{{ initials(row.employee_name) }}</span>
              <span class="av-ring" />
            </div>
            <div class="d-emp">
              <div class="d-name">{{ row.employee_name || row.employee_code || '—' }}</div>
              <div class="d-tags">
                <span class="d-ref leave-mono">{{ row.reference_no }}</span>
                <span v-if="row.employee_code" class="d-code leave-mono">{{ row.employee_code }}</span>
              </div>
              <div class="d-stage-tag" :data-type="currentStageType(row)">
                <span class="ds-dot" />
                {{ currentStageLabel(row) }}
              </div>
            </div>
          </div>

          <!-- ═══ Request column — type glyph + date strip + reason ═══ -->
          <div class="d-col d-request">
            <div class="d-type">
              <div class="d-type-glyph">
                <span class="dtg-aura" />
                <LeaveTypeIcon :type="row.leave_type" :size="22" ambient />
              </div>
              <div class="d-type-body">
                <div class="d-type-lbl">{{ typeMeta(row.leave_type).label }} leave</div>
                <div class="d-type-range leave-mono">
                  {{ fmtRange(row.from_date, row.to_date) }}
                  <span v-if="row.is_half_day" class="d-half">· half day</span>
                </div>
              </div>
              <div class="d-days">
                <span class="d-days-num">{{ row.total_days }}</span>
                <span class="d-days-suf leave-mono">d</span>
              </div>
            </div>

            <!-- Date strip — visual representation of the requested span -->
            <div class="d-strip">
              <div class="d-strip-track">
                <Motion v-for="(d, idx) in dateStrip(row)" :key="idx" as="div"
                  class="d-strip-cell" :data-state="d.state"
                  :initial="{ opacity: 0, scaleY: 0.6 }"
                  :animate="{ opacity: 1, scaleY: 1 }"
                  :transition="{ duration: 0.32, delay: 0.22 + idx * 0.018 }"
                >
                  <span class="dsc-day leave-mono">{{ d.day }}</span>
                  <span class="dsc-dot" />
                </Motion>
              </div>
              <div class="d-strip-edges">
                <span class="d-strip-tick leave-mono">{{ fmtMon(row.from_date) }}</span>
                <span class="d-strip-tick leave-mono">{{ fmtMon(row.to_date) }}</span>
              </div>
            </div>

            <!-- Reason / pipeline -->
            <div v-if="row.reason" class="d-reason">
              <span class="d-reason-eye leave-mono">REASON</span>
              <p class="d-reason-text">{{ row.reason }}</p>
            </div>

            <div class="d-pipe">
              <LeaveStatusPipeline
                :status="row.status"
                :steps="row.approval_steps || null"
                :current-step="row.current_step || 0"
                compact
              />
            </div>
          </div>

          <!-- ═══ Verdict column — approve / reject ═══ -->
          <div class="d-col d-verdict">
            <Motion as="button" type="button"
              class="d-act d-approve"
              :disabled="busyIds[row.id]"
              :whileHover="{ y: -3, scale: 1.04 }"
              :whileTap="{ scale: 0.94 }"
              @click="onApprove(row)"
            >
              <span class="da-glow" />
              <span class="da-stamp">
                <Check :size="20" />
              </span>
              <span class="da-lbl">Approve</span>
            </Motion>

            <Motion as="button" type="button"
              class="d-act d-reject"
              :disabled="busyIds[row.id]"
              :whileHover="{ y: -3, scale: 1.04 }"
              :whileTap="{ scale: 0.94 }"
              @click="onReject(row)"
            >
              <span class="da-glow" />
              <span class="da-stamp">
                <X :size="20" />
              </span>
              <span class="da-lbl">Reject</span>
            </Motion>

            <div class="d-since leave-mono" v-if="row.created_at">
              <Clock :size="11" /> {{ relTime(row.created_at) }}
            </div>
          </div>

          <!-- Loading veil when an action is in flight -->
          <transition name="veil">
            <div v-if="busyIds[row.id]" class="d-veil">
              <span class="dv-spinner" />
              <span class="dv-text leave-mono">DECIDING…</span>
            </div>
          </transition>
        </Motion>
      </div>

      <!-- Pagination — only when there's more than one page-sized batch -->
      <LeavePagination
        v-if="!loading && filteredItems.length"
        :page="pgPage"
        :page-size="pgSize"
        :total-items="filteredItems.length"
        :page-size-options="[10, 25, 50, 100]"
        @update:page="pgPage = $event"
        @update:pageSize="pgSize = $event"
      />
    </section>

    <!-- Reject modal -->
    <LeaveRejectModal :open="rejectModal" :leave="rejectTarget"
      :stage="rejectStage"
      @cancel="rejectModal = false" @confirm="confirmReject"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  RefreshCw, Check, X, Clock, Hourglass, Zap, AlarmClock,
} from 'lucide-vue-next'
import LeaveTypeIcon from '../components/LeaveTypeIcon.vue'
import LeaveStatusPipeline from '../components/LeaveStatusPipeline.vue'
import LeaveRejectModal from '../modals/LeaveRejectModal.vue'
import LeavePagination from '../components/LeavePagination.vue'
import {
  fetchMyApprovalQueue, decideChainStage, decideAsManager, decideAsHr, typeMeta,
} from '@/composables/useLeaves'
import { useToast } from 'vue-toastification'

const toast = useToast()
const items = ref([])
const loading = ref(false)
const busyIds = reactive({})
const rejectModal = ref(false)
const rejectTarget = ref(null)
const rejectStage = ref('HR')
const filterKey = ref('ALL')

// ─── Fetch ────────────────────────────────────────────────────────────
const load = async () => {
  loading.value = true
  try {
    const res = await fetchMyApprovalQueue()
    items.value = res.items || []
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load approvals')
  } finally { loading.value = false }
}
onMounted(load)

// ─── Stage / chain helpers ────────────────────────────────────────────
const currentStage = (row) => {
  const idx = row.current_step ?? 0
  return (row.approval_steps && row.approval_steps[idx]) || null
}
const currentStageType = (row) => currentStage(row)?.approver_type || 'HR'
const currentStageLabel = (row) => {
  const s = currentStage(row)
  if (!s) return row.status
  const label = s.label || s.approver_type
  return `Stage ${(row.current_step || 0) + 1} · ${label}`
}

// ─── Filter rail ─────────────────────────────────────────────────────
const FILTERS = [
  { key: 'ALL',     label: 'All' },
  { key: 'MANAGER', label: 'Manager' },
  { key: 'HR',      label: 'HR' },
  { key: 'USER',    label: 'Named' },
]
const filterCounts = computed(() => {
  const c = { ALL: items.value.length, MANAGER: 0, HR: 0, USER: 0 }
  for (const r of items.value) {
    const t = currentStageType(r)
    if (c[t] != null) c[t] += 1
  }
  return c
})
const filterCurrent = computed(() => FILTERS.find(f => f.key === filterKey.value) || FILTERS[0])
const filteredItems = computed(() => {
  if (filterKey.value === 'ALL') return items.value
  return items.value.filter(r => currentStageType(r) === filterKey.value)
})

// Client-side pagination over filteredItems.
const pgPage = ref(1)
const pgSize = ref(10)
watch([filterKey, pgSize], () => { pgPage.value = 1 })
watch(() => filteredItems.value.length, (len) => {
  const tp = Math.max(1, Math.ceil(len / pgSize.value))
  if (pgPage.value > tp) pgPage.value = tp
})
const pagedDossiers = computed(() => {
  const start = (pgPage.value - 1) * pgSize.value
  return filteredItems.value.slice(start, start + pgSize.value)
})

// ─── Hero satellites — unique leave types in the queue with counts ────
const satellites = computed(() => {
  const map = new Map()
  for (const r of items.value) {
    const meta = typeMeta(r.leave_type)
    const prev = map.get(r.leave_type) || { key: r.leave_type, label: meta.label, color: meta.hex, count: 0 }
    prev.count += 1
    map.set(r.leave_type, prev)
  }
  // Max 8 satellites around the orbit
  return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 8)
})

// Orbital positioning — each satellite sits on the inner ring at r=118
const ORBIT_R = 132
const satStyle = (i, total) => {
  if (!total) return { transform: 'translate(-50%, -50%)' }
  const angle = (i / total) * 2 * Math.PI - Math.PI / 2
  const x = Math.cos(angle) * ORBIT_R
  const y = Math.sin(angle) * ORBIT_R
  return { transform: `translate(calc(${x}px - 50%), calc(${y}px - 50%))` }
}

// Sweep arc — fills proportionally to queue depth (max 20)
const sweepCircumference = 2 * Math.PI * 118
const sweepDash = sweepCircumference
const sweepOffset = computed(() => {
  const pct = Math.min(1, items.value.length / 20)
  return sweepCircumference * (1 - pct)
})

// ─── Hero stats ──────────────────────────────────────────────────────
const heroStats = computed(() => {
  const ageHrs = (iso) => {
    if (!iso) return 0
    const ms = Date.now() - new Date(iso).getTime()
    return Math.max(0, ms / 36e5)
  }
  const ages = items.value.map(r => ageHrs(r.created_at)).filter(n => n > 0)
  const oldest = ages.length ? Math.max(...ages) : 0
  const totalDays = items.value.reduce((a, r) => a + Number(r.total_days || 0), 0)
  const stageMix = Object.entries(filterCounts.value).filter(([k]) => k !== 'ALL')
  const dominant = stageMix.sort((a, b) => b[1] - a[1])[0]?.[0] || '—'

  const fmtAge = (h) => {
    if (!h) return '—'
    if (h < 1) return `${Math.round(h * 60)}m`
    if (h < 24) return `${Math.round(h)}h`
    return `${Math.round(h / 24)}d`
  }
  return [
    { key: 'queue',    eye: 'IN QUEUE',     icon: Hourglass, value: items.value.length, suffix: '', foot: 'dossiers waiting', tone: 'warn' },
    { key: 'days',     eye: 'TOTAL DAYS',   icon: AlarmClock, value: totalDays.toFixed(0), suffix: 'd', foot: 'requested across all', tone: 'info' },
    { key: 'oldest',   eye: 'OLDEST WAIT',  icon: Clock, value: fmtAge(oldest), suffix: '', foot: 'top of the queue', tone: oldest > 48 ? 'danger' : 'warn' },
    { key: 'mix',      eye: 'STAGE MIX',    icon: Zap, value: dominant === '—' ? '—' : dominant.slice(0, 3), suffix: '', foot: 'dominant approver', tone: 'success' },
  ]
})

// ─── Decide actions ──────────────────────────────────────────────────
const decideFor = (row, decision, notes) => {
  const t = currentStageType(row)
  const body = { decision, notes: notes || null }
  if (t === 'MANAGER') return decideAsManager(row.id, body)
  if (t === 'HR')      return decideAsHr(row.id, body)
  return decideChainStage(row.id, body)
}

const onApprove = async (row) => {
  busyIds[row.id] = true
  try {
    await decideFor(row, 'APPROVED', null)
    toast.success(`Approved ${row.reference_no}`)
    items.value = items.value.filter(r => r.id !== row.id)
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to approve')
  } finally { busyIds[row.id] = false }
}
const onReject = (row) => {
  rejectTarget.value = row
  rejectStage.value = currentStageType(row) || 'HR'
  rejectModal.value = true
}
const confirmReject = async (notes) => {
  rejectModal.value = false
  const row = rejectTarget.value
  if (!row) return
  busyIds[row.id] = true
  try {
    await decideFor(row, 'REJECTED', notes)
    toast.success(`Rejected ${row.reference_no}`)
    items.value = items.value.filter(r => r.id !== row.id)
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to reject')
  } finally {
    busyIds[row.id] = false
    rejectTarget.value = null
  }
}

// ─── Date strip ──────────────────────────────────────────────────────
const MAX_STRIP_CELLS = 14
const dateStrip = (row) => {
  if (!row?.from_date || !row?.to_date) return []
  const from = new Date(row.from_date)
  const to = new Date(row.to_date)
  if (isNaN(from) || isNaN(to)) return []
  const days = Math.max(1, Math.round((to - from) / 86400000) + 1)
  // Show context: 2 days before + the leave span + 2 days after, capped at MAX
  const span = Math.min(MAX_STRIP_CELLS, days + 4)
  const startOffset = Math.min(2, Math.floor((span - days) / 2))
  const startDate = new Date(from)
  startDate.setDate(startDate.getDate() - startOffset)
  const out = []
  for (let i = 0; i < span; i += 1) {
    const d = new Date(startDate)
    d.setDate(startDate.getDate() + i)
    const inLeave = d >= from && d <= to
    const dow = d.getDay()
    const isWeekend = dow === 0 || dow === 6
    out.push({
      day: String(d.getDate()).padStart(2, '0'),
      state: inLeave ? (isWeekend ? 'leave-weekend' : 'leave') : (isWeekend ? 'weekend' : 'normal'),
    })
  }
  return out
}

// ─── Formatters ──────────────────────────────────────────────────────
const fmtDate = (v) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
const fmtRange = (a, b) => a === b ? fmtDate(a) : `${fmtDate(a)} → ${fmtDate(b)}`
const fmtMon = (v) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'

const initials = (name) => {
  if (!name) return '—'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
const avatarStyle = (row) => {
  const meta = typeMeta(row.leave_type)
  return {
    background: `linear-gradient(135deg, ${meta.hex} 0%, color-mix(in srgb, ${meta.hex} 50%, #ea580c) 100%)`,
  }
}

const relTime = (iso) => {
  if (!iso) return ''
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return `${Math.round(diff)}s ago`
  if (diff < 3600) return `${Math.round(diff / 60)}m ago`
  if (diff < 86400) return `${Math.round(diff / 3600)}h ago`
  return `${Math.round(diff / 86400)}d ago`
}
</script>

<style scoped>
@import '@/styles/leave-theme.css';

.theater { display: flex; flex-direction: column; gap: 22px; }

/* ════════════════════════════════════════════════════════════════════
   HERO — Stage with orbital arena
   ──────────────────────────────────────────────────────────────────── */
.th-stage {
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: 360px 1fr;
  gap: 32px;
  padding: 32px 32px 28px;
  border-radius: 24px;
  background:
    radial-gradient(60% 80% at 0% 50%, rgba(251, 191, 36, 0.16), transparent 55%),
    radial-gradient(50% 60% at 100% 0%, rgba(234, 88, 12, 0.12), transparent 60%),
    linear-gradient(180deg, rgba(20, 12, 6, 0.92), rgba(14, 8, 4, 0.92));
  border: 1px solid var(--leave-border);
  isolation: isolate;
}
[data-theme="light"] .th-stage {
  background:
    radial-gradient(60% 80% at 0% 50%, rgba(251, 191, 36, 0.22), transparent 55%),
    radial-gradient(50% 60% at 100% 0%, rgba(234, 88, 12, 0.14), transparent 60%),
    linear-gradient(180deg, rgba(255, 250, 235, 0.96), rgba(255, 245, 220, 0.96));
  border-color: rgba(180, 83, 9, 0.20);
}
@media (max-width: 980px) {
  .th-stage { grid-template-columns: 1fr; gap: 24px; padding: 24px; }
}

/* Decorative corner brackets — terminal aesthetic */
.th-bracket {
  position: absolute; width: 18px; height: 18px;
  border: 2px solid var(--leave-brand);
  opacity: 0.5;
  pointer-events: none;
}
.th-bracket.tl { top: 12px; left: 12px;     border-right: 0; border-bottom: 0; }
.th-bracket.tr { top: 12px; right: 12px;    border-left: 0;  border-bottom: 0; }
.th-bracket.bl { bottom: 12px; left: 12px;  border-right: 0; border-top: 0; }
.th-bracket.br { bottom: 12px; right: 12px; border-left: 0;  border-top: 0; }

/* ─── Arena (orbital stage) ─── */
.th-arena {
  position: relative;
  width: 360px; height: 360px;
  margin: 0 auto;
}
@media (max-width: 980px) { .th-arena { width: 320px; height: 320px; } }

.ar-dial { position: absolute; inset: 0; width: 100%; height: 100%; }
.ar-rot { transform-origin: 160px 160px; animation: leave-orb-spin 90s linear infinite; }
.ar-ring-outer { stroke: rgba(251, 191, 36, 0.16); stroke-width: 1; }
.ar-ring-inner { stroke: rgba(251, 191, 36, 0.22); stroke-width: 1; }
.ar-ring-faint { stroke: rgba(251, 191, 36, 0.08); }
.ar-tick { stroke: rgba(251, 191, 36, 0.26); stroke-width: 1; }
.ar-tick-major { stroke: rgba(251, 191, 36, 0.55); stroke-width: 1.4; }
[data-theme="light"] .ar-ring-outer { stroke: rgba(180, 83, 9, 0.28); }
[data-theme="light"] .ar-ring-inner { stroke: rgba(180, 83, 9, 0.30); }
[data-theme="light"] .ar-ring-faint { stroke: rgba(180, 83, 9, 0.14); }
[data-theme="light"] .ar-tick       { stroke: rgba(180, 83, 9, 0.34); }
[data-theme="light"] .ar-tick-major { stroke: rgba(180, 83, 9, 0.70); }

.ar-sweep {
  transition: stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1);
}

/* Orbital satellites — leave-type counters */
.ar-orbits {
  position: absolute; inset: 0;
  pointer-events: none;
}
/* Positioner: keeps the satellite anchored on its orbit point. The Motion
   child handles entrance scaling on its own transform layer. */
.ar-sat-pos {
  position: absolute;
  left: 50%; top: 50%;
  width: 44px; height: 44px;
  z-index: 2;
}
.ar-sat {
  width: 100%; height: 100%;
  border-radius: 14px;
  display: grid; place-items: center;
  background: rgba(20, 12, 6, 0.88);
  border: 1.5px solid rgba(251, 191, 36, 0.40);
  color: var(--leave-text);
  box-shadow:
    0 8px 22px -8px rgba(0, 0, 0, 0.7),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  position: relative;
  animation: sat-float 4s ease-in-out infinite;
}
[data-theme="light"] .ar-sat {
  background: rgba(255, 248, 230, 0.94);
  border-color: rgba(194, 65, 12, 0.34);
}
.ar-sat-pos:nth-child(2n) .ar-sat { animation-delay: -1s; }
.ar-sat-pos:nth-child(3n) .ar-sat { animation-delay: -2s; }
.ar-sat-pos:nth-child(4n) .ar-sat { animation-delay: -3s; }
@keyframes sat-float {
  0%, 100% { translate: 0 0; }
  50% { translate: 0 -3px; }
}
.ar-sat-aura {
  position: absolute; inset: -6px;
  border-radius: 50%;
  opacity: 0.22;
  filter: blur(8px);
  z-index: -1;
}
.ar-sat-count {
  position: absolute;
  bottom: -8px; right: -8px;
  font-size: 9.5px; font-weight: 800;
  width: 18px; height: 18px; border-radius: 50%;
  display: grid; place-items: center;
  background: var(--leave-grad-cta);
  color: #2a1100;
  border: 1.5px solid rgba(255, 255, 255, 0.42);
  box-shadow: 0 0 10px rgba(234, 88, 12, 0.55);
}

/* Core counter — positioner centers the box, Motion child animates inside it */
.ar-core-pos {
  position: absolute;
  left: 50%; top: 50%;
  transform: translate(-50%, -50%);
  width: 168px; height: 168px;
  z-index: 3;
  pointer-events: none;
}
.ar-core {
  width: 100%; height: 100%;
  border-radius: 50%;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 4px;
  background:
    radial-gradient(60% 60% at 50% 50%, rgba(251, 191, 36, 0.18), transparent 70%),
    radial-gradient(40% 40% at 50% 50%, rgba(234, 88, 12, 0.20), transparent 70%);
  border: 1.5px solid rgba(251, 191, 36, 0.36);
  box-shadow:
    0 0 60px -8px rgba(251, 191, 36, 0.34),
    inset 0 0 40px -10px rgba(234, 88, 12, 0.32);
  position: relative;
}
.ar-core-aura {
  position: absolute; inset: -12px;
  border-radius: 50%;
  border: 1px solid rgba(251, 191, 36, 0.30);
  opacity: 0.6;
  animation: core-pulse 3s ease-in-out infinite;
}
@keyframes core-pulse {
  0%, 100% { transform: scale(0.96); opacity: 0.45; }
  50%      { transform: scale(1.08); opacity: 0; }
}
.ar-core-eye {
  font-size: 9px; font-weight: 800;
  letter-spacing: 0.20em;
  color: var(--w-gold-200);
}
[data-theme="light"] .ar-core-eye { color: var(--w-gold-700); }
.ar-core-num {
  font-size: 64px; font-weight: 800;
  letter-spacing: -0.030em; line-height: 1;
  font-variant-numeric: tabular-nums;
  background: linear-gradient(135deg, #fde047, #fbbf24 50%, #ea580c);
  background-clip: text; -webkit-background-clip: text;
  color: transparent;
}
.ar-core-sub {
  font-size: 8.5px; font-weight: 800;
  letter-spacing: 0.20em;
  color: var(--leave-text-muted);
}

/* ─── Readout panel ─── */
.th-readout { display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.ro-status {
  display: inline-flex; align-items: center; gap: 8px;
  width: max-content;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid rgba(251, 191, 36, 0.28);
}
[data-theme="light"] .ro-status { background: rgba(251, 191, 36, 0.14); border-color: rgba(180, 83, 9, 0.26); }
.ro-led {
  width: 8px; height: 8px; border-radius: 50%;
  background: var(--leave-approved);
  box-shadow: 0 0 8px var(--leave-approved);
  animation: leave-eyebrow-pulse 1.6s ease-in-out infinite;
}
.ro-led-lbl { font-size: 9px; font-weight: 800; letter-spacing: 0.16em; color: var(--leave-approved); }
.ro-led-sep { color: var(--leave-text-muted); }
.ro-led-meta { font-size: 9px; font-weight: 800; letter-spacing: 0.16em; color: var(--leave-text-muted); }

.ro-title {
  margin: 0;
  font-size: 32px; font-weight: 800;
  color: var(--leave-text);
  letter-spacing: -0.024em;
  line-height: 1.1;
}
.ro-title em {
  font-style: normal;
  background: linear-gradient(135deg, #fde047, #fbbf24 50%, #ea580c);
  background-clip: text; -webkit-background-clip: text;
  color: transparent;
}
.ro-sub {
  margin: 0;
  font-size: 13px; line-height: 1.55;
  color: var(--leave-text-muted);
  max-width: 60ch;
}

/* Stat tiles in the readout */
.ro-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-top: 8px;
}
@media (max-width: 780px) { .ro-stats { grid-template-columns: repeat(2, 1fr); } }

.ro-stat {
  position: relative;
  overflow: hidden;
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(20, 14, 8, 0.55);
  border: 1px solid var(--leave-border);
  display: flex; flex-direction: column; gap: 5px;
  cursor: default;
  transition: border-color .26s, box-shadow .26s;
}
[data-theme="light"] .ro-stat { background: rgba(255, 248, 230, 0.78); }
.ro-stat:hover { border-color: var(--leave-brand); box-shadow: 0 8px 22px -10px rgba(251, 191, 36, 0.36); }
.ro-stat[data-tone="danger"]:hover { border-color: var(--leave-rejected); }
.rs-head {
  display: flex; align-items: center; gap: 6px;
  color: var(--w-gold-200);
}
[data-theme="light"] .rs-head { color: var(--w-gold-700); }
.rs-eye {
  font-size: 8.5px; font-weight: 800;
  letter-spacing: 0.14em;
  color: inherit;
}
.rs-val {
  font-size: 22px; font-weight: 800;
  letter-spacing: -0.020em;
  font-variant-numeric: tabular-nums;
  background: linear-gradient(135deg, #fde047, #fbbf24 50%, #ea580c);
  background-clip: text; -webkit-background-clip: text;
  color: transparent;
}
.ro-stat[data-tone="danger"] .rs-val { background: linear-gradient(135deg, #ff8a4c, #e34a0a); background-clip: text; -webkit-background-clip: text; color: transparent; }
.rs-suf { font-size: 12px; color: var(--leave-text-muted); margin-left: 2px; }
.rs-foot {
  font-size: 9px; font-weight: 700;
  letter-spacing: 0.10em;
  text-transform: uppercase;
  color: var(--leave-text-muted);
}

/* Toolbar — sits BETWEEN the hero panel and the dossier queue */
.th-toolbar {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
  padding: 12px 16px;
  border-radius: 14px;
  background:
    linear-gradient(90deg, rgba(251, 191, 36, 0.08), rgba(234, 88, 12, 0.04) 60%, transparent);
  border: 1px solid var(--leave-border);
}
[data-theme="light"] .th-toolbar {
  background: linear-gradient(90deg, rgba(251, 191, 36, 0.14), rgba(234, 88, 12, 0.06) 60%, transparent);
  border-color: rgba(180, 83, 9, 0.18);
}
.th-filter {
  display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
  margin-left: auto;
}
.th-chip {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(255, 250, 235, 0.04);
  border: 1px solid var(--leave-border);
  color: var(--leave-text-secondary);
  font-size: 11.5px; font-weight: 700;
  cursor: pointer;
  transition: border-color .22s, color .22s, background .22s, box-shadow .22s;
}
[data-theme="light"] .th-chip { background: rgba(255, 250, 240, 0.7); }
.th-chip:hover { border-color: var(--leave-brand); color: var(--leave-text); }
.th-chip.is-active {
  background: var(--leave-grad-cta);
  color: #2a1100;
  border-color: rgba(251, 146, 60, 0.5);
  box-shadow: 0 8px 22px -8px rgba(234, 88, 12, 0.55);
}
.th-chip-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--leave-brand);
  box-shadow: 0 0 6px var(--leave-brand);
}
.th-chip.is-active .th-chip-dot { background: #2a1100; box-shadow: none; }
.th-chip-count {
  font-size: 9.5px; font-weight: 800;
  padding: 1px 7px; border-radius: 999px;
  background: rgba(0, 0, 0, 0.20);
}
.th-chip:not(.is-active) .th-chip-count {
  background: rgba(251, 191, 36, 0.16);
  color: var(--leave-brand);
}
[data-theme="light"] .th-chip:not(.is-active) .th-chip-count { color: var(--w-gold-700); background: rgba(251, 191, 36, 0.22); }

/* Spinning refresh icon */
.spin { animation: th-spin .8s linear infinite; }
@keyframes th-spin { to { transform: rotate(360deg); } }

/* ════════════════════════════════════════════════════════════════════
   QUEUE — Decision dossiers
   ──────────────────────────────────────────────────────────────────── */
.th-queue { display: flex; flex-direction: column; gap: 14px; }
.q-head { display: flex; align-items: center; gap: 12px; }
.q-num {
  font-size: 10px; font-weight: 800;
  color: var(--leave-brand);
  padding: 3px 8px; border-radius: 5px;
  background: rgba(251, 191, 36, 0.14);
  border: 1px solid rgba(251, 191, 36, 0.32);
}
.q-rule {
  width: 28px; height: 1px;
  background: linear-gradient(90deg, var(--leave-brand), transparent);
}
.q-title {
  margin: 0;
  font-size: 17px; font-weight: 800;
  color: var(--leave-text);
  letter-spacing: -0.012em;
}
.q-meta {
  margin-left: auto;
  font-size: 9.5px; font-weight: 800;
  letter-spacing: 0.14em; text-transform: uppercase;
  color: var(--leave-text-muted);
}

/* Loading skeletons */
.q-loading { display: flex; flex-direction: column; gap: 12px; }
.sk-dossier { height: 168px; border-radius: 18px; }

/* Empty state */
.q-empty {
  display: flex; flex-direction: column; align-items: center; gap: 14px;
  padding: 56px 24px;
  border-radius: 22px;
  background:
    radial-gradient(80% 60% at 50% 0%, rgba(251, 191, 36, 0.14), transparent 60%),
    linear-gradient(180deg, rgba(20, 14, 8, 0.55), rgba(14, 10, 6, 0.55));
  border: 1px dashed var(--leave-border);
  text-align: center;
}
[data-theme="light"] .q-empty {
  background:
    radial-gradient(80% 60% at 50% 0%, rgba(251, 191, 36, 0.18), transparent 60%),
    linear-gradient(180deg, rgba(255, 250, 235, 0.7), rgba(255, 245, 220, 0.7));
}
.qe-stage {
  position: relative;
  width: 100px; height: 100px;
  display: grid; place-items: center;
}
.qe-ring {
  position: absolute; border-radius: 50%;
  border: 1.5px solid var(--leave-brand);
  opacity: 0.4;
}
.qe-ring-1 { inset: 0; }
.qe-ring-2 { inset: -12px; opacity: 0.26; animation: qe-pulse 2.6s ease-in-out infinite; }
.qe-ring-3 { inset: -24px; opacity: 0.14; animation: qe-pulse 2.6s ease-in-out infinite; animation-delay: 0.7s; }
@keyframes qe-pulse {
  0%, 100% { transform: scale(1); opacity: 0.14; }
  50%      { transform: scale(1.15); opacity: 0; }
}
.qe-icon {
  width: 56px; height: 56px;
  display: grid; place-items: center;
  border-radius: 50%;
  background: var(--leave-grad-cta);
  color: #2a1100;
  box-shadow: 0 14px 32px -8px rgba(251, 191, 36, 0.50);
}
.qe-title {
  margin: 6px 0 0;
  font-size: 17px; font-weight: 800;
  color: var(--leave-text);
  letter-spacing: -0.014em;
}
.qe-sub {
  margin: 0;
  font-size: 12.5px;
  color: var(--leave-text-muted);
  max-width: 50ch; line-height: 1.55;
}

/* ─── Dossier card ─── */
.q-list {
  display: flex; flex-direction: column;
  gap: 14px;
  perspective: 1400px;
}

.dossier {
  position: relative;
  overflow: hidden;
  display: grid;
  grid-template-columns: 220px 1fr 180px;
  gap: 18px;
  padding: 22px 24px;
  border-radius: 20px;
  background:
    radial-gradient(70% 60% at 0% 0%, rgba(251, 191, 36, 0.08), transparent 55%),
    linear-gradient(180deg, rgba(20, 14, 8, 0.78), rgba(14, 10, 6, 0.82));
  border: 1px solid var(--leave-border);
  backdrop-filter: blur(14px) saturate(140%);
  transition: border-color .26s var(--leave-ease), box-shadow .26s var(--leave-ease);
  transform-style: preserve-3d;
  isolation: isolate;
}
[data-theme="light"] .dossier {
  background:
    radial-gradient(70% 60% at 0% 0%, rgba(251, 191, 36, 0.12), transparent 55%),
    linear-gradient(180deg, rgba(255, 250, 235, 0.92), rgba(255, 245, 220, 0.92));
  border-color: rgba(180, 83, 9, 0.16);
}
.dossier:hover {
  border-color: var(--leave-brand);
  box-shadow: var(--leave-shadow-lift);
}
@media (max-width: 920px) {
  .dossier { grid-template-columns: 1fr; gap: 14px; padding: 18px 20px; }
}

/* Side-rail accent per leave type */
.d-rail {
  position: absolute; left: 0; top: 14px; bottom: 14px;
  width: 4px; border-radius: 0 4px 4px 0;
  background: linear-gradient(180deg, var(--leave-brand), transparent);
}
.dossier[data-leave-type="CASUAL"]      .d-rail { background: linear-gradient(180deg, var(--leave-casual),      transparent); }
.dossier[data-leave-type="SICK"]        .d-rail { background: linear-gradient(180deg, var(--leave-sick),        transparent); }
.dossier[data-leave-type="EARNED"]      .d-rail { background: linear-gradient(180deg, var(--leave-earned),      transparent); }
.dossier[data-leave-type="MATERNITY"]   .d-rail { background: linear-gradient(180deg, var(--leave-maternity),   transparent); }
.dossier[data-leave-type="PATERNITY"]   .d-rail { background: linear-gradient(180deg, var(--leave-paternity),   transparent); }
.dossier[data-leave-type="BEREAVEMENT"] .d-rail { background: linear-gradient(180deg, var(--leave-bereavement), transparent); }
.dossier[data-leave-type="COMP_OFF"]    .d-rail { background: linear-gradient(180deg, var(--leave-compoff),     transparent); }
.dossier[data-leave-type="LWP"]         .d-rail { background: linear-gradient(180deg, var(--leave-lwp),         transparent); }
.dossier[data-leave-type="STUDY"]       .d-rail { background: linear-gradient(180deg, var(--leave-study),       transparent); }
.dossier[data-leave-type="SPECIAL"]     .d-rail { background: linear-gradient(180deg, var(--leave-special),     transparent); }

.d-aura {
  position: absolute; inset: -30% -10% auto auto;
  width: 50%; height: 80%;
  background: radial-gradient(50% 50% at 50% 50%, rgba(251, 191, 36, 0.16), transparent 65%);
  filter: blur(36px);
  z-index: -1;
  opacity: 0;
  transition: opacity .3s;
  pointer-events: none;
}
.dossier:hover .d-aura { opacity: 0.85; }
.d-grain {
  position: absolute; inset: 0; opacity: 0.04;
  background-image: radial-gradient(rgba(251, 191, 36, 0.6) 1px, transparent 1px);
  background-size: 7px 7px;
  pointer-events: none;
}

/* ═══ Identity column ═══ */
.d-identity {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  position: relative;
  z-index: 1;
}
.d-avatar {
  position: relative;
  flex-shrink: 0;
  width: 54px; height: 54px;
  border-radius: 14px;
  display: grid; place-items: center;
  font-size: 16px; font-weight: 800;
  color: #2a1100;
  letter-spacing: 0.04em;
  box-shadow:
    0 8px 22px -8px rgba(0, 0, 0, 0.50),
    inset 0 1px 0 rgba(255, 255, 255, 0.50);
}
.av-initials { position: relative; z-index: 1; }
.av-ring {
  position: absolute; inset: -3px;
  border-radius: 50%;
  border: 1px solid currentColor;
  opacity: 0.4;
  animation: av-ring-spin 24s linear infinite;
}
@keyframes av-ring-spin { to { transform: rotate(360deg); } }

.d-emp { min-width: 0; display: flex; flex-direction: column; gap: 6px; flex: 1; }
.d-name {
  font-size: 14.5px; font-weight: 800;
  color: var(--leave-text);
  letter-spacing: -0.008em;
  line-height: 1.2;
}
.d-tags { display: flex; flex-wrap: wrap; gap: 6px; }
.d-ref {
  font-size: 9.5px; font-weight: 800;
  letter-spacing: 0.08em;
  padding: 2px 7px;
  border-radius: 5px;
  background: rgba(251, 191, 36, 0.10);
  border: 1px solid rgba(251, 191, 36, 0.28);
  color: var(--leave-brand);
}
[data-theme="light"] .d-ref { color: var(--w-gold-700); background: rgba(251, 191, 36, 0.18); }
.d-code {
  font-size: 9.5px; font-weight: 700;
  color: var(--leave-text-muted);
}

/* Stage tag — sits below ref */
.d-stage-tag {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 10px; font-weight: 800;
  letter-spacing: 0.06em; text-transform: uppercase;
  background: rgba(251, 191, 36, 0.08);
  border: 1px solid var(--leave-border);
  color: var(--leave-text-muted);
  width: max-content;
}
.d-stage-tag[data-type="MANAGER"] { color: #fbbf24; border-color: rgba(251, 191, 36, 0.36); background: rgba(251, 191, 36, 0.10); }
.d-stage-tag[data-type="HR"]      { color: var(--leave-approved); border-color: rgba(217, 119, 6, 0.40); background: rgba(217, 119, 6, 0.10); }
.d-stage-tag[data-type="USER"]    { color: #fcd34d; border-color: rgba(180, 83, 9, 0.40); background: rgba(180, 83, 9, 0.10); }
.ds-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 6px currentColor;
}

/* ═══ Request column ═══ */
.d-request {
  display: flex; flex-direction: column; gap: 12px;
  min-width: 0;
  position: relative;
  z-index: 1;
}
.d-type {
  display: flex; align-items: center; gap: 12px;
}
.d-type-glyph {
  position: relative;
  flex-shrink: 0;
  width: 40px; height: 40px;
  border-radius: 12px;
  display: grid; place-items: center;
  background: rgba(251, 191, 36, 0.10);
  border: 1px solid rgba(251, 191, 36, 0.30);
  color: var(--leave-text);
}
.dtg-aura {
  position: absolute; inset: -4px;
  border-radius: 50%;
  background: radial-gradient(50% 50% at 50% 50%, rgba(251, 191, 36, 0.30), transparent);
  filter: blur(6px);
  z-index: -1;
}
.d-type-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
.d-type-lbl {
  font-size: 13px; font-weight: 700;
  color: var(--leave-text);
  letter-spacing: -0.008em;
}
.d-type-range {
  font-size: 10.5px; font-weight: 700;
  color: var(--leave-text-muted);
}
.d-half { color: var(--leave-brand); font-weight: 700; }
.d-days {
  display: inline-flex; align-items: baseline; gap: 1px;
  padding: 4px 10px; border-radius: 10px;
  background: rgba(251, 191, 36, 0.10);
  border: 1px solid rgba(251, 191, 36, 0.32);
}
[data-theme="light"] .d-days { background: rgba(251, 191, 36, 0.18); border-color: rgba(180, 83, 9, 0.30); }
.d-days-num {
  font-size: 16px; font-weight: 800;
  color: var(--leave-text);
  letter-spacing: -0.018em;
  font-variant-numeric: tabular-nums;
}
.d-days-suf {
  font-size: 10px; font-weight: 700;
  color: var(--leave-text-muted);
  margin-left: 2px;
}

/* Date strip — bar visualisation of the leave span */
.d-strip {
  display: flex; flex-direction: column; gap: 4px;
  padding: 8px 6px 4px;
  border-radius: 10px;
  background: rgba(251, 191, 36, 0.04);
  border: 1px solid rgba(251, 191, 36, 0.08);
}
[data-theme="light"] .d-strip { background: rgba(255, 244, 210, 0.4); border-color: rgba(180, 83, 9, 0.08); }
.d-strip-track {
  display: flex; gap: 3px;
  justify-content: space-between;
}
.d-strip-cell {
  flex: 1;
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  padding: 4px 0 6px;
  border-radius: 6px;
  transition: background .22s var(--leave-ease);
}
.d-strip-cell[data-state="leave"] { background: var(--leave-grad-cta); }
.d-strip-cell[data-state="leave-weekend"] {
  background: linear-gradient(135deg, var(--w-orange-400), var(--w-orange-600));
  opacity: 0.65;
}
.d-strip-cell[data-state="weekend"] { background: rgba(251, 191, 36, 0.05); opacity: 0.55; }
.d-strip-cell[data-state="normal"]  { background: rgba(251, 191, 36, 0.08); }
[data-theme="light"] .d-strip-cell[data-state="normal"] { background: rgba(180, 83, 9, 0.06); }
[data-theme="light"] .d-strip-cell[data-state="weekend"] { background: rgba(180, 83, 9, 0.04); }
.dsc-day {
  font-size: 9px; font-weight: 800;
  letter-spacing: 0.02em;
  color: var(--leave-text-muted);
}
.d-strip-cell[data-state="leave"] .dsc-day,
.d-strip-cell[data-state="leave-weekend"] .dsc-day { color: #2a1100; }
.dsc-dot {
  width: 4px; height: 4px; border-radius: 50%;
  background: var(--leave-text-muted); opacity: 0.4;
}
.d-strip-cell[data-state="leave"] .dsc-dot,
.d-strip-cell[data-state="leave-weekend"] .dsc-dot {
  background: #2a1100; opacity: 1;
}
.d-strip-edges {
  display: flex; justify-content: space-between;
  padding: 0 4px;
  font-size: 8.5px; font-weight: 700;
  letter-spacing: 0.10em; text-transform: uppercase;
  color: var(--leave-text-muted);
}

/* Reason block */
.d-reason {
  display: flex; flex-direction: column; gap: 3px;
  padding: 8px 12px;
  border-radius: 10px;
  background: rgba(255, 250, 235, 0.04);
  border: 1px solid var(--leave-border-soft);
}
[data-theme="light"] .d-reason { background: rgba(255, 244, 210, 0.55); border-color: rgba(180, 83, 9, 0.10); }
.d-reason-eye {
  font-size: 8px; font-weight: 800;
  letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--w-gold-200);
}
[data-theme="light"] .d-reason-eye { color: var(--w-gold-700); }
.d-reason-text {
  margin: 0;
  font-size: 11.5px; line-height: 1.55;
  color: var(--leave-text-secondary);
}

/* Pipeline mini */
.d-pipe { padding: 4px 4px 0; }

/* ═══ Verdict column — action buttons ═══ */
.d-verdict {
  display: flex; flex-direction: column; gap: 8px;
  align-items: stretch;
  position: relative;
  z-index: 1;
}
.d-act {
  position: relative; overflow: hidden;
  display: flex; align-items: center; gap: 10px;
  padding: 12px 14px;
  border-radius: 14px;
  font-family: inherit; font-size: 12px; font-weight: 800;
  letter-spacing: -0.004em;
  cursor: pointer;
  border: 1px solid transparent;
  transition: border-color .22s, box-shadow .22s;
}
.d-act:disabled { opacity: 0.5; cursor: not-allowed; }

.d-approve {
  background: var(--leave-grad-cta);
  background-size: 240% 100%;
  background-position: 0% 50%;
  color: #2a1100;
  border-color: rgba(251, 146, 60, 0.45);
  box-shadow:
    0 12px 32px -10px rgba(234, 88, 12, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.45);
}
.d-approve:not(:disabled):hover {
  background-position: 100% 50%;
  box-shadow: 0 18px 44px -10px rgba(234, 88, 12, 0.78);
}
.d-reject {
  background: rgba(20, 12, 10, 0.7);
  color: #ffd0b8;
  border-color: rgba(234, 88, 12, 0.36);
}
.d-reject:not(:disabled):hover {
  background: rgba(234, 88, 12, 0.16);
  border-color: var(--leave-rejected);
  color: #fff7ed;
}
[data-theme="light"] .d-reject {
  background: rgba(255, 248, 230, 0.95);
  color: var(--w-ember-700);
  border-color: rgba(194, 65, 12, 0.28);
}
[data-theme="light"] .d-reject:not(:disabled):hover {
  background: var(--leave-rejected-soft);
  color: var(--w-ember-800);
  border-color: var(--w-ember-600);
}

.da-glow {
  position: absolute; inset: 0;
  background: linear-gradient(120deg, transparent, rgba(255, 255, 255, 0.42), transparent);
  background-size: 220% 100%;
  background-position: -100% 0;
  pointer-events: none;
  transition: background-position .7s var(--leave-ease);
}
.d-act:not(:disabled):hover .da-glow { background-position: 100% 0; }
.da-stamp {
  display: grid; place-items: center;
  width: 32px; height: 32px;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.18);
  flex-shrink: 0;
  transition: transform .26s var(--leave-spring);
}
.d-reject .da-stamp { background: rgba(234, 88, 12, 0.16); }
[data-theme="light"] .d-reject .da-stamp { background: rgba(234, 88, 12, 0.18); }
.d-act:not(:disabled):hover .da-stamp { transform: rotate(-8deg) scale(1.10); }
.da-lbl { flex: 1; text-align: left; }

.d-since {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 9.5px; font-weight: 700;
  letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--leave-text-muted);
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(251, 191, 36, 0.06);
  border: 1px solid var(--leave-border-soft);
  align-self: center;
  margin-top: 4px;
}

/* Loading veil — appears when an action is being submitted */
.d-veil {
  position: absolute; inset: 0;
  display: grid; place-items: center; gap: 10px;
  background: rgba(14, 8, 4, 0.72);
  backdrop-filter: blur(4px);
  z-index: 10;
}
[data-theme="light"] .d-veil { background: rgba(255, 250, 240, 0.84); }
.dv-spinner {
  width: 34px; height: 34px;
  border-radius: 50%;
  border: 3px solid rgba(251, 191, 36, 0.20);
  border-top-color: var(--leave-brand);
  animation: th-spin .8s linear infinite;
}
.dv-text {
  font-size: 9.5px; font-weight: 800;
  letter-spacing: 0.22em;
  color: var(--leave-brand);
}
[data-theme="light"] .dv-text { color: var(--w-gold-700); }
.veil-enter-active, .veil-leave-active { transition: opacity .26s; }
.veil-enter-from, .veil-leave-to { opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .ar-rot, .av-ring, .sat-float, .ar-core-aura, .qe-ring, .ro-led { animation: none !important; }
}
</style>
