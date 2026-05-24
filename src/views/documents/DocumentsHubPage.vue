<template>
  <div class="atlas-root">
    <!-- AMBIENT BACKDROP -->
    <div class="atlas-backdrop" aria-hidden="true">
      <div class="atlas-base"></div>
      <div class="atlas-grain"></div>
      <div class="atlas-orb atlas-orb-1"></div>
      <div class="atlas-orb atlas-orb-2"></div>
      <div class="atlas-orb atlas-orb-3"></div>
      <svg class="atlas-mark" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <linearGradient id="atlas-mark-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.85"/>
            <stop offset="100%" stop-color="#f97316" stop-opacity="0.45"/>
          </linearGradient>
        </defs>
        <g fill="none" stroke="url(#atlas-mark-grad)" stroke-width="0.6">
          <circle cx="50" cy="50" r="48"/>
          <circle cx="50" cy="50" r="36"/>
          <circle cx="50" cy="50" r="24"/>
          <line x1="2" y1="50" x2="98" y2="50"/>
          <line x1="50" y1="2" x2="50" y2="98"/>
          <line x1="14" y1="14" x2="86" y2="86"/>
          <line x1="86" y1="14" x2="14" y2="86"/>
        </g>
      </svg>
    </div>

    <!-- HERO STRIP -->
    <header class="atlas-hero fade-up">
      <div class="hero-text">
        <div class="hero-eyebrow pop-in">
          <Compass :size="11"/>
          <span>DOCUMENT ATLAS</span>
        </div>
        <h1 class="hero-title slide-in-text">Your records, mapped.</h1>
        <p class="hero-sub">Five vaults. One command center. Navigate every document workflow from a single horizon.</p>

        <div class="hero-meta">
          <div class="hero-pill">
            <Layers :size="11"/>
            <span><strong>{{ totalsAll }}</strong> records across vault</span>
          </div>
          <div class="hero-pill">
            <Activity :size="11"/>
            <span><strong>{{ data.activity?.length || 0 }}</strong> recent events</span>
          </div>
          <div class="hero-pill">
            <HardDrive :size="11"/>
            <span><strong>{{ formatBytes(data.storage?.used_bytes || 0) }}</strong> stored</span>
          </div>
        </div>
      </div>

      <!-- Storage gauge -->
      <div class="hero-gauge pop-in">
        <svg viewBox="0 0 120 120" class="gauge-svg">
          <defs>
            <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color="#fbbf24"/>
              <stop offset="100%" stop-color="#f97316"/>
            </linearGradient>
          </defs>
          <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="8"/>
          <circle
            cx="60" cy="60" r="50" fill="none"
            stroke="url(#gauge-grad)" stroke-width="8" stroke-linecap="round"
            :stroke-dasharray="gaugeCircumference"
            :stroke-dashoffset="gaugeOffset"
            transform="rotate(-90 60 60)"
            class="gauge-arc"
          />
          <text x="60" y="58" text-anchor="middle" class="gauge-pct">{{ gaugePct }}%</text>
          <text x="60" y="72" text-anchor="middle" class="gauge-label">used</text>
        </svg>
        <div class="gauge-foot">
          <span>{{ formatBytes(data.storage?.used_bytes || 0) }}</span>
          <span class="opacity-50">of {{ formatBytes(STORAGE_QUOTA) }}</span>
        </div>
      </div>
    </header>

    <!-- VAULT FLOOR — 5 stacked tiles -->
    <section class="vault-floor">
      <article
        v-for="(v, i) in vaults"
        :key="v.kind"
        class="vault-tile fade-up"
        :style="{ animationDelay: `${0.1 + i * 0.08}s` }"
        @click="navigateVault(v)"
        tabindex="0"
        @keydown.enter="navigateVault(v)"
      >
        <!-- Stacked-paper depth -->
        <div class="vt-stack">
          <span class="vt-paper vt-paper-3"></span>
          <span class="vt-paper vt-paper-2"></span>
          <span class="vt-paper vt-paper-1"></span>
          <span class="vt-paper vt-paper-front" :class="`tint-${v.kind}`">
            <component :is="v.icon" :size="22" stroke-width="1.6"/>
          </span>
        </div>

        <div class="vt-body">
          <span class="vt-eyebrow">{{ v.eyebrow }}</span>
          <h3 class="vt-title">{{ v.label }}</h3>
          <div class="vt-count-row">
            <span class="vt-count">{{ animatedCounts[v.kind] }}</span>
            <span class="vt-suffix">{{ v.kind === 'drive' ? 'files' : 'docs' }}</span>
          </div>

          <ul class="vt-recent" v-if="(data.recent_by_kind?.[v.kind] || []).length">
            <li
              v-for="(r, ri) in (data.recent_by_kind[v.kind] || []).slice(0, 2)"
              :key="r.id"
              :style="{ animationDelay: `${0.4 + i * 0.08 + ri * 0.05}s` }"
              class="slide-in-text"
            >
              <span class="vt-bullet"></span>
              <span class="vt-recent-title">{{ r.title }}</span>
            </li>
          </ul>
          <div v-else class="vt-empty">
            <Inbox :size="11"/>
            <span>No records yet</span>
          </div>

          <div class="vt-cta">
            <span>Open</span> <ArrowUpRight :size="13"/>
          </div>
        </div>
      </article>
    </section>

    <!-- PULSE + QUICK FORGE -->
    <section class="atlas-row">
      <!-- LEFT: Pulse stream -->
      <div class="atlas-card pulse-card fade-up" style="animation-delay: 0.5s">
        <header class="ac-head">
          <div class="ac-head-left">
            <div class="ac-icon"><Activity :size="13"/></div>
            <div>
              <h4>Pulse Stream</h4>
              <p>Live activity across every vault</p>
            </div>
          </div>
          <span class="ac-tag">{{ data.activity?.length || 0 }} events</span>
        </header>

        <div class="pulse-list custom-scroll">
          <div v-if="loading" class="pulse-loading">
            <Loader2 class="spin" :size="18"/>
          </div>
          <template v-else>
            <div
              v-for="(a, i) in (data.activity || [])"
              :key="a.id"
              class="pulse-item slide-in-text"
              :style="{ animationDelay: `${0.6 + i * 0.04}s` }"
            >
              <div class="pulse-dot" :class="`dot-${actionTone(a.action)}`"></div>
              <div class="pulse-rail"></div>
              <div class="pulse-body">
                <div class="pulse-line">
                  <strong>{{ a.actor_name || 'System' }}</strong>
                  <span>{{ humanAction(a.action) }}</span>
                  <span class="pulse-target">{{ a.details || a.doc_kind }}</span>
                </div>
                <div class="pulse-meta">
                  <span class="pulse-kind-pill" :class="`kind-${a.doc_kind}`">{{ kindLabel(a.doc_kind) }}</span>
                  <span class="pulse-time">{{ timeAgo(a.created_at) }}</span>
                </div>
              </div>
            </div>
            <div v-if="!data.activity?.length" class="pulse-empty">
              <Wind :size="22" class="opacity-30"/>
              <span>No activity yet — your vault is quiet.</span>
            </div>
          </template>
        </div>
      </div>

      <!-- RIGHT: Quick Forge -->
      <div class="atlas-card forge-card fade-up" style="animation-delay: 0.6s">
        <header class="ac-head">
          <div class="ac-head-left">
            <div class="ac-icon"><Sparkles :size="13"/></div>
            <div>
              <h4>Quick Forge</h4>
              <p>Spin up a new document</p>
            </div>
          </div>
        </header>

        <div class="forge-grid">
          <button
            v-for="(q, i) in quickActions"
            :key="q.kind"
            class="forge-btn"
            :class="`forge-${q.kind}`"
            :style="{ animationDelay: `${0.7 + i * 0.06}s` }"
            @click="navigateForge(q)"
          >
            <div class="forge-glow"></div>
            <component :is="q.icon" :size="18" stroke-width="1.6"/>
            <span class="forge-label">{{ q.label }}</span>
            <ArrowUpRight :size="14" class="forge-arrow"/>
          </button>
        </div>
      </div>
    </section>

    <!-- CROSS-VAULT FEED -->
    <section class="atlas-card mixed-card fade-up" style="animation-delay: 0.7s">
      <header class="ac-head">
        <div class="ac-head-left">
          <div class="ac-icon"><Telescope :size="13"/></div>
          <div>
            <h4>Recent Across Vault</h4>
            <p>The latest across every category, side by side</p>
          </div>
        </div>
        <div class="filter-chips">
          <button
            v-for="f in filterChips"
            :key="f.kind || 'all'"
            class="filter-chip"
            :class="{ active: filterKind === f.kind }"
            @click="filterKind = f.kind"
          >{{ f.label }}</button>
        </div>
      </header>

      <transition name="filter-swap" mode="out-in">
        <div :key="filterKind || 'all'" class="mixed-list">
          <div
            v-for="r in filteredMixed"
            :key="r.id"
            class="mixed-row"
            @click="navigateRow(r)"
          >
            <span class="mr-kind" :class="`kind-${r.kind}`">{{ kindLabel(r.kind) }}</span>
            <span class="mr-title">{{ r.title }}</span>
            <span class="mr-sub">{{ r.subtitle || '—' }}</span>
            <span class="mr-status">
              <span class="mr-status-dot" :class="`status-${(r.status || '').toLowerCase()}`"></span>
              {{ r.status || '—' }}
            </span>
            <span class="mr-time">{{ timeAgo(r.updated_at) }}</span>
            <ArrowUpRight :size="12" class="mr-arrow"/>
          </div>
          <div v-if="!loading && !filteredMixed.length" class="mixed-empty">
            <FolderOpen :size="32" class="opacity-30"/>
            <span>Nothing to show in this filter.</span>
          </div>
        </div>
      </transition>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'
import { useToast } from 'vue-toastification'
import { API_BASE } from '@/utils/api'
import {
  Compass, Layers, Activity, HardDrive, ArrowUpRight, Inbox, Sparkles,
  Telescope, FolderOpen, Wind, Loader2,
  FileText, Handshake, FileSpreadsheet, FolderArchive, Cloud,
  Plus, Upload, Archive
} from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const toast = useToast()
const isAdminRoute = computed(() => route.path.includes('/admin/'))
const portal = computed(() => isAdminRoute.value ? 'admin' : 'user')

const getToken = () => isAdminRoute.value
  ? (localStorage.getItem('admin_token') || localStorage.getItem('user_token'))
  : (localStorage.getItem('user_token') || localStorage.getItem('admin_token'))

const STORAGE_QUOTA = 5 * 1024 * 1024 * 1024 // 5 GB

const data = ref({
  totals: { sla: 0, handover: 0, dpr: 0, drive: 0, archive: 0 },
  recent_by_kind: { sla: [], handover: [], dpr: [], drive: [] },
  recent_mixed: [],
  storage: { used_bytes: 0, file_count: 0, type_breakdown: [] },
  activity: [],
})
const loading = ref(true)

// Counter that animates from 0 → real values
const animatedCounts = ref({ sla: 0, handover: 0, dpr: 0, drive: 0, archive: 0 })

const totalsAll = computed(() =>
  Object.values(data.value.totals || {}).reduce((acc, n) => acc + (n || 0), 0)
)

// Storage gauge maths
const gaugeCircumference = 2 * Math.PI * 50
const gaugePct = computed(() => {
  const used = data.value.storage?.used_bytes || 0
  return Math.min(100, Math.round((used / STORAGE_QUOTA) * 100))
})
const gaugeOffset = computed(() => gaugeCircumference * (1 - gaugePct.value / 100))

// Vault tile definitions
const vaults = [
  { kind: 'sla',      label: 'SLA Agreements',   eyebrow: 'CONTRACTS',   icon: FileText,        path: '/documents/sla' },
  { kind: 'handover', label: 'Project Handover', eyebrow: 'TRANSITIONS', icon: Handshake,       path: '/documents/handover' },
  { kind: 'dpr',      label: 'DPR Reports',      eyebrow: 'PROPOSALS',   icon: FileSpreadsheet, path: '/documents/dpr' },
  { kind: 'drive',    label: 'Document Drive',   eyebrow: 'STORAGE',     icon: Cloud,           path: '/documents/document-drive' },
  { kind: 'archive',  label: 'Archive',          eyebrow: 'RECORDS HALL',icon: FolderArchive,   path: '/documents/archive' },
]

const quickActions = [
  { kind: 'sla',      label: 'New SLA',           icon: FileText,        path: '/documents/sla/new' },
  { kind: 'handover', label: 'New Handover',      icon: Handshake,       path: '/documents/handover/new' },
  { kind: 'dpr',      label: 'New DPR',           icon: FileSpreadsheet, path: '/documents/dpr/new' },
  { kind: 'drive',    label: 'Open Drive',        icon: Cloud,           path: '/documents/document-drive' },
  { kind: 'archive',  label: 'Browse Archive',    icon: Archive,         path: '/documents/archive' },
]

const filterChips = [
  { kind: null,       label: 'All' },
  { kind: 'sla',      label: 'SLA' },
  { kind: 'handover', label: 'Handover' },
  { kind: 'dpr',      label: 'DPR' },
  { kind: 'drive',    label: 'Drive' },
]
const filterKind = ref(null)

const filteredMixed = computed(() => {
  const list = data.value.recent_mixed || []
  if (!filterKind.value) return list
  return list.filter(r => r.kind === filterKind.value)
})

// --- Navigation
const prefix = () => `/${portal.value}`
const navigateVault = (v) => router.push(prefix() + v.path)
const navigateForge = (q) => router.push(prefix() + q.path)
const navigateRow = (r) => {
  const map = {
    sla:      '/documents/sla',
    handover: '/documents/handover',
    dpr:      '/documents/dpr',
    drive:    '/documents/document-drive',
  }
  router.push(prefix() + (map[r.kind] || '/documents'))
}

// --- Display helpers
const kindLabel = (k) => ({ sla:'SLA', handover:'HND', dpr:'DPR', drive:'DRV', drive_activity:'DRV', archive:'ARC' })[k] || (k || '').toUpperCase()
const formatBytes = (n) => {
  if (!+n) return '0 B'
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'], i = Math.floor(Math.log(n) / Math.log(k))
  return `${parseFloat((n / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
const timeAgo = (iso) => {
  if (!iso) return '—'
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)        return 'just now'
  if (s < 3600)      return `${Math.floor(s / 60)}m ago`
  if (s < 86400)     return `${Math.floor(s / 3600)}h ago`
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
const humanAction = (a) => {
  const v = (a || '').toLowerCase()
  return ({
    uploaded: 'uploaded', shared: 'shared', deleted: 'deleted', restored: 'restored',
    favorited: 'favorited', downloaded: 'downloaded', updated: 'updated',
    active: 'is now active', expired: 'expired', approved: 'was approved',
    completed: 'completed', rejected: 'was rejected', draft: 'started drafting',
  })[v] || a
}
const actionTone = (a) => {
  const v = (a || '').toLowerCase()
  if (['expired', 'rejected', 'deleted'].includes(v)) return 'red'
  if (['active', 'approved', 'completed'].includes(v)) return 'green'
  if (['shared', 'uploaded', 'favorited', 'downloaded'].includes(v)) return 'blue'
  return 'amber'
}

// --- Counter animation
const startCounters = () => {
  const targets = data.value.totals || {}
  Object.keys(targets).forEach((k) => {
    const target = targets[k] || 0
    const dur = 1100
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / dur)
      const eased = 1 - Math.pow(1 - t, 3)
      animatedCounts.value[k] = Math.round(target * eased)
      if (t < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}

// --- Fetch
const fetchOverview = async () => {
  loading.value = true
  try {
    const res = await axios.get(`${API_BASE}/api/documents/overview`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    data.value = res.data
    startCounters()
  } catch (e) {
    console.error('overview:', e)
    toast.error(e.response?.data?.detail || 'Failed to load overview')
  } finally {
    loading.value = false
  }
}

onMounted(fetchOverview)
watch(() => route.path, fetchOverview)
</script>

<style scoped>
/* ============================================================
   DOCUMENT ATLAS — the documents-hub command center.
   Palette: amber-500 #f59e0b · amber-400 #fbbf24 · gold #ffb900 · orange #f97316 · deep-amber #d97706
   ============================================================ */

.atlas-root {
  position: relative;
  min-height: calc(100vh - 52px);
  width: 100%;
  max-width: 1500px;
  margin: 0 auto;
  padding: 28px 28px 80px;
  color: #f5f5f7;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Outfit", sans-serif;
}

/* ----- BACKDROP ----- */
.atlas-backdrop { position: fixed; inset: 52px 0 0 0; pointer-events: none; z-index: -1; overflow: hidden; }
.atlas-base { position: absolute; inset: 0; background: radial-gradient(ellipse at top right, #1a0f05 0%, #060503 50%, #020201 100%); }
.atlas-grain {
  position: absolute; inset: 0; opacity: 0.40;
  background-image:
    radial-gradient(circle at 20% 30%, rgba(245, 158, 11, 0.025) 1px, transparent 1px),
    radial-gradient(circle at 80% 70%, rgba(255, 255, 255, 0.012) 1px, transparent 1px);
  background-size: 28px 28px, 36px 36px;
}
.atlas-orb {
  position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.55;
  will-change: transform;
}
.atlas-orb-1 { width: 480px; height: 480px; top: -120px; right: -120px; background: radial-gradient(circle, rgba(245, 158, 11, 0.20), transparent 70%); animation: orb-drift-1 22s ease-in-out infinite; }
.atlas-orb-2 { width: 360px; height: 360px; bottom: -80px; left: -80px; background: radial-gradient(circle, rgba(249, 115, 22, 0.16), transparent 70%); animation: orb-drift-2 26s ease-in-out infinite; }
.atlas-orb-3 { width: 280px; height: 280px; top: 40%; left: 40%; background: radial-gradient(circle, rgba(217, 119, 6, 0.10), transparent 70%); animation: orb-drift-3 18s ease-in-out infinite; }
@keyframes orb-drift-1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50%      { transform: translate(-40px, 30px) scale(1.06); }
}
@keyframes orb-drift-2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50%      { transform: translate(50px, -20px) scale(1.05); }
}
@keyframes orb-drift-3 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50%      { transform: translate(-25px, -25px) scale(1.10); }
}
.atlas-mark {
  position: absolute;
  top: 30%; right: -120px;
  width: 460px; height: 460px;
  opacity: 0.06;
  animation: mark-spin 80s linear infinite;
}
@keyframes mark-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

/* ----- HERO ----- */
.atlas-hero {
  display: flex; align-items: center; justify-content: space-between; gap: 40px;
  padding: 14px 0 36px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 36px;
}
.hero-text { flex: 1; min-width: 0; }
.hero-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.22em; color: #fbbf24;
  padding: 5px 12px; border-radius: 999px;
  background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.20);
  margin-bottom: 18px;
}
.hero-title {
  font-family: 'Outfit', sans-serif;
  font-size: 56px; font-weight: 700; line-height: 1.02; margin: 0 0 10px;
  letter-spacing: -0.025em;
  background: linear-gradient(120deg, #fff 30%, #fbbf24 70%, #f97316 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.hero-sub { font-size: 14px; color: rgba(255, 255, 255, 0.50); max-width: 520px; line-height: 1.6; margin: 0 0 24px; }
.hero-meta { display: flex; gap: 10px; flex-wrap: wrap; }
.hero-pill {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 7px 14px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 12px; color: rgba(255, 255, 255, 0.70);
}
.hero-pill svg { color: #fbbf24; }
.hero-pill strong { color: #fff; font-weight: 700; }

/* gauge */
.hero-gauge { display: flex; flex-direction: column; align-items: center; gap: 8px; flex-shrink: 0; }
.gauge-svg { width: 130px; height: 130px; filter: drop-shadow(0 6px 18px rgba(245, 158, 11, 0.20)); }
.gauge-arc { transition: stroke-dashoffset 1.4s cubic-bezier(0.16, 1, 0.3, 1); }
.gauge-pct { fill: #fff; font-family: 'Outfit'; font-size: 22px; font-weight: 700; }
.gauge-label { fill: rgba(255, 255, 255, 0.40); font-size: 9px; letter-spacing: 0.10em; text-transform: uppercase; }
.gauge-foot { display: flex; gap: 6px; font-size: 11px; color: rgba(255, 255, 255, 0.65); font-family: 'SF Mono', monospace; }
.gauge-foot .opacity-50 { color: rgba(255, 255, 255, 0.40); }

/* ----- VAULT FLOOR ----- */
.vault-floor {
  display: grid; grid-template-columns: repeat(5, 1fr); gap: 16px;
  margin-bottom: 36px;
}
.vault-tile {
  position: relative;
  display: flex; flex-direction: column; gap: 16px;
  padding: 20px 18px 18px;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.015) 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
  transition: all 0.45s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
  outline: none;
}
.vault-tile::before {
  content: ''; position: absolute; inset: 0; border-radius: inherit;
  background: linear-gradient(180deg, rgba(245, 158, 11, 0.04), transparent 50%);
  opacity: 0; transition: opacity 0.45s ease;
}
.vault-tile:hover, .vault-tile:focus-visible {
  transform: translateY(-6px);
  border-color: rgba(245, 158, 11, 0.35);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(245, 158, 11, 0.08) inset;
}
.vault-tile:hover::before, .vault-tile:focus-visible::before { opacity: 1; }

/* Stacked-paper ornament */
.vt-stack {
  position: relative; width: 56px; height: 64px; flex-shrink: 0;
}
.vt-paper {
  position: absolute; top: 0; left: 0;
  width: 56px; height: 64px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(255, 255, 255, 0.02);
  transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.45s ease;
}
.vt-paper-3 { transform: translate(-8px, -8px) rotate(-9deg); opacity: 0.30; }
.vt-paper-2 { transform: translate(-3px, -4px) rotate(-4deg); opacity: 0.55; }
.vt-paper-1 { transform: translate(0, -1px) rotate(-1.5deg); opacity: 0.85; }
.vt-paper-front {
  display: flex; align-items: center; justify-content: center;
  color: #1a1208;
  background: linear-gradient(135deg, #f59e0b, #f97316);
  border-color: rgba(255, 255, 255, 0.20);
  box-shadow: 0 6px 18px rgba(245, 158, 11, 0.25);
}
.vt-paper-front.tint-sla      { background: linear-gradient(135deg, #f59e0b, #f97316); }
.vt-paper-front.tint-handover { background: linear-gradient(135deg, #fbbf24, #d97706); }
.vt-paper-front.tint-dpr      { background: linear-gradient(135deg, #ffb900, #f59e0b); }
.vt-paper-front.tint-drive    { background: linear-gradient(135deg, #fbbf24, #f97316); }
.vt-paper-front.tint-archive  { background: linear-gradient(135deg, #d97706, #b45309); }

/* hover fans the stack */
.vault-tile:hover .vt-paper-3 { transform: translate(-12px, -12px) rotate(-13deg); }
.vault-tile:hover .vt-paper-2 { transform: translate(-6px, -7px) rotate(-7deg); }
.vault-tile:hover .vt-paper-1 { transform: translate(-2px, -3px) rotate(-3deg); }
.vault-tile:hover .vt-paper-front { transform: translate(2px, -2px) rotate(2deg); box-shadow: 0 12px 28px rgba(245, 158, 11, 0.40); }

/* tile body */
.vt-body { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.vt-eyebrow { font-size: 9px; font-weight: 700; color: rgba(245, 158, 11, 0.65); letter-spacing: 0.18em; }
.vt-title { font-family: 'Outfit', sans-serif; font-size: 16px; font-weight: 600; color: #fff; line-height: 1.2; margin: 0; }
.vt-count-row { display: flex; align-items: baseline; gap: 8px; margin-top: 4px; }
.vt-count {
  font-family: 'Outfit', sans-serif; font-size: 36px; font-weight: 700; line-height: 1;
  background: linear-gradient(180deg, #fff, #fbbf24);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  letter-spacing: -0.02em;
}
.vt-suffix { font-size: 11px; color: rgba(255, 255, 255, 0.40); font-weight: 500; }

.vt-recent {
  list-style: none; padding: 0; margin: 4px 0 0;
  display: flex; flex-direction: column; gap: 6px;
}
.vt-recent li {
  display: flex; align-items: center; gap: 8px;
  font-size: 11.5px; color: rgba(255, 255, 255, 0.55);
  overflow: hidden;
}
.vt-bullet {
  flex-shrink: 0; width: 5px; height: 5px; border-radius: 50%;
  background: rgba(245, 158, 11, 0.55);
  box-shadow: 0 0 6px rgba(245, 158, 11, 0.6);
}
.vt-recent-title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.vt-empty {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11px; color: rgba(255, 255, 255, 0.30);
  margin-top: 2px;
}
.vt-empty svg { color: rgba(245, 158, 11, 0.40); }

.vt-cta {
  display: inline-flex; align-items: center; gap: 4px;
  margin-top: 10px;
  padding-top: 12px;
  border-top: 1px dashed rgba(255, 255, 255, 0.06);
  font-size: 11px; font-weight: 600; color: #fbbf24;
  letter-spacing: 0.04em;
  transition: gap 0.3s ease;
}
.vault-tile:hover .vt-cta { gap: 8px; color: #ffb900; }

/* ----- ATLAS ROW (Pulse + Forge) ----- */
.atlas-row {
  display: grid; grid-template-columns: 1fr 380px; gap: 20px;
  margin-bottom: 28px;
}
.atlas-card {
  position: relative;
  border-radius: 20px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.025), rgba(255, 255, 255, 0.005));
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
  overflow: hidden;
}
.ac-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 22px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}
.ac-head-left { display: flex; align-items: center; gap: 12px; }
.ac-icon {
  width: 30px; height: 30px; border-radius: 9px;
  background: rgba(245, 158, 11, 0.10); color: #fbbf24;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid rgba(245, 158, 11, 0.18);
}
.ac-head h4 { margin: 0; font-family: 'Outfit'; font-size: 14px; font-weight: 600; color: #fff; }
.ac-head p { margin: 1px 0 0; font-size: 11px; color: rgba(255, 255, 255, 0.40); }
.ac-tag { font-size: 10px; padding: 4px 10px; border-radius: 999px; background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.18); color: #fbbf24; font-weight: 600; letter-spacing: 0.04em; }

/* Pulse */
.pulse-card { display: flex; flex-direction: column; }
.pulse-list {
  flex: 1; padding: 16px 22px; max-height: 380px; overflow-y: auto;
}
.pulse-loading { display: flex; justify-content: center; padding: 40px 0; color: #fbbf24; }
.pulse-empty { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 36px 0; color: rgba(255, 255, 255, 0.40); font-size: 12px; }

.pulse-item {
  position: relative; display: grid; grid-template-columns: 16px 1fr; gap: 14px;
  padding: 8px 0; min-height: 50px;
}
.pulse-dot {
  position: relative; z-index: 2;
  width: 12px; height: 12px; margin-top: 4px;
  border-radius: 50%;
  background: #f59e0b; border: 3px solid #060503;
  box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.40), 0 0 10px rgba(245, 158, 11, 0.40);
}
.pulse-dot.dot-amber  { background: #f59e0b; box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.4), 0 0 10px rgba(245, 158, 11, 0.4); }
.pulse-dot.dot-green  { background: #10b981; box-shadow: 0 0 0 1px rgba(16, 185, 129, 0.4), 0 0 10px rgba(16, 185, 129, 0.4); }
.pulse-dot.dot-red    { background: #ef4444; box-shadow: 0 0 0 1px rgba(239, 68, 68, 0.4), 0 0 10px rgba(239, 68, 68, 0.4); }
.pulse-dot.dot-blue   { background: #38bdf8; box-shadow: 0 0 0 1px rgba(56, 189, 248, 0.4), 0 0 10px rgba(56, 189, 248, 0.4); }
.pulse-rail {
  position: absolute; left: 5px; top: 22px; bottom: -8px; width: 2px;
  background: linear-gradient(180deg, rgba(245, 158, 11, 0.30), rgba(245, 158, 11, 0.04));
}
.pulse-item:last-child .pulse-rail { display: none; }
.pulse-body { padding-bottom: 4px; }
.pulse-line { font-size: 12.5px; color: rgba(255, 255, 255, 0.85); line-height: 1.45; }
.pulse-line strong { color: #fff; font-weight: 600; margin-right: 4px; }
.pulse-line span { color: rgba(255, 255, 255, 0.55); }
.pulse-target { color: #fbbf24 !important; margin-left: 4px; font-weight: 500; }
.pulse-meta { display: flex; gap: 8px; align-items: center; margin-top: 4px; }
.pulse-kind-pill {
  font-size: 9px; font-weight: 700; padding: 2px 7px; border-radius: 999px;
  letter-spacing: 0.06em; color: #1a1208;
  background: linear-gradient(135deg, #f59e0b, #f97316);
}
.pulse-kind-pill.kind-handover { background: linear-gradient(135deg, #fbbf24, #d97706); }
.pulse-kind-pill.kind-dpr      { background: linear-gradient(135deg, #ffb900, #f59e0b); }
.pulse-kind-pill.kind-drive    { background: linear-gradient(135deg, #fbbf24, #f97316); }
.pulse-time { font-size: 10px; color: rgba(255, 255, 255, 0.35); font-family: 'SF Mono', monospace; }

/* Forge */
.forge-card { display: flex; flex-direction: column; }
.forge-grid { padding: 16px 16px 22px; display: flex; flex-direction: column; gap: 10px; }
.forge-btn {
  position: relative; overflow: hidden;
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  color: #f5f5f7; cursor: pointer;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  animation: pop-in-anim 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
  font-size: 13px; font-weight: 600;
  text-align: left;
}
.forge-glow {
  position: absolute; inset: -1px; pointer-events: none;
  background: radial-gradient(80px 60px at var(--mx, 50%) var(--my, 50%), rgba(245, 158, 11, 0.18), transparent 60%);
  opacity: 0; transition: opacity 0.3s ease;
}
.forge-btn:hover .forge-glow { opacity: 1; }
.forge-btn:hover {
  background: rgba(245, 158, 11, 0.06);
  border-color: rgba(245, 158, 11, 0.30);
  transform: translateX(3px);
}
.forge-btn:hover .forge-arrow { transform: translateX(2px); color: #ffb900; }
.forge-btn svg:first-of-type { color: #fbbf24; flex-shrink: 0; }
.forge-label { flex: 1; }
.forge-arrow { color: rgba(255, 255, 255, 0.35); transition: all 0.25s ease; }

/* ----- MIXED FEED ----- */
.mixed-card { padding-bottom: 8px; }
.filter-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.filter-chip {
  font-size: 11px; font-weight: 600; padding: 5px 12px;
  border-radius: 999px; cursor: pointer;
  background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.55);
  transition: all 0.25s ease;
}
.filter-chip:hover { background: rgba(245, 158, 11, 0.06); color: #fbbf24; border-color: rgba(245, 158, 11, 0.20); }
.filter-chip.active {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.20), rgba(249, 115, 22, 0.10));
  border-color: rgba(245, 158, 11, 0.50);
  color: #fbbf24;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.15);
}

.mixed-list { display: flex; flex-direction: column; padding: 8px 6px 14px; }
.mixed-row {
  display: grid;
  grid-template-columns: 56px 1.4fr 1fr 0.9fr 0.7fr 16px;
  align-items: center; gap: 14px;
  padding: 12px 18px;
  border-radius: 12px;
  cursor: pointer;
  transition: background 0.25s ease, transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
}
.mixed-row::after {
  content: ''; position: absolute; left: 18px; right: 18px; bottom: 0; height: 1px;
  background: rgba(255, 255, 255, 0.04);
}
.mixed-row:last-child::after { display: none; }
.mixed-row:hover {
  background: linear-gradient(90deg, rgba(245, 158, 11, 0.06), transparent);
  transform: translateX(3px);
}
.mixed-row:hover .mr-arrow { color: #fbbf24; transform: translateX(2px); }

.mr-kind {
  font-size: 9px; font-weight: 700; padding: 4px 8px;
  border-radius: 6px; text-align: center;
  color: #1a1208;
  background: linear-gradient(135deg, #f59e0b, #f97316);
  letter-spacing: 0.06em;
}
.mr-kind.kind-handover { background: linear-gradient(135deg, #fbbf24, #d97706); }
.mr-kind.kind-dpr      { background: linear-gradient(135deg, #ffb900, #f59e0b); }
.mr-kind.kind-drive    { background: linear-gradient(135deg, #fbbf24, #f97316); }
.mr-title { font-size: 13px; font-weight: 500; color: #fff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mr-sub { font-size: 12px; color: rgba(255, 255, 255, 0.45); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mr-status { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: rgba(255, 255, 255, 0.65); font-weight: 500; }
.mr-status-dot { width: 6px; height: 6px; border-radius: 50%; background: #f59e0b; box-shadow: 0 0 5px rgba(245, 158, 11, 0.5); }
.mr-status-dot.status-active    { background: #10b981; box-shadow: 0 0 5px rgba(16, 185, 129, 0.5); }
.mr-status-dot.status-expired   { background: #f97316; }
.mr-status-dot.status-approved  { background: #fbbf24; }
.mr-status-dot.status-completed { background: #10b981; }
.mr-status-dot.status-rejected  { background: #ef4444; }
.mr-time { font-size: 10px; color: rgba(255, 255, 255, 0.40); font-family: 'SF Mono', monospace; }
.mr-arrow { color: rgba(255, 255, 255, 0.20); transition: all 0.25s ease; }

.mixed-empty {
  display: flex; flex-direction: column; align-items: center; gap: 10px;
  padding: 50px 20px;
  color: rgba(255, 255, 255, 0.35); font-size: 13px;
}

/* Filter swap — old list fades out cleanly before new list fades in (mode="out-in"
   on the wrapper). Avoids the absolute-positioned overlap we used to get with
   transition-group, and the per-row stagger that made the list look like it was
   "loading one row at a time" on tab switch. */
.filter-swap-enter-active, .filter-swap-leave-active {
  transition: opacity 0.22s ease, transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}
.filter-swap-enter-from { opacity: 0; transform: translateY(6px); }
.filter-swap-leave-to   { opacity: 0; transform: translateY(-6px); }

/* ----- shared animations ----- */
.fade-up { animation: fade-up-anim 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes fade-up-anim {
  0%   { opacity: 0; transform: translateY(20px); }
  100% { opacity: 1; transform: translateY(0); }
}
.pop-in { animation: pop-in-anim 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes pop-in-anim {
  0%   { opacity: 0; transform: scale(0.92); filter: blur(3px); }
  60%  { opacity: 1; transform: scale(1.02); filter: blur(0); }
  100% { opacity: 1; transform: scale(1); }
}
.slide-in-text { animation: slide-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes slide-in {
  0%   { opacity: 0; transform: translateX(-12px); filter: blur(4px); }
  100% { opacity: 1; transform: translateX(0); filter: blur(0); }
}
.spin { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.opacity-30 { opacity: 0.3; }
.opacity-50 { opacity: 0.5; }

.custom-scroll::-webkit-scrollbar { width: 6px; }
.custom-scroll::-webkit-scrollbar-thumb { background: rgba(245, 158, 11, 0.20); border-radius: 999px; }
.custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(245, 158, 11, 0.40); }

/* responsive */
@media (max-width: 1180px) {
  .vault-floor { grid-template-columns: repeat(3, 1fr); }
  .atlas-row { grid-template-columns: 1fr; }
  .mixed-row { grid-template-columns: 56px 1fr 0.7fr 16px; }
  .mr-sub, .mr-time { display: none; }
}
@media (max-width: 720px) {
  .atlas-hero { flex-direction: column; align-items: flex-start; }
  .vault-floor { grid-template-columns: repeat(2, 1fr); }
  .hero-title { font-size: 38px; }
}

/* ============================================================
   EXTRA ULTRA-MODERN ANIMATIONS (active in both themes)
   ============================================================ */

/* 1) Hero eyebrow — soft gold shimmer sweep across the chip */
.hero-eyebrow {
  position: relative;
  overflow: hidden;
  isolation: isolate;
}
.hero-eyebrow::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(
    100deg,
    transparent 0%, transparent 35%,
    rgba(251, 191, 36, 0.35) 50%,
    transparent 65%, transparent 100%
  );
  background-size: 220% 100%;
  animation: eyebrow-sheen 5s linear infinite;
  pointer-events: none;
  z-index: -1;
}
@keyframes eyebrow-sheen {
  0%   { background-position: -120% 0; }
  100% { background-position: 220% 0; }
}

/* 2) Hero gauge — pulsing amber halo behind the SVG */
.hero-gauge {
  position: relative;
}
.hero-gauge::before {
  content: '';
  position: absolute;
  inset: 14px;
  border-radius: 50%;
  box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.35);
  animation: gauge-halo 3.2s ease-in-out infinite;
  pointer-events: none;
}
@keyframes gauge-halo {
  0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.35); }
  50%      { box-shadow: 0 0 0 14px rgba(245, 158, 11, 0); }
}

/* 3) Pulse dots — each gets its own breathing halo */
.pulse-dot::after {
  content: '';
  position: absolute; inset: -4px;
  border-radius: 50%;
  box-shadow: 0 0 0 0 currentColor;
  animation: pulse-dot-halo 2.4s ease-in-out infinite;
  pointer-events: none;
  opacity: 0.55;
}
@keyframes pulse-dot-halo {
  0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.55); }
  50%      { box-shadow: 0 0 0 7px rgba(245, 158, 11, 0); }
}

/* 4) Vault tile — diagonal shine that sweeps on hover */
.vault-tile {
  isolation: isolate;
}
.vault-tile::after {
  content: '';
  position: absolute; top: 0; left: -150%;
  width: 60%; height: 100%;
  background: linear-gradient(
    105deg,
    transparent 0%,
    rgba(255, 255, 255, 0.08) 50%,
    transparent 100%
  );
  pointer-events: none;
  transition: left 0.9s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 0;
}
.vault-tile:hover::after,
.vault-tile:focus-visible::after {
  left: 160%;
}

/* 5) Atlas card — animated warm border glow on hover */
.atlas-card {
  transition: border-color 0.4s ease, box-shadow 0.4s ease;
}
.atlas-card:hover {
  border-color: rgba(245, 158, 11, 0.22);
  box-shadow:
    0 18px 40px -16px rgba(0, 0, 0, 0.45),
    0 0 0 1px rgba(245, 158, 11, 0.08) inset;
}

/* 6) Mixed-row arrow — tiny rotate-and-glow on hover */
.mixed-row:hover .mr-arrow {
  filter: drop-shadow(0 0 6px rgba(251, 191, 36, 0.55));
}

/* Respect reduced-motion */
@media (prefers-reduced-motion: reduce) {
  .hero-eyebrow::before,
  .hero-gauge::before,
  .pulse-dot::after,
  .atlas-orb,
  .atlas-mark,
  .vault-tile::after { animation: none !important; }
}

/* ============================================================
   LIGHT THEME OVERRIDES
   Brand palette preserved end-to-end: amber #f59e0b, gold #fbbf24,
   orange #f97316, deep-amber #d97706, teal-blue #38bdf8 (kept for
   "shared/uploaded" pulse-dot variant the user wants preserved).
   Only neutral surfaces and text colors invert for cream readability.
   ============================================================ */
[data-theme="light"] .atlas-root { color: var(--text-primary); }

/* Backdrop — soft cream wash with warm orbs */
[data-theme="light"] .atlas-base {
  background: radial-gradient(ellipse at top right, #fff4dc 0%, #fbeed3 45%, #faf7f0 100%);
}
[data-theme="light"] .atlas-grain {
  opacity: 0.30;
  background-image:
    radial-gradient(circle at 20% 30%, rgba(217, 119, 6, 0.045) 1px, transparent 1px),
    radial-gradient(circle at 80% 70%, rgba(180, 83, 9, 0.025) 1px, transparent 1px);
}
[data-theme="light"] .atlas-orb { opacity: 0.55; filter: blur(90px); }
[data-theme="light"] .atlas-orb-1 { background: radial-gradient(circle, rgba(245, 158, 11, 0.35), transparent 70%); }
[data-theme="light"] .atlas-orb-2 { background: radial-gradient(circle, rgba(249, 115, 22, 0.30), transparent 70%); }
[data-theme="light"] .atlas-orb-3 { background: radial-gradient(circle, rgba(217, 119, 6, 0.20), transparent 70%); }
[data-theme="light"] .atlas-mark { opacity: 0.12; }

/* ── HERO ── */
[data-theme="light"] .atlas-hero {
  border-bottom: 1px solid rgba(217, 119, 6, 0.18);
}
[data-theme="light"] .hero-eyebrow {
  background: rgba(255, 250, 240, 0.85);
  border: 1px solid rgba(217, 119, 6, 0.35);
  color: #b45309;
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.6) inset;
}
[data-theme="light"] .hero-title {
  background: linear-gradient(120deg, #1a1410 25%, #d97706 65%, #b45309 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
[data-theme="light"] .hero-sub { color: #4a3a28; }

[data-theme="light"] .hero-pill {
  background: rgba(255, 250, 240, 0.75);
  border: 1px solid rgba(217, 119, 6, 0.28);
  color: var(--text-primary);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.6) inset;
}
[data-theme="light"] .hero-pill :deep(svg) { color: #b45309; }
[data-theme="light"] .hero-pill strong { color: var(--text-primary); }

/* Gauge */
[data-theme="light"] .gauge-svg circle:first-of-type { stroke: rgba(217, 119, 6, 0.18); }
[data-theme="light"] .gauge-pct { fill: var(--text-primary); }
[data-theme="light"] .gauge-label { fill: #6b5840; }
[data-theme="light"] .gauge-foot { color: var(--text-primary); }
[data-theme="light"] .gauge-foot .opacity-50 { color: #6b5840; }

/* ── VAULT TILES ── */
[data-theme="light"] .vault-tile {
  background: linear-gradient(180deg, rgba(255, 250, 240, 0.85) 0%, rgba(255, 250, 240, 0.65) 100%);
  border: 1px solid rgba(217, 119, 6, 0.22);
  box-shadow:
    0 12px 30px -16px rgba(120, 75, 20, 0.22),
    0 1px 0 rgba(255, 255, 255, 0.7) inset;
}
[data-theme="light"] .vault-tile::before {
  background: linear-gradient(180deg, rgba(217, 119, 6, 0.08), transparent 50%);
}
[data-theme="light"] .vault-tile:hover,
[data-theme="light"] .vault-tile:focus-visible {
  border-color: rgba(217, 119, 6, 0.55);
  box-shadow:
    0 22px 50px -18px rgba(120, 75, 20, 0.36),
    0 0 0 1px rgba(217, 119, 6, 0.18) inset;
}
[data-theme="light"] .vault-tile::after {
  background: linear-gradient(
    105deg,
    transparent 0%,
    rgba(217, 119, 6, 0.18) 50%,
    transparent 100%
  );
}

/* Stacked papers — warm cream tones for the depth layers */
[data-theme="light"] .vt-paper {
  background: rgba(255, 250, 240, 0.85);
  border: 1px solid rgba(217, 119, 6, 0.20);
}
/* .vt-paper-front keeps the amber gradient — brand palette */

[data-theme="light"] .vt-eyebrow { color: #b45309; }
[data-theme="light"] .vt-title { color: var(--text-primary); }
[data-theme="light"] .vt-count {
  background: linear-gradient(180deg, #92400e, #d97706);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
[data-theme="light"] .vt-suffix { color: #6b5840; }
[data-theme="light"] .vt-recent li { color: #4a3a28; }
[data-theme="light"] .vt-bullet {
  background: #d97706;
  box-shadow: 0 0 6px rgba(217, 119, 6, 0.5);
}
[data-theme="light"] .vt-empty { color: #8a6f4a; }
[data-theme="light"] .vt-empty :deep(svg) { color: #b45309; }

[data-theme="light"] .vt-cta {
  border-top: 1px dashed rgba(217, 119, 6, 0.30);
  color: #b45309;
}
[data-theme="light"] .vault-tile:hover .vt-cta { color: #92400e; }

/* ── ATLAS CARDS (Pulse + Forge + Mixed) ── */
[data-theme="light"] .atlas-card {
  background: linear-gradient(180deg, rgba(255, 250, 240, 0.78), rgba(255, 250, 240, 0.55));
  border: 1px solid rgba(217, 119, 6, 0.22);
  box-shadow:
    0 12px 30px -16px rgba(120, 75, 20, 0.22),
    0 1px 0 rgba(255, 255, 255, 0.7) inset;
}
[data-theme="light"] .atlas-card:hover {
  border-color: rgba(217, 119, 6, 0.40);
  box-shadow:
    0 20px 44px -18px rgba(120, 75, 20, 0.32),
    0 0 0 1px rgba(217, 119, 6, 0.14) inset;
}
[data-theme="light"] .ac-head {
  border-bottom: 1px solid rgba(217, 119, 6, 0.18);
}
[data-theme="light"] .ac-icon {
  background: rgba(217, 119, 6, 0.14);
  color: #b45309;
  border: 1px solid rgba(217, 119, 6, 0.35);
}
[data-theme="light"] .ac-head h4 { color: var(--text-primary); }
[data-theme="light"] .ac-head p { color: #6b5840; }
[data-theme="light"] .ac-tag {
  background: rgba(217, 119, 6, 0.12);
  border: 1px solid rgba(217, 119, 6, 0.32);
  color: #92400e;
}

/* Pulse stream */
[data-theme="light"] .pulse-loading { color: #b45309; }
[data-theme="light"] .pulse-empty { color: #6b5840; }
[data-theme="light"] .pulse-dot {
  border: 3px solid #faf7f0;
  box-shadow:
    0 0 0 1px rgba(217, 119, 6, 0.45),
    0 0 10px rgba(217, 119, 6, 0.40);
}
/* dot tones — keep brand colors vivid on cream too */
[data-theme="light"] .pulse-dot.dot-amber {
  background: #d97706;
  box-shadow: 0 0 0 1px rgba(217, 119, 6, 0.45), 0 0 10px rgba(217, 119, 6, 0.45);
}
[data-theme="light"] .pulse-dot.dot-green {
  background: #059669;
  box-shadow: 0 0 0 1px rgba(5, 150, 105, 0.45), 0 0 10px rgba(5, 150, 105, 0.40);
}
[data-theme="light"] .pulse-dot.dot-red {
  background: #dc2626;
  box-shadow: 0 0 0 1px rgba(220, 38, 38, 0.45), 0 0 10px rgba(220, 38, 38, 0.40);
}
[data-theme="light"] .pulse-dot.dot-blue {
  background: #0ea5e9;
  box-shadow: 0 0 0 1px rgba(14, 165, 233, 0.45), 0 0 10px rgba(14, 165, 233, 0.40);
}
[data-theme="light"] .pulse-rail {
  background: linear-gradient(180deg, rgba(217, 119, 6, 0.40), rgba(217, 119, 6, 0.05));
}
[data-theme="light"] .pulse-line { color: var(--text-primary); }
[data-theme="light"] .pulse-line strong { color: var(--text-primary); }
[data-theme="light"] .pulse-line span { color: #4a3a28; }
[data-theme="light"] .pulse-target { color: #b45309 !important; }
[data-theme="light"] .pulse-time { color: #8a6f4a; }
/* .pulse-kind-pill keeps amber/orange gradient — readable on cream because the
   chip itself is gold-filled with dark text */

/* Forge buttons */
[data-theme="light"] .forge-btn {
  background: rgba(255, 250, 240, 0.7);
  border: 1px solid rgba(217, 119, 6, 0.22);
  color: var(--text-primary);
  box-shadow: 0 1px 0 rgba(255, 255, 255, 0.6) inset;
}
[data-theme="light"] .forge-btn:hover {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.18), rgba(217, 119, 6, 0.10));
  border-color: rgba(217, 119, 6, 0.50);
}
[data-theme="light"] .forge-btn :deep(svg:first-of-type) { color: #b45309; }
[data-theme="light"] .forge-arrow { color: #8a6f4a; }
[data-theme="light"] .forge-btn:hover .forge-arrow { color: #92400e; }
[data-theme="light"] .forge-glow {
  background: radial-gradient(80px 60px at var(--mx, 50%) var(--my, 50%), rgba(217, 119, 6, 0.22), transparent 60%);
}

/* Filter chips */
[data-theme="light"] .filter-chip {
  background: rgba(255, 250, 240, 0.65);
  border: 1px solid rgba(217, 119, 6, 0.22);
  color: #6b4f24;
}
[data-theme="light"] .filter-chip:hover {
  background: rgba(217, 119, 6, 0.10);
  border-color: rgba(217, 119, 6, 0.40);
  color: #92400e;
}
[data-theme="light"] .filter-chip.active {
  background: linear-gradient(135deg, #d97706, #b45309);
  border-color: #b45309;
  color: #fff8e7;
  box-shadow: 0 6px 16px rgba(217, 119, 6, 0.32);
}

/* Mixed rows */
[data-theme="light"] .mixed-row::after {
  background: rgba(217, 119, 6, 0.12);
}
[data-theme="light"] .mixed-row:hover {
  background: linear-gradient(90deg, rgba(251, 191, 36, 0.14), transparent);
}
[data-theme="light"] .mr-title { color: var(--text-primary); }
[data-theme="light"] .mr-sub { color: #6b5840; }
[data-theme="light"] .mr-status { color: var(--text-primary); }
[data-theme="light"] .mr-time { color: #8a6f4a; }
[data-theme="light"] .mr-arrow { color: #b45309; }
/* status dots keep their semantic colors; tweak the default amber for cream contrast */
[data-theme="light"] .mr-status-dot { background: #d97706; box-shadow: 0 0 5px rgba(217, 119, 6, 0.5); }
[data-theme="light"] .mr-status-dot.status-active    { background: #059669; box-shadow: 0 0 5px rgba(5, 150, 105, 0.5); }
[data-theme="light"] .mr-status-dot.status-expired   { background: #ea580c; }
[data-theme="light"] .mr-status-dot.status-approved  { background: #d97706; }
[data-theme="light"] .mr-status-dot.status-completed { background: #059669; }
[data-theme="light"] .mr-status-dot.status-rejected  { background: #dc2626; }

[data-theme="light"] .mixed-empty { color: #6b5840; }

/* Scrollbar — deeper amber on cream */
[data-theme="light"] .custom-scroll::-webkit-scrollbar-thumb {
  background: rgba(217, 119, 6, 0.30);
}
[data-theme="light"] .custom-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(217, 119, 6, 0.55);
}

/* Reduced motion already handled above */
</style>
