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
          <span class="stat-value"><AnimatedNumber :value="approvedCount" /></span>
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
            @click="activeTab = tab.id"
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
                <button class="icon-btn" title="Download PDF" @click.stop="generatePdf(dpr)"><Download :size="16" /></button>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
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
import { useToast } from '../../composables/useToast'
import { generateDprPdf } from '../../utils/dprPdfGenerator'
import { API } from '@/utils/api'

const { success: toastSuccess, error: toastError } = useToast()

const router = useRouter()
const route = useRoute()
const panelBase = computed(() => route.path.startsWith('/admin') ? '/admin' : '/user')
const isAdmin = computed(() => route.path.startsWith('/admin'))

const allDprs = ref([])
const activeTab = ref('all')
const searchQuery = ref('')
const selectedDpr = ref(null)

const tabs = [
  { id: 'all', label: 'All Proposals' },
  { id: 'Draft', label: 'Drafts' },
  { id: 'Internal Review', label: 'In Review' },
  { id: 'Approved', label: 'Approved' },
  { id: 'Rejected', label: 'Rejected' }
]

const getCount = (status) => {
  if (status === 'all') return allDprs.value.length
  return allDprs.value.filter(d => d.status === status).length
}

const approvedCount = computed(() => getCount('Approved'))
const pendingCount = computed(() => getCount('Internal Review'))
const draftCount = computed(() => getCount('Draft'))

const filteredDprs = computed(() => {
  let list = allDprs.value
  if (activeTab.value !== 'all') {
    list = list.filter(d => d.status === activeTab.value)
  } else if (!isAdmin.value) {
    list = list.filter(d => d.status === 'Approved')
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
  return "No Proposals Found"
})

const emptyStateSubtitle = computed(() => {
  if (searchQuery.value) return `We couldn't find any proposals matching "${searchQuery.value}"`
  if (activeTab.value === 'Internal Review') return "There are no entreprise DPR proposals awaiting your review at the moment."
  if (activeTab.value === 'Draft') return "You haven't saved any drafts recently."
  return isAdmin.value ? "No enterprise DPR proposals have been submitted yet." : "Start by creating your first enterprise DPR proposal using the 15-step wizard."
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

const handleReject = async (dpr) => {
  const reason = prompt('Please enter rejection reason:')
  if (!reason) return
  try {
     await axios.put(`${API}/dpr/${dpr.id}`, { status: 'Rejected', rejection_reason: reason }, {
       headers: { Authorization: `Bearer ${getToken()}` }
     })
     toastSuccess('Proposal rejected')
     fetchData()
     selectedDpr.value = null
  } catch (e) {
     console.error('Rejection failed:', e)
     toastError('Failed to reject proposal')
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
  background: #000 !important; /* FORCED SOLID BLACK */
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
</style>
