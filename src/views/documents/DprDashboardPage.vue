<template>
  <div class="dpr-dashboard-wrapper nano-scroll">
    <!-- Header Section -->
    <header class="dashboard-header animate-fade-in">
      <div class="header-content">
        <div class="title-area">
          <div class="hero-badge">Enterprise</div>
          <h1>DPR Proposal Generator</h1>
          <p class="subtitle">Architecting vision into structured project proposals with precision.</p>
        </div>
        <div class="header-actions">
          <router-link :to="`${panelBase}/documents/dpr/new`" class="btn-premium primary ripple">
            <Plus :size="20" />
            <span>Generate New DPR</span>
          </router-link>
        </div>
      </div>
    </header>

    <!-- Stats and Metrics -->
    <section class="stats-grid animate-slide-up">
      <div class="stat-card glass-morph">
        <div class="stat-icon purple"><FileText :size="24" /></div>
        <div class="stat-data">
          <span class="stat-label">Total Proposals</span>
          <span class="stat-value"><AnimatedNumber :value="totalCount" /></span>
        </div>
        <div class="stat-graph"><Activity :size="40" /></div>
      </div>
      <div class="stat-card glass-morph">
        <div class="stat-icon emerald"><CheckCircle :size="24" /></div>
        <div class="stat-data">
          <span class="stat-label">Approved</span>
          <span class="stat-value"><AnimatedNumber :value="approvedCount" /></span>
        </div>
      </div>
      <div class="stat-card glass-morph">
        <div class="stat-icon amber"><Clock :size="24" /></div>
        <div class="stat-data">
          <span class="stat-label">In Review</span>
          <span class="stat-value"><AnimatedNumber :value="pendingCount" /></span>
        </div>
      </div>
      <div class="stat-card glass-morph">
        <div class="stat-icon blue"><Layers :size="24" /></div>
        <div class="stat-data">
          <span class="stat-label">Drafts</span>
          <span class="stat-value"><AnimatedNumber :value="draftCount" /></span>
        </div>
      </div>
    </section>

    <!-- Main Content -->
    <main class="main-content animate-slide-up delay-1">
      <div class="content-header">
        <div class="tabs-premium">
          <button v-for="tab in tabs" :key="tab.id"
            @click="setTab(tab.id)"
            :class="['tab-item', { active: activeTab === tab.id }]"
          >
            {{ tab.label }}
            <span class="badge" v-if="getCount(tab.id) > 0">{{ getCount(tab.id) }}</span>
          </button>
        </div>
        <div class="search-premium">
          <Search :size="18" />
          <input v-model="searchQuery" placeholder="Search by project or title..." />
        </div>
      </div>

      <!-- Proposals List -->
      <div class="proposal-container">
        <div v-if="filteredDprs.length === 0" class="empty-state glass-morph">
          <div class="empty-gfx"><Package :size="64" /></div>
          <h3>{{ emptyStateTitle }}</h3>
          <p>{{ emptyStateSubtitle }}</p>
          <router-link v-if="!isAdmin || activeTab === 'Draft'" :to="`${panelBase}/documents/dpr/new`" class="btn-premium ghost">
            Create First Proposal
          </router-link>
        </div>

        <div v-else class="proposal-grid">
          <div v-for="dpr in filteredDprs" :key="dpr.id" class="proposal-card glass-morph card-hover" @click="openDpr(dpr)">
            <div class="card-status" :class="dpr.status.toLowerCase().replace(' ', '-')"></div>
            <div class="card-header">
              <div class="project-info">
                <h3>{{ dpr.title }}</h3>
                <div class="pj-meta">
                  <span class="version">{{ dpr.version }}</span>
                  <span class="sep">&bull;</span>
                  <span class="prj-code">{{ dpr.dpr_code || dpr.overview?.project_code || 'TBD-REF' }}</span>
                </div>
              </div>
              <div class="status-chip" :class="dpr.status.toLowerCase().replace(' ', '-')">
                {{ dpr.status }}
              </div>
            </div>
            
            <div class="card-body">
              <div class="client-meta">
                <Building2 :size="14" />
                <span>{{ dpr.client?.organization || 'Enterprise Client' }}</span>
              </div>
              <div class="desc-preview">
                {{ dpr.overview?.description || 'Structural detailed project report containing comprehensive technical and financial feasibility analysis.' }}
              </div>
            </div>

            <div class="card-footer">
              <div class="user-info">
                <div class="avatar">{{ dpr.created_by?.full_name?.charAt(0) || 'U' }}</div>
                <div class="user-details">
                  <span class="name">{{ dpr.created_by?.full_name || 'System User' }}</span>
                  <span class="date">{{ formatDate(dpr.created_at) }}</span>
                </div>
              </div>
              <div class="card-actions">
                <button class="icon-btn" title="View Details" @click.stop="openDpr(dpr)"><Eye :size="16" /></button>
                <!-- Download is only meaningful for Approved proposals. Drafts /
                     Internal Review / Rejected are not shareable artifacts, so
                     the icon is hidden to match the drawer's permission logic. -->
                <button v-if="dpr.status === 'Approved'" class="icon-btn icon-btn-primary" title="Download PDF" @click.stop="generatePdf(dpr)"><Download :size="16" /></button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Details Drawer -->
    <DprDetailsDrawer
      :is-open="!!selectedDpr"
      :dpr="selectedDpr"
      :is-admin-mode="isAdmin"
      @close="selectedDpr = null"
      @edit="editDpr"
      @approve="handleApprove"
      @reject="handleReject"
      @deleted="handleDeleted"
      @generate="generatePdf"
    />

    <!-- Rejection Modal -->
    <RejectionModal
      :is-open="isRejectionModalOpen"
      :is-submitting="isRejecting"
      @close="cancelRejection"
      @confirm="handleRejectionConfirm"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'
import { 
  Plus, FileText, Download, Trash2, Search, Filter, 
  Calendar, Layers, Clock, CheckCircle, AlertCircle,
  FileDown, Share2, MoreVertical, Eye, Activity,
  Package, Building2, X, ClipboardList, Target
} from 'lucide-vue-next'
import AnimatedNumber from '../../components/ui/AnimatedNumber.vue'
import DprDetailsDrawer from '../../components/documents/DprDetailsDrawer.vue'
import RejectionModal from '../../components/documents/RejectionModal.vue'
import { useToast } from '../../composables/useToast'
import { generateDprPdf } from '../../utils/dprPdfGenerator'
import { API } from '@/utils/api'

const { success: toastSuccess, error: toastError } = useToast()

const router = useRouter()
const route = useRoute()
const panelBase = computed(() => route.path.startsWith('/admin') ? '/admin' : '/user')
const isAdmin = computed(() => route.path.startsWith('/admin'))

const allDprs = ref([])
// Initial tab read from ?tab=... URL query so deep-links work. The Status filter
// uses spaces ("Internal Review") but URLs use kebab-case ("internal-review")
// for readability. Two-way mapping below.
const tabFromQuery = {
  all: 'all',
  draft: 'Draft',
  'internal-review': 'Internal Review',
  approved: 'Approved',
  rejected: 'Rejected'
}
const queryFromTab = Object.fromEntries(Object.entries(tabFromQuery).map(([k, v]) => [v, k]))
const activeTab = ref(tabFromQuery[route.query.tab] || 'all')
const searchQuery = ref('')
const selectedDpr = ref(null)

const tabs = [
  { id: 'all', label: 'All Proposals' },
  { id: 'Draft', label: 'Drafts' },
  { id: 'Internal Review', label: 'In Review' },
  { id: 'Approved', label: 'Approved' },
  { id: 'Rejected', label: 'Rejected' }
]

// setTab pushes ?tab=… so tabs are linkable/shareable. The watcher syncs
// activeTab when the URL changes externally (e.g. notification bell clicks a
// rejected-DPR notification that links to /user/documents/dpr?tab=rejected).
const setTab = (tabId) => {
  activeTab.value = tabId
  const q = queryFromTab[tabId] || 'all'
  router.replace({ query: { ...route.query, tab: q } }).catch(() => {})
}
watch(() => route.query.tab, (newQ) => {
  const resolved = tabFromQuery[newQ] || 'all'
  if (resolved !== activeTab.value) activeTab.value = resolved
})

const getCount = (status) => {
  if (status === 'all') return allDprs.value.length
  return allDprs.value.filter(d => d.status === status).length
}

const totalCount = computed(() => allDprs.value.length)
const approvedCount = computed(() => getCount('Approved'))
const pendingCount = computed(() => getCount('Internal Review'))
const draftCount = computed(() => getCount('Draft'))

const filteredDprs = computed(() => {
  // "All Proposals" tab shows every DPR returned by the API (backend already
  // scopes the user's list). The previous non-admin guard restricted "All" to
  // Approved only, which mismatched the badge count (e.g. badge said 4 but only
  // 1 card rendered). Tab badges always reflect actual list size.
  let list = allDprs.value
  if (activeTab.value !== 'all') {
    list = list.filter(d => d.status === activeTab.value)
  }
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(d =>
      (d.title?.toLowerCase() || '').includes(q) ||
      (d.overview?.project_name?.toLowerCase() || '').includes(q) ||
      (d.overview?.project_code?.toLowerCase() || '').includes(q) ||
      (d.client?.organization?.toLowerCase() || '').includes(q) ||
      (d.created_by?.full_name?.toLowerCase() || '').includes(q)
    )
  }
  return list
})

const emptyStateTitle = computed(() => {
  if (searchQuery.value) return "No Results Found"
  if (activeTab.value === 'Internal Review') return "Review Queue Clear"
  if (activeTab.value === 'Draft') return "No Drafts Found"
  if (activeTab.value === 'Approved') return "No Approved Proposals"
  if (activeTab.value === 'Rejected') return "No Rejected Proposals"
  return "No Proposals Found"
})

const emptyStateSubtitle = computed(() => {
  if (searchQuery.value) return `We couldn't find any proposals matching "${searchQuery.value}"`
  if (activeTab.value === 'Internal Review') return isAdmin.value
    ? "There are no enterprise DPR proposals awaiting your review at the moment."
    : "You don't have any proposals currently under review."
  if (activeTab.value === 'Draft') return "You haven't saved any drafts recently."
  if (activeTab.value === 'Approved') return isAdmin.value
    ? "No proposals have been approved yet."
    : "None of your proposals have been approved yet."
  if (activeTab.value === 'Rejected') return isAdmin.value
    ? "No proposals have been rejected."
    : "None of your proposals have been rejected — keep going."
  return isAdmin.value
    ? "No enterprise DPR proposals have been submitted yet."
    : "Start by creating your first enterprise DPR proposal using the 15-step wizard."
})

const getToken = () => isAdmin.value ? localStorage.getItem('admin_token') : localStorage.getItem('user_token')

const fetchData = async () => {
  try {
    const res = await axios.get(`${API}/dpr/`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    allDprs.value = res.data
  } catch (e) {
    console.error('Failed to fetch DPRs:', e)
  }
}

const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  })
}

const openDpr = (dpr) => {
  selectedDpr.value = dpr
}

const editDpr = (dpr) => {
  router.push(`${panelBase.value}/documents/dpr/new?edit=${dpr.id}`)
}

const handleApprove = async (dpr) => {
  try {
     await axios.put(`${API}/dpr/${dpr.id}`, { status: 'Approved' }, {
       headers: { Authorization: `Bearer ${getToken()}` }
     })
     toastSuccess('Proposal approved successfully')
     fetchData()
     selectedDpr.value = null
  } catch (e) {
     console.error('Approval failed:', e)
     toastError('Failed to approve proposal')
  }
}

// Rejection modal state
const isRejectionModalOpen = ref(false)
const isRejecting = ref(false)
const dprToReject = ref(null)

const handleReject = (dpr) => {
  dprToReject.value = dpr
  isRejectionModalOpen.value = true
}

const cancelRejection = () => {
  if (isRejecting.value) return
  isRejectionModalOpen.value = false
  dprToReject.value = null
}

const handleRejectionConfirm = async (reason) => {
  if (!dprToReject.value || !reason?.trim()) return
  isRejecting.value = true
  try {
    await axios.put(`${API}/dpr/${dprToReject.value.id}`, { status: 'Rejected', rejection_reason: reason }, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    toastSuccess('Proposal rejected')
    isRejectionModalOpen.value = false
    dprToReject.value = null
    selectedDpr.value = null
    fetchData()
  } catch (e) {
    console.error('Rejection failed:', e)
    toastError('Failed to reject proposal')
  } finally {
    isRejecting.value = false
  }
}

const generatePdf = (dpr) => {
  try {
    generateDprPdf(dpr)
    toastSuccess('PDF generation started')
  } catch (e) {
    console.error('PDF generation failed:', e)
    toastError('Failed to generate PDF')
  }
}

const handleDeleted = () => {
  selectedDpr.value = null
  fetchData()
}

onMounted(() => {
  fetchData()
})
onUnmounted(() => {
})
</script>

<style scoped>
.dpr-dashboard-wrapper {
  position: relative;
  min-height: 100vh;
  padding: 48px;
  background: transparent;
  color: #fff;
  font-family: 'Inter', sans-serif;
  overflow-y: auto;
  overflow-x: hidden;
}

@keyframes float {
  from { transform: translate(0, 0) scale(1); }
  to { transform: translate(50px, 100px) scale(1.1); }
}

/* Animations */
.animate-fade-in { animation: fadeIn 0.8s ease-out; position: relative; z-index: 1; }
.animate-slide-up { animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; position: relative; z-index: 1; }
.delay-1 { animation-delay: 0.2s; }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { 
  from { opacity: 0; transform: translateY(30px); } 
  to { opacity: 1; transform: translateY(0); } 
}

/* Header */
.dashboard-header {
  margin-bottom: 48px;
}
.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}
.hero-badge {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  border: 1px solid rgba(245, 158, 11, 0.2);
  display: inline-block;
  margin-bottom: 12px;
}
.title-area h1 {
  font-size: 42px;
  font-weight: 800;
  letter-spacing: -1.5px;
  margin: 0 0 8px;
  background: linear-gradient(to right, #fff, #a1a1aa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
.subtitle {
  color: #71717a;
  font-size: 16px;
  max-width: 500px;
}

.btn-premium {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 28px;
  border-radius: 14px;
  font-weight: 700;
  font-size: 15px;
  text-decoration: none;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  cursor: pointer;
  border: none;
}
.btn-premium.primary {
  background: #fff;
  color: #000;
}
.btn-premium.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 30px rgba(255,255,255,0.1);
}
.btn-premium.ghost {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.1);
  color: #fff;
}
.btn-premium.ghost:hover {
  background: rgba(255,255,255,0.05);
}

/* Stats */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20px;
  margin-bottom: 48px;
}
.stat-card {
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 20px;
  position: relative;
  overflow: hidden;
}
.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.stat-icon.purple { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
.stat-icon.emerald { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.stat-icon.amber { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
.stat-icon.blue { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }

.stat-data { display: flex; flex-direction: column; }
.stat-label { font-size: 12px; font-weight: 600; color: #71717a; text-transform: uppercase; letter-spacing: 0.5px; }
.stat-value { font-size: 28px; font-weight: 800; color: #fff; letter-spacing: -1px; }

.stat-graph { margin-left: auto; opacity: 0.1; color: #f59e0b; }

/* Main Content */
.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}
.tabs-premium {
  display: flex;
  gap: 8px;
  background: rgba(255,255,255,0.03);
  padding: 6px;
  border-radius: 14px;
  border: 1px solid rgba(255,255,255,0.05);
}
.tab-item {
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #71717a;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  gap: 8px;
}
.tab-item:hover { color: #fff; }
.tab-item.active {
  background: rgba(255,255,255,0.05);
  color: #fff;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}
.badge {
  font-size: 10px;
  background: rgba(255,255,255,0.1);
  padding: 2px 6px;
  border-radius: 6px;
}

.search-premium {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  padding: 0 16px;
  border-radius: 14px;
  width: 300px;
  transition: all 0.3s;
}
.search-premium:focus-within {
  border-color: rgba(255,255,255,0.2);
  background: rgba(255,255,255,0.05);
}
.search-premium input {
  background: transparent;
  border: none;
  padding: 12px 0;
  color: #fff;
  outline: none;
  font-size: 14px;
  width: 100%;
}

/* Proposals Grid */
.proposal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}
.glass-morph {
  background: rgba(255, 255, 255, 0.02);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 24px;
}
.proposal-card {
  padding: 24px;
  position: relative;
  cursor: pointer;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.proposal-card:hover {
  transform: translateY(-8px);
  border-color: rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.04);
  box-shadow: 0 20px 40px rgba(0,0,0,0.4);
}
.card-status {
  position: absolute;
  top: 24px; left: 0;
  width: 4px; height: 32px;
  border-radius: 0 4px 4px 0;
}
.card-status.approved { background: #10b981; }
.card-status.internal-review { background: #f59e0b; }
.card-status.draft { background: #71717a; }
.card-status.rejected { background: #ef4444; }

.card-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}
.project-info h3 {
  margin: 0 0 6px;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.5px;
}
.pj-meta { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #71717a; }
.status-chip {
  height: fit-content;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}
.status-chip.approved { background: rgba(16, 185, 129, 0.1); color: #10b981; }
.status-chip.internal-review { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
.status-chip.draft { background: rgba(113, 113, 122, 0.1); color: #a1a1aa; }
.status-chip.rejected { background: rgba(239, 68, 68, 0.1); color: #ef4444; }

.client-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #a1a1aa;
  margin-bottom: 12px;
}
.desc-preview {
  font-size: 14px;
  color: #71717a;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
  margin-bottom: 24px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20px;
  border-top: 1px solid rgba(255,255,255,0.05);
}
.user-info { display: flex; align-items: center; gap: 10px; }
.avatar {
  width: 32px; height: 32px;
  border-radius: 10px;
  background: #27272a;
  display: flex; align-items: center; justify-content: center;
  font-size: 12px; font-weight: 700;
}
.user-details { display: flex; flex-direction: column; }
.name { font-size: 12px; font-weight: 600; }
.date { font-size: 11px; color: #52525b; }

.card-actions { display: flex; gap: 8px; }
.icon-btn {
  width: 32px; height: 32px;
  border-radius: 8px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
  color: #71717a;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}
.icon-btn:hover { background: rgba(255,255,255,0.1); color: #fff; }

/* Empty State */
.empty-state {
  padding: 80px 40px;
  text-align: center;
  max-width: 500px;
  margin: 40px auto;
}
.empty-gfx { color: rgba(255,255,255,0.05); margin-bottom: 24px; }
.empty-state h3 { font-size: 24px; margin-bottom: 12px; }
.empty-state p { color: #71717a; margin-bottom: 32px; }

/* Details Drawer */
.dpr-details-drawer {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: rgba(0,0,0,0.4);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: flex-end;
}
.drawer-panel {
  width: 500px;
  max-width: 100vw;
  height: 100vh;
  background: #0a0a0d;
  border-left: 1px solid rgba(255,255,255,0.08);
  display: flex;
  flex-direction: column;
}
.drawer-header {
  padding: 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.drawer-header h2 { margin: 8px 0 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
.close-btn { background: transparent; border: none; color: #71717a; cursor: pointer; transition: color 0.2s; }
.close-btn:hover { color: #fff; }

.drawer-body {
  flex: 1;
  padding: 32px;
  overflow-y: auto;
}
.steps-progress {
  display: flex;
  gap: 6px;
  margin-bottom: 32px;
}
.step-dot {
  flex: 1;
  height: 4px;
  background: rgba(255,255,255,0.05);
  border-radius: 2px;
}
.step-dot.completed { background: #f59e0b; }

.section-group { margin-bottom: 32px; }
.section-group h4 {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 700;
  text-transform: uppercase;
  color: #f59e0b;
  margin: 0 0 12px;
}
.section-group p { font-size: 15px; color: #a1a1aa; line-height: 1.6; }
.obj-list { list-style: none; padding: 0; margin: 0; }
.obj-list li {
  padding: 10px 0;
  border-bottom: 1px solid rgba(255,255,255,0.03);
  color: #d4d4d8;
}

.drawer-footer {
  padding: 32px;
  display: grid;
  grid-template-columns: 1fr 1.5fr;
  gap: 16px;
  border-top: 1px solid rgba(255,255,255,0.05);
  background: rgba(255,255,255,0.01);
}

/* Scrollbar */
.nano-scroll::-webkit-scrollbar { width: 4px; }
.nano-scroll::-webkit-scrollbar-track { background: transparent; }
.nano-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }

/* Transitions */
.drawer-enter-active, .drawer-leave-active { transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
.drawer-enter-from, .drawer-leave-to { opacity: 0; }
.drawer-enter-from .drawer-panel { transform: translateX(100%); }
.drawer-leave-to .drawer-panel { transform: translateX(100%); }

/* ─── Extra polish animations (apply on both themes) ───
   Staggered entrance for stat cards + a subtle scale-in for tab badge updates. */
.stats-grid .stat-card {
  animation: statCardIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.stats-grid .stat-card:nth-child(1) { animation-delay: 0.1s; }
.stats-grid .stat-card:nth-child(2) { animation-delay: 0.18s; }
.stats-grid .stat-card:nth-child(3) { animation-delay: 0.26s; }
.stats-grid .stat-card:nth-child(4) { animation-delay: 0.34s; }
@keyframes statCardIn {
  from { opacity: 0; transform: translateY(20px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.stat-card { transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s, border-color 0.4s; }
.stat-card:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(245, 158, 11, 0.12); }

.tab-item .badge { transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.tab-item.active .badge { transform: scale(1.15); }

.proposal-card {
  animation: proposalIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
  position: relative;
  overflow: hidden;
}
.proposal-card::before {
  content: '';
  position: absolute;
  top: 0; right: 0;
  width: 140px;
  height: 140px;
  background: radial-gradient(circle at top right, rgba(245, 158, 11, 0.18) 0%, transparent 65%);
  opacity: 0;
  transition: opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  pointer-events: none;
}
.proposal-card:hover::before { opacity: 1; }
.proposal-card .card-actions .icon-btn {
  opacity: 0;
  transform: translateX(8px);
  transition: opacity 0.35s cubic-bezier(0.16, 1, 0.3, 1), transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.proposal-card:hover .card-actions .icon-btn {
  opacity: 1;
  transform: translateX(0);
}
.proposal-card:hover .card-actions .icon-btn:nth-child(2) { transition-delay: 0.06s; }
.icon-btn-primary { color: #f59e0b !important; border-color: rgba(245, 158, 11, 0.25) !important; }
.icon-btn-primary:hover { background: rgba(245, 158, 11, 0.18) !important; }

@keyframes proposalIn {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ═══════════════════════════════════════════
   LIGHT THEME OVERRIDES — preserve gold/amber/orange palette + transparency.
   Wrapper is transparent (set above), so cream page background shows through.
   ═══════════════════════════════════════════ */

[data-theme="light"] .dpr-dashboard-wrapper { color: var(--text-primary); }

/* Header */
[data-theme="light"] .hero-badge {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
  border-color: rgba(245, 158, 11, 0.32);
}
[data-theme="light"] .title-area h1 {
  background: linear-gradient(to right, #1a1410, #b45309);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
[data-theme="light"] .subtitle { color: #6b5840; }
[data-theme="light"] .btn-premium.primary {
  background: linear-gradient(135deg, #f59e0b, #fb923c);
  color: #fff;
  box-shadow: 0 6px 18px rgba(245, 158, 11, 0.32);
}
[data-theme="light"] .btn-premium.primary:hover {
  box-shadow: 0 12px 28px rgba(245, 158, 11, 0.5);
}
[data-theme="light"] .btn-premium.ghost {
  background: rgba(255, 250, 240, 0.78);
  border-color: rgba(180, 110, 30, 0.22);
  color: #b45309;
}
[data-theme="light"] .btn-premium.ghost:hover {
  background: rgba(245, 158, 11, 0.12);
  border-color: rgba(245, 158, 11, 0.4);
}

/* Glass cards — warm cream with gold-tinted shadow */
[data-theme="light"] .glass-morph {
  background: rgba(255, 250, 240, 0.85);
  border: 1px solid rgba(180, 110, 30, 0.18);
  box-shadow: 0 10px 28px rgba(120, 80, 20, 0.08);
}

/* Stat cards */
[data-theme="light"] .stat-icon.purple,
[data-theme="light"] .stat-icon.amber { background: rgba(245, 158, 11, 0.14); color: #b45309; }
[data-theme="light"] .stat-icon.emerald { background: rgba(16, 185, 129, 0.14); color: #047857; }
[data-theme="light"] .stat-icon.blue { background: rgba(59, 130, 246, 0.14); color: #1d4ed8; }
[data-theme="light"] .stat-label { color: #6b5840; }
[data-theme="light"] .stat-value { color: var(--text-primary); }
[data-theme="light"] .stat-graph { color: #d97706; opacity: 0.15; }
[data-theme="light"] .stat-card:hover {
  border-color: rgba(245, 158, 11, 0.4);
  box-shadow: 0 18px 40px rgba(245, 158, 11, 0.16);
}

/* Tabs */
[data-theme="light"] .tabs-premium {
  background: rgba(255, 250, 240, 0.72);
  border-color: rgba(180, 110, 30, 0.18);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.55);
}
[data-theme="light"] .tab-item { color: #6b5840; }
[data-theme="light"] .tab-item:hover { color: var(--text-primary); }
[data-theme="light"] .tab-item.active {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.22), rgba(251, 191, 36, 0.18));
  color: #b45309;
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.5);
}
[data-theme="light"] .badge {
  background: rgba(245, 158, 11, 0.16);
  color: #b45309;
}

/* Search input */
[data-theme="light"] .search-premium {
  background: transparent;
  border: 1px solid rgba(217, 119, 6, 0.32);
}
[data-theme="light"] .search-premium:focus-within {
  border-color: #d97706;
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.18);
}
[data-theme="light"] .search-premium svg { color: #b45309; }
[data-theme="light"] .search-premium input { color: var(--text-primary); }
[data-theme="light"] .search-premium input::placeholder { color: rgba(120, 53, 15, 0.5); }

/* Proposal cards */
[data-theme="light"] .proposal-card {
  background: rgba(255, 250, 240, 0.88);
  border: 1px solid rgba(180, 110, 30, 0.22);
}
[data-theme="light"] .proposal-card:hover {
  background: rgba(255, 250, 240, 0.96);
  border-color: rgba(217, 119, 6, 0.5);
  box-shadow: 0 20px 44px rgba(180, 110, 30, 0.2);
}
[data-theme="light"] .project-info h3 { color: var(--text-primary); }
[data-theme="light"] .pj-meta { color: #6b5840; }
[data-theme="light"] .client-meta { color: #6b5840; }
[data-theme="light"] .desc-preview { color: rgba(107, 88, 64, 0.8); }
[data-theme="light"] .card-footer { border-top-color: rgba(180, 110, 30, 0.14); }
[data-theme="light"] .avatar { background: rgba(245, 158, 11, 0.16); color: #b45309; }
[data-theme="light"] .name { color: var(--text-primary); }
[data-theme="light"] .date { color: #6b5840; }

/* Status chips (preserve semantic colors with cream-readable variants) */
[data-theme="light"] .status-chip.approved { background: rgba(16, 185, 129, 0.16); color: #047857; }
[data-theme="light"] .status-chip.internal-review { background: rgba(245, 158, 11, 0.18); color: #b45309; }
[data-theme="light"] .status-chip.draft { background: rgba(113, 113, 122, 0.16); color: #52525b; }
[data-theme="light"] .status-chip.rejected { background: rgba(239, 68, 68, 0.16); color: #b91c1c; }

/* Card status accent bars (preserved) */
[data-theme="light"] .card-status.approved { background: #047857; }
[data-theme="light"] .card-status.internal-review { background: #d97706; }
[data-theme="light"] .card-status.draft { background: #71717a; }
[data-theme="light"] .card-status.rejected { background: #b91c1c; }

/* Icon-buttons (eye, download) on each proposal card */
[data-theme="light"] .icon-btn {
  background: rgba(255, 250, 240, 0.65);
  border-color: rgba(180, 110, 30, 0.18);
  color: #6b5840;
}
[data-theme="light"] .icon-btn:hover {
  background: rgba(245, 158, 11, 0.12);
  color: #b45309;
  border-color: rgba(245, 158, 11, 0.4);
}

/* Empty state */
[data-theme="light"] .empty-gfx { color: rgba(180, 110, 30, 0.22); }
[data-theme="light"] .empty-state h3 { color: var(--text-primary); }
[data-theme="light"] .empty-state p { color: #6b5840; }

/* Scrollbar */
[data-theme="light"] .nano-scroll::-webkit-scrollbar-thumb { background: rgba(180, 110, 30, 0.22); }
</style>
