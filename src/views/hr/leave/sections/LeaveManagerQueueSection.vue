<template>
  <div class="bridge" :data-load="bridgeLoad">
    <!-- ═════════════════════════════════════════════════════════════════
         AMBIENT BACKDROP — drifting gold mist + dotted grid + light rays
         ════════════════════════════════════════════════════════════════ -->
    <div class="br-bg" aria-hidden="true">
      <span class="bg-mist a" />
      <span class="bg-mist b" />
      <span class="bg-mist c" />
      <span class="bg-grid" />
      <span class="bg-rays" />
    </div>

    <!-- ═════════════════════════════════════════════════════════════════
         01 · HERO — TACTICAL RADAR + TELEMETRY PANEL
         A polar radar plots each manager by polar coords:
           radius = oldest-age (closer to centre = fresher)
           angle  = even distribution around the dial
         Sweeping arm rotates continuously, illuminating each node as it
         passes. Right side carries a telemetry strip with counters.
         ════════════════════════════════════════════════════════════════ -->
    <Motion class="br-hero" as="section"
      :initial="{ opacity: 0, y: 18 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }"
    >
      <!-- Corner bracket frame -->
      <span class="hb tl" /><span class="hb tr" />
      <span class="hb bl" /><span class="hb br" />

      <!-- LEFT — Radar scope -->
      <div class="radar-wrap">
        <Motion as="div" class="radar"
          :initial="{ opacity: 0, scale: 0.86 }"
          :animate="{ opacity: 1, scale: 1 }"
          :transition="{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }"
        >
          <svg viewBox="0 0 360 360" class="radar-svg" aria-hidden="true">
            <defs>
              <radialGradient id="radarCore" cx="0.5" cy="0.5" r="0.6">
                <stop offset="0%"   stop-color="rgba(251,191,36,0.36)" />
                <stop offset="55%"  stop-color="rgba(251,191,36,0.08)" />
                <stop offset="100%" stop-color="rgba(251,191,36,0)" />
              </radialGradient>
              <linearGradient id="sweepLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stop-color="rgba(251,191,36,0.9)" />
                <stop offset="60%"  stop-color="rgba(251,191,36,0.25)" />
                <stop offset="100%" stop-color="rgba(251,191,36,0)" />
              </linearGradient>
              <filter id="radarBlur" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="1.2" />
              </filter>
            </defs>

            <!-- Outer disc + inner glow (classes drive theme) -->
            <circle cx="180" cy="180" r="170" class="rd-disc" />
            <circle cx="180" cy="180" r="160" fill="url(#radarCore)" />

            <!-- 4 range rings -->
            <g class="rg-rings">
              <circle v-for="r in 4" :key="`rg-${r}`" cx="180" cy="180"
                :r="40 + (r - 1) * 40"
                class="rd-ring"
              />
            </g>

            <!-- Crosshairs -->
            <line x1="180" y1="14" x2="180" y2="346" class="rd-cross" />
            <line x1="14" y1="180" x2="346" y2="180" class="rd-cross" />
            <line x1="62" y1="62"  x2="298" y2="298" class="rd-cross faint" />
            <line x1="298" y1="62" x2="62" y2="298"  class="rd-cross faint" />

            <!-- 60 azimuth ticks -->
            <g>
              <line v-for="t in 60" :key="`tk-${t}`"
                :x1="180 + 165 * Math.cos((t - 1) * Math.PI / 30 - Math.PI / 2)"
                :y1="180 + 165 * Math.sin((t - 1) * Math.PI / 30 - Math.PI / 2)"
                :x2="180 + (t % 5 === 0 ? 152 : 158) * Math.cos((t - 1) * Math.PI / 30 - Math.PI / 2)"
                :y2="180 + (t % 5 === 0 ? 152 : 158) * Math.sin((t - 1) * Math.PI / 30 - Math.PI / 2)"
                :class="['rd-tick', { 'rd-tick-major': t % 5 === 0 }]"
                stroke-linecap="round"
              />
            </g>

            <!-- Range labels -->
            <g class="rg-labels">
              <text x="184" y="146" class="rd-label">24h</text>
              <text x="184" y="106" class="rd-label">48h</text>
              <text x="184" y="66"  class="rd-label">72h</text>
              <text x="184" y="26"  class="rd-label crit">96h+</text>
            </g>

            <!-- SWEEPING ARM (rotates infinitely; angle drives blip-pulse timing too) -->
            <g class="sweep-arm" :style="{ transform: `rotate(${sweepAngle}deg)` }">
              <path d="M 180 180 L 180 22 A 158 158 0 0 1 282 80 Z"
                fill="url(#sweepLine)" opacity="0.4" />
              <line x1="180" y1="180" x2="180" y2="22"
                stroke="url(#sweepLine)" stroke-width="2.4" stroke-linecap="round"
                filter="url(#radarBlur)"
              />
              <circle cx="180" cy="22" r="3.2" class="rd-arm-tip" />
            </g>

            <!-- MANAGER BLIPS — plotted by oldest-age + index angle -->
            <g class="blips">
              <g v-for="(m, i) in radarBlips" :key="m.id"
                :class="['blip', `tone-${m.tone}`, { 'is-active': activeManager === m.id, 'is-lit': blipLit[m.id] }]"
                :transform="`translate(${m.x}, ${m.y})`"
                @click="filterManager(m)"
                style="cursor: pointer"
              >
                <!-- Sonar-ping rings (hover only — animate via CSS, scale from own center) -->
                <circle cx="0" cy="0" r="6" class="blip-ping p1" />
                <circle cx="0" cy="0" r="6" class="blip-ping p2" />
                <circle cx="0" cy="0" r="6" class="blip-ping p3" />
                <!-- Aura ring (lit by sweep / active state) -->
                <circle cx="0" cy="0" r="14" class="blip-aura" />
                <!-- Halo -->
                <circle cx="0" cy="0" r="10" class="blip-halo" />
                <!-- Dot -->
                <circle cx="0" cy="0" r="6" class="blip-dot" />
                <!-- Count badge -->
                <g transform="translate(10, -10)">
                  <circle r="8" class="blip-badge" />
                  <text y="3" text-anchor="middle" class="blip-badge-txt">{{ m.count }}</text>
                </g>
              </g>
            </g>

            <!-- Centre crosshair -->
            <circle cx="180" cy="180" r="5" class="rd-center" filter="url(#radarBlur)" />
            <circle cx="180" cy="180" r="14" class="rd-center-ring" />
          </svg>

          <!-- Floating radar status -->
          <div class="radar-status leave-mono">
            <span class="rs-led" :data-tone="radarLed" />
            <span>RADAR · {{ radarLabel }}</span>
            <span class="rs-sep">·</span>
            <span>{{ liveClock }}</span>
          </div>

          <!-- Tooltip when hovering a blip -->
          <Transition name="blip-tip">
            <div v-if="hoveredBlip" class="blip-tip"
              :style="{ left: hoveredBlip.tipX + 'px', top: hoveredBlip.tipY + 'px' }"
            >
              <div class="bt-head">
                <span class="bt-avatar">{{ initials(hoveredBlip.name) }}</span>
                <div>
                  <strong>{{ hoveredBlip.name }}</strong>
                  <span class="leave-mono">{{ hoveredBlip.count }} pending · oldest {{ relTime(hoveredBlip.oldestAt) }}</span>
                </div>
              </div>
            </div>
          </Transition>
        </Motion>
      </div>

      <!-- RIGHT — Briefing panel: title + telemetry + controls -->
      <div class="br-copy">
        <Motion as="div" class="br-led"
          :initial="{ opacity: 0, x: 12 }" :animate="{ opacity: 1, x: 0 }"
          :transition="{ duration: 0.5, delay: 0.15 }"
        >
          <span class="led-pulse" :data-tone="radarLed" />
          <span class="led-text leave-mono">OVERSIGHT · {{ radarLabel }}</span>
          <span class="led-sep">/</span>
          <span class="led-text leave-mono">FY {{ fyLabel }}</span>
        </Motion>

        <h1 class="br-title">
          <span class="t-line">The
            <em class="word-em">manager</em> bench
          </span>
          <span class="t-line second">— under your watch.</span>
        </h1>
        <p class="br-sub">
          Every blip on the scope is a reporting manager who owes a decision.
          The further out it sits, the longer they've been holding the request.
          Click a blip — or a chip below — to drill into their pile.
        </p>

        <!-- Telemetry strip (4-up) — sparkline + KPI mix -->
        <Motion as="div" class="br-telem"
          :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.55, delay: 0.3 }"
        >
          <Motion v-for="(t, i) in telemetry" :key="t.key" as="div"
            class="tx" :data-tone="t.tone"
            :initial="{ opacity: 0, y: 10, scale: 0.96 }"
            :animate="{ opacity: 1, y: 0, scale: 1 }"
            :transition="{ duration: 0.45, delay: 0.36 + i * 0.07, ease: [0.34, 1.56, 0.64, 1] }"
            :whileHover="{ y: -3 }"
          >
            <header class="tx-head">
              <component :is="t.icon" :size="12" />
              <span class="tx-lbl">{{ t.label }}</span>
            </header>
            <div class="tx-val leave-mono">{{ t.value }}<span v-if="t.unit" class="tx-unit">{{ t.unit }}</span></div>
            <div class="tx-bars">
              <span v-for="b in 12" :key="`tb-${b}`" class="tx-bar"
                :style="{ height: barHeight(t, b) + '%' }"
              />
            </div>
            <div class="tx-foot leave-mono">{{ t.foot }}</div>
          </Motion>
        </Motion>

        <!-- Controls -->
        <Motion as="div" class="br-controls"
          :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.5, delay: 0.5 }"
        >
          <button class="br-btn primary" @click="reload" :disabled="loading">
            <RefreshCw :size="13" :class="{ spin: loading }" />
            <span>Sync radar</span>
          </button>
          <button class="br-btn ghost" @click="clearFilter" v-if="activeManager">
            <X :size="13" />
            <span>Clear filter</span>
          </button>
          <span class="br-pill leave-mono">
            <Compass :size="11" />
            <span>{{ filteredItems.length }} brief{{ filteredItems.length === 1 ? '' : 's' }} visible</span>
          </span>
        </Motion>
      </div>
    </Motion>

    <!-- ═════════════════════════════════════════════════════════════════
         02 · MANAGER ROSTER RIBBON — chips ranked by oldest age
         ════════════════════════════════════════════════════════════════ -->
    <Motion v-if="managerGroups.length" as="section" class="roster"
      :initial="{ opacity: 0, y: 12 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.5, delay: 0.25 }"
    >
      <header class="roster-head">
        <span class="rh-eye leave-mono"><span class="rh-dot" /> Manager roster</span>
        <h2 class="rh-title">Who's holding requests</h2>
        <span class="rh-meta leave-mono">{{ managerGroups.length }} manager{{ managerGroups.length === 1 ? '' : 's' }} on the bench</span>
      </header>

      <div class="roster-strip" ref="stripRef">
        <Motion v-for="(m, i) in managerGroups" :key="m.id || m.name" as="button" type="button"
          class="chip" :data-tone="m.tone" :class="{ 'is-active': activeManager === m.id }"
          :initial="{ opacity: 0, y: 12, scale: 0.95 }"
          :animate="{ opacity: 1, y: 0, scale: 1 }"
          :transition="{ duration: 0.45, delay: 0.05 + Math.min(i * 0.04, 0.4), ease: [0.34, 1.56, 0.64, 1] }"
          :whileHover="{ y: -3, scale: 1.03 }"
          :whileTap="{ scale: 0.97 }"
          @click="filterManager(m)"
        >
          <span class="chip-rail" />
          <div class="chip-avatar">
            <span class="ca-init">{{ initials(m.name) }}</span>
            <span class="ca-glyph" />
          </div>
          <div class="chip-meta">
            <strong class="chip-name">{{ m.name }}</strong>
            <span class="chip-sub leave-mono">
              {{ m.count }} pending · oldest {{ relTime(m.oldestAt) }}
            </span>
          </div>
          <div class="chip-load">
            <span class="chip-load-bar">
              <span class="chip-load-fill" :style="{ width: m.loadPct + '%' }" />
            </span>
            <span class="chip-load-num leave-mono">{{ m.count }}</span>
          </div>
        </Motion>
      </div>
    </Motion>

    <!-- ═════════════════════════════════════════════════════════════════
         03 · MISSION BRIEFINGS — landscape cards grouped by manager
         ════════════════════════════════════════════════════════════════ -->
    <section class="briefs">
      <header v-if="filteredItems.length" class="briefs-head">
        <span class="bh-eye leave-mono"><span class="bh-dot" /> Mission briefings</span>
        <h2 class="bh-title">
          <span v-if="activeManager">{{ activeManagerName }} · pending</span>
          <span v-else>Live triage feed</span>
        </h2>
        <p class="bh-sub" v-if="activeManager">
          Filtered to <b>{{ activeManagerName }}</b>'s queue. Click any briefing
          to open the full chain, day breakdown, and audit trail.
        </p>
        <p class="bh-sub" v-else>
          Every PENDING_MANAGER request, freshest first. Click a briefing for
          the full case file; click a roster chip above to filter the deck.
        </p>
      </header>

      <!-- Skeletons -->
      <div v-if="loading && !items.length" class="brief-grid">
        <div v-for="i in 6" :key="`sk-${i}`" class="brief-skel">
          <div class="leave-skel" style="width:48px;height:48px;border-radius:50%" />
          <div style="flex:1; display:flex; flex-direction:column; gap:8px">
            <div class="leave-skel" style="width:55%;height:13px" />
            <div class="leave-skel" style="width:90%;height:36px;border-radius:10px" />
          </div>
        </div>
      </div>

      <!-- Empty -->
      <div v-else-if="!filteredItems.length" class="brief-empty">
        <div class="be-frame">
          <svg viewBox="0 0 120 60" class="be-svg" aria-hidden="true">
            <path d="M 8 50 Q 30 22 60 30 T 112 14"
              fill="none" stroke="rgba(251,191,36,0.55)" stroke-width="2"
              stroke-dasharray="6 6"
              class="be-trace"
            />
            <circle cx="8" cy="50" r="3" fill="#fbbf24" />
            <circle cx="112" cy="14" r="3" fill="#fbbf24" />
          </svg>
          <UserCheck :size="38" />
        </div>
        <strong v-if="!items.length">Bench is clear.</strong>
        <strong v-else>No briefings for that manager.</strong>
        <span v-if="!items.length">Every manager is current on their team's requests. Stand down.</span>
        <span v-else>Pick another chip above or clear the filter to see the full deck.</span>
      </div>

      <!-- Card deck — landscape "node-card" briefings -->
      <div v-else class="brief-grid">
        <Motion v-for="(r, i) in pagedBriefings" :key="r.id + '-p' + pgPage" as="article"
          class="brief" :data-age="ageBucket(r.created_at)"
          :style="{ '--c': typeMeta(r.leave_type).hex || '#fbbf24' }"
          :initial="{ opacity: 0, y: 14, rotateX: -6, scale: 0.97 }"
          :animate="{ opacity: 1, y: 0, rotateX: 0, scale: 1 }"
          :transition="{ duration: 0.55, delay: 0.04 + Math.min(i * 0.05, 0.45), ease: [0.16, 1, 0.3, 1] }"
          :whileHover="{ y: -4, scale: 1.01 }"
        >
          <!-- Decorative edge tracer (depth only — no click target) -->
          <span class="br-trace" />

          <!-- ── STRIP 1 · HEADER ─ identity + status ── -->
          <header class="br-head" @click="openDrawer(r)">
            <div class="bh-left">
              <div class="br-avatar">
                <span class="av-init">{{ initials(r.employee_name) }}</span>
                <span class="av-orbit" />
                <span class="av-pulse" />
              </div>
              <div class="br-who">
                <strong class="who-name">{{ r.employee_name }}</strong>
                <span class="who-meta leave-mono">
                  {{ r.employee_code }}
                  <span v-if="r.department_name" class="who-sep">·</span>
                  <span v-if="r.department_name">{{ r.department_name }}</span>
                </span>
              </div>
            </div>
            <div class="bh-right">
              <LeaveStatusChip :status="r.status" pulse />
              <span class="bh-ref leave-mono">{{ r.reference_no }}</span>
            </div>
          </header>

          <!-- ── STRIP 2 · BODY ─ TYPE / RANGE / DAYS ── -->
          <div class="br-body" @click="openDrawer(r)">
            <div class="cell">
              <span class="cell-eye leave-mono">Type</span>
              <div class="cell-line">
                <LeaveTypeIcon :type="r.leave_type" :size="14" ambient />
                <strong>{{ typeMeta(r.leave_type).label }}</strong>
                <span v-if="r.is_half_day" class="cell-half leave-mono">half</span>
              </div>
            </div>
            <div class="cell">
              <span class="cell-eye leave-mono">Range</span>
              <div class="cell-line leave-mono">
                <Calendar :size="11" />
                <span>{{ fmtRange(r.from_date, r.to_date) }}</span>
              </div>
            </div>
            <div class="cell">
              <span class="cell-eye leave-mono">Days</span>
              <div class="cell-line">
                <strong class="cell-days">{{ r.total_days }}</strong>
                <small>{{ Number(r.total_days) === 1 ? 'day' : 'days' }}</small>
              </div>
            </div>
          </div>

          <!-- ── STRIP 3 · REASON (only if present) ── -->
          <p v-if="r.reason" class="br-reason" @click="openDrawer(r)">
            <Quote :size="10" class="br-reason-q" />
            <span>{{ truncate(r.reason, 180) }}</span>
          </p>

          <!-- ── STRIP 4 · FOOTER ─ aging gauge + manager + CTA ── -->
          <footer class="br-foot">
            <div class="ag-rail" :data-age="ageBucket(r.created_at)">
              <span class="ag-eye leave-mono">
                <Clock :size="10" />
                {{ relTime(r.created_at) }}
              </span>
              <div class="ag-track">
                <span class="ag-fill" :style="{ width: agePct(r.created_at) + '%' }" />
                <span class="ag-tick" style="left: 25%" />
                <span class="ag-tick" style="left: 50%" />
                <span class="ag-tick" style="left: 75%" />
              </div>
              <span class="ag-num leave-mono">{{ agePct(r.created_at) }}%</span>
            </div>
            <div class="br-mgr leave-mono">
              <Users :size="10" />
              <span>w/ <b>{{ r.manager_name || 'manager' }}</b></span>
            </div>
            <button class="br-cta" type="button" @click="openDrawer(r)">
              <span>Open brief</span>
              <ArrowRight :size="11" />
            </button>
          </footer>
        </Motion>
      </div>

      <!-- Pagination — only when there's something to slice -->
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

    <LeaveDetailDrawer
      :open="drawer.open"
      :leave-id="drawer.id"
      @close="drawer.open = false"
      @changed="reload"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  RefreshCw, UserCheck, ArrowRight, Calendar, Quote, Users, X,
  Compass, Inbox, Flame, Clock, Activity,
} from 'lucide-vue-next'
import LeaveStatusChip from '../components/LeaveStatusChip.vue'
import LeaveTypeIcon from '../components/LeaveTypeIcon.vue'
import LeaveDetailDrawer from '../drawers/LeaveDetailDrawer.vue'
import LeavePagination from '../components/LeavePagination.vue'
import { useLeaves, typeMeta } from '@/composables/useLeaves'

defineEmits(['refresh-stats'])

// ─────────────────────────────────────────────────────────────────────
// Data
// ─────────────────────────────────────────────────────────────────────
const api = useLeaves()
const loading = computed(() => api.loading.value)
const items = computed(() => api.items.value)
const drawer = ref({ open: false, id: null })

const openDrawer = (r) => {
  if (!r?.id) return
  drawer.value = { open: true, id: String(r.id) }
}

const reload = () => api.fetchManagerQueueAsAdmin(1, 200)
onMounted(reload)

// ─────────────────────────────────────────────────────────────────────
// Filtering by manager (toggles when same blip clicked twice)
// ─────────────────────────────────────────────────────────────────────
const activeManager = ref(null)
const filterManager = (m) => {
  activeManager.value = activeManager.value === m.id ? null : m.id
}
const clearFilter = () => { activeManager.value = null }
const filteredItems = computed(() => {
  if (!activeManager.value) return items.value
  return items.value.filter(r => (r.manager_id || r.manager_name) === activeManager.value)
})
const activeManagerName = computed(() => {
  const grp = managerGroups.value.find(g => g.id === activeManager.value)
  return grp?.name || 'manager'
})

// Client-side pagination over filteredItems.
const pgPage = ref(1)
const pgSize = ref(10)
watch([activeManager, pgSize], () => { pgPage.value = 1 })
watch(() => filteredItems.value.length, (len) => {
  const tp = Math.max(1, Math.ceil(len / pgSize.value))
  if (pgPage.value > tp) pgPage.value = tp
})
const pagedBriefings = computed(() => {
  const start = (pgPage.value - 1) * pgSize.value
  return filteredItems.value.slice(start, start + pgSize.value)
})

// ─────────────────────────────────────────────────────────────────────
// Aging + formatters
// ─────────────────────────────────────────────────────────────────────
const AGING_CAP_HOURS = 96
const ageHours = (v) => (v ? (Date.now() - new Date(v).getTime()) / 3600000 : 0)
const ageBucket = (v) => {
  const h = ageHours(v)
  if (h > 72) return 'critical'
  if (h > 48) return 'old'
  if (h > 24) return 'mid'
  return 'fresh'
}
const agePct = (v) => Math.min(100, Math.round((ageHours(v) / AGING_CAP_HOURS) * 100))

const initials = (name) => {
  if (!name) return '?'
  const p = String(name).trim().split(/\s+/).filter(Boolean)
  return p.length === 1
    ? p[0].slice(0, 2).toUpperCase()
    : (p[0][0] + p[p.length - 1][0]).toUpperCase()
}
const fmtDate = (v) =>
  v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—'
const fmtRange = (a, b) => (a === b ? fmtDate(a) : `${fmtDate(a)} → ${fmtDate(b)}`)
const relTime = (v) => {
  if (!v) return '—'
  const m = (Date.now() - new Date(v).getTime()) / 60000
  if (m < 1) return 'just now'
  if (m < 60) return `${Math.floor(m)}m ago`
  if (m < 1440) return `${Math.floor(m / 60)}h ago`
  return `${Math.floor(m / 1440)}d ago`
}
const truncate = (s, n) => ((s || '').length > n ? (s || '').slice(0, n - 1) + '…' : s || '')

// ─────────────────────────────────────────────────────────────────────
// Manager grouping (single source of truth for radar blips + roster)
// ─────────────────────────────────────────────────────────────────────
const managerGroups = computed(() => {
  const map = new Map()
  for (const r of items.value) {
    const key = r.manager_id || r.manager_name || 'unassigned'
    const cur = map.get(key) || {
      id: key,
      name: r.manager_name || 'Unassigned',
      count: 0,
      oldestAt: r.created_at,
    }
    cur.count += 1
    if (new Date(r.created_at) < new Date(cur.oldestAt)) cur.oldestAt = r.created_at
    map.set(key, cur)
  }
  const list = Array.from(map.values())
  // Tone derived from oldest age — flags critical / aging / fresh
  for (const m of list) {
    const h = ageHours(m.oldestAt)
    m.tone = h > 72 ? 'crimson' : h > 48 ? 'amber' : h > 24 ? 'gold' : 'emerald'
    m.oldestHours = h
  }
  // Sort hottest first (highest age, then count desc)
  list.sort((a, b) => b.oldestHours - a.oldestHours || b.count - a.count)
  const maxCount = Math.max(1, ...list.map(m => m.count))
  for (const m of list) {
    m.loadPct = Math.min(100, (m.count / maxCount) * 100)
  }
  return list
})

// ─────────────────────────────────────────────────────────────────────
// Live clock + sweeping radar arm (animated by RAF, smooth)
// ─────────────────────────────────────────────────────────────────────
const liveClock = ref('')
const sweepAngle = ref(0)
const blipLit = ref({})  // map managerId → boolean; flips true briefly when sweep passes
let clockTimer = null
let rafId = null
let lastTs = 0

const updateClock = () => {
  liveClock.value = new Date().toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  })
}
onMounted(() => {
  updateClock()
  clockTimer = setInterval(updateClock, 1000)
  // Smooth RAF-driven sweep — 1 revolution per 6s. Drives the blip "ping" too.
  const tick = (ts) => {
    if (!lastTs) lastTs = ts
    const dt = ts - lastTs
    lastTs = ts
    sweepAngle.value = (sweepAngle.value + (dt / 6000) * 360) % 360
    // Light up blips whose angle is within ±10° of the sweep
    const sw = sweepAngle.value
    const blips = radarBlips.value
    const next = {}
    for (const b of blips) {
      // Convert blip's angle in degrees from +90 (top) anchor
      const bAng = (b.angle + 90 + 360) % 360
      let delta = Math.abs(((sw - bAng + 540) % 360) - 180)
      // Smaller delta = closer to arm; emit "lit" when within 20°
      next[b.id] = delta < 25
    }
    blipLit.value = next
    rafId = requestAnimationFrame(tick)
  }
  rafId = requestAnimationFrame(tick)
})
onBeforeUnmount(() => {
  if (clockTimer) clearInterval(clockTimer)
  if (rafId) cancelAnimationFrame(rafId)
})

const fyLabel = computed(() => {
  const d = new Date()
  const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1
  return `${y}-${String(y + 1).slice(-2)}`
})

// ─────────────────────────────────────────────────────────────────────
// Radar blip plotting — radius = oldest-age, angle = distributed even
// ─────────────────────────────────────────────────────────────────────
const RADAR_R_INNER = 30     // 0..24h
const RADAR_R_MAX = 156      // 96h+
const radarBlips = computed(() => {
  const groups = managerGroups.value
  if (!groups.length) return []
  return groups.map((g, idx) => {
    // Map oldest-hours linearly to radius (clamped); 0h → inner, 96h → outer
    const ratio = Math.min(1, g.oldestHours / 96)
    const r = RADAR_R_INNER + (RADAR_R_MAX - RADAR_R_INNER) * ratio
    // Even angular distribution; first blip at top (-π/2) so it lines up w/ sweep start
    const angleDeg = -90 + (360 / Math.max(groups.length, 1)) * idx
    const angleRad = (angleDeg * Math.PI) / 180
    const x = 180 + r * Math.cos(angleRad)
    const y = 180 + r * Math.sin(angleRad)
    return {
      id: g.id, name: g.name, count: g.count, oldestAt: g.oldestAt,
      tone: g.tone, angle: angleDeg, x, y,
    }
  })
})

// ─────────────────────────────────────────────────────────────────────
// Blip hover tooltip
// ─────────────────────────────────────────────────────────────────────
const hoveredBlip = ref(null)
// (kept here for future onmouseover wiring — currently the tooltip
// triggers via the active class; left a stub so it renders cleanly)

// ─────────────────────────────────────────────────────────────────────
// Telemetry strip (4-up)
// ─────────────────────────────────────────────────────────────────────
const radarLed = computed(() => {
  if (!items.value.length) return 'idle'
  const critical = managerGroups.value.filter(m => m.oldestHours > 72).length
  if (critical > 0) return 'crimson'
  const warn = managerGroups.value.filter(m => m.oldestHours > 48).length
  if (warn > 0) return 'amber'
  return 'green'
})
const radarLabel = computed(() => ({
  crimson: 'PRIORITY',
  amber:   'ATTENTION',
  green:   'OPERATIONAL',
  idle:    'DORMANT',
}[radarLed.value]))
const bridgeLoad = computed(() => ({
  crimson: 'critical',
  amber:   'warn',
  green:   'normal',
  idle:    'empty',
}[radarLed.value]))

const telemetry = computed(() => {
  const total = items.value.length
  const mgrs = managerGroups.value.length
  const oldest = managerGroups.value[0]?.oldestHours || 0
  const oldestLbl = oldest >= 24
    ? `${Math.floor(oldest / 24)}d ${Math.round(oldest % 24)}h`
    : `${Math.round(oldest)}h`
  const avg = mgrs ? Math.round((total / mgrs) * 10) / 10 : 0
  return [
    {
      key: 'total', label: 'open requests', tone: 'gold',
      icon: Inbox, value: total, unit: '', foot: total ? 'across queue' : 'inbox zero',
      seed: 7,
    },
    {
      key: 'mgrs', label: 'managers', tone: 'gold',
      icon: Users, value: mgrs, unit: '', foot: mgrs ? 'on the bench' : '—',
      seed: 3,
    },
    {
      key: 'oldest', label: 'oldest signal', tone: oldest > 72 ? 'crimson' : oldest > 48 ? 'amber' : 'gold',
      icon: Flame, value: oldestLbl, unit: '', foot: oldest > 48 ? 'past 48h SLA' : 'within SLA',
      seed: 4,
    },
    {
      key: 'avg', label: 'avg per mgr', tone: 'gold',
      icon: Activity, value: avg, unit: '', foot: 'requests',
      seed: 9,
    },
  ]
})

// 12-bar mini sparkline; deterministic (no Math.random in template) by seeding
// off the index so the visual is stable between renders.
const barHeight = (t, b) => {
  const seed = (t.seed * 53 + b * 17) % 100
  return 22 + (seed / 100) * 75
}
</script>

<style scoped>
/* ════════════════════════════════════════════════════════════════════════════
   PAGE WRAPPER + AMBIENT BACKDROP
   ════════════════════════════════════════════════════════════════════════════ */
.bridge {
  position: relative;
  display: flex; flex-direction: column; gap: 28px;
  isolation: isolate;
}
.br-bg {
  position: absolute; inset: -20px; z-index: -1; overflow: hidden;
  pointer-events: none;
}
.bg-mist {
  position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.55;
}
.bg-mist.a {
  width: 480px; height: 480px; top: -150px; left: -100px;
  background: radial-gradient(circle, rgba(251, 191, 36, 0.45), transparent 65%);
  animation: br-aura-a 24s ease-in-out infinite;
}
.bg-mist.b {
  width: 420px; height: 420px; bottom: -150px; right: -120px;
  background: radial-gradient(circle, rgba(234, 88, 12, 0.38), transparent 65%);
  animation: br-aura-b 28s ease-in-out infinite;
}
.bg-mist.c {
  width: 380px; height: 380px; top: 40%; left: 50%; transform: translateX(-50%);
  background: radial-gradient(circle, rgba(253, 224, 71, 0.18), transparent 65%);
  animation: br-aura-c 30s ease-in-out infinite;
}
@keyframes br-aura-a { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-28px,38px) scale(1.08); } }
@keyframes br-aura-b { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(38px,-32px) scale(1.10); } }
@keyframes br-aura-c { 0%,100% { transform: translate(-50%,0) scale(0.95); } 50% { transform: translate(-50%,-22px) scale(1.10); } }
.bg-grid {
  position: absolute; inset: 0;
  background-image: radial-gradient(rgba(251,191,36,0.05) 1px, transparent 1px);
  background-size: 22px 22px;
  mask-image: linear-gradient(180deg, rgba(0,0,0,0.5), transparent 70%);
}
[data-theme="light"] .bg-grid {
  background-image: radial-gradient(rgba(180, 83, 9, 0.10) 1px, transparent 1px);
}
.bg-rays {
  position: absolute; left: 50%; top: -100px; transform: translateX(-50%);
  width: 1200px; height: 760px;
  background: conic-gradient(
    from 45deg,
    transparent 0deg 28deg,
    rgba(251, 191, 36, 0.04) 50deg 70deg,
    transparent 90deg 130deg,
    rgba(251, 146, 60, 0.04) 150deg 170deg,
    transparent 190deg 230deg,
    rgba(251, 191, 36, 0.04) 250deg 270deg,
    transparent 290deg 360deg
  );
  mask-image: radial-gradient(closest-side, black 30%, transparent 70%);
  animation: br-rays 80s linear infinite;
  opacity: 0.7;
}
@keyframes br-rays { to { transform: translateX(-50%) rotate(360deg); } }

/* ════════════════════════════════════════════════════════════════════════════
   01 · HERO — RADAR + COPY (sized to match HR-Queue proportions)
   ════════════════════════════════════════════════════════════════════════════ */
.br-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(280px, 0.85fr) 1.25fr;
  gap: 28px;
  align-items: center;
  padding: 28px 32px;
  border-radius: 26px;
  background:
    radial-gradient(120% 70% at 0% 0%, rgba(251, 191, 36, 0.22), transparent 65%),
    radial-gradient(80% 60% at 100% 100%, rgba(234, 88, 12, 0.18), transparent 65%),
    linear-gradient(180deg, rgba(20, 14, 8, 0.84), rgba(28, 18, 10, 0.88));
  border: 1px solid rgba(251, 191, 36, 0.30);
  box-shadow:
    0 40px 100px -40px rgba(120, 53, 15, 0.65),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  overflow: hidden;
}
[data-theme="light"] .br-hero {
  background:
    radial-gradient(120% 70% at 0% 0%, rgba(251, 191, 36, 0.20), transparent 65%),
    radial-gradient(80% 60% at 100% 100%, rgba(234, 88, 12, 0.16), transparent 65%),
    linear-gradient(180deg, rgba(255, 250, 240, 0.94), rgba(255, 244, 218, 0.96));
  border-color: rgba(180, 83, 9, 0.26);
  box-shadow: 0 32px 64px -36px rgba(120, 53, 15, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.6);
}
@media (max-width: 1080px) {
  .br-hero { grid-template-columns: 1fr; padding: 24px 20px; }
}

/* Corner brackets (mid-bracket style — different from HR vault rivets) */
.hb {
  position: absolute; width: 22px; height: 22px;
  border-color: rgba(251, 191, 36, 0.55);
  pointer-events: none;
}
.hb.tl { top: 12px; left: 12px;     border-top: 2px solid; border-left: 2px solid; border-top-left-radius: 6px; }
.hb.tr { top: 12px; right: 12px;    border-top: 2px solid; border-right: 2px solid; border-top-right-radius: 6px; }
.hb.bl { bottom: 12px; left: 12px;  border-bottom: 2px solid; border-left: 2px solid; border-bottom-left-radius: 6px; }
.hb.br { bottom: 12px; right: 12px; border-bottom: 2px solid; border-right: 2px solid; border-bottom-right-radius: 6px; }
[data-theme="light"] .hb { border-color: rgba(180, 83, 9, 0.55); }

/* ── Radar (shrunk: max 340px so the hero matches HR-queue proportions) ── */
.radar-wrap {
  position: relative;
  aspect-ratio: 1 / 1;
  max-width: 340px;
  width: 100%;
  justify-self: center;
}
.radar { position: relative; width: 100%; height: 100%; }
.radar-svg { width: 100%; height: 100%; }
.sweep-arm { transform-origin: 180px 180px; }
.rg-rings circle { animation: ring-breathe 6s ease-in-out infinite; }
@keyframes ring-breathe { 0%, 100% { opacity: 0.5; } 50% { opacity: 1; } }

/* Radar geometry — class-based so light theme can flip the palette */
.rd-disc {
  fill: rgba(20, 14, 8, 0.55);
  stroke: rgba(251, 191, 36, 0.32);
  stroke-width: 1.5;
}
[data-theme="light"] .rd-disc {
  fill: rgba(255, 248, 232, 0.65);
  stroke: rgba(180, 83, 9, 0.40);
}
.rd-ring {
  fill: none;
  stroke: rgba(251, 191, 36, 0.22);
  stroke-width: 1;
  stroke-dasharray: 2 6;
}
[data-theme="light"] .rd-ring {
  stroke: rgba(180, 83, 9, 0.30);
}
.rd-cross {
  stroke: rgba(251, 191, 36, 0.16);
  stroke-width: 1;
}
.rd-cross.faint {
  stroke: rgba(251, 191, 36, 0.10);
}
[data-theme="light"] .rd-cross { stroke: rgba(180, 83, 9, 0.22); }
[data-theme="light"] .rd-cross.faint { stroke: rgba(180, 83, 9, 0.14); }
.rd-tick {
  stroke: rgba(251, 191, 36, 0.28);
  stroke-width: 1;
}
.rd-tick.rd-tick-major {
  stroke: rgba(251, 191, 36, 0.65);
  stroke-width: 1.5;
}
[data-theme="light"] .rd-tick { stroke: rgba(180, 83, 9, 0.32); }
[data-theme="light"] .rd-tick.rd-tick-major { stroke: rgba(180, 83, 9, 0.70); }
.rd-label {
  font-size: 8px; font-weight: 800; letter-spacing: 1.4px;
  fill: rgba(251, 191, 36, 0.65);
}
.rd-label.crit { fill: rgba(248, 113, 113, 0.85); }
[data-theme="light"] .rd-label { fill: rgba(180, 83, 9, 0.65); }
[data-theme="light"] .rd-label.crit { fill: rgba(185, 28, 28, 0.85); }
.rd-arm-tip { fill: #fde68a; }
[data-theme="light"] .rd-arm-tip { fill: #d97706; }
.rd-center { fill: #fbbf24; }
.rd-center-ring {
  fill: none;
  stroke: rgba(251, 191, 36, 0.55);
  stroke-width: 1.2;
}
[data-theme="light"] .rd-center { fill: #b45309; }
[data-theme="light"] .rd-center-ring { stroke: rgba(180, 83, 9, 0.55); }

/* Blips — base + tone tints (theme-aware) */
.blip { transition: opacity .25s; }
.blip-dot {
  fill: #fbbf24;
  filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.55));
  transition: fill .25s, filter .25s;
}
.blip-halo {
  fill: none;
  stroke: rgba(251, 191, 36, 0.45);
  stroke-width: 1.4;
  transition: stroke .25s;
}
.blip-aura {
  fill: rgba(251, 191, 36, 0.18);
  opacity: 0;
  transition: opacity .35s;
}
.blip.is-lit .blip-aura,
.blip.is-active .blip-aura,
.blip:hover .blip-aura { opacity: 1; }
.blip-badge {
  fill: rgba(20, 14, 8, 0.95);
  stroke: rgba(251, 191, 36, 0.55);
  stroke-width: 1;
}
.blip-badge-txt {
  font-size: 9px; font-weight: 800; fill: #fde68a;
}
[data-theme="light"] .blip-badge { fill: rgba(255, 244, 218, 0.96); stroke: rgba(180, 83, 9, 0.55); }
[data-theme="light"] .blip-badge-txt { fill: #92400e; }

/* Sonar-ping rings — animate scaling about each circle's OWN centre (cx=0,cy=0)
   via transform-box: fill-box. The parent <g transform="translate(x,y)"> keeps
   the blip positioned; only the rings expand. No more "flying" hover. */
.blip-ping {
  fill: none;
  stroke: rgba(251, 191, 36, 0.65);
  stroke-width: 1.4;
  transform-box: fill-box;
  transform-origin: center;
  opacity: 0;
  pointer-events: none;
}
.blip:hover .blip-ping {
  animation: blip-ping-out 1.6s cubic-bezier(0.16, 1, 0.3, 1) infinite;
}
.blip:hover .blip-ping.p1 { animation-delay: 0s; }
.blip:hover .blip-ping.p2 { animation-delay: 0.45s; }
.blip:hover .blip-ping.p3 { animation-delay: 0.9s; }
@keyframes blip-ping-out {
  0%   { transform: scale(0.6); opacity: 0.85; }
  100% { transform: scale(3.6); opacity: 0; }
}

/* Tone tints */
.blip.tone-crimson .blip-dot   { fill: #ef4444; filter: drop-shadow(0 0 8px rgba(239, 68, 68, 0.75)); }
.blip.tone-crimson .blip-halo  { stroke: rgba(239, 68, 68, 0.55); }
.blip.tone-crimson .blip-aura  { fill: rgba(239, 68, 68, 0.22); }
.blip.tone-crimson .blip-ping  { stroke: rgba(239, 68, 68, 0.80); }
.blip.tone-amber   .blip-dot   { fill: #f59e0b; filter: drop-shadow(0 0 7px rgba(245, 158, 11, 0.70)); }
.blip.tone-amber   .blip-halo  { stroke: rgba(245, 158, 11, 0.55); }
.blip.tone-amber   .blip-aura  { fill: rgba(245, 158, 11, 0.22); }
.blip.tone-amber   .blip-ping  { stroke: rgba(245, 158, 11, 0.75); }
.blip.tone-emerald .blip-dot   { fill: #34d399; filter: drop-shadow(0 0 7px rgba(52, 211, 153, 0.55)); }
.blip.tone-emerald .blip-halo  { stroke: rgba(52, 211, 153, 0.45); }
.blip.tone-emerald .blip-aura  { fill: rgba(52, 211, 153, 0.20); }
.blip.tone-emerald .blip-ping  { stroke: rgba(52, 211, 153, 0.65); }
[data-theme="light"] .blip-dot   { fill: #b45309; filter: drop-shadow(0 0 4px rgba(180, 83, 9, 0.55)); }
[data-theme="light"] .blip-halo  { stroke: rgba(180, 83, 9, 0.55); }
[data-theme="light"] .blip-aura  { fill: rgba(180, 83, 9, 0.18); }
[data-theme="light"] .blip-ping  { stroke: rgba(180, 83, 9, 0.65); }
[data-theme="light"] .blip.tone-crimson .blip-dot  { fill: #b91c1c; filter: drop-shadow(0 0 5px rgba(185, 28, 28, 0.65)); }
[data-theme="light"] .blip.tone-crimson .blip-halo { stroke: rgba(185, 28, 28, 0.55); }
[data-theme="light"] .blip.tone-crimson .blip-aura { fill: rgba(185, 28, 28, 0.20); }
[data-theme="light"] .blip.tone-crimson .blip-ping { stroke: rgba(185, 28, 28, 0.75); }
[data-theme="light"] .blip.tone-amber   .blip-dot  { fill: #c2410c; }
[data-theme="light"] .blip.tone-amber   .blip-halo { stroke: rgba(194, 65, 12, 0.55); }
[data-theme="light"] .blip.tone-emerald .blip-dot  { fill: #047857; }
[data-theme="light"] .blip.tone-emerald .blip-halo { stroke: rgba(4, 120, 87, 0.55); }
.blip.is-active .blip-halo {
  stroke-width: 2;
  animation: blip-active-pulse 1.4s ease-in-out infinite;
  transform-box: fill-box;
  transform-origin: center;
}
@keyframes blip-active-pulse {
  0%, 100% { transform: scale(1); opacity: 0.7; }
  50%      { transform: scale(1.15); opacity: 1; }
}

/* Radar status pill (bottom-left of radar) */
.radar-status {
  position: absolute; left: 10px; bottom: 12px;
  display: inline-flex; align-items: center; gap: 7px;
  padding: 5px 11px;
  border-radius: 999px;
  background: rgba(20, 14, 8, 0.85);
  border: 1px solid rgba(251, 191, 36, 0.30);
  color: var(--hr-text);
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.14em;
  backdrop-filter: blur(6px);
}
[data-theme="light"] .radar-status {
  background: rgba(255, 250, 240, 0.92);
  border-color: rgba(180, 83, 9, 0.30);
  color: #3a1f0b;
}
.rs-led {
  width: 6px; height: 6px; border-radius: 50%;
  background: #34d399; box-shadow: 0 0 6px #34d399;
  animation: led-blink 1.6s ease-in-out infinite;
}
.rs-led[data-tone="amber"]   { background: #f59e0b; box-shadow: 0 0 6px #f59e0b; }
.rs-led[data-tone="crimson"] { background: #ef4444; box-shadow: 0 0 9px #ef4444; animation-duration: 0.9s; }
.rs-led[data-tone="idle"]    { background: #94a3b8; box-shadow: 0 0 4px #94a3b8; animation: none; opacity: 0.6; }
@keyframes led-blink {
  0%, 100% { opacity: 0.7; transform: scale(1); }
  50%      { opacity: 1; transform: scale(1.4); }
}
.rs-sep { color: rgba(251, 191, 36, 0.45); }
[data-theme="light"] .rs-sep { color: rgba(180, 83, 9, 0.45); }

/* Blip tip (currently latent; defined for future hover wiring) */
.blip-tip {
  position: absolute;
  padding: 8px 10px; border-radius: 10px;
  background: rgba(20, 14, 8, 0.92);
  border: 1px solid rgba(251, 191, 36, 0.42);
  font-size: 11px; color: var(--hr-text);
  pointer-events: none;
  backdrop-filter: blur(8px);
  z-index: 5;
}
.bt-head { display: flex; align-items: center; gap: 8px; }
.bt-avatar {
  width: 26px; height: 26px; border-radius: 50%;
  background: linear-gradient(135deg, #fbbf24, #fb923c);
  display: grid; place-items: center;
  color: #1f1408; font-weight: 800; font-size: 10px;
}
.bt-head strong { display: block; font-size: 12px; font-weight: 800; }
.bt-head .leave-mono { display: block; font-size: 9.5px; color: var(--hr-text-muted); margin-top: 2px; }
.blip-tip-enter-active, .blip-tip-leave-active { transition: opacity .2s, transform .25s cubic-bezier(0.16, 1, 0.3, 1); }
.blip-tip-enter-from, .blip-tip-leave-to { opacity: 0; transform: translateY(4px); }

/* ── Copy (right column) ── */
.br-copy {
  display: flex; flex-direction: column; gap: 14px;
  min-width: 0;
}
.br-led {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(251, 191, 36, 0.10);
  border: 1px solid rgba(251, 191, 36, 0.30);
  color: #fde68a;
  font-size: 10px; font-weight: 800; letter-spacing: 0.16em;
  align-self: flex-start;
  backdrop-filter: blur(6px);
}
[data-theme="light"] .br-led {
  background: rgba(251, 191, 36, 0.16);
  border-color: rgba(180, 83, 9, 0.30);
  color: #92400e;
}
.led-pulse {
  width: 7px; height: 7px; border-radius: 50%;
  background: #34d399; box-shadow: 0 0 8px #34d399;
  animation: led-blink 1.6s ease-in-out infinite;
}
.led-pulse[data-tone="amber"]   { background: #f59e0b; box-shadow: 0 0 8px #f59e0b; }
.led-pulse[data-tone="crimson"] { background: #ef4444; box-shadow: 0 0 12px #ef4444; animation-duration: 0.9s; }
.led-pulse[data-tone="idle"]    { background: #94a3b8; box-shadow: 0 0 6px #94a3b8; animation: none; opacity: 0.6; }
.led-sep { color: rgba(251, 191, 36, 0.40); }
[data-theme="light"] .led-sep { color: rgba(180, 83, 9, 0.40); }

.br-title {
  margin: 0;
  font-size: clamp(24px, 3.4vw, 36px);
  font-weight: 900; letter-spacing: -0.028em; line-height: 1.08;
  display: flex; flex-direction: column; gap: 4px;
}
.t-line { display: inline-flex; flex-wrap: wrap; gap: 0 12px; align-items: baseline; }
.word-em {
  font-style: normal;
  background: linear-gradient(135deg, #fef3c7, #fbbf24 40%, #fb923c);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  position: relative;
}
.word-em::after {
  content: '';
  position: absolute;
  left: 0; right: 0; bottom: 2px; height: 3px;
  background: linear-gradient(90deg, transparent, rgba(251, 146, 60, 0.85), transparent);
  border-radius: 2px;
  animation: em-underline 3.6s ease-in-out infinite;
}
@keyframes em-underline {
  0%, 100% { transform: scaleX(0.6); opacity: 0.6; }
  50%      { transform: scaleX(1.0); opacity: 1; }
}
[data-theme="light"] .word-em {
  background: linear-gradient(135deg, #92400e, #b45309 60%, #c2410c);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
.t-line.second {
  font-size: clamp(17px, 2.2vw, 24px);
  font-weight: 800;
  background: linear-gradient(135deg, #fef3c7, #fbbf24 40%, #fb923c);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  opacity: 0.92;
}
[data-theme="light"] .t-line.second {
  background: linear-gradient(135deg, #4a2c0d, #92400e 70%);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}

.br-sub {
  margin: 0; max-width: 560px;
  font-size: 13px; line-height: 1.6; color: var(--hr-text-secondary);
}

/* Telemetry 4-up */
.br-telem {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;
}
@media (max-width: 720px) { .br-telem { grid-template-columns: repeat(2, 1fr); } }
.tx {
  position: relative;
  display: flex; flex-direction: column; gap: 4px;
  padding: 9px 11px;
  border-radius: 12px;
  background: linear-gradient(180deg, rgba(28, 18, 10, 0.65), rgba(20, 14, 8, 0.82));
  border: 1px solid rgba(251, 191, 36, 0.22);
  overflow: hidden;
  isolation: isolate;
  transition: border-color .22s, box-shadow .22s;
}
[data-theme="light"] .tx {
  background: linear-gradient(180deg, rgba(255, 250, 240, 0.92), rgba(255, 244, 218, 0.94));
  border-color: rgba(180, 83, 9, 0.20);
}
.tx[data-tone="amber"]   { border-color: rgba(245, 158, 11, 0.55); }
.tx[data-tone="crimson"] { border-color: rgba(239, 68, 68, 0.55); }
.tx:hover { box-shadow: 0 14px 26px -18px rgba(251, 191, 36, 0.40); }
.tx-head {
  display: inline-flex; align-items: center; gap: 6px;
  color: var(--hr-text-muted);
}
.tx-head svg { color: #fbbf24; }
[data-theme="light"] .tx-head svg { color: #b45309; }
.tx[data-tone="amber"] .tx-head svg { color: #f59e0b; }
.tx[data-tone="crimson"] .tx-head svg { color: #ef4444; }
.tx-lbl {
  font-size: 9px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase;
}
.tx-val {
  font-size: 18px; font-weight: 900; letter-spacing: -0.025em; line-height: 1;
  color: var(--hr-text);
  font-variant-numeric: tabular-nums;
}
.tx[data-tone="crimson"] .tx-val { color: #fca5a5; }
[data-theme="light"] .tx[data-tone="crimson"] .tx-val { color: #b91c1c; }
.tx[data-tone="amber"] .tx-val { color: #fcd34d; }
[data-theme="light"] .tx[data-tone="amber"] .tx-val { color: #b45309; }
.tx-unit {
  font-size: 11px; font-weight: 700; color: var(--hr-text-muted); margin-left: 2px;
}
.tx-bars {
  display: flex; align-items: flex-end; gap: 2px;
  height: 16px;
  margin-top: 3px;
}
.tx-bar {
  flex: 1;
  background: linear-gradient(180deg, #fbbf24, #ea580c);
  border-radius: 2px;
  opacity: 0.8;
}
.tx[data-tone="crimson"] .tx-bar { background: linear-gradient(180deg, #ef4444, #b91c1c); }
.tx[data-tone="amber"]   .tx-bar { background: linear-gradient(180deg, #fbbf24, #c2410c); }
.tx-foot {
  font-size: 9px; font-weight: 700; letter-spacing: 0.06em;
  color: var(--hr-text-muted);
}

/* Controls */
.br-controls {
  display: inline-flex; align-items: center; gap: 10px; flex-wrap: wrap;
  margin-top: 4px;
}
.br-btn {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 9px 16px;
  border-radius: 11px;
  font: inherit; font-size: 12px; font-weight: 800; letter-spacing: 0.04em;
  border: 1px solid;
  cursor: pointer;
  transition: transform .22s cubic-bezier(0.34, 1.56, 0.64, 1), background .25s, border-color .25s, box-shadow .25s;
}
.br-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.br-btn.primary {
  background: linear-gradient(135deg, #fde68a, #fbbf24 40%, #fb923c);
  border-color: rgba(251, 191, 36, 0.65);
  color: #1f1408;
  box-shadow: 0 14px 28px -12px rgba(251, 146, 60, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.45);
}
.br-btn.primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 20px 38px -14px rgba(251, 146, 60, 0.70);
}
.br-btn.ghost {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(251, 191, 36, 0.30);
  color: var(--hr-text);
}
.br-btn.ghost:hover:not(:disabled) {
  transform: translateY(-2px);
  background: rgba(251, 191, 36, 0.10);
  border-color: rgba(251, 146, 60, 0.55);
}
[data-theme="light"] .br-btn.ghost {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(180, 83, 9, 0.26);
  color: #3a1f0b;
}
[data-theme="light"] .br-btn.ghost:hover:not(:disabled) {
  background: rgba(251, 191, 36, 0.20);
  border-color: rgba(180, 83, 9, 0.42);
}
.br-pill {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px dashed rgba(251, 191, 36, 0.30);
  color: var(--hr-text-muted);
  font-size: 10.5px; font-weight: 700; letter-spacing: 0.06em;
}
[data-theme="light"] .br-pill {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(180, 83, 9, 0.30);
  color: #6b5840;
}
.br-pill svg { color: #fbbf24; }
[data-theme="light"] .br-pill svg { color: #b45309; }

/* ════════════════════════════════════════════════════════════════════════════
   02 · MANAGER ROSTER RIBBON
   ════════════════════════════════════════════════════════════════════════════ */
.roster {
  display: flex; flex-direction: column; gap: 12px;
}
.roster-head {
  display: flex; flex-direction: column; gap: 4px;
}
.rh-eye {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase;
  color: #fbbf24;
  width: max-content;
}
.rh-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #fbbf24; box-shadow: 0 0 8px #fbbf24;
  animation: led-blink 2s ease-in-out infinite;
}
[data-theme="light"] .rh-eye { color: #b45309; }
[data-theme="light"] .rh-dot { background: #b45309; box-shadow: 0 0 6px rgba(180, 83, 9, 0.55); }
.rh-title {
  margin: 0;
  font-size: 22px; font-weight: 900; letter-spacing: -0.018em;
  color: var(--hr-text);
}
.rh-meta {
  font-size: 11px; font-weight: 700; color: var(--hr-text-muted);
  letter-spacing: 0.06em;
}

.roster-strip {
  display: flex; gap: 12px; flex-wrap: wrap;
}

.chip {
  position: relative;
  display: inline-flex; align-items: center; gap: 11px;
  padding: 11px 14px 11px 16px;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(28, 18, 10, 0.68), rgba(20, 14, 8, 0.82));
  border: 1px solid rgba(251, 191, 36, 0.22);
  color: var(--hr-text);
  font: inherit; cursor: pointer; text-align: left;
  overflow: hidden;
  isolation: isolate;
  transition: border-color .22s, transform .25s, box-shadow .25s;
  min-width: 240px;
}
[data-theme="light"] .chip {
  background: linear-gradient(180deg, rgba(255, 250, 240, 0.92), rgba(255, 244, 218, 0.94));
  border-color: rgba(180, 83, 9, 0.20);
}
.chip-rail {
  position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: #fbbf24;
  box-shadow: 0 0 10px #fbbf24;
}
.chip[data-tone="emerald"] { border-color: rgba(52, 211, 153, 0.55); }
.chip[data-tone="emerald"] .chip-rail { background: #34d399; box-shadow: 0 0 10px #34d399; }
.chip[data-tone="amber"] { border-color: rgba(245, 158, 11, 0.55); }
.chip[data-tone="amber"] .chip-rail { background: #f59e0b; box-shadow: 0 0 10px #f59e0b; }
.chip[data-tone="crimson"] { border-color: rgba(239, 68, 68, 0.55); }
.chip[data-tone="crimson"] .chip-rail {
  background: #ef4444; box-shadow: 0 0 14px #ef4444;
  animation: rail-pulse 0.9s ease-in-out infinite;
}
@keyframes rail-pulse {
  0%, 100% { opacity: 0.85; }
  50%      { opacity: 1; }
}
.chip:hover {
  border-color: color-mix(in srgb, currentColor 50%, transparent);
  box-shadow: 0 14px 28px -16px rgba(251, 191, 36, 0.40);
}
.chip.is-active {
  background: linear-gradient(180deg, rgba(251, 191, 36, 0.16), rgba(251, 146, 60, 0.08));
  border-color: rgba(251, 191, 36, 0.75);
}
[data-theme="light"] .chip.is-active {
  background: linear-gradient(180deg, rgba(251, 191, 36, 0.28), rgba(251, 146, 60, 0.14));
  border-color: rgba(180, 83, 9, 0.55);
}

.chip-avatar {
  position: relative;
  width: 38px; height: 38px; border-radius: 50%;
  display: grid; place-items: center;
  background: linear-gradient(135deg, #fde68a, #fbbf24 50%, #fb923c);
  color: #1f1408;
  font-weight: 800; font-size: 13px;
  flex-shrink: 0;
  box-shadow: 0 6px 14px -6px rgba(251, 146, 60, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.4);
}
.ca-init { position: relative; z-index: 2; }
.ca-glyph {
  position: absolute; inset: 3px;
  border-radius: 50%;
  border: 1px dashed rgba(31, 20, 8, 0.35);
}
.chip[data-tone="emerald"] .chip-avatar { background: linear-gradient(135deg, #6ee7b7, #34d399 50%, #059669); }
.chip[data-tone="amber"]   .chip-avatar { background: linear-gradient(135deg, #fef3c7, #f59e0b 50%, #c2410c); }
.chip[data-tone="crimson"] .chip-avatar { background: linear-gradient(135deg, #fecaca, #ef4444 50%, #991b1b); color: #fff; }
.chip-meta { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; }
.chip-name { font-size: 13px; font-weight: 800; color: var(--hr-text); }
.chip-sub { font-size: 10px; color: var(--hr-text-muted); letter-spacing: 0.04em; }
.chip-load {
  display: flex; align-items: center; gap: 7px;
  flex-shrink: 0;
}
.chip-load-bar {
  width: 56px; height: 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
  border: 1px solid rgba(251, 191, 36, 0.18);
}
[data-theme="light"] .chip-load-bar { background: rgba(180, 83, 9, 0.10); border-color: rgba(180, 83, 9, 0.18); }
.chip-load-fill {
  display: block; height: 100%;
  background: linear-gradient(90deg, #fbbf24, #fb923c);
}
.chip[data-tone="emerald"] .chip-load-fill { background: linear-gradient(90deg, #34d399, #059669); }
.chip[data-tone="amber"]   .chip-load-fill { background: linear-gradient(90deg, #f59e0b, #c2410c); }
.chip[data-tone="crimson"] .chip-load-fill { background: linear-gradient(90deg, #ef4444, #991b1b); }
.chip-load-num {
  font-size: 14px; font-weight: 900; color: var(--hr-text);
  font-variant-numeric: tabular-nums;
}

/* ════════════════════════════════════════════════════════════════════════════
   03 · BRIEFINGS — landscape cards
   ════════════════════════════════════════════════════════════════════════════ */
.briefs {
  display: flex; flex-direction: column; gap: 14px;
}
.briefs-head {
  display: flex; flex-direction: column; gap: 5px;
}
.bh-eye {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase;
  color: #fbbf24;
  width: max-content;
}
.bh-dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: #fbbf24; box-shadow: 0 0 8px #fbbf24;
  animation: led-blink 2s ease-in-out infinite;
}
[data-theme="light"] .bh-eye { color: #b45309; }
[data-theme="light"] .bh-dot { background: #b45309; box-shadow: 0 0 6px rgba(180, 83, 9, 0.55); }
.bh-title {
  margin: 0;
  font-size: 22px; font-weight: 900; letter-spacing: -0.018em;
  color: var(--hr-text);
}
.bh-sub {
  margin: 0; max-width: 720px;
  font-size: 12.5px; line-height: 1.55; color: var(--hr-text-secondary);
}
.bh-sub b { color: #fbbf24; font-weight: 800; }
[data-theme="light"] .bh-sub b { color: #b45309; }

/* Grid — cards are LANDSCAPE; one per row on narrow, two on wide */
.brief-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}
@media (min-width: 1100px) {
  .brief-grid { grid-template-columns: repeat(2, 1fr); }
}
.brief-skel {
  height: 140px; padding: 18px;
  display: flex; align-items: center; gap: 14px;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(28, 18, 10, 0.55), rgba(20, 14, 8, 0.70));
  border: 1px solid rgba(251, 191, 36, 0.16);
}
[data-theme="light"] .brief-skel {
  background: linear-gradient(180deg, rgba(255, 250, 240, 0.86), rgba(255, 244, 218, 0.90));
  border-color: rgba(180, 83, 9, 0.16);
}

/* Empty state */
.brief-empty {
  display: flex; flex-direction: column; align-items: center; gap: 8px;
  padding: 60px 24px;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(28, 18, 10, 0.55), rgba(20, 14, 8, 0.78));
  border: 1px dashed rgba(251, 191, 36, 0.30);
  color: var(--hr-text);
  text-align: center;
}
[data-theme="light"] .brief-empty {
  background: linear-gradient(180deg, rgba(255, 250, 240, 0.85), rgba(255, 244, 218, 0.90));
  border-color: rgba(180, 83, 9, 0.30);
}
.be-frame {
  position: relative;
  display: grid; place-items: center;
  width: 130px; height: 80px;
  margin-bottom: 4px;
  color: #fbbf24;
}
.be-svg {
  position: absolute; inset: 0;
  width: 100%; height: 100%;
}
.be-trace {
  stroke-dasharray: 200;
  animation: be-trace-draw 2s ease-in-out infinite;
}
@keyframes be-trace-draw {
  0%   { stroke-dashoffset: 0; }
  100% { stroke-dashoffset: -100; }
}
.brief-empty strong { font-size: 16px; font-weight: 800; }
.brief-empty span { font-size: 12.5px; color: var(--hr-text-secondary); max-width: 380px; }

/* ── Brief card — landscape "node-card" with 4 stacked strips ── */
.brief {
  position: relative;
  display: flex; flex-direction: column;
  border-radius: 18px;
  background:
    radial-gradient(80% 60% at 0% 0%, color-mix(in srgb, var(--c) 12%, transparent), transparent 65%),
    linear-gradient(180deg, rgba(28, 18, 10, 0.72), rgba(20, 14, 8, 0.86));
  border: 1px solid color-mix(in srgb, var(--c) 28%, rgba(251, 191, 36, 0.18));
  overflow: hidden;
  isolation: isolate;
  transform-style: preserve-3d;
  transition:
    transform .35s cubic-bezier(0.16, 1, 0.3, 1),
    border-color .25s,
    box-shadow .25s;
}
[data-theme="light"] .brief {
  background:
    radial-gradient(80% 60% at 0% 0%, color-mix(in srgb, var(--c) 18%, transparent), transparent 65%),
    linear-gradient(180deg, rgba(255, 250, 240, 0.94), rgba(255, 244, 218, 0.96));
  border-color: color-mix(in srgb, var(--c) 34%, rgba(180, 83, 9, 0.18));
}
.brief:hover {
  border-color: color-mix(in srgb, var(--c) 60%, transparent);
  box-shadow: 0 22px 48px -28px color-mix(in srgb, var(--c) 65%, transparent);
}
.brief[data-age="mid"]      { box-shadow: 0 16px 32px -22px rgba(245, 158, 11, 0.40); }
.brief[data-age="old"]      { box-shadow: 0 18px 36px -22px rgba(251, 146, 60, 0.50); }
.brief[data-age="critical"] { box-shadow: 0 20px 38px -22px rgba(239, 68, 68, 0.55); border-color: rgba(239, 68, 68, 0.55); }

/* Decorative corner tracer (subtle depth, NEVER clickable) */
.br-trace {
  position: absolute; inset: 0;
  background:
    linear-gradient(115deg, transparent 0% 92%, rgba(251, 191, 36, 0.15) 92% 93%, transparent 93% 100%);
  pointer-events: none;
  opacity: 0.65;
  z-index: 0;
}

/* ── STRIP 1 · HEADER ─ left identity + right status ── */
.br-head {
  position: relative; z-index: 1;
  display: flex; align-items: center; justify-content: space-between; gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid color-mix(in srgb, var(--c) 18%, rgba(251, 191, 36, 0.10));
  background: linear-gradient(180deg, color-mix(in srgb, var(--c) 9%, transparent), transparent);
  cursor: pointer;
}
[data-theme="light"] .br-head {
  border-bottom-color: color-mix(in srgb, var(--c) 22%, rgba(180, 83, 9, 0.10));
}
.bh-left {
  display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1;
}
.bh-right {
  display: flex; flex-direction: column; align-items: flex-end; gap: 4px;
  flex-shrink: 0;
}
.bh-ref {
  font-size: 9.5px; font-weight: 700;
  color: var(--hr-text-muted);
  letter-spacing: 0.06em;
}

.br-avatar {
  position: relative;
  width: 42px; height: 42px; border-radius: 50%;
  display: grid; place-items: center;
  background: linear-gradient(135deg, color-mix(in srgb, var(--c) 70%, #fbbf24), color-mix(in srgb, var(--c) 30%, #fb923c));
  color: #1f1408;
  font-weight: 900; font-size: 14px;
  flex-shrink: 0;
  box-shadow: 0 8px 18px -10px color-mix(in srgb, var(--c) 70%, transparent), inset 0 1px 0 rgba(255, 255, 255, 0.4);
}
.av-init { position: relative; z-index: 2; }
.av-orbit {
  position: absolute; inset: -5px;
  border-radius: 50%;
  border: 1px dashed color-mix(in srgb, var(--c) 55%, transparent);
  animation: orbit-spin 14s linear infinite;
  pointer-events: none;
}
@keyframes orbit-spin { to { transform: rotate(360deg); } }
.av-pulse {
  position: absolute; inset: -3px;
  border-radius: 50%;
  border: 1px solid color-mix(in srgb, var(--c) 65%, transparent);
  animation: av-pulse-grow 2.4s ease-in-out infinite;
  pointer-events: none;
}
@keyframes av-pulse-grow {
  0%, 100% { transform: scale(1); opacity: 0.55; }
  50%      { transform: scale(1.15); opacity: 0; }
}
.br-who {
  display: flex; flex-direction: column; gap: 2px; min-width: 0;
}
.who-name {
  font-size: 14px; font-weight: 800; color: var(--hr-text);
  letter-spacing: -0.005em;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  max-width: 100%;
}
.who-meta {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10px; letter-spacing: 0.06em; color: var(--hr-text-muted);
}
.who-sep { color: color-mix(in srgb, var(--c) 60%, transparent); }
[data-theme="light"] .who-sep { color: color-mix(in srgb, var(--c) 50%, #b45309); }

/* ── STRIP 2 · BODY ─ 3-col data cells ── */
.br-body {
  position: relative; z-index: 1;
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
  padding: 12px 16px;
  cursor: pointer;
}
@media (max-width: 540px) { .br-body { grid-template-columns: 1fr; } }
.cell {
  display: flex; flex-direction: column; gap: 4px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid color-mix(in srgb, var(--c) 18%, rgba(251, 191, 36, 0.10));
  min-width: 0;
}
[data-theme="light"] .cell {
  background: rgba(255, 250, 240, 0.75);
  border-color: color-mix(in srgb, var(--c) 22%, rgba(180, 83, 9, 0.10));
}
.cell-eye {
  font-size: 9px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--hr-text-muted);
}
.cell-line {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12.5px; font-weight: 700; color: var(--hr-text);
  min-width: 0;
}
.cell-line strong {
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  max-width: 100%;
}
.cell-line.leave-mono {
  font-size: 11px; font-weight: 700; color: var(--hr-text-secondary);
}
.cell-line svg { color: var(--c); flex-shrink: 0; }
.cell-half {
  padding: 1px 5px; border-radius: 999px;
  font-size: 8.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
  background: rgba(251, 191, 36, 0.15);
  border: 1px solid rgba(251, 191, 36, 0.30);
  color: #fbbf24;
}
[data-theme="light"] .cell-half { color: #b45309; border-color: rgba(180, 83, 9, 0.30); }
.cell-days {
  font-size: 18px; font-weight: 900; letter-spacing: -0.015em;
  color: var(--c);
  font-variant-numeric: tabular-nums;
}
.cell-line small { font-size: 9.5px; font-weight: 700; color: var(--hr-text-muted); }

/* ── STRIP 3 · REASON ── */
.br-reason {
  position: relative; z-index: 1;
  margin: 0 16px;
  display: flex; gap: 8px; align-items: flex-start;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.03);
  border-left: 2px solid color-mix(in srgb, var(--c) 50%, transparent);
  font-size: 12px; font-style: italic; line-height: 1.5;
  color: var(--hr-text-secondary);
  cursor: pointer;
}
[data-theme="light"] .br-reason {
  background: rgba(255, 244, 218, 0.55);
  color: #6b4d20;
}
.br-reason-q { color: var(--c); flex-shrink: 0; margin-top: 3px; opacity: 0.7; }

/* ── STRIP 4 · FOOTER ─ aging rail + manager + CTA ── */
.br-foot {
  position: relative; z-index: 1;
  display: grid; grid-template-columns: 1fr auto auto; gap: 12px;
  align-items: center;
  padding: 12px 16px 14px;
  margin-top: 8px;
  border-top: 1px dashed color-mix(in srgb, var(--c) 22%, rgba(251, 191, 36, 0.12));
}
[data-theme="light"] .br-foot {
  border-top-color: color-mix(in srgb, var(--c) 28%, rgba(180, 83, 9, 0.12));
}
@media (max-width: 560px) {
  .br-foot { grid-template-columns: 1fr; gap: 8px; }
}

/* Horizontal aging rail — replaces the bleeding vertical SVG column */
.ag-rail {
  display: flex; align-items: center; gap: 8px;
  min-width: 0;
}
.ag-eye {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.06em;
  color: var(--hr-text-muted);
  flex-shrink: 0;
}
.ag-eye svg { color: var(--c); }
.ag-track {
  position: relative;
  flex: 1; min-width: 80px;
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid color-mix(in srgb, var(--c) 22%, rgba(251, 191, 36, 0.14));
  overflow: hidden;
}
[data-theme="light"] .ag-track {
  background: rgba(180, 83, 9, 0.10);
  border-color: color-mix(in srgb, var(--c) 28%, rgba(180, 83, 9, 0.18));
}
.ag-fill {
  display: block; height: 100%;
  background: linear-gradient(90deg, #fde047, #f59e0b 60%, #ea580c);
  border-radius: 999px;
  box-shadow: 0 0 8px rgba(251, 191, 36, 0.45);
  transition: width .8s cubic-bezier(0.16, 1, 0.3, 1);
}
.ag-rail[data-age="mid"]      .ag-fill { background: linear-gradient(90deg, #fbbf24, #f59e0b 60%, #c2410c); }
.ag-rail[data-age="old"]      .ag-fill { background: linear-gradient(90deg, #f59e0b, #ea580c 60%, #c2410c); }
.ag-rail[data-age="critical"] .ag-fill {
  background: linear-gradient(90deg, #fb923c, #ef4444 60%, #b91c1c);
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.55);
  animation: ag-fill-pulse 1.6s ease-in-out infinite;
}
@keyframes ag-fill-pulse {
  0%, 100% { opacity: 0.95; }
  50%      { opacity: 0.65; }
}
.ag-tick {
  position: absolute; top: 0; bottom: 0; width: 1px;
  background: rgba(255, 255, 255, 0.18);
  pointer-events: none;
}
[data-theme="light"] .ag-tick { background: rgba(120, 53, 15, 0.20); }
.ag-num {
  font-size: 10px; font-weight: 800; letter-spacing: 0.04em;
  color: var(--hr-text-muted);
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
  min-width: 28px;
  text-align: right;
}
.ag-rail[data-age="critical"] .ag-num { color: #fca5a5; }
.ag-rail[data-age="old"]      .ag-num { color: #fcd34d; }
[data-theme="light"] .ag-rail[data-age="critical"] .ag-num { color: #b91c1c; }
[data-theme="light"] .ag-rail[data-age="old"]      .ag-num { color: #b45309; }

.br-mgr {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 10px; font-weight: 700;
  color: var(--hr-text-muted);
  letter-spacing: 0.04em;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px dashed rgba(251, 191, 36, 0.30);
  white-space: nowrap;
}
.br-mgr b { color: var(--hr-text); font-weight: 800; }
[data-theme="light"] .br-mgr {
  background: rgba(255, 250, 240, 0.65);
  border-color: rgba(180, 83, 9, 0.30);
}
[data-theme="light"] .br-mgr b { color: #3a1f0b; }
.br-mgr svg { color: #fbbf24; }
[data-theme="light"] .br-mgr svg { color: #b45309; }

.br-cta {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 8px 14px;
  border-radius: 10px;
  background: linear-gradient(135deg, #fde68a, #fbbf24 40%, #fb923c);
  border: 1px solid rgba(251, 191, 36, 0.65);
  color: #1f1408;
  font: inherit; font-size: 11.5px; font-weight: 800; letter-spacing: 0.04em;
  cursor: pointer;
  box-shadow: 0 10px 22px -12px rgba(251, 146, 60, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.45);
  transition: transform .22s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow .25s, letter-spacing .3s;
  white-space: nowrap;
  flex-shrink: 0;
}
.br-cta:hover {
  transform: translateY(-2px);
  letter-spacing: 0.06em;
  box-shadow: 0 16px 32px -14px rgba(251, 146, 60, 0.75);
}
.br-cta:active { transform: translateY(0); }

/* ════════════════════════════════════════════════════════════════════════════
   Misc utilities
   ════════════════════════════════════════════════════════════════════════════ */
.spin { animation: br-spin 1s linear infinite; }
@keyframes br-spin { to { transform: rotate(360deg); } }

/* Reduce motion */
@media (prefers-reduced-motion: reduce) {
  .bg-mist, .bg-rays,
  .rg-rings circle, .rs-led, .led-pulse, .av-orbit, .av-pulse,
  .br-trace, .word-em::after, .be-trace,
  .chip[data-tone="crimson"] .chip-rail, .rh-dot, .bh-dot,
  .blip.is-active .blip-halo { animation: none !important; }
}
</style>
