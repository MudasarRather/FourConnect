<template>
  <div class="vault-root">
    <!-- ATMOSPHERIC BACKDROP -->
    <div class="vault-backdrop" aria-hidden="true">
      <div class="vault-base"></div>
      <div class="vault-grain"></div>
      <div class="vault-shaft shaft-1"></div>
      <div class="vault-shaft shaft-2"></div>
      <div class="vault-shaft shaft-3"></div>
    </div>

    <!-- HERO -->
    <section class="vault-hero fade-up">
      <div class="vault-hero-left">
        <div class="vault-eyebrow pop-in">
          <Archive :size="11" />
          <span>ARCHIVE VAULT</span>
        </div>
        <h1 class="vault-title slide-in-text">The Records Hall</h1>
        <p class="vault-subtitle">Documents preserved beyond their active lifecycle. Read-only, searchable, downloadable.</p>

        <div class="folder-clusters">
          <button
            class="folder-cluster"
            v-for="(c, idx) in clusters"
            :key="c.kind"
            :style="{ animationDelay: `${idx * 0.6}s` }"
            :class="{ active: currentType === c.kind }"
            @click="onClusterClick(c.kind)"
          >
            <div class="cluster-stack" :class="`stack-${c.kind}`">
              <div class="stack-card stack-back"></div>
              <div class="stack-card stack-mid"></div>
              <div class="stack-card stack-front">
                <component :is="c.icon" :size="22" stroke-width="1.6" />
              </div>
            </div>
            <div class="cluster-meta">
              <span class="cluster-count">{{ counts[c.kind] }}</span>
              <span class="cluster-label">{{ c.label }}</span>
            </div>
          </button>
        </div>
      </div>

      <div class="vault-hero-right pop-in">
        <div class="metric-card">
          <div class="metric-eyebrow">
            <Sparkles :size="11" />
            <span>TOTAL ARCHIVED</span>
          </div>
          <div class="metric-value">
            <span class="metric-num">{{ animatedTotal }}</span>
            <span class="metric-suffix">docs</span>
          </div>
          <div class="metric-foot">
            <Calendar :size="11" />
            <span v-if="stats.oldest_year">Oldest record · {{ stats.oldest_year }}</span>
            <span v-else>No records yet</span>
          </div>
          <div class="metric-bar"><div class="metric-bar-fill" :style="{ width: barFill + '%' }"></div></div>
        </div>
      </div>
    </section>

    <!-- CATEGORY TILE STRIP -->
    <section class="tile-strip fade-up" style="animation-delay: 0.15s">
      <button
        v-for="t in tiles"
        :key="t.kind || 'all'"
        class="vault-tile"
        :class="{ active: currentType === t.kind }"
        @click="currentType = t.kind"
      >
        <div class="tile-icon"><component :is="t.icon" :size="16" stroke-width="1.8" /></div>
        <div class="tile-info">
          <span class="tile-label">{{ t.label }}</span>
          <span class="tile-count">{{ counts[t.kind ?? 'all'] }}</span>
        </div>
      </button>
    </section>

    <!-- FILTER BAR -->
    <section class="filter-bar fade-up" style="animation-delay: 0.25s">
      <div class="search-pill">
        <Search :size="14" class="search-icon" />
        <input v-model="searchQuery" type="text" placeholder="Search title, client, code, status…" class="search-input" />
        <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''" aria-label="Clear">
          <X :size="12" />
        </button>
      </div>

      <div class="filter-controls">
        <CustomSelect
          v-model="selectedYear"
          :options="yearOptions"
          labelKey="label"
          valueKey="value"
          class="filter-dropdown"
        />
        <CustomSelect
          v-model="selectedStatus"
          :options="statusOptions"
          labelKey="label"
          valueKey="value"
          class="filter-dropdown"
        />
        <button v-if="hasFilters" class="clear-chip" @click="clearAllFilters">
          <X :size="12" /> Clear filters
        </button>
      </div>
    </section>

    <!-- DOCUMENT GRID -->
    <section class="docs-section">
      <div v-if="isLoading" class="skeleton-grid">
        <div v-for="i in 8" :key="i" class="skel-card">
          <div class="skel-line skel-line-sm"></div>
          <div class="skel-line skel-line-lg"></div>
          <div class="skel-line skel-line-md"></div>
          <div class="skel-line skel-line-sm"></div>
        </div>
      </div>

      <div v-else-if="!items.length" class="vault-empty">
        <div class="empty-folder">
          <FolderArchive :size="48" stroke-width="1" />
        </div>
        <h3>No records match this view</h3>
        <p>Try clearing filters or switching the category tab.</p>
        <button v-if="hasFilters" class="empty-clear-btn" @click="clearAllFilters">
          <X :size="13" /> Clear filters
        </button>
      </div>

      <transition-group v-else name="grid-shuffle" tag="div" class="docs-grid">
        <article
          v-for="(d, i) in items"
          :key="d.id"
          class="doc-card pop-in"
          :style="{ animationDelay: `${i * 30}ms` }"
          @click="openDrawer(d)"
        >
          <header class="dc-head">
            <span class="kind-badge" :class="`kind-${d.kind}`">{{ kindLabel(d.kind) }}</span>
            <span class="age-pill"><Clock :size="10" /> {{ ageLabel(d.years_old) }}</span>
          </header>

          <h3 class="dc-title">{{ d.title }}</h3>
          <p class="dc-client" v-if="d.client"><Building2 :size="11" /> {{ d.client }}</p>
          <p class="dc-code" v-if="d.code"><Hash :size="10" /> {{ d.code }}</p>

          <div class="dc-divider"></div>

          <footer class="dc-foot">
            <span class="status-dot" :class="`status-${(d.status || '').toLowerCase()}`"></span>
            <span class="status-label">{{ d.status }}</span>
            <span class="dc-date"><CalendarDays :size="10" /> {{ formatMonthYear(d.created_at) }}</span>
          </footer>

          <div class="dc-hover-actions">
            <button class="dc-action ghost" @click.stop="openDrawer(d)">
              <Eye :size="12" /> Open
            </button>
            <button class="dc-action primary" @click.stop="downloadDoc(d)" :disabled="downloadingId === d.id">
              <Loader2 v-if="downloadingId === d.id" :size="12" class="spin" />
              <Download v-else :size="12" />
              <span>{{ downloadingId === d.id ? 'Preparing…' : 'Download' }}</span>
            </button>
          </div>
        </article>
      </transition-group>

      <!-- pagination -->
      <div v-if="totalPages > 1 && !isLoading" class="pagination fade-up">
        <button class="pg-btn" :disabled="page <= 1" @click="page--; fetchDocs()">
          <ChevronLeft :size="14" /> Prev
        </button>
        <span class="pg-info">Page {{ page }} of {{ totalPages }}</span>
        <button class="pg-btn" :disabled="page >= totalPages" @click="page++; fetchDocs()">
          Next <ChevronRight :size="14" />
        </button>
      </div>
    </section>

    <!-- DRAWER -->
    <transition name="fade">
      <div class="vault-drawer-overlay" v-if="selectedDoc" @click="selectedDoc = null"></div>
    </transition>
    <div class="vault-drawer" :class="{ 'is-open': !!selectedDoc }">
      <div class="vd-inner" v-if="selectedDoc">
        <header class="vd-header">
          <div class="vd-h-left">
            <span class="vd-code">{{ selectedDoc.code || selectedDoc.id.slice(0, 8).toUpperCase() }}</span>
            <span class="kind-badge vd-h-kind" :class="`kind-${selectedDoc.kind}`">{{ kindLabel(selectedDoc.kind) }}</span>
          </div>
          <button class="vd-close spin-hover" @click="selectedDoc = null">
            <X :size="16" />
          </button>
        </header>

        <div class="vd-body custom-scroll">
          <!-- Paper preview -->
          <div class="paper-preview">
            <div class="paper-back paper-1"></div>
            <div class="paper-back paper-2"></div>
            <div class="paper-front">
              <div class="paper-letterhead">
                <div class="paper-mark">
                  <Archive :size="14" />
                  <span>{{ kindLabel(selectedDoc.kind).toUpperCase() }}</span>
                </div>
                <div class="paper-id">{{ selectedDoc.code || selectedDoc.id.slice(0, 8) }}</div>
              </div>
              <h2 class="paper-title">{{ selectedDoc.title }}</h2>
              <div class="paper-meta">
                <span v-if="selectedDoc.client">{{ selectedDoc.client }}</span>
                <span class="paper-dot">·</span>
                <span>{{ formatLongDate(selectedDoc.created_at) }}</span>
              </div>
              <div class="paper-line-stack" aria-hidden="true">
                <span class="paper-line"></span>
                <span class="paper-line short"></span>
                <span class="paper-line"></span>
                <span class="paper-line"></span>
                <span class="paper-line short"></span>
              </div>
            </div>
          </div>

          <!-- Tabs -->
          <div class="vd-tabs">
            <button class="vd-tab" :class="{ active: drawerTab === 'details' }" @click="drawerTab = 'details'">Details</button>
            <button class="vd-tab" :class="{ active: drawerTab === 'history' }" @click="drawerTab = 'history'">Version History</button>
          </div>

          <transition name="tab-fade" mode="out-in">
            <!-- Details -->
            <div v-if="drawerTab === 'details'" class="vd-tab-content">
              <div class="info-block fade-up" style="animation-delay: 0.05s">
                <h4><Info :size="13" class="info-block-icon" /> Overview</h4>
                <div class="separator-line"></div>
                <div class="ib-row">
                  <span class="ib-label"><FileType2 :size="11" /> Type</span>
                  <span class="ib-val">{{ kindLabel(selectedDoc.kind) }}</span>
                </div>
                <div class="ib-row">
                  <span class="ib-label"><Activity :size="11" /> Status</span>
                  <span class="ib-val">{{ selectedDoc.status }}</span>
                </div>
                <div class="ib-row" v-if="selectedDoc.client">
                  <span class="ib-label"><Building2 :size="11" /> Client</span>
                  <span class="ib-val">{{ selectedDoc.client }}</span>
                </div>
                <div class="ib-row">
                  <span class="ib-label"><Clock :size="11" /> Age</span>
                  <span class="ib-val">{{ ageLabel(selectedDoc.years_old) }}</span>
                </div>
                <div class="ib-row" v-if="selectedDoc.code">
                  <span class="ib-label"><Hash :size="11" /> Reference</span>
                  <span class="ib-val">{{ selectedDoc.code }}</span>
                </div>
              </div>

              <div class="info-block fade-up" style="animation-delay: 0.15s">
                <h4><CalendarDays :size="13" class="info-block-icon" /> Timeline</h4>
                <div class="separator-line"></div>
                <div class="ib-row">
                  <span class="ib-label"><Calendar :size="11" /> Created</span>
                  <span class="ib-val">{{ formatLongDate(selectedDoc.created_at) }}</span>
                </div>
                <div class="ib-row" v-if="selectedDoc.updated_at">
                  <span class="ib-label"><RefreshCw :size="11" /> Updated</span>
                  <span class="ib-val">{{ formatLongDate(selectedDoc.updated_at) }}</span>
                </div>
                <div class="ib-row" v-if="selectedDoc.completion_date">
                  <span class="ib-label"><CheckCircle2 :size="11" /> Completed</span>
                  <span class="ib-val">{{ formatLongDate(selectedDoc.completion_date) }}</span>
                </div>
              </div>

              <div class="info-block fade-up" v-if="selectedDoc.kind === 'sla' || selectedDoc.kind === 'handover'" style="animation-delay: 0.25s">
                <h4><DollarSign :size="13" class="info-block-icon" /> Financials</h4>
                <div class="separator-line"></div>
                <div class="ib-row" v-if="selectedDoc.agreement_value">
                  <span class="ib-label"><Coins :size="11" /> Agreement Value</span>
                  <span class="ib-val">{{ formatMoney(selectedDoc.agreement_value, selectedDoc.currency) }}</span>
                </div>
                <div class="ib-row" v-if="selectedDoc.total_project_value">
                  <span class="ib-label"><Coins :size="11" /> Project Value</span>
                  <span class="ib-val">{{ formatMoney(selectedDoc.total_project_value, selectedDoc.currency) }}</span>
                </div>
                <div v-if="!selectedDoc.agreement_value && !selectedDoc.total_project_value" class="empty-row">
                  <DollarSign :size="14" class="empty-row-icon" />
                  <span>No financial data on record.</span>
                </div>
              </div>
            </div>

            <!-- Version history -->
            <div v-else class="vd-tab-content">
              <div class="info-block fade-up">
                <h4><GitBranch :size="13" class="info-block-icon" /> Lifecycle</h4>
                <div class="separator-line"></div>
                <div class="timeline">
                  <div class="tl-item pop-in" style="animation-delay: 0.05s">
                    <div class="tl-node tl-node-start"></div>
                    <div class="tl-content">
                      <div class="tl-title">Created</div>
                      <div class="tl-meta">{{ formatLongDate(selectedDoc.created_at) }}</div>
                    </div>
                  </div>
                  <div class="tl-item pop-in" v-if="selectedDoc.updated_at && selectedDoc.updated_at !== selectedDoc.created_at" style="animation-delay: 0.15s">
                    <div class="tl-node"></div>
                    <div class="tl-content">
                      <div class="tl-title">Last revised</div>
                      <div class="tl-meta">{{ formatLongDate(selectedDoc.updated_at) }}</div>
                    </div>
                  </div>
                  <div class="tl-item pop-in" style="animation-delay: 0.25s">
                    <div class="tl-node tl-node-end"></div>
                    <div class="tl-content">
                      <div class="tl-title">Status: {{ selectedDoc.status }}</div>
                      <div class="tl-meta">Archived {{ ageLabel(selectedDoc.years_old) }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </transition>
        </div>

        <footer class="vd-footer">
          <button class="vd-btn ghost" @click="selectedDoc = null">Close</button>
          <button class="vd-btn primary" @click="downloadDoc(selectedDoc)" :disabled="downloadingId === selectedDoc.id">
            <Loader2 v-if="downloadingId === selectedDoc.id" :size="14" class="spin" />
            <Download v-else :size="14" />
            <span>{{ downloadingId === selectedDoc.id ? 'Preparing…' : 'Download PDF' }}</span>
          </button>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { debounce } from 'lodash'
import {
  Archive, Search, X, Sparkles, Calendar, CalendarDays, Clock, Hash, Eye, Download,
  FolderArchive, ChevronLeft, ChevronRight, FileText, Handshake, FileSpreadsheet,
  Building2, Info, FileType2, Activity, RefreshCw, CheckCircle2, DollarSign, Coins,
  GitBranch, Loader2
} from 'lucide-vue-next'
import CustomSelect from '../../components/ui/CustomSelect.vue'
import { useToast } from 'vue-toastification'
import { generateSlaPdf } from '../../utils/slaPdfGenerator'
import { generateHandoverPdf } from '../../utils/handoverPdfGenerator'
import { generateDprPdf } from '../../utils/dprPdfGenerator'

const route = useRoute()
const toast = useToast()
const isAdminRoute = computed(() => route.path.includes('/admin/'))
const getToken = () => isAdminRoute.value
  ? (localStorage.getItem('admin_token') || localStorage.getItem('user_token'))
  : (localStorage.getItem('user_token') || localStorage.getItem('admin_token'))

const API_BASE = 'http://localhost:8000'

// State
const stats = ref({ total: 0, sla: 0, handover: 0, dpr: 0, oldest_year: null, by_year: [] })
const items = ref([])
const isLoading = ref(true)
const page = ref(1)
const pageSize = 24
const totalPages = ref(1)
const totalItems = ref(0)
const searchQuery = ref('')
const selectedYear = ref('')
const selectedStatus = ref('')
const currentType = ref(null) // null = all
const selectedDoc = ref(null)
const drawerTab = ref('details')
const downloadingId = ref(null)
const animatedTotal = ref(0)

// Cluster definitions for the hero
const clusters = [
  { kind: 'sla',      label: 'SLA Agreements',  icon: FileText },
  { kind: 'handover', label: 'Handovers',       icon: Handshake },
  { kind: 'dpr',      label: 'DPRs',            icon: FileSpreadsheet },
]

const tiles = computed(() => [
  { kind: null,       label: 'All Records',     icon: Archive },
  { kind: 'sla',      label: 'SLA',             icon: FileText },
  { kind: 'handover', label: 'Handover',        icon: Handshake },
  { kind: 'dpr',      label: 'DPR',             icon: FileSpreadsheet },
])

const counts = computed(() => ({
  all:      stats.value.total,
  sla:      stats.value.sla,
  handover: stats.value.handover,
  dpr:      stats.value.dpr,
}))

const yearOptions = computed(() => [
  { value: '', label: 'All years' },
  ...stats.value.by_year.map(y => ({ value: String(y.year), label: `${y.year} (${y.count})` })),
])

const statusOptions = computed(() => {
  const map = {
    null: ['Active', 'Expired', 'Approved', 'Completed'],
    sla:  ['Active', 'Expired'],
    handover: ['Approved', 'Completed'],
    dpr:  ['Approved'],
  }
  const opts = map[currentType.value ?? 'null']
  return [{ value: '', label: 'All statuses' }, ...opts.map(s => ({ value: s, label: s }))]
})

const hasFilters = computed(() => searchQuery.value || selectedYear.value || selectedStatus.value || currentType.value)

const barFill = computed(() => {
  if (!stats.value.by_year.length) return 0
  const max = Math.max(...stats.value.by_year.map(y => y.count))
  return Math.min(100, (stats.value.total / Math.max(1, max * stats.value.by_year.length)) * 100 + 30)
})

// Display helpers
const kindLabel = (k) => k === 'sla' ? 'SLA' : k === 'handover' ? 'Handover' : 'DPR'
const ageLabel = (y) => y === 0 ? '<1 yr' : y === 1 ? '1 yr ago' : `${y} yrs ago`
const formatMonthYear = (iso) => {
  if (!iso) return ''
  const d = new Date(iso); return d.toLocaleString('en-US', { month: 'short', year: 'numeric' })
}
const formatLongDate = (iso) => {
  if (!iso) return ''
  const d = new Date(iso); return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
const formatMoney = (n, cur = 'USD') => {
  if (!n) return '—'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur || 'USD', maximumFractionDigits: 0 }).format(n)
}

// Animated counter for the hero metric
const startCounter = (target) => {
  const start = animatedTotal.value
  const delta = target - start
  if (!delta) { animatedTotal.value = target; return }
  const duration = 1200
  const startTime = performance.now()
  const tick = (now) => {
    const t = Math.min(1, (now - startTime) / duration)
    const eased = 1 - Math.pow(1 - t, 3)
    animatedTotal.value = Math.round(start + delta * eased)
    if (t < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

// Fetchers
const fetchStats = async () => {
  try {
    const res = await axios.get(`${API_BASE}/api/archive/stats`, { headers: { Authorization: `Bearer ${getToken()}` } })
    stats.value = res.data
    startCounter(res.data.total)
  } catch (e) { console.error('archive stats:', e); toast.error('Failed to load archive stats') }
}

const fetchDocs = async () => {
  isLoading.value = true
  try {
    const params = { page: page.value, page_size: pageSize }
    if (currentType.value) params.doc_type = currentType.value
    if (selectedStatus.value) params.status = selectedStatus.value
    if (selectedYear.value) params.year = Number(selectedYear.value)
    if (searchQuery.value) params.search = searchQuery.value
    const res = await axios.get(`${API_BASE}/api/archive/documents`, { params, headers: { Authorization: `Bearer ${getToken()}` } })
    items.value = res.data.items || []
    totalPages.value = res.data.total_pages || 1
    totalItems.value = res.data.total || 0
  } catch (e) {
    console.error('archive docs:', e); toast.error('Failed to load archive list')
    items.value = []
  } finally { isLoading.value = false }
}

const debouncedFetch = debounce(() => { page.value = 1; fetchDocs() }, 300)
watch([currentType, selectedYear, selectedStatus], () => { page.value = 1; fetchDocs() })
watch(searchQuery, debouncedFetch)

const onClusterClick = (kind) => {
  currentType.value = currentType.value === kind ? null : kind
  document.querySelector('.tile-strip')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
const clearAllFilters = () => {
  searchQuery.value = ''
  selectedYear.value = ''
  selectedStatus.value = ''
  currentType.value = null
}

// Drawer
const openDrawer = (d) => {
  selectedDoc.value = d
  drawerTab.value = 'details'
}

// Download — two-phase so we can give an accurate toast for each failure mode.
//   Phase 1: fetch the full document from the existing /sla/:id /handover/:id /dpr/:id endpoints.
//            A 4xx/5xx here = "Couldn't fetch document".
//   Phase 2: feed it to the matching PDF generator. If a generator throws on missing fields,
//            that's a "Couldn't generate PDF" — distinct from a network failure.
const downloadDoc = async (d) => {
  if (downloadingId.value) return
  downloadingId.value = d.id

  let full
  try {
    const url = d.kind === 'sla'      ? `/api/sla/${d.id}`
              : d.kind === 'handover' ? `/api/handover/${d.id}`
              :                         `/api/dpr/${d.id}`
    const res = await axios.get(`${API_BASE}${url}`, { headers: { Authorization: `Bearer ${getToken()}` } })
    full = res.data
  } catch (e) {
    console.error('download fetch:', e)
    const detail = typeof e.response?.data?.detail === 'string'
      ? e.response.data.detail
      : `Server returned ${e.response?.status || 'an error'}`
    toast.error(`Couldn't fetch document: ${detail}`)
    downloadingId.value = null
    return
  }

  try {
    // Each generator triggers its own .save() internally (with a templated filename like
    // `SLA_<client>_<date>.pdf`) and returns undefined. Don't call .save() here.
    if (d.kind === 'sla')           generateSlaPdf(full)
    else if (d.kind === 'handover') generateHandoverPdf(full)
    else                            generateDprPdf(full)
    toast.success(`Downloaded ${d.code || d.title || d.kind}`)
  } catch (e) {
    console.error('download generate:', e)
    toast.error(`Couldn't generate PDF: ${e?.message || 'unknown error'}`)
  } finally {
    downloadingId.value = null
  }
}

onMounted(async () => {
  await fetchStats()
  await fetchDocs()
})
</script>

<style scoped>
/* ============================================================
   CINEMATIC VAULT — Archive Documents
   Palette: amber-500 #f59e0b · amber-400 #fbbf24 · gold #ffb900 · orange #f97316
   Motion grammar: shared cubic-bezier(0.16, 1, 0.3, 1) springs.
   ============================================================ */

.vault-root {
  position: relative;
  min-height: calc(100vh - 52px);
  width: 100%;
  max-width: 1500px;
  margin: 0 auto;
  padding: 32px 32px 80px;
  color: #f5f5f7;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Outfit", sans-serif;
  overflow: visible;
}

/* ----- BACKDROP ----- */
.vault-backdrop {
  position: fixed; inset: 52px 0 0 0; pointer-events: none; z-index: -1;
  overflow: hidden;
}
.vault-base { position: absolute; inset: 0; background: linear-gradient(180deg, #0a0807 0%, #050403 100%); }
.vault-grain {
  position: absolute; inset: 0; opacity: 0.5;
  background-image:
    radial-gradient(circle at 25% 25%, rgba(245, 158, 11, 0.018) 1px, transparent 1px),
    radial-gradient(circle at 75% 75%, rgba(255, 255, 255, 0.012) 1px, transparent 1px);
  background-size: 24px 24px, 32px 32px;
}
.vault-shaft {
  position: absolute; top: -20%; bottom: -20%; width: 120px;
  background: linear-gradient(60deg, transparent 30%, rgba(245, 158, 11, 0.05) 50%, transparent 70%);
  filter: blur(40px);
  will-change: transform;
}
.shaft-1 { left: 10%; animation: shaft-drift 30s linear infinite; }
.shaft-2 { left: 45%; animation: shaft-drift 45s linear infinite -10s; }
.shaft-3 { left: 75%; animation: shaft-drift 60s linear infinite -25s; }
@keyframes shaft-drift {
  0%   { transform: translateX(-200%) rotate(8deg); }
  100% { transform: translateX(200%) rotate(8deg); }
}

/* ----- HERO ----- */
.vault-hero {
  display: flex; gap: 48px; align-items: flex-start; justify-content: space-between;
  padding: 24px 0 40px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 32px;
}
.vault-hero-left { flex: 1; min-width: 0; }
.vault-hero-right { flex-shrink: 0; }
.vault-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.20em; color: #fbbf24;
  padding: 5px 12px; border-radius: 999px;
  background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.20);
  margin-bottom: 18px;
}
.vault-title {
  font-family: 'Outfit', sans-serif;
  font-size: 52px; font-weight: 700; line-height: 1.05;
  background: linear-gradient(120deg, #fff 30%, #fbbf24 80%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  margin: 0 0 10px; letter-spacing: -0.02em;
}
.vault-subtitle { font-size: 14px; color: rgba(255,255,255,0.50); max-width: 520px; line-height: 1.6; margin-bottom: 32px; }

.folder-clusters { display: flex; gap: 28px; }
.folder-cluster {
  position: relative;
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  padding: 14px 18px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 18px;
  cursor: pointer; color: inherit;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  animation: float-anim 8s ease-in-out infinite;
}
.folder-cluster:hover {
  background: rgba(245, 158, 11, 0.05);
  border-color: rgba(245, 158, 11, 0.25);
  transform: translateY(-6px);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.4), 0 0 24px rgba(245, 158, 11, 0.10);
}
.folder-cluster.active {
  background: rgba(245, 158, 11, 0.08);
  border-color: rgba(245, 158, 11, 0.40);
  box-shadow: 0 12px 30px rgba(245, 158, 11, 0.15);
}
@keyframes float-anim {
  0%, 100% { transform: translateY(0px); }
  50%      { transform: translateY(-6px); }
}

.cluster-stack {
  position: relative; width: 60px; height: 50px;
}
.stack-card {
  position: absolute; inset: 0;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.10), rgba(249, 115, 22, 0.06));
  display: flex; align-items: center; justify-content: center;
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.stack-back  { transform: translate(-6px, -6px) rotate(-8deg); opacity: 0.45; }
.stack-mid   { transform: translate(0, -3px) rotate(-3deg); opacity: 0.70; }
.stack-front { transform: translate(0, 0) rotate(0deg); color: #fbbf24; box-shadow: 0 6px 18px rgba(245, 158, 11, 0.20); }
.folder-cluster:hover .stack-back  { transform: translate(-9px, -9px) rotate(-12deg); }
.folder-cluster:hover .stack-mid   { transform: translate(-3px, -5px) rotate(-6deg); }
.folder-cluster:hover .stack-front { transform: translate(2px, -2px) rotate(2deg); }

/* per-kind tints */
.stack-sla .stack-front      { background: linear-gradient(135deg, #f59e0b, #f97316); color: #1a1208; }
.stack-handover .stack-front { background: linear-gradient(135deg, #fbbf24, #d97706); color: #1a1208; }
.stack-dpr .stack-front      { background: linear-gradient(135deg, #ffb900, #f59e0b); color: #1a1208; }

.cluster-meta { display: flex; flex-direction: column; align-items: center; gap: 1px; }
.cluster-count { font-size: 18px; font-weight: 700; color: #fff; }
.cluster-label { font-size: 10px; color: rgba(255, 255, 255, 0.50); letter-spacing: 0.06em; text-transform: uppercase; }

/* Metric card */
.metric-card {
  position: relative;
  width: 280px;
  padding: 24px 26px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(255, 255, 255, 0.02));
  border: 1px solid rgba(245, 158, 11, 0.20);
  backdrop-filter: blur(20px);
  overflow: hidden;
}
.metric-card::before {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(60% 80% at 100% 0%, rgba(245, 158, 11, 0.10), transparent 70%);
  pointer-events: none;
}
.metric-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 9px; font-weight: 700; letter-spacing: 0.20em; color: #fbbf24;
}
.metric-value { display: flex; align-items: baseline; gap: 8px; margin: 12px 0 6px; }
.metric-num { font-family: 'Outfit', sans-serif; font-size: 56px; font-weight: 700; line-height: 1; color: #fff; letter-spacing: -0.03em; background: linear-gradient(180deg, #fff, #fbbf24); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.metric-suffix { font-size: 14px; color: rgba(255, 255, 255, 0.40); font-weight: 500; }
.metric-foot { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: rgba(255, 255, 255, 0.50); }
.metric-bar { margin-top: 16px; height: 4px; border-radius: 999px; background: rgba(255, 255, 255, 0.05); overflow: hidden; }
.metric-bar-fill { height: 100%; background: linear-gradient(90deg, #f59e0b, #ffb900); border-radius: 999px; transition: width 1.2s cubic-bezier(0.16, 1, 0.3, 1); box-shadow: 0 0 12px rgba(245, 158, 11, 0.4); }

/* ----- TILE STRIP ----- */
.tile-strip {
  display: flex; gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}
.vault-tile {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 20px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  cursor: pointer; color: inherit;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  min-width: 160px;
}
.vault-tile:hover { background: rgba(245, 158, 11, 0.05); border-color: rgba(245, 158, 11, 0.20); transform: translateY(-2px); }
.vault-tile.active {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(249, 115, 22, 0.06));
  border-color: rgba(245, 158, 11, 0.45);
  box-shadow: 0 6px 18px rgba(245, 158, 11, 0.10);
  animation: tile-pulse 3s ease-in-out infinite;
}
@keyframes tile-pulse {
  0%, 100% { box-shadow: 0 6px 18px rgba(245, 158, 11, 0.10), 0 0 0 0 rgba(245, 158, 11, 0.20); }
  50%      { box-shadow: 0 6px 18px rgba(245, 158, 11, 0.18), 0 0 0 6px rgba(245, 158, 11, 0); }
}
.tile-icon {
  width: 36px; height: 36px; border-radius: 10px;
  background: rgba(245, 158, 11, 0.10); color: #fbbf24;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.vault-tile.active .tile-icon { background: linear-gradient(135deg, #f59e0b, #f97316); color: #1a1208; }
.tile-info { display: flex; flex-direction: column; gap: 2px; }
.tile-label { font-size: 12px; font-weight: 600; color: rgba(255, 255, 255, 0.85); letter-spacing: 0.02em; }
.tile-count { font-family: 'Outfit', sans-serif; font-size: 22px; font-weight: 700; color: #fff; line-height: 1; }

/* ----- FILTER BAR ----- */
.filter-bar {
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
  padding: 16px 20px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 28px;
}
.search-pill {
  position: relative; flex: 1; min-width: 240px;
}
.search-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: rgba(245, 158, 11, 0.55); pointer-events: none; }
.search-input {
  width: 100%;
  background: rgba(0, 0, 0, 0.30); border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px; padding: 11px 38px 11px 38px; color: #fff; font-size: 13px;
  transition: all 0.25s ease;
}
.search-input::placeholder { color: rgba(255, 255, 255, 0.30); }
.search-input:focus {
  outline: none; border-color: rgba(245, 158, 11, 0.45);
  background: rgba(245, 158, 11, 0.04);
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.08);
}
.search-clear {
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  width: 22px; height: 22px; border-radius: 50%;
  background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.5); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.search-clear:hover { background: rgba(245, 158, 11, 0.20); color: #fff; }
.filter-controls { display: flex; gap: 10px; align-items: center; }
.filter-dropdown { min-width: 160px; }
.clear-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 12px; border-radius: 999px;
  background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.22);
  color: #fbbf24; font-size: 11px; font-weight: 600; cursor: pointer;
  transition: all 0.2s ease;
}
.clear-chip:hover { background: rgba(245, 158, 11, 0.14); }

/* ----- DOC GRID ----- */
.docs-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 18px;
}
.doc-card {
  position: relative; overflow: hidden;
  display: flex; flex-direction: column; gap: 10px;
  padding: 18px 18px 14px;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.025) 0%, rgba(255, 255, 255, 0.01) 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.doc-card:hover {
  transform: translateY(-4px);
  border-color: rgba(245, 158, 11, 0.30);
  background: linear-gradient(180deg, rgba(245, 158, 11, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.40), 0 0 0 1px rgba(245, 158, 11, 0.05) inset;
}
.dc-head { display: flex; justify-content: space-between; align-items: center; }
.kind-badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 10px; border-radius: 999px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
  color: #1a1208;
  box-shadow: 0 4px 10px rgba(245, 158, 11, 0.20);
}
.kind-sla      { background: linear-gradient(135deg, #f59e0b, #f97316); }
.kind-handover { background: linear-gradient(135deg, #fbbf24, #d97706); }
.kind-dpr      { background: linear-gradient(135deg, #ffb900, #f59e0b); }
.age-pill {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 9px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 10px; color: rgba(255, 255, 255, 0.55); font-weight: 600;
}
.age-pill svg { color: rgba(245, 158, 11, 0.6); }

.dc-title {
  font-family: 'Outfit', sans-serif;
  font-size: 16px; font-weight: 600; color: #fff;
  line-height: 1.3; margin: 4px 0 0;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden;
}
.dc-client, .dc-code {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12px; color: rgba(255, 255, 255, 0.50); margin: 0;
}
.dc-code { font-family: 'SF Mono', monospace; font-size: 10.5px; color: rgba(255, 255, 255, 0.35); }
.dc-divider { height: 1px; background: linear-gradient(90deg, rgba(255,255,255,0.06), transparent); margin: 4px 0 2px; }
.dc-foot { display: flex; align-items: center; gap: 8px; font-size: 11px; color: rgba(255, 255, 255, 0.55); }
.status-dot { width: 7px; height: 7px; border-radius: 50%; background: #f59e0b; box-shadow: 0 0 6px rgba(245, 158, 11, 0.6); }
.status-active    { background: #00d95f; box-shadow: 0 0 6px rgba(0, 217, 95, 0.6); }
.status-expired   { background: #f97316; box-shadow: 0 0 6px rgba(249, 115, 22, 0.6); }
.status-approved  { background: #fbbf24; box-shadow: 0 0 6px rgba(251, 191, 36, 0.6); }
.status-completed { background: #10b981; box-shadow: 0 0 6px rgba(16, 185, 129, 0.6); }
.status-label { font-weight: 600; color: rgba(255, 255, 255, 0.70); }
.dc-date { margin-left: auto; display: inline-flex; align-items: center; gap: 4px; }
.dc-date svg { color: rgba(245, 158, 11, 0.55); }

/* hover actions slide up from bottom */
.dc-hover-actions {
  position: absolute; left: 0; right: 0; bottom: 0;
  display: flex; gap: 8px;
  padding: 12px 14px;
  background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.85));
  transform: translateY(100%); opacity: 0;
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.doc-card:hover .dc-hover-actions { transform: translateY(0); opacity: 1; }
.dc-action {
  flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 8px 12px; border-radius: 10px; font-size: 11px; font-weight: 600;
  cursor: pointer; transition: all 0.2s ease; border: none;
}
.dc-action.ghost { background: rgba(255, 255, 255, 0.06); color: #f5f5f7; border: 1px solid rgba(255, 255, 255, 0.10); }
.dc-action.ghost:hover { background: rgba(255, 255, 255, 0.10); }
.dc-action.primary { background: linear-gradient(135deg, #f59e0b, #f97316); color: #1a1208; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25); }
.dc-action.primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(245, 158, 11, 0.40); }
.dc-action:disabled { opacity: 0.5; cursor: not-allowed; }

/* grid-shuffle FLIP transitions */
.grid-shuffle-enter-from { opacity: 0; transform: translateY(20px) scale(0.95); }
.grid-shuffle-enter-active { transition: all 0.45s cubic-bezier(0.16, 1, 0.3, 1); }
.grid-shuffle-leave-active { transition: all 0.30s ease; position: absolute; }
.grid-shuffle-leave-to { opacity: 0; transform: translateY(-12px) scale(0.94); }
.grid-shuffle-move { transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1); }

/* ----- skeleton ----- */
.skeleton-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 18px; }
.skel-card {
  display: flex; flex-direction: column; gap: 12px;
  padding: 22px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.04);
  height: 165px;
}
.skel-line { height: 10px; border-radius: 4px;
  background: linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.10) 50%, rgba(255,255,255,0.04) 100%);
  background-size: 200% 100%;
  animation: skel-shimmer 1.6s ease-in-out infinite;
}
.skel-line-sm { width: 30%; }
.skel-line-md { width: 60%; }
.skel-line-lg { width: 90%; height: 14px; }
@keyframes skel-shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ----- empty state ----- */
.vault-empty {
  display: flex; flex-direction: column; align-items: center; gap: 16px;
  padding: 80px 40px;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.015);
  border: 1px solid rgba(255, 255, 255, 0.04);
  text-align: center;
}
.empty-folder {
  width: 80px; height: 80px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 20px;
  background: rgba(245, 158, 11, 0.06); color: rgba(245, 158, 11, 0.45);
  border: 1px solid rgba(245, 158, 11, 0.15);
  animation: float-anim 4s ease-in-out infinite;
}
.vault-empty h3 { font-family: 'Outfit'; font-size: 18px; font-weight: 600; margin: 0; }
.vault-empty p { font-size: 13px; color: rgba(255, 255, 255, 0.40); margin: 0; }
.empty-clear-btn {
  margin-top: 8px; display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px; border-radius: 999px; font-size: 11px; font-weight: 600; cursor: pointer;
  background: linear-gradient(135deg, #f59e0b, #f97316); color: #1a1208; border: none;
}

/* ----- pagination ----- */
.pagination {
  display: flex; align-items: center; justify-content: center; gap: 16px;
  margin-top: 32px;
}
.pg-btn {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 8px 14px; border-radius: 10px;
  background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.75); font-size: 12px; cursor: pointer;
}
.pg-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.pg-btn:hover:not(:disabled) { background: rgba(245, 158, 11, 0.06); color: #fff; }
.pg-info { font-size: 11px; color: rgba(255, 255, 255, 0.40); font-family: 'SF Mono', monospace; }

/* ----- DRAWER ----- */
.vault-drawer-overlay {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px); z-index: 1000;
}
.vault-drawer {
  position: fixed; top: 0; right: 0; bottom: 0; width: 480px;
  background: linear-gradient(180deg, rgba(14, 14, 16, 0.55) 0%, rgba(8, 8, 10, 0.65) 100%);
  border-left: 1px solid rgba(245, 158, 11, 0.12);
  backdrop-filter: blur(40px) saturate(180%);
  -webkit-backdrop-filter: blur(40px) saturate(180%);
  box-shadow: -28px 0 80px rgba(0, 0, 0, 0.7);
  z-index: 1010;
  transform: translateX(100%);
  transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex; flex-direction: column;
}
.vault-drawer.is-open { transform: translateX(0); }
.vd-inner { display: flex; flex-direction: column; height: 100%; }

.vd-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(10, 10, 10, 0.30);
  backdrop-filter: blur(20px);
}
.vd-h-left { display: flex; align-items: center; gap: 10px; }
.vd-code { font-family: 'SF Mono', monospace; font-size: 11px; color: #fbbf24; padding: 5px 10px; border-radius: 6px; background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.18); }
.vd-h-kind { font-size: 9px; }
.vd-close { width: 30px; height: 30px; border-radius: 50%; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.55); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s ease; }
.vd-close:hover { background: rgba(255, 255, 255, 0.10); color: #fff; transform: rotate(90deg); }

.vd-body { flex: 1; padding: 22px 24px; overflow-y: auto; }

/* paper preview */
.paper-preview {
  position: relative; height: 200px; margin-bottom: 22px;
  perspective: 1200px;
}
.paper-back, .paper-front {
  position: absolute; left: 50%;
  width: 86%; height: 100%;
  border-radius: 8px;
}
.paper-back  { background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.06); }
.paper-1 { transform: translate(-46%, 8px) rotate(-2.5deg); top: 0; }
.paper-2 { transform: translate(-49%, 4px) rotate(-1deg);   top: 0; }
.paper-front {
  background: linear-gradient(180deg, #f5e6cc, #e8d3a8);
  color: #1a1208;
  padding: 22px;
  box-shadow: 0 24px 50px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.08) inset;
  transform: translate(-50%, 0);
  top: 0;
  display: flex; flex-direction: column; gap: 8px;
}
.paper-letterhead { display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 1px solid rgba(0, 0, 0, 0.10); }
.paper-mark { display: inline-flex; align-items: center; gap: 6px; font-size: 9px; font-weight: 700; letter-spacing: 0.18em; color: #92400e; }
.paper-id { font-family: 'SF Mono', monospace; font-size: 10px; color: #92400e; }
.paper-title { font-family: 'Outfit', sans-serif; font-size: 17px; font-weight: 700; color: #1a1208; margin: 4px 0 2px; line-height: 1.25; }
.paper-meta { font-size: 11px; color: #6b4720; display: flex; gap: 6px; align-items: center; }
.paper-dot { opacity: 0.5; }
.paper-line-stack { display: flex; flex-direction: column; gap: 5px; margin-top: 8px; }
.paper-line { height: 5px; border-radius: 2px; background: rgba(0, 0, 0, 0.08); width: 100%; }
.paper-line.short { width: 60%; }

/* drawer tabs */
.vd-tabs { display: flex; gap: 4px; padding: 4px; border-radius: 12px; background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.05); margin-bottom: 18px; }
.vd-tab {
  flex: 1; padding: 9px 12px; border-radius: 9px; border: none;
  background: transparent; color: rgba(255, 255, 255, 0.55);
  font-size: 12px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;
}
.vd-tab.active { background: rgba(245, 158, 11, 0.10); color: #fbbf24; box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.20); }
.tab-fade-enter-from { opacity: 0; transform: translateY(6px); }
.tab-fade-enter-active { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.tab-fade-leave-to { opacity: 0; transform: translateY(-4px); }
.tab-fade-leave-active { transition: all 0.2s ease; }

.vd-tab-content { display: flex; flex-direction: column; gap: 28px; }

/* info-block — local copies (Tailwind classes are inert in this project) */
.info-block { display: flex; flex-direction: column; }
.info-block h4 { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #fbbf24; font-weight: 600; margin: 0 0 12px; display: flex; align-items: center; gap: 8px; }
.info-block-icon { color: #f59e0b; flex-shrink: 0; }
.separator-line { height: 1px; background: linear-gradient(90deg, rgba(255, 255, 255, 0.10), transparent); margin-bottom: 12px; }
.ib-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px dashed rgba(255, 255, 255, 0.04); }
.ib-row:last-child { border-bottom: none; }
.ib-label { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; color: rgba(255, 255, 255, 0.50); letter-spacing: 0.02em; }
.ib-label svg { color: rgba(245, 158, 11, 0.55); flex-shrink: 0; }
.ib-val { font-size: 12px; font-weight: 500; color: #fff; text-align: right; max-width: 60%; word-break: break-word; }

.empty-row { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-radius: 12px; background: rgba(255, 255, 255, 0.02); border: 1px dashed rgba(255, 255, 255, 0.08); font-size: 12px; color: rgba(255, 255, 255, 0.40); margin-top: 4px; }
.empty-row .empty-row-icon { color: rgba(245, 158, 11, 0.40); flex-shrink: 0; }

/* timeline */
.timeline { display: flex; flex-direction: column; gap: 0; padding: 8px 0 4px; }
.tl-item { position: relative; display: flex; gap: 14px; padding: 6px 0 14px 0; padding-left: 4px; }
.tl-item::before {
  content: ''; position: absolute; left: 9px; top: 18px; bottom: -8px;
  width: 2px; background: linear-gradient(180deg, rgba(245, 158, 11, 0.30), rgba(245, 158, 11, 0.05));
}
.tl-item:last-child::before { display: none; }
.tl-node {
  position: relative; flex-shrink: 0;
  width: 14px; height: 14px; border-radius: 50%;
  background: #f59e0b; border: 3px solid #0a0807;
  box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.40), 0 0 12px rgba(245, 158, 11, 0.30);
  margin-top: 2px;
}
.tl-node-start { background: #fbbf24; }
.tl-node-end   { background: #00d95f; box-shadow: 0 0 0 1px rgba(0, 217, 95, 0.40), 0 0 12px rgba(0, 217, 95, 0.30); }
.tl-content { flex: 1; padding-bottom: 4px; }
.tl-title { font-size: 13px; font-weight: 600; color: #fff; line-height: 1.2; }
.tl-meta { font-size: 11px; color: rgba(255, 255, 255, 0.45); margin-top: 2px; }

/* drawer footer */
.vd-footer {
  display: flex; gap: 10px; padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(10, 10, 10, 0.30);
  backdrop-filter: blur(20px);
}
.vd-btn {
  flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  padding: 11px 16px; border-radius: 12px;
  font-size: 13px; font-weight: 600; cursor: pointer;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.vd-btn.ghost { background: transparent; border: 1px solid rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.65); }
.vd-btn.ghost:hover { background: rgba(255, 255, 255, 0.04); color: #fff; }
.vd-btn.primary { background: linear-gradient(135deg, #f59e0b, #f97316); color: #1a1208; border: none; box-shadow: 0 6px 20px rgba(245, 158, 11, 0.30); }
.vd-btn.primary:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 10px 28px rgba(245, 158, 11, 0.42); }
.vd-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ----- shared ----- */
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
.spin-hover { transition: transform 0.3s ease; }
.spin-hover:hover { transform: rotate(90deg) scale(1.06); }
.spin { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.fade-enter-from, .fade-leave-to { opacity: 0; }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s ease; }

/* responsive */
@media (max-width: 980px) {
  .vault-hero { flex-direction: column; gap: 32px; }
  .vault-hero-right .metric-card { width: 100%; }
  .folder-clusters { flex-wrap: wrap; }
  .vault-title { font-size: 38px; }
}
.custom-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
.custom-scroll::-webkit-scrollbar-thumb { background: rgba(245, 158, 11, 0.20); border-radius: 999px; }
.custom-scroll::-webkit-scrollbar-thumb:hover { background: rgba(245, 158, 11, 0.40); }
.custom-scroll::-webkit-scrollbar-track { background: transparent; }
</style>
