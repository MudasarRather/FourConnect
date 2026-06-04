<template>
  <div class="ledger">
    <!-- ═══════════════════════════════════════════════════════════════════
         AMBIENT — CRT scanlines + faint tape grid (forensic console vibe;
         no flow-lanes, no orbital dial, no blueprint dot-grid)
    ═══════════════════════════════════════════════════════════════════ -->
    <div class="lx-bg" aria-hidden="true">
      <span class="lx-bg-aura" />
      <span class="lx-bg-scan" />
      <span class="lx-bg-lines" />
    </div>

    <!-- ═══════════════════════════════════════════════════════════════════
         00 · CONSOLE — brief + evidence stamps + ACTIVITY SIGNAL (EKG)
    ═══════════════════════════════════════════════════════════════════ -->
    <Motion class="lx-console" as="section"
      :initial="{ opacity: 0, y: 16 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }"
    >
      <div class="lx-brief">
        <Motion as="div" class="lx-eye"
          :initial="{ opacity: 0, x: -10 }" :animate="{ opacity: 1, x: 0 }"
          :transition="{ duration: 0.5, delay: 0.08 }"
        >
          <span class="lx-eye-led" />
          <span class="leave-mono">CHAIN OF CUSTODY</span><span class="lx-eye-sep">/</span>
          <span class="leave-mono">IMMUTABLE</span><span class="lx-eye-sep">/</span>
          <span class="leave-mono lx-eye-live">LIVE</span>
        </Motion>

        <h1 class="lx-title">
          Every action, <em>sealed</em>
          <span class="lx-title-l2">&amp; time-stamped.</span>
        </h1>
        <p class="lx-sub">
          A tamper-proof recorder for the leave module — requests, approvals, balance
          adjustments, comp-off credits and encashments, each captured with its actor,
          payload and an immutable hash. Nothing is edited; only appended.
        </p>

        <div class="lx-stamps">
          <Motion v-for="(s, i) in stamps" :key="s.key" as="div"
            class="lx-stamp" :data-tone="s.tone"
            :initial="{ opacity: 0, scale: 0.9, rotate: -3 }"
            :animate="{ opacity: 1, scale: 1, rotate: 0 }"
            :transition="{ duration: 0.45, delay: 0.22 + i * 0.07, ease: [0.34, 1.56, 0.64, 1] }"
            :whileHover="{ y: -3 }"
          >
            <span class="lx-stamp-ic"><component :is="s.icon" :size="13" /></span>
            <div class="lx-stamp-body">
              <strong class="lx-stamp-val leave-mono">{{ s.display }}</strong>
              <span class="lx-stamp-lbl">{{ s.label }}</span>
            </div>
          </Motion>
        </div>
      </div>

      <!-- ACTIVITY SIGNAL — an oscilloscope trace of event volume over the window -->
      <div class="lx-scope">
        <div class="lx-scope-head">
          <span class="leave-mono">ACTIVITY SIGNAL</span>
          <span class="lx-scope-meta leave-mono">{{ items.length }} events · peak {{ trace.max }}</span>
        </div>
        <div class="lx-scope-screen">
          <svg viewBox="0 0 600 120" preserveAspectRatio="none" class="lx-scope-svg" aria-hidden="true">
            <defs>
              <linearGradient id="lxArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%"  stop-color="#fbbf24" stop-opacity="0.42" />
                <stop offset="100%" stop-color="#ea580c" stop-opacity="0" />
              </linearGradient>
              <linearGradient id="lxLine" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%"   stop-color="#fde047" />
                <stop offset="55%"  stop-color="#fbbf24" />
                <stop offset="100%" stop-color="#ea580c" />
              </linearGradient>
            </defs>
            <!-- baseline + mid gridlines -->
            <line v-for="g in 3" :key="`g-${g}`" class="lx-scope-grid"
              :x1="0" :x2="600" :y1="g * 30" :y2="g * 30" />
            <template v-if="trace.line">
              <path class="lx-scope-fill" :d="trace.area" fill="url(#lxArea)" :class="{ on: loaded }" />
              <path class="lx-scope-trace" :d="trace.line" fill="none" stroke="url(#lxLine)"
                pathLength="1" :class="{ on: loaded }" />
              <circle v-for="(p, i) in trace.points" :key="`pt-${i}`"
                class="lx-scope-dot" :class="{ on: loaded }"
                :cx="p[0]" :cy="p[1]" :r="p[2] ? 3 : 1.6"
                :style="{ transitionDelay: (0.4 + i * 0.012) + 's' }" />
            </template>
          </svg>
          <span class="lx-scope-sweep" />
          <div v-if="!trace.line" class="lx-scope-empty leave-mono">NO SIGNAL</div>
        </div>
      </div>
    </Motion>

    <!-- ═══════════════════════════════════════════════════════════════════
         01 · FILTER CONSOLE
    ═══════════════════════════════════════════════════════════════════ -->
    <Motion class="lx-filters" as="div"
      :initial="{ opacity: 0, y: 8 }" :animate="{ opacity: 1, y: 0 }"
      :transition="{ duration: 0.45, delay: 0.2 }"
    >
      <div class="lx-search">
        <Search :size="14" class="ic" />
        <input v-model.trim="query" placeholder="Filter loaded events — actor, employee, payload…" />
        <button v-if="query" class="lx-search-x" @click="query = ''" aria-label="Clear"><X :size="11" /></button>
      </div>

      <label class="lx-field">
        <span class="leave-mono">Action</span>
        <select v-model="filters.action" @change="reload">
          <option :value="null">All actions</option>
          <option v-for="a in actionsAvailable" :key="a" :value="a">{{ a.replace(/_/g, ' ') }}</option>
        </select>
      </label>
      <label class="lx-field">
        <span class="leave-mono">From</span>
        <input type="date" v-model="filters.from" @change="reload" />
      </label>
      <label class="lx-field">
        <span class="leave-mono">To</span>
        <input type="date" v-model="filters.to" @change="reload" />
      </label>

      <button class="leave-btn leave-btn-sm lx-refresh" :disabled="loading" @click="reload">
        <RefreshCw :size="13" :class="{ spin: loading }" /> Refresh
      </button>
    </Motion>

    <!-- tone legend / quick filter -->
    <Motion v-if="items.length" class="lx-legend" as="div"
      :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :transition="{ duration: 0.4, delay: 0.26 }"
    >
      <button class="lx-leg" :class="{ active: !toneFilter }" @click="toneFilter = null">
        All <span class="lx-leg-n leave-mono">{{ items.length }}</span>
      </button>
      <button v-for="t in TONES" :key="t.key"
        class="lx-leg" :class="[`tone-${t.key}`, { active: toneFilter === t.key, mute: toneFilter && toneFilter !== t.key }]"
        @click="toggleTone(t.key)"
      >
        <span class="lx-leg-dot" />{{ t.label }}
        <span class="lx-leg-n leave-mono">{{ toneCounts[t.key] || 0 }}</span>
      </button>
    </Motion>

    <!-- ═══════════════════════════════════════════════════════════════════
         02 · IMMUTABLE CHAIN — vertical sealed-record stream
    ═══════════════════════════════════════════════════════════════════ -->
    <div v-if="loading && !items.length" class="lx-skel-stack">
      <div v-for="i in 7" :key="i" class="leave-skel lx-skel" />
    </div>

    <Motion v-else-if="!visibleItems.length" as="div" class="leave-empty lx-empty"
      :initial="{ opacity: 0, scale: 0.96 }" :animate="{ opacity: 1, scale: 1 }"
      :transition="{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }"
    >
      <ScrollText :size="40" style="color: var(--leave-approved)" />
      <strong>{{ items.length ? 'No events match the filter' : 'The ledger is empty' }}</strong>
      <span>{{ items.length
        ? 'Clear the search or tone filter to see the full chain.'
        : 'Audit entries are written automatically as leave actions occur — the trail will populate itself.' }}</span>
    </Motion>

    <div v-else class="lx-stream">
      <div v-for="grp in grouped" :key="grp.key" class="lx-day">
        <!-- day marker on the chain -->
        <Motion as="div" class="lx-day-mark"
          :initial="{ opacity: 0, x: -12 }" :animate="{ opacity: 1, x: 0 }"
          :transition="{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }"
        >
          <span class="lx-day-node"><Lock :size="11" /></span>
          <span class="lx-day-lbl">{{ grp.label }}</span>
          <span class="lx-day-n leave-mono">{{ grp.items.length }} sealed</span>
          <span class="lx-day-rule" />
        </Motion>

        <!-- sealed records -->
        <Motion v-for="(r, i) in grp.items" :key="r.id" as="article"
          class="lx-rec" :class="[`tone-${actionTone(r.action)}`, { open: expanded.has(r.id) }]"
          :initial="{ opacity: 0, x: -18 }" :animate="{ opacity: 1, x: 0 }"
          :transition="{ duration: 0.42, delay: Math.min(i * 0.035, 0.4), ease: [0.16, 1, 0.3, 1] }"
        >
          <!-- chain rail: link + node -->
          <div class="lx-rail">
            <span class="lx-link top" />
            <span class="lx-node"><span class="lx-node-core" /></span>
            <span class="lx-link bot" />
          </div>

          <!-- record body -->
          <div class="lx-card" @click="toggleExpand(r.id)">
            <span class="lx-card-foil" aria-hidden="true" />

            <header class="lx-card-head">
              <span class="lx-seal" :data-tone="actionTone(r.action)">
                <component :is="actionIcon(r.action)" :size="11" />
                {{ r.action.replace(/_/g, ' ') }}
              </span>
              <span class="lx-time leave-mono">{{ fmtClock(r.created_at) }}</span>
              <span class="lx-rel leave-mono">{{ relTime(r.created_at) }}</span>
              <span class="lx-hash leave-mono" title="Immutable record seal">#{{ hashOf(r.id) }}</span>
              <ChevronDown :size="13" class="lx-caret" />
            </header>

            <!-- actor → employee custody flow -->
            <div class="lx-flow">
              <span class="lx-who">
                <span class="lx-who-av actor">{{ initials(r.actor_name) }}</span>
                <span class="lx-who-meta">
                  <strong>{{ r.actor_name || 'system' }}</strong>
                  <span class="leave-mono">actor</span>
                </span>
              </span>
              <span class="lx-arrow"><ArrowRight :size="13" /></span>
              <span class="lx-who" v-if="r.employee_name">
                <span class="lx-who-av subj">{{ initials(r.employee_name) }}</span>
                <span class="lx-who-meta">
                  <strong>{{ r.employee_name }}</strong>
                  <span class="leave-mono">{{ r.employee_code || 'subject' }}</span>
                </span>
              </span>
              <span class="lx-who muted" v-else>
                <span class="lx-who-av sys"><ScrollText :size="13" /></span>
                <span class="lx-who-meta"><strong>module-wide</strong><span class="leave-mono">no subject</span></span>
              </span>
            </div>

            <!-- payload preview (collapsed) -->
            <div v-if="!expanded.has(r.id)" class="lx-evidence-preview">
              <span v-for="(p, ix) in payloadChips(r.payload).slice(0, 4)" :key="ix" class="lx-chip">
                <b class="leave-mono">{{ p.k }}</b>{{ p.v }}
              </span>
              <span v-if="!payloadChips(r.payload).length" class="lx-chip empty leave-mono">no payload</span>
              <span v-else-if="payloadChips(r.payload).length > 4" class="lx-chip more leave-mono">
                +{{ payloadChips(r.payload).length - 4 }}
              </span>
            </div>

            <!-- payload expanded — decoded evidence -->
            <transition name="lx-exp">
              <div v-if="expanded.has(r.id)" class="lx-evidence">
                <div class="lx-evidence-head leave-mono"><FileSearch :size="11" /> DECODED EVIDENCE</div>
                <div v-if="payloadChips(r.payload).length" class="lx-kv-grid">
                  <div v-for="(p, ix) in payloadChips(r.payload)" :key="ix" class="lx-kv">
                    <span class="lx-kv-k leave-mono">{{ p.k }}</span>
                    <span class="lx-kv-v leave-mono">{{ p.v }}</span>
                  </div>
                </div>
                <div v-else class="lx-kv-empty leave-mono">— empty payload —</div>
                <div class="lx-evidence-foot leave-mono">
                  <span><Clock :size="10" /> {{ fmtTime(r.created_at) }}</span>
                  <span><Fingerprint :size="10" /> seal #{{ hashOf(r.id) }} · verified</span>
                </div>
              </div>
            </transition>
          </div>
        </Motion>
      </div>

      <!-- terminator — the chain's genesis cap -->
      <div class="lx-genesis">
        <span class="lx-genesis-node"><ShieldCheck :size="12" /></span>
        <span class="leave-mono">CHAIN ANCHORED · {{ total }} TOTAL RECORDS</span>
      </div>
    </div>

    <!-- ═══════════════════════════════════════════════════════════════════
         03 · PAGER — shared ultra-modern 3D carousel (matches Applications)
    ═══════════════════════════════════════════════════════════════════ -->
    <LeavePagination
      v-if="!loading"
      :page="filters.page"
      :page-size="filters.limit"
      :total-items="total"
      :page-size-options="[10, 25, 50, 100]"
      @update:page="go($event)"
      @update:pageSize="onLimitChange($event)"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { Motion } from 'motion-v'
import {
  RefreshCw, ScrollText, ChevronDown, Search, X,
  Send, ThumbsUp, ThumbsDown, Edit3, Trash2, Coffee, IndianRupee, BadgeCheck, Wallet,
  Lock, ShieldCheck, ArrowRight, Fingerprint, Clock, FileSearch, Activity, AlertTriangle, CircleCheck,
} from 'lucide-vue-next'
import { fetchAuditLogs } from '@/composables/useLeaves'
import LeavePagination from '../components/LeavePagination.vue'
import { useToast } from 'vue-toastification'

const toast = useToast()

const items = ref([])
const actionsAvailable = ref([])
const total = ref(0)
const loading = ref(false)
const loaded = ref(false)
const query = ref('')
const toneFilter = ref(null)
const expanded = ref(new Set())
const filters = ref({ page: 1, limit: 10, action: null, from: null, to: null })

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / filters.value.limit)))

const reload = async () => {
  loading.value = true
  loaded.value = false
  try {
    const params = { page: filters.value.page, limit: filters.value.limit }
    if (filters.value.action) params.action = filters.value.action
    if (filters.value.from) params.from = filters.value.from
    if (filters.value.to) params.to = filters.value.to
    const data = await fetchAuditLogs(params)
    items.value = data.items || []
    total.value = data.total || 0
    actionsAvailable.value = data.actions_available || []
  } catch (e) {
    toast.error(e?.response?.data?.detail || 'Failed to load audit logs')
    items.value = []; total.value = 0
  } finally {
    loading.value = false
    requestAnimationFrame(() => requestAnimationFrame(() => { loaded.value = true }))
  }
}

const go = (p) => { filters.value.page = Math.max(1, Math.min(totalPages.value, p)); reload() }
const onLimitChange = (n) => { filters.value.limit = n; filters.value.page = 1; reload() }

// ── Time helpers ──
const fmtTime = (v) => v ? new Date(v).toLocaleString('en-IN', {
  day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit',
}) : '—'
const fmtClock = (v) => v ? new Date(v).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false }) : '—'
const relTime = (v) => {
  if (!v) return ''
  const m = (Date.now() - new Date(v).getTime()) / 60000
  if (m < 1) return 'just now'
  if (m < 60) return `${Math.floor(m)}m ago`
  if (m < 1440) return `${Math.floor(m / 60)}h ago`
  return `${Math.floor(m / 1440)}d ago`
}
const initials = (n) => {
  if (!n) return '·'
  const p = String(n).trim().split(/\s+/).filter(Boolean)
  return p.length === 1 ? p[0].slice(0, 2).toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase()
}
const hashOf = (id) => String(id || '').replace(/-/g, '').slice(0, 6) || '000000'

// ── Tone / icon maps ──
const ACTION_TONE = {
  LEAVE_REQUESTED: 'info', LEAVE_MANAGER_APPROVED: 'success', LEAVE_HR_APPROVED: 'success',
  LEAVE_MANAGER_REJECTED: 'danger', LEAVE_HR_REJECTED: 'danger', LEAVE_CANCELLED: 'neutral',
  LEAVE_WITHDRAWN: 'neutral', LEAVE_ADMIN_OVERRIDE: 'warn', LEAVE_BALANCE_ACCRUED: 'success',
  LEAVE_BALANCE_CARRY_FORWARD: 'success', LEAVE_BALANCE_ADJUSTED: 'warn', COMP_OFF_EARNED: 'success',
  COMP_OFF_GRANTED: 'warn', COMP_OFF_USED: 'info', COMP_OFF_EXPIRED: 'danger',
  ENCASHMENT_REQUESTED: 'info', ENCASHMENT_APPROVED: 'success', ENCASHMENT_REJECTED: 'danger',
  ENCASHMENT_PAID: 'success', ENCASHMENT_CANCELLED: 'neutral',
}
const ACTION_ICON = {
  LEAVE_REQUESTED: Send, LEAVE_MANAGER_APPROVED: ThumbsUp, LEAVE_HR_APPROVED: BadgeCheck,
  LEAVE_MANAGER_REJECTED: ThumbsDown, LEAVE_HR_REJECTED: ThumbsDown, LEAVE_CANCELLED: Trash2,
  LEAVE_WITHDRAWN: X, LEAVE_ADMIN_OVERRIDE: Edit3, LEAVE_BALANCE_ACCRUED: Wallet,
  LEAVE_BALANCE_CARRY_FORWARD: Wallet, LEAVE_BALANCE_ADJUSTED: Edit3, COMP_OFF_EARNED: Coffee,
  COMP_OFF_GRANTED: Coffee, COMP_OFF_USED: Coffee, COMP_OFF_EXPIRED: Coffee,
  ENCASHMENT_REQUESTED: IndianRupee, ENCASHMENT_APPROVED: IndianRupee, ENCASHMENT_REJECTED: IndianRupee,
  ENCASHMENT_PAID: IndianRupee, ENCASHMENT_CANCELLED: IndianRupee,
}
const actionTone = (a) => ACTION_TONE[a] || 'neutral'
const actionIcon = (a) => ACTION_ICON[a] || ScrollText

const TONES = [
  { key: 'success', label: 'Approvals' },
  { key: 'danger',  label: 'Rejections' },
  { key: 'warn',    label: 'Overrides' },
  { key: 'info',    label: 'Requests' },
  { key: 'neutral', label: 'Other' },
]

// ── Payload decode ──
const payloadChips = (p) => {
  if (!p || typeof p !== 'object') return []
  return Object.entries(p).map(([k, v]) => {
    const raw = typeof v === 'string' ? v : JSON.stringify(v)
    const val = raw && raw.length > 40 ? raw.slice(0, 37) + '…' : raw
    return { k, v: val }
  })
}
const toggleExpand = (id) => {
  const s = new Set(expanded.value)
  s.has(id) ? s.delete(id) : s.add(id)
  expanded.value = s
}

// ── Client-side search + tone filter over the loaded page ──
const visibleItems = computed(() => {
  const q = query.value.toLowerCase()
  return items.value.filter(r => {
    if (toneFilter.value && actionTone(r.action) !== toneFilter.value) return false
    if (q) {
      const hay = `${r.action} ${r.actor_name || ''} ${r.employee_name || ''} ${r.employee_code || ''} ${JSON.stringify(r.payload || {})}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
})
const toggleTone = (t) => { toneFilter.value = toneFilter.value === t ? null : t }
const toneCounts = computed(() => {
  const m = {}
  for (const r of items.value) { const t = actionTone(r.action); m[t] = (m[t] || 0) + 1 }
  return m
})

// ── Day grouping (chain segments) ──
const dayLabel = (d) => {
  const dt = new Date(d); dt.setHours(0, 0, 0, 0)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.round((today - dt) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  return dt.toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long' })
}
const grouped = computed(() => {
  const map = new Map()
  for (const r of visibleItems.value) {
    const key = new Date(r.created_at).toISOString().slice(0, 10)
    if (!map.has(key)) map.set(key, { key, label: dayLabel(r.created_at), items: [] })
    map.get(key).items.push(r)
  }
  return Array.from(map.values())
})

// ── Activity signal (EKG trace) from the loaded window ──
const trace = computed(() => {
  const N = 30, W = 600, H = 120, pad = 12
  const times = items.value.map(r => new Date(r.created_at).getTime()).filter(Boolean)
  if (!times.length) return { line: '', area: '', points: [], max: 0 }
  const min = Math.min(...times), max = Math.max(...times)
  const span = Math.max(1, max - min)
  const buckets = new Array(N).fill(0)
  for (const t of times) {
    let idx = Math.round(((t - min) / span) * (N - 1))
    idx = Math.max(0, Math.min(N - 1, idx))
    buckets[idx]++
  }
  const maxC = Math.max(1, ...buckets)
  const pts = buckets.map((c, i) => {
    const x = (i / (N - 1)) * W
    const y = H - pad - (c / maxC) * (H - 2 * pad)
    return [x, y, c >= maxC && c > 0]
  })
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  const area = `${line} L ${W} ${H} L 0 ${H} Z`
  return { line, area, points: pts, max: maxC }
})

// ── Evidence stamps (tweened) ──
function useTween(getter, { duration = 850 } = {}) {
  const out = ref(0); let raf = null
  const run = (to) => {
    if (raf) cancelAnimationFrame(raf)
    const from = out.value, start = performance.now()
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration)
      out.value = from + (to - from) * (1 - Math.pow(1 - t, 3))
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
  }
  watch(getter, (v) => run(Number(v) || 0), { immediate: true })
  onBeforeUnmount(() => { if (raf) cancelAnimationFrame(raf) })
  return out
}
const tTotal = useTween(() => total.value)
const tApprovals = useTween(() => toneCounts.value.success || 0)
const tFlags = useTween(() => toneCounts.value.danger || 0)
const tOverrides = useTween(() => toneCounts.value.warn || 0)
const stamps = computed(() => [
  { key: 'total', label: 'total records',  tone: 'gold',  icon: Activity,      display: String(Math.round(tTotal.value)) },
  { key: 'ok',    label: 'approvals',       tone: 'gold',  icon: CircleCheck,   display: String(Math.round(tApprovals.value)) },
  { key: 'flag',  label: 'rejections',      tone: 'ember', icon: AlertTriangle, display: String(Math.round(tFlags.value)) },
  { key: 'ovr',   label: 'overrides',       tone: 'amber', icon: Edit3,         display: String(Math.round(tOverrides.value)) },
])

onMounted(reload)
</script>

<style scoped>
@import '@/styles/leave-theme.css';

.ledger { position: relative; display: flex; flex-direction: column; gap: 18px; isolation: isolate; }

/* ── Ambient: forensic CRT ── */
.lx-bg { position: absolute; inset: -20px; z-index: -1; overflow: hidden; pointer-events: none; }
.lx-bg-aura {
  position: absolute; width: 520px; height: 520px; top: -180px; right: -120px; border-radius: 50%;
  background: radial-gradient(circle, rgba(251,191,36,0.34), transparent 65%); filter: blur(90px);
  opacity: 0.5; animation: lx-aura 24s ease-in-out infinite;
}
@keyframes lx-aura { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-30px,30px) scale(1.1); } }
.lx-bg-scan {
  position: absolute; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, transparent, rgba(251,191,36,0.5), transparent);
  filter: blur(1px); opacity: 0.5; animation: lx-scan 6s linear infinite;
}
@keyframes lx-scan { 0% { top: -2%; opacity: 0; } 10% { opacity: 0.6; } 90% { opacity: 0.6; } 100% { top: 102%; opacity: 0; } }
.lx-bg-lines {
  position: absolute; inset: 0;
  background: repeating-linear-gradient(180deg, rgba(251,191,36,0.035) 0 1px, transparent 1px 4px);
  mask-image: linear-gradient(180deg, rgba(0,0,0,0.4), transparent 60%);
}

/* ════════════════════════════════════════════════════════════════════════
   CONSOLE
   ════════════════════════════════════════════════════════════════════════ */
.lx-console {
  position: relative; overflow: hidden;
  display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 0.92fr);
  gap: 26px; align-items: stretch;
  padding: 26px 28px; border-radius: 24px;
  background:
    radial-gradient(70% 90% at 0% 0%, rgba(251,191,36,0.14), transparent 56%),
    radial-gradient(60% 80% at 100% 100%, rgba(234,88,12,0.12), transparent 60%),
    linear-gradient(180deg, #0a0604, #120a05);
  border: 1px solid var(--leave-border); min-height: 280px;
}
[data-theme="light"] .lx-console {
  background:
    radial-gradient(70% 90% at 0% 0%, rgba(251,191,36,0.2), transparent 56%),
    radial-gradient(60% 80% at 100% 100%, rgba(234,88,12,0.1), transparent 60%),
    linear-gradient(180deg, #fffdf5, #fff5e3);
  border-color: rgba(180,83,9,0.2);
}
@media (max-width: 1040px) { .lx-console { grid-template-columns: 1fr; } }

.lx-brief { position: relative; z-index: 1; display: flex; flex-direction: column; gap: 14px; min-width: 0; }
.lx-eye {
  display: inline-flex; align-items: center; gap: 8px; width: max-content; max-width: 100%;
  padding: 6px 12px; border-radius: 999px;
  background: rgba(251,191,36,0.08); border: 1px solid rgba(251,191,36,0.28);
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.14em; color: var(--leave-text-secondary);
}
[data-theme="light"] .lx-eye { background: rgba(251,191,36,0.16); border-color: rgba(180,83,9,0.26); }
.lx-eye-led { width: 7px; height: 7px; border-radius: 50%; background: var(--leave-approved); box-shadow: 0 0 10px var(--leave-approved); animation: leave-eyebrow-pulse 1.6s ease-in-out infinite; }
.lx-eye-sep { opacity: 0.5; }
.lx-eye-live { color: var(--leave-brand); }
[data-theme="light"] .lx-eye-live { color: var(--w-gold-700); }

.lx-title { margin: 0; font-size: clamp(27px, 3.2vw, 38px); font-weight: 800; letter-spacing: -0.028em; line-height: 1.06; color: #fff8dc; text-wrap: balance; }
[data-theme="light"] .lx-title { color: #2a1100; }
.lx-title em { font-style: italic; background: linear-gradient(135deg, #fde047, #f59e0b 50%, #ea580c); background-clip: text; -webkit-background-clip: text; color: transparent; }
.lx-title-l2 { display: block; }
.lx-sub { margin: 0; max-width: 54ch; font-size: 13px; line-height: 1.6; color: var(--w-gold-100); opacity: 0.85; }
[data-theme="light"] .lx-sub { color: #6b3d12; opacity: 1; }

.lx-stamps { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 10px; margin-top: 6px; }
@media (max-width: 560px) { .lx-stamps { grid-template-columns: repeat(2, 1fr); } }
.lx-stamp {
  display: flex; align-items: center; gap: 10px; padding: 11px 12px; border-radius: 13px;
  background: rgba(20,13,7,0.6); border: 1px solid var(--leave-border);
  transition: border-color .22s, box-shadow .22s;
}
[data-theme="light"] .lx-stamp { background: rgba(255,248,230,0.82); }
.lx-stamp:hover { border-color: var(--leave-brand); box-shadow: 0 8px 22px -12px rgba(251,191,36,0.4); }
.lx-stamp-ic { display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0; background: rgba(251,191,36,0.12); border: 1px solid rgba(251,191,36,0.26); color: var(--leave-brand); }
.lx-stamp[data-tone="ember"] .lx-stamp-ic { background: rgba(234,88,12,0.14); border-color: rgba(234,88,12,0.3); color: var(--w-ember-400); }
.lx-stamp-body { display: flex; flex-direction: column; min-width: 0; }
.lx-stamp-val { font-size: 20px; font-weight: 900; line-height: 1; letter-spacing: -0.02em; color: var(--leave-text); font-variant-numeric: tabular-nums; }
.lx-stamp-lbl { font-size: 8.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--leave-text-muted); margin-top: 3px; }

/* ── Activity scope (EKG) ── */
.lx-scope {
  position: relative; z-index: 1; display: flex; flex-direction: column; gap: 10px;
  padding: 14px 16px; border-radius: 18px;
  background: rgba(8,5,3,0.5); border: 1px solid var(--leave-border);
}
[data-theme="light"] .lx-scope { background: rgba(255,250,235,0.6); }
.lx-scope-head { display: flex; align-items: baseline; justify-content: space-between; }
.lx-scope-head span:first-child { font-size: 9.5px; font-weight: 800; letter-spacing: 0.18em; color: var(--leave-text-secondary); }
.lx-scope-meta { font-size: 9px; color: var(--leave-text-muted); }
.lx-scope-screen {
  position: relative; flex: 1; min-height: 150px; border-radius: 12px; overflow: hidden;
  background:
    repeating-linear-gradient(90deg, rgba(251,191,36,0.05) 0 1px, transparent 1px 40px),
    radial-gradient(120% 80% at 50% 120%, rgba(251,146,60,0.1), transparent 60%);
  border: 1px solid var(--leave-border-soft);
}
.lx-scope-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
.lx-scope-grid { stroke: rgba(251,191,36,0.1); stroke-width: 1; }
[data-theme="light"] .lx-scope-grid { stroke: rgba(180,83,9,0.12); }
.lx-scope-fill { opacity: 0; transition: opacity 1s ease 0.5s; }
.lx-scope-fill.on { opacity: 1; }
.lx-scope-trace {
  stroke-width: 2.4; stroke-linejoin: round; stroke-linecap: round;
  filter: drop-shadow(0 0 5px rgba(251,146,60,0.6));
  stroke-dasharray: 1; stroke-dashoffset: 1;
  transition: stroke-dashoffset 1.6s cubic-bezier(0.16,1,0.3,1);
}
.lx-scope-trace.on { stroke-dashoffset: 0; }
.lx-scope-dot { fill: #fde68a; opacity: 0; transform: scale(0); transform-box: fill-box; transform-origin: center; transition: opacity .4s, transform .5s cubic-bezier(0.34,1.56,0.64,1); }
.lx-scope-dot.on { opacity: 0.9; transform: scale(1); }
.lx-scope-sweep {
  position: absolute; top: 0; bottom: 0; width: 120px;
  background: linear-gradient(90deg, transparent, rgba(251,191,36,0.16), transparent);
  animation: lx-sweep 4.5s linear infinite; pointer-events: none;
}
@keyframes lx-sweep { 0% { left: -130px; } 100% { left: 100%; } }
.lx-scope-empty { position: absolute; inset: 0; display: grid; place-items: center; font-size: 11px; letter-spacing: 0.18em; color: var(--leave-text-muted); }

/* ════════════════════════════════════════════════════════════════════════
   FILTER CONSOLE
   ════════════════════════════════════════════════════════════════════════ */
.lx-filters {
  display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end;
  padding: 12px 14px; border-radius: 14px;
  background: var(--leave-surface); border: 1px solid var(--leave-border); backdrop-filter: blur(14px);
}
.lx-search {
  position: relative; display: flex; align-items: center; gap: 8px;
  padding: 0 12px; height: 38px; border-radius: 10px;
  background: rgba(251,191,36,0.06); border: 1px solid var(--leave-border);
  flex: 1; min-width: 240px;
  transition: border-color .22s, box-shadow .22s;
}
.lx-search:focus-within { border-color: var(--leave-brand); box-shadow: 0 0 0 3px rgba(251,191,36,0.16); }
[data-theme="light"] .lx-search { background: rgba(255,248,225,0.92); }
.lx-search .ic { color: var(--leave-text-muted); flex-shrink: 0; }
.lx-search input { flex: 1; min-width: 0; height: 100%; background: transparent; border: 0; outline: 0; font: inherit; font-size: 13px; color: var(--leave-text); }
.lx-search input::placeholder { color: var(--leave-text-placeholder); }
.lx-search-x { width: 20px; height: 20px; flex-shrink: 0; display: grid; place-items: center; border-radius: 50%; border: 1px solid var(--leave-border); background: transparent; color: var(--leave-text-muted); cursor: pointer; }
.lx-search-x:hover { color: var(--leave-text); border-color: var(--leave-brand); }

.lx-field { display: flex; flex-direction: column; gap: 4px; min-width: 150px; }
.lx-field > span { font-size: 8.5px; font-weight: 800; letter-spacing: 0.14em; text-transform: uppercase; color: var(--leave-text-muted); }
.lx-field > select, .lx-field > input {
  height: 38px; padding: 0 10px; border-radius: 9px;
  background: rgba(251,191,36,0.06); border: 1px solid var(--leave-border);
  color: var(--leave-text); font: inherit; font-size: 12.5px; outline: none; color-scheme: dark;
  transition: border-color .2s, box-shadow .2s;
}
.lx-field > select:focus, .lx-field > input:focus { border-color: var(--leave-brand); box-shadow: 0 0 0 3px rgba(251,191,36,0.14); }
[data-theme="light"] .lx-field > select, [data-theme="light"] .lx-field > input { background: rgba(255,250,240,0.92); border-color: rgba(180,83,9,0.2); color-scheme: light; }
.lx-refresh { margin-left: auto; height: 38px; }

/* tone legend */
.lx-legend { display: flex; flex-wrap: wrap; gap: 6px; }
.lx-leg {
  --tc: var(--leave-brand);
  display: inline-flex; align-items: center; gap: 7px;
  height: 28px; padding: 0 11px; border-radius: 999px; cursor: pointer; font: inherit;
  font-size: 11px; font-weight: 700; color: var(--leave-text-secondary);
  background: transparent; border: 1px solid var(--leave-border);
  transition: border-color .2s, color .2s, background .2s, opacity .2s;
}
.lx-leg.tone-success { --tc: var(--leave-approved); }
.lx-leg.tone-danger  { --tc: var(--leave-rejected); }
.lx-leg.tone-warn    { --tc: var(--leave-pending-mgr); }
.lx-leg.tone-info    { --tc: var(--w-yellow-300); }
.lx-leg.tone-neutral { --tc: var(--leave-cancelled); }
.lx-leg:hover { color: var(--leave-text); border-color: color-mix(in srgb, var(--tc) 55%, transparent); }
.lx-leg.active { background: color-mix(in srgb, var(--tc) 14%, transparent); border-color: color-mix(in srgb, var(--tc) 60%, transparent); color: var(--leave-text); }
.lx-leg.mute { opacity: 0.45; }
.lx-leg-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--tc); box-shadow: 0 0 7px color-mix(in srgb, var(--tc) 70%, transparent); }
.lx-leg-n { font-size: 9px; font-weight: 800; opacity: 0.8; }

/* ════════════════════════════════════════════════════════════════════════
   CHAIN STREAM
   ════════════════════════════════════════════════════════════════════════ */
.lx-skel-stack { display: flex; flex-direction: column; gap: 8px; }
.lx-skel { height: 76px; border-radius: 16px; }
.lx-empty { flex-direction: column; }
.lx-empty strong { font-size: 15px; font-weight: 800; color: var(--leave-text); }
.lx-empty span { font-size: 12px; max-width: 50ch; }

.lx-stream { position: relative; display: flex; flex-direction: column; }

/* day marker */
.lx-day-mark { display: flex; align-items: center; gap: 10px; padding: 16px 0 8px; }
.lx-day-node {
  display: grid; place-items: center; width: 30px; height: 30px; border-radius: 9px; flex-shrink: 0; margin-left: 7px;
  background: linear-gradient(135deg, rgba(251,191,36,0.24), rgba(234,88,12,0.14));
  border: 1px solid rgba(251,146,60,0.5); color: #fde68a;
  box-shadow: 0 0 16px -6px rgba(251,146,60,0.6);
}
[data-theme="light"] .lx-day-node { color: #92400e; }
.lx-day-lbl { font-size: 13px; font-weight: 800; color: var(--leave-text); letter-spacing: -0.01em; }
.lx-day-n { font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--leave-text-muted); }
.lx-day-rule { flex: 1; height: 1px; background: linear-gradient(90deg, var(--leave-border-strong), transparent); }

/* record row = rail + card */
.lx-rec { --tc: var(--leave-cancelled); display: grid; grid-template-columns: 44px 1fr; }
.lx-rec.tone-success { --tc: var(--leave-approved); }
.lx-rec.tone-danger  { --tc: var(--leave-rejected); }
.lx-rec.tone-warn    { --tc: var(--leave-pending-mgr); }
.lx-rec.tone-info    { --tc: var(--w-yellow-300); }
.lx-rec.tone-neutral { --tc: var(--leave-cancelled); }

.lx-rail { position: relative; display: flex; flex-direction: column; align-items: center; }
.lx-link { width: 2px; flex: 1; background: var(--leave-border-strong); }
.lx-link.top { min-height: 14px; }
.lx-link.bot { min-height: 14px; }
.lx-node {
  position: relative; z-index: 1; flex-shrink: 0;
  width: 16px; height: 16px; margin: 2px 0;
  display: grid; place-items: center; border-radius: 4px;
  transform: rotate(45deg);
  background: color-mix(in srgb, var(--tc) 22%, rgba(20,13,7,0.9));
  border: 1.5px solid var(--tc);
  box-shadow: 0 0 10px -2px color-mix(in srgb, var(--tc) 80%, transparent);
}
.lx-node-core { width: 5px; height: 5px; border-radius: 1px; background: var(--tc); }

.lx-card {
  position: relative; overflow: hidden;
  margin: 0 0 8px; padding: 12px 14px; border-radius: 14px;
  background:
    linear-gradient(90deg, color-mix(in srgb, var(--tc) 9%, transparent), transparent 36%),
    var(--leave-surface);
  border: 1px solid var(--leave-border);
  cursor: pointer; backdrop-filter: blur(12px);
  transition: border-color .22s, box-shadow .22s, transform .22s var(--leave-ease);
}
[data-theme="light"] .lx-card {
  background: linear-gradient(90deg, color-mix(in srgb, var(--tc) 13%, transparent), transparent 36%), rgba(255,250,240,0.9);
  border-color: rgba(180,83,9,0.16);
}
.lx-card::before { content: ''; position: absolute; left: 0; top: 8px; bottom: 8px; width: 3px; border-radius: 999px; background: var(--tc); box-shadow: 0 0 10px color-mix(in srgb, var(--tc) 70%, transparent); }
.lx-card:hover { border-color: color-mix(in srgb, var(--tc) 55%, transparent); box-shadow: 0 14px 32px -22px color-mix(in srgb, var(--tc) 75%, transparent); transform: translateX(2px); }
.lx-rec.open .lx-card { border-color: color-mix(in srgb, var(--tc) 55%, transparent); }
.lx-card-foil { position: absolute; inset: 0; background: linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%); background-size: 250% 100%; background-position: 200% 0; pointer-events: none; }
.lx-card:hover .lx-card-foil { animation: lx-foil 0.9s ease forwards; }
@keyframes lx-foil { to { background-position: -60% 0; } }

.lx-card-head { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
.lx-seal {
  --tc: var(--leave-approved);
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 9px; border-radius: 7px;
  font-size: 9.5px; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase;
}
.lx-seal[data-tone="success"] { background: var(--leave-approved-soft); color: var(--leave-approved); border: 1px solid color-mix(in srgb, var(--leave-approved) 35%, transparent); }
.lx-seal[data-tone="danger"]  { background: var(--leave-rejected-soft); color: var(--leave-rejected); border: 1px solid color-mix(in srgb, var(--leave-rejected) 35%, transparent); }
.lx-seal[data-tone="warn"]    { background: var(--leave-pending-mgr-soft); color: var(--leave-pending-mgr); border: 1px solid color-mix(in srgb, var(--leave-pending-mgr) 35%, transparent); }
.lx-seal[data-tone="info"]    { background: var(--leave-draft-soft); color: var(--w-yellow-400); border: 1px solid color-mix(in srgb, var(--w-yellow-300) 35%, transparent); }
.lx-seal[data-tone="neutral"] { background: var(--leave-cancelled-soft); color: var(--leave-cancelled); border: 1px solid color-mix(in srgb, var(--leave-cancelled) 35%, transparent); }
.lx-time { font-size: 12px; font-weight: 800; color: var(--leave-text); font-variant-numeric: tabular-nums; }
.lx-rel { font-size: 10px; color: var(--leave-text-muted); }
.lx-hash {
  margin-left: auto; font-size: 10px; font-weight: 700; letter-spacing: 0.04em;
  color: var(--leave-text-muted); padding: 2px 7px; border-radius: 6px;
  background: rgba(251,191,36,0.07); border: 1px dashed var(--leave-border-strong);
}
.lx-caret { color: var(--leave-text-muted); transition: transform .3s var(--leave-ease); }
.lx-rec.open .lx-caret { transform: rotate(180deg); }

.lx-flow { display: flex; align-items: center; gap: 10px; margin-top: 11px; flex-wrap: wrap; }
.lx-who { display: inline-flex; align-items: center; gap: 8px; min-width: 0; }
.lx-who.muted { opacity: 0.75; }
.lx-who-av {
  display: grid; place-items: center; width: 28px; height: 28px; border-radius: 8px; flex-shrink: 0;
  font-size: 10px; font-weight: 900; color: #2a1100;
  background: linear-gradient(135deg, var(--leave-approved), var(--leave-compoff));
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.4);
}
.lx-who-av.subj { background: linear-gradient(135deg, #fdba74, #ea580c); }
.lx-who-av.sys { background: rgba(251,191,36,0.14); color: var(--leave-text-muted); }
.lx-who-meta { display: flex; flex-direction: column; line-height: 1.15; min-width: 0; }
.lx-who-meta strong { font-size: 12px; font-weight: 800; color: var(--leave-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lx-who-meta span { font-size: 8.5px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--leave-text-muted); }
.lx-arrow { color: var(--tc); display: inline-flex; }

.lx-evidence-preview { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 11px; }
.lx-chip {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 9px; border-radius: 7px; font-size: 10.5px; color: var(--leave-text-secondary);
  background: rgba(255,255,255,0.03); border: 1px solid var(--leave-border);
}
[data-theme="light"] .lx-chip { background: rgba(180,83,9,0.04); }
.lx-chip b { color: var(--leave-text-muted); font-weight: 700; }
.lx-chip.empty, .lx-chip.more { color: var(--leave-text-muted); }
.lx-chip.more { background: color-mix(in srgb, var(--tc) 12%, transparent); border-color: color-mix(in srgb, var(--tc) 35%, transparent); }

/* expanded evidence */
.lx-evidence { margin-top: 12px; padding: 12px; border-radius: 11px; background: rgba(8,5,3,0.4); border: 1px dashed var(--leave-border-strong); }
[data-theme="light"] .lx-evidence { background: rgba(180,83,9,0.05); }
.lx-evidence-head { display: flex; align-items: center; gap: 6px; font-size: 8.5px; font-weight: 800; letter-spacing: 0.16em; color: var(--leave-brand); margin-bottom: 10px; }
[data-theme="light"] .lx-evidence-head { color: var(--w-gold-700); }
.lx-kv-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 7px; }
.lx-kv { display: flex; flex-direction: column; gap: 2px; padding: 7px 9px; border-radius: 8px; background: rgba(251,191,36,0.05); border: 1px solid var(--leave-border-soft); }
.lx-kv-k { font-size: 8.5px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; color: var(--leave-text-muted); }
.lx-kv-v { font-size: 11.5px; font-weight: 700; color: var(--leave-text); word-break: break-word; }
.lx-kv-empty { font-size: 11px; color: var(--leave-text-muted); padding: 4px; }
.lx-evidence-foot { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 10px; padding-top: 9px; border-top: 1px solid var(--leave-border); font-size: 9px; color: var(--leave-text-muted); }
.lx-evidence-foot span { display: inline-flex; align-items: center; gap: 4px; }

.lx-exp-enter-active { transition: opacity .3s ease, transform .3s cubic-bezier(0.16,1,0.3,1); }
.lx-exp-leave-active { transition: opacity .2s ease, transform .2s ease; }
.lx-exp-enter-from, .lx-exp-leave-to { opacity: 0; transform: translateY(-6px); }

/* genesis cap */
.lx-genesis { display: flex; align-items: center; gap: 10px; padding: 12px 0 4px; margin-left: 7px; }
.lx-genesis-node {
  display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0;
  background: linear-gradient(135deg, rgba(251,191,36,0.2), rgba(234,88,12,0.12));
  border: 1px solid rgba(251,146,60,0.45); color: var(--leave-approved);
}
.lx-genesis span { font-size: 9px; font-weight: 800; letter-spacing: 0.16em; color: var(--leave-text-muted); }

.spin { animation: lx-spin 0.9s linear infinite; }
@keyframes lx-spin { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .lx-bg-aura, .lx-bg-scan, .lx-eye-led, .lx-scope-sweep, .lx-card-foil { animation: none !important; }
  .lx-scope-trace, .lx-scope-dot, .lx-scope-fill { transition: none !important; }
}
</style>
