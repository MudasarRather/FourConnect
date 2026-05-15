<template>
  <div ref="pageRoot" class="archived-projects-page">
    <!-- Page Header -->
    <div class="page-header" data-anim="page-header">
      <div class="header-left">
        <h1>Archived Projects</h1>
        <p class="subtitle">Projects completed over 6 months ago</p>
      </div>
    </div>

    <!-- Filter Bar -->
    <div class="filter-bar" data-anim="filter-bar">
      <div class="search-box">
        <Search :size="16" class="search-icon" />
        <input type="text" v-model="searchQuery" placeholder="Search archived projects..." @input="debouncedFetch" />
      </div>
      <div class="stats-pill">
        <Archive :size="14" class="stats-icon" />
        <span>{{ totalCount }} Archived</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="loading-state">
      <Loader2 :size="32" class="spin" />
      <p>Loading archived projects...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="projects.length === 0" class="empty-state">
      <div class="empty-icon-wrapper">
        <Archive :size="48" class="empty-icon" />
      </div>
      <h3>No archived projects</h3>
      <p>Projects will appear here when they have been 100% complete for more than 6 months.</p>
    </div>

    <!-- Table -->
    <div v-else class="archive-table-wrapper" data-anim="table">
      <div class="section-header">
        <div class="header-content">
          <h3>Project Archive</h3>
          <p>Completed projects aged 6+ months</p>
        </div>
      </div>

      <div class="ms-table">
        <div class="ms-row header">
          <div class="col-name">Project Name</div>
          <div class="col-code">Code</div>
          <div class="col-type">Type</div>
          <div class="col-org">Organization</div>
          <div class="col-budget">Budget</div>
          <div class="col-used">Utilized</div>
          <div class="col-timeline">Timeline</div>
          <div class="col-completed">Completed</div>
          <div class="col-owner">Owner</div>
          <div class="col-badge">Status</div>
        </div>

        <div v-if="projects.length === 0" class="empty-row">
          <p>No archived projects found.</p>
        </div>

        <div
          v-for="p in projects"
          :key="p.id"
          class="ms-row item"
          data-anim="archive-row"
          @click="openDrawer(p)"
        >
          <!-- Name -->
          <div class="col-name">
            <span class="ms-title" :title="p.project_name">{{ p.project_name }}</span>
          </div>

          <!-- Code -->
          <div class="col-code">
            <span class="code-mono">{{ p.code }}</span>
          </div>

          <!-- Type -->
          <div class="col-type">
            <span>{{ p.project_type || '—' }}</span>
          </div>

          <!-- Organization -->
          <div class="col-org">
            <span>{{ p.organization || '—' }}</span>
          </div>

          <!-- Budget -->
          <div class="col-budget">
            <span class="val-text">{{ formatCurrency(p.budget_amount, p.currency) }}</span>
          </div>

          <!-- Utilized -->
          <div class="col-used">
            <span class="val-text">{{ formatCurrency(p.budget_utilized, p.currency) }}</span>
          </div>

          <!-- Timeline -->
          <div class="col-timeline">
            <span>{{ getDuration(p.start_date, p.end_date) }}</span>
          </div>

          <!-- Completed -->
          <div class="col-completed">
            <span>{{ formatDate(p.completed_at) }}</span>
          </div>

          <!-- Owner -->
          <div class="col-owner">
            <div class="owner-avatar" :title="p.created_by_name || 'Unknown'">
              {{ (p.created_by_name || '?').charAt(0) }}
            </div>
          </div>

          <!-- Status Badge -->
          <div class="col-badge">
            <span class="ms-badge archived">
              <Archive :size="10" /> Archived
            </span>
          </div>
        </div>
      </div>

      <!-- Pagination -->
      <div v-if="totalPages > 1" class="pagination-bar">
        <button class="page-btn" :disabled="currentPage <= 1" @click="goToPage(currentPage - 1)">
          <ChevronLeft :size="14" />
        </button>
        <span class="page-info">Page {{ currentPage }} of {{ totalPages }}</span>
        <button class="page-btn" :disabled="currentPage >= totalPages" @click="goToPage(currentPage + 1)">
          <ChevronRight :size="14" />
        </button>
      </div>
    </div>

    <!-- Detail Drawer -->
    <Teleport to="body">
      <Transition name="panel-slide">
        <div v-if="drawerOpen" class="panel-overlay" @click.self="closeDrawer">
          <div class="panel-content glass-panel">
            
            <!-- Header -->
            <div class="panel-header">
              <div class="header-left">
                <div class="type-badge" v-if="selectedProject.project_type">{{ selectedProject.project_type }}</div>
                <div class="status-badge archived">Archived</div>
                <div class="completion-badge">
                  <CheckCircle2 :size="10" /> 100%
                </div>
              </div>
              <button class="close-btn" @click="closeDrawer">
                <X :size="20" />
              </button>
            </div>

            <!-- Body -->
            <div class="panel-body">
              <!-- Title -->
              <div class="title-section">
                <h2>{{ selectedProject.project_name }}</h2>
                <span class="project-code-pill" v-if="selectedProject.code">{{ selectedProject.code }}</span>
                <p class="description" v-if="selectedProject.description">{{ selectedProject.description }}</p>
              </div>

              <div class="divider"></div>

              <!-- Details Grid -->
              <div class="details-grid">
                <div class="detail-item">
                  <label>Organization</label>
                  <div class="value">
                    <Building :size="14" class="text-blue-400" />
                    {{ selectedProject.organization || '—' }}
                  </div>
                </div>

                <div class="detail-item">
                  <label>Order Value</label>
                  <div class="value mono">
                    <CreditCard :size="14" class="text-amber-400" />
                    {{ selectedProject.currency }} {{ formatNumber(selectedProject.budget_amount) }}
                  </div>
                </div>

                <div class="detail-item">
                  <label>Budget Utilized</label>
                  <div class="value mono">
                    <TrendingUp :size="14" class="text-green-400" />
                    {{ selectedProject.currency }} {{ formatNumber(selectedProject.budget_utilized) }}
                  </div>
                </div>

                <div class="detail-item">
                  <label>Start Date</label>
                  <div class="value">
                    <Calendar :size="14" class="text-emerald-400" />
                    {{ formatDate(selectedProject.start_date) || '—' }}
                  </div>
                </div>

                <div class="detail-item">
                  <label>End Date</label>
                  <div class="value">
                    <Calendar :size="14" class="text-red-400" />
                    {{ formatDate(selectedProject.end_date) || '—' }}
                  </div>
                </div>

                <div class="detail-item">
                  <label>Completed Date</label>
                  <div class="value">
                    <CheckCircle2 :size="14" class="text-green-400" />
                    {{ formatDate(selectedProject.completed_at) }}
                  </div>
                </div>

                <div class="detail-item" v-if="selectedProject.category">
                  <label>Category</label>
                  <div class="value">
                    <Tag :size="14" class="text-blue-400"/>
                    {{ selectedProject.category }}
                  </div>
                </div>

                <div class="detail-item" v-if="selectedProject.priority">
                  <label>Priority</label>
                  <div class="value">
                    <Flame :size="14" class="text-red-400"/>
                    {{ selectedProject.priority }}
                  </div>
                </div>

                <div class="detail-item" v-if="selectedProject.lifecycle_status">
                  <label>Lifecycle</label>
                  <div class="value">
                    <Activity :size="14" class="text-cyan-400"/>
                    {{ selectedProject.lifecycle_status }}
                  </div>
                </div>

                <div class="detail-item" v-if="selectedProject.funding_type">
                  <label>Funding</label>
                  <div class="value">
                    <Coins :size="14" class="text-amber-400"/>
                    {{ selectedProject.funding_type }}
                  </div>
                </div>

                <div class="detail-item" v-if="selectedProject.state || selectedProject.district">
                  <label>Location</label>
                  <div class="value">
                    <MapPin :size="14" class="text-emerald-400"/>
                    {{ [selectedProject.state, selectedProject.district].filter(Boolean).join(' · ') }}
                  </div>
                </div>

                <div class="detail-item full-width" v-if="selectedProject.government_order_no">
                  <label>Government Order</label>
                  <div class="value mono">
                    <Crown :size="14" class="text-amber-400"/>
                    {{ selectedProject.government_order_no }}
                    <span style="opacity:0.5; margin-left:8px" v-if="selectedProject.issuing_authority">· {{ selectedProject.issuing_authority }}</span>
                  </div>
                </div>

                <div class="detail-item full-width" v-if="selectedProject.project_head_name">
                  <label>Project Head</label>
                  <div class="value">
                    <User :size="14" class="text-purple-400"/>
                    {{ selectedProject.project_head_name }}
                    <span style="opacity:0.5; margin-left:8px" v-if="selectedProject.project_head_designation">· {{ selectedProject.project_head_designation }}</span>
                  </div>
                </div>

                <div class="divider full-width"></div>

                <div class="detail-item">
                  <label>Team Members</label>
                  <div class="value">
                    <Users :size="14" class="text-indigo-400" />
                    {{ selectedProject.team_member_count || 0 }} members
                  </div>
                </div>

                <div class="detail-item">
                  <label>Milestones</label>
                  <div class="value">
                    <Flag :size="14" class="text-yellow-400" />
                    {{ selectedProject.milestone_count || 0 }} milestones
                  </div>
                </div>

                <div class="detail-item full-width">
                  <label>Project Owner</label>
                  <div class="value">
                    <div class="avatar-xs">{{ (selectedProject.created_by_name || '?').charAt(0) }}</div>
                    {{ selectedProject.created_by_name || 'Unknown' }}
                  </div>
                </div>
              </div>

              <!-- Meta -->
              <div class="meta-section">
                <p>Created on {{ formatDate(selectedProject.created_at) }}</p>
                <p v-if="selectedProject.completed_at">Archived after 6+ months of completion ({{ getAgeSince(selectedProject.completed_at) }})</p>
              </div>
            </div>

            <!-- Footer -->
            <div class="panel-footer">
              <div class="permission-note">
                <Lock :size="12" /> Read-Only Archive
              </div>
            </div>

          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'
import {
  Search, Loader2, Archive, CheckCircle2, X, ChevronLeft, ChevronRight,
  Building, Target, CreditCard, TrendingUp, Calendar, Wallet, Users, Flag,
  Lock, Eye, Crown, MapPin, Coins, Flame, Tag, Activity, User
} from 'lucide-vue-next'
import { useToast } from '../composables/useToast'
import { useGsapAnim } from '../composables/useGsapAnim'
import { archivedProjectsEntry } from '../animations/pageChoreography'

const pageRoot = ref(null)

const router = useRouter()
const route = useRoute()
const { error: showError } = useToast()

const projects = ref([])
const isLoading = ref(true)
const searchQuery = ref('')
const currentPage = ref(1)
const totalPages = ref(1)
const totalCount = ref(0)

const drawerOpen = ref(false)
const selectedProject = ref({})

let debounceTimer = null

const debouncedFetch = () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    currentPage.value = 1
    fetchArchived()
  }, 300)
}

const fetchArchived = async () => {
  isLoading.value = true
  try {
    const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token')
    if (!token) return

    const params = { page: currentPage.value, limit: 20 }
    if (searchQuery.value) params.search = searchQuery.value

    const response = await axios.get('http://localhost:8000/api/projects/archived/list', {
      headers: { Authorization: `Bearer ${token}` },
      params
    })

    const data = response.data
    projects.value = (data.items || []).map(p => ({
      ...p,
      project_name: p.name || p.project_name,
      budget_utilized: p.budget_utilized || 0,
      budget_amount: p.budget_amount || 0,
      completion_percentage: p.completion_percentage || 0,
      description: p.description || '',
      code: p.code || '',
      created_by_name: p.created_by_name || 'Unknown'
    }))

    totalPages.value = data.pages || 1
    totalCount.value = data.total || 0
  } catch (e) {
    console.error(e)
    showError('Failed to load archived projects')
  } finally {
    isLoading.value = false
  }
}

const goToPage = (page) => {
  currentPage.value = page
  fetchArchived()
}

const openDrawer = (project) => {
  selectedProject.value = project
  drawerOpen.value = true
}

const closeDrawer = () => {
  drawerOpen.value = false
  selectedProject.value = {}
}

const viewProjectDetails = (project) => {
  closeDrawer()
  const base = route.path.startsWith('/admin') ? '/admin' : '/user'
  router.push(`${base}/projects/projectdetails/${project.id}`)
}

// Helpers
const formatCurrency = (amount, currency) => {
  const symbols = { 'USD': '$', 'EUR': '€', 'GBP': '£', 'INR': '₹', 'JPY': '¥', 'OMR': 'OMR ' }
  return `${symbols[currency] || currency + ' '}${Number(amount || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const formatNumber = (val) => {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(val || 0)
}

const formatDate = (date) => {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const getDuration = (start, end) => {
  if (!start || !end) return '—'
  const s = new Date(start)
  const e = new Date(end)
  const diffTime = Math.abs(e - s)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  if (diffDays > 365) return `${Math.round(diffDays / 365)}y ${Math.round((diffDays % 365) / 30)}m`
  if (diffDays > 30) return `${Math.round(diffDays / 30)} months`
  return `${diffDays} days`
}

const getAgeSince = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const now = new Date()
  const diffMs = now - d
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const months = Math.floor(diffDays / 30)
  const years = Math.floor(months / 12)
  if (years > 0) return `${years}y ${months % 12}m ago`
  return `${months} months ago`
}

const { run } = useGsapAnim(pageRoot)
run(() => { archivedProjectsEntry(pageRoot.value) })

onMounted(() => {
  fetchArchived()
})
</script>

<style scoped>
.archived-projects-page {
  width: 100%;
  padding-bottom: 60px;
}

/* Page Header */
.page-header {
  margin-bottom: 40px;
}

.header-left h1 {
  font-size: 32px;
  font-weight: 800;
  background: linear-gradient(135deg, #fff 0%, #a1a1aa 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 8px;
  letter-spacing: -0.03em;
}

.subtitle {
  color: #8e8e93;
  font-size: 15px;
}

/* Filter Bar */
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.search-box {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #71717a;
}

.search-box input {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 10px 16px 10px 40px;
  border-radius: 12px;
  font-size: 14px;
  width: 320px;
  outline: none;
  transition: all 0.3s;
}

.search-box input:focus {
  border-color: rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
  box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.02);
}

.stats-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: rgba(168, 85, 247, 0.1);
  border: 1px solid rgba(168, 85, 247, 0.2);
  border-radius: 20px;
  color: #c084fc;
  font-size: 13px;
  font-weight: 600;
}

.stats-icon { opacity: 0.8; }

/* Section Header (Table) */
.section-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;
}
.header-content h3 { font-size: 16px; font-weight: 600; color: #f5f5f7; margin-bottom: 2px; }
.header-content p { font-size: 13px; color: rgba(255,255,255,0.5); margin: 0; }

/* Table Structure — Matching ActiveMilestoneTable exactly */
.ms-table { display: flex; flex-direction: column; width: 100%; }

.ms-row {
  display: grid;
  /* Name | Code | Type | Org | Budget | Used | Timeline | Completed | Owner | Status */
  grid-template-columns: 2fr 110px 100px 120px 100px 100px 90px 100px 50px 100px;
  align-items: center; padding: 12px 0;
  gap: 12px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.ms-row.header {
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  font-size: 11px; text-transform: uppercase; color: rgba(255,255,255,0.4); font-weight: 600; letter-spacing: 0.05em;
}

.ms-row.item {
  transition: background 0.25s ease;
  border-radius: 8px;
  margin: 0 -8px;
  padding: 12px 8px;
  cursor: pointer;
  border-bottom: 1px solid transparent;
  position: relative;
  overflow: hidden;
}
.ms-row.item::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(245,158,11,0.08) 50%, transparent 100%);
  transform: translateX(-100%);
  pointer-events: none;
  transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}
.ms-row.item:hover {
  background: rgba(245,158,11,0.04);
}
.ms-row.item:hover::before {
  transform: translateX(100%);
}

/* Columns */
.col-name { display: flex; flex-direction: column; min-width: 0; }
.ms-title { font-size: 13px; font-weight: 500; color: #f5f5f7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.col-code { font-size: 11px; color: rgba(255,255,255,0.5); font-family: 'SF Mono', monospace; letter-spacing: 0.02em; }
.code-mono { background: rgba(255,255,255,0.03); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(255,255,255,0.05); }

.col-type { font-size: 12px; color: rgba(255,255,255,0.6); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.col-org { font-size: 12px; color: rgba(255,255,255,0.6); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.col-budget, .col-used { font-size: 12px; color: #d4d4d8; font-weight: 500; }
.val-text { font-variant-numeric: tabular-nums; }

.col-timeline { font-size: 11px; color: rgba(255,255,255,0.6); font-family: 'SF Mono', monospace; }
.col-completed { font-size: 11px; color: rgba(255,255,255,0.6); font-family: 'SF Mono', monospace; }

.col-owner { display: flex; justify-content: center; }
.owner-avatar {
  width: 24px; height: 24px; border-radius: 50%;
  background: #3f3f46; color: rgba(255,255,255,0.8);
  font-size: 10px; font-weight: 600;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid rgba(255,255,255,0.1);
}

.col-badge { display: flex; justify-content: flex-start; }
.ms-badge {
  font-size: 10px; padding: 4px 8px; border-radius: 12px;
  text-transform: capitalize; border: 1px solid transparent;
  font-weight: 600; white-space: nowrap;
  display: flex; align-items: center; gap: 4px;
}
.ms-badge.archived {
  background: rgba(168, 85, 247, 0.1);
  color: #c084fc;
  border-color: rgba(168, 85, 247, 0.2);
}

.empty-row { padding: 40px; text-align: center; color: rgba(255,255,255,0.3); font-size: 13px; }

/* Pagination */
.pagination-bar {
  display: flex; align-items: center; justify-content: center; gap: 16px;
  margin-top: 24px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.05);
}
.page-btn {
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.6); width: 32px; height: 32px; border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.2s;
}
.page-btn:hover:not(:disabled) { background: rgba(255,255,255,0.1); color: #fff; }
.page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.page-info { font-size: 12px; color: rgba(255,255,255,0.4); font-weight: 500; }

/* Drawer — Matching MilestoneDetailsPanel exactly */
.panel-overlay {
  position: fixed; inset: 0; z-index: 9998;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  display: flex; justify-content: flex-end;
}

.panel-content.glass-panel {
  width: 480px; max-width: 90vw; height: 100vh;
  display: flex; flex-direction: column;
  border-left: 1px solid rgba(255,255,255,0.08);
  background: rgba(20, 20, 23, 0.85);
  backdrop-filter: blur(20px);
}

.panel-header {
  padding: 24px;
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.panel-header .header-left { display: flex; gap: 8px; align-items: center; }

.type-badge { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; background: rgba(255,255,255,0.1); padding: 2px 6px; border-radius: 4px; color: rgba(255,255,255,0.7); }
.status-badge { font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; }
.status-badge.archived { color: #c084fc; background: rgba(168, 85, 247, 0.1); }

.completion-badge {
  font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;
  display: flex; align-items: center; gap: 4px;
  color: #34d399; background: rgba(16, 185, 129, 0.1);
}

.close-btn {
  background: none; border: none; color: rgba(255,255,255,0.4);
  cursor: pointer; width: 32px; height: 32px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.close-btn:hover {
  color: white;
  background: rgba(255,255,255,0.1);
  transform: rotate(90deg);
}

.panel-body {
  padding: 16px;
  flex: 1; overflow-y: auto;
}

.panel-body::-webkit-scrollbar { width: 6px; }
.panel-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
.panel-body::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
.panel-body::-webkit-scrollbar-track { background: transparent; }

.title-section h2 { font-size: 20px; font-weight: 600; color: #f5f5f7; margin: 0 0 8px 0; }
.project-code-pill {
  font-size: 10px; color: rgba(255,255,255,0.5);
  background: rgba(255,255,255,0.03); padding: 3px 8px; border-radius: 6px;
  font-family: 'SF Mono', monospace; letter-spacing: 0.05em;
  border: 1px solid rgba(255,255,255,0.05);
  display: inline-block; margin-bottom: 12px;
}
.description { font-size: 14px; line-height: 1.6; color: rgba(255,255,255,0.7); white-space: pre-wrap; margin-top: 8px; }

.divider { height: 1px; background: rgba(255,255,255,0.05); margin: 16px 0; }
.divider.full-width { grid-column: span 2; }

.details-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
}

.detail-item { display: flex; flex-direction: column; gap: 4px; }
.detail-item.full-width { grid-column: span 2; }
.detail-item label { font-size: 11px; text-transform: uppercase; color: rgba(255,255,255,0.4); font-weight: 600; letter-spacing: 0.05em; }
.detail-item .value { font-size: 14px; color: #f5f5f7; display: flex; align-items: center; gap: 6px; }
.detail-item .value.mono { font-variant-numeric: tabular-nums; }

.avatar-xs { width: 24px; height: 24px; background: rgba(255,255,255,0.1); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 600; }

.text-blue-400 { color: #60a5fa; }
.text-purple-400 { color: #a78bfa; }
.text-amber-400 { color: #fbbf24; }
.text-green-400 { color: #4ade80; }
.text-emerald-400 { color: #34d399; }
.text-red-400 { color: #f87171; }
.text-orange-400 { color: #fb923c; }
.text-indigo-400 { color: #818cf8; }
.text-yellow-400 { color: #facc15; }

.meta-section { margin-top: 40px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.05); font-size: 12px; color: rgba(255,255,255,0.3); font-style: italic; }

.panel-footer {
  padding: 24px; border-top: 1px solid rgba(255,255,255,0.05);
  display: flex; justify-content: space-between; align-items: center;
}

.permission-note { font-size: 12px; color: rgba(255,255,255,0.3); display: flex; align-items: center; gap: 6px; }

.btn-pill { display: flex; align-items: center; gap: 8px; }
.btn-pill.primary {
  background: white; color: black;
  border: none; padding: 8px 16px; border-radius: 20px;
  font-weight: 600; font-size: 13px; cursor: pointer;
  display: flex; align-items: center; gap: 8px;
  box-shadow: 0 4px 12px rgba(255,255,255,0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}
.btn-pill.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(255,255,255,0.2);
}

/* Transitions */
.panel-slide-enter-active, .panel-slide-leave-active { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.panel-slide-enter-from, .panel-slide-leave-to { opacity: 0; transform: translateX(100%); }

/* Empty/Loading States */
.empty-state { text-align: center; padding: 80px 0; color: #71717a; }
.empty-icon-wrapper {
  width: 80px; height: 80px; background: rgba(255, 255, 255, 0.03);
  border-radius: 50%; margin: 0 auto 24px;
  display: flex; align-items: center; justify-content: center;
}
.empty-icon { opacity: 0.55; color: #fbbf24; }
.empty-state h3 { font-size: 18px; color: #a1a1aa; margin-bottom: 8px; font-weight: 600; }
.empty-state p { font-size: 14px; color: #71717a; max-width: 400px; margin: 0 auto; }

.loading-state { text-align: center; padding: 60px; color: #71717a; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }
</style>
