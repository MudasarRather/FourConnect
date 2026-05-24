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

              <!-- Budget Hero — big-deal summary card -->
              <div class="budget-hero">
                <div class="bh-item">
                  <span class="bh-label"><CreditCard :size="10" /> Order Value</span>
                  <span class="bh-value">{{ selectedProject.currency }} {{ formatNumber(selectedProject.budget_amount) }}</span>
                </div>
                <div class="bh-divider"></div>
                <div class="bh-item">
                  <span class="bh-label"><TrendingUp :size="10" /> Utilized</span>
                  <span class="bh-value">{{ selectedProject.currency }} {{ formatNumber(selectedProject.budget_utilized) }}</span>
                </div>
              </div>

              <!-- Timeline section -->
              <div class="d-section">
                <div class="d-section-title"><Calendar :size="12" /> Timeline</div>
                <div class="d-grid">
                  <div class="d-card">
                    <span class="d-card-label">Start</span>
                    <span class="d-card-value">{{ formatDate(selectedProject.start_date) || '—' }}</span>
                  </div>
                  <div class="d-card">
                    <span class="d-card-label">End</span>
                    <span class="d-card-value">{{ formatDate(selectedProject.end_date) || '—' }}</span>
                  </div>
                  <div class="d-card">
                    <span class="d-card-label">Completed</span>
                    <span class="d-card-value emerald">{{ formatDate(selectedProject.completed_at) }}</span>
                  </div>
                </div>
              </div>

              <!-- Classification section -->
              <div class="d-section" v-if="selectedProject.category || selectedProject.priority || selectedProject.lifecycle_status || selectedProject.funding_type">
                <div class="d-section-title"><Tag :size="12" /> Classification</div>
                <div class="d-grid">
                  <div class="d-card" v-if="selectedProject.category">
                    <span class="d-card-label">Category</span>
                    <span class="d-card-value">{{ selectedProject.category }}</span>
                  </div>
                  <div class="d-card" v-if="selectedProject.priority">
                    <span class="d-card-label">Priority</span>
                    <span class="d-card-value"><Flame :size="11" class="ic-amber" /> {{ selectedProject.priority }}</span>
                  </div>
                  <div class="d-card" v-if="selectedProject.lifecycle_status">
                    <span class="d-card-label">Lifecycle</span>
                    <span class="d-card-value">{{ selectedProject.lifecycle_status }}</span>
                  </div>
                  <div class="d-card" v-if="selectedProject.funding_type">
                    <span class="d-card-label">Funding</span>
                    <span class="d-card-value"><Coins :size="11" class="ic-amber" /> {{ selectedProject.funding_type }}</span>
                  </div>
                </div>
              </div>

              <!-- Location section -->
              <div class="d-section" v-if="selectedProject.state || selectedProject.district || selectedProject.organization">
                <div class="d-section-title"><MapPin :size="12" /> Location & Org</div>
                <div class="d-grid">
                  <div class="d-card" v-if="selectedProject.organization">
                    <span class="d-card-label"><Building :size="10" /> Organization</span>
                    <span class="d-card-value">{{ selectedProject.organization }}</span>
                  </div>
                  <div class="d-card" v-if="selectedProject.state || selectedProject.district">
                    <span class="d-card-label">State · District</span>
                    <span class="d-card-value">{{ [selectedProject.state, selectedProject.district].filter(Boolean).join(' · ') }}</span>
                  </div>
                </div>
              </div>

              <!-- Government Order section -->
              <div class="d-section" v-if="selectedProject.government_order_no">
                <div class="d-section-title gov"><Crown :size="12" /> Government Order</div>
                <div class="gov-card">
                  <span class="gov-no">{{ selectedProject.government_order_no }}</span>
                  <span class="gov-meta" v-if="selectedProject.issuing_authority">· {{ selectedProject.issuing_authority }}</span>
                </div>
              </div>

              <!-- Project Head section -->
              <div class="d-section" v-if="selectedProject.project_head_name">
                <div class="d-section-title"><User :size="12" /> Project Head</div>
                <div class="person-card">
                  <div class="person-avatar">{{ (selectedProject.project_head_name || '?').charAt(0).toUpperCase() }}</div>
                  <div class="person-info">
                    <span class="person-name">{{ selectedProject.project_head_name }}</span>
                    <span class="person-meta" v-if="selectedProject.project_head_designation">{{ selectedProject.project_head_designation }}</span>
                  </div>
                </div>
              </div>

              <!-- Team & Milestones counts -->
              <div class="d-section">
                <div class="d-section-title"><Users :size="12" /> People & Progress</div>
                <div class="stat-grid">
                  <div class="stat-tile">
                    <div class="stat-icon-box"><Users :size="14" /></div>
                    <div class="stat-info">
                      <span class="stat-label">Team Members</span>
                      <span class="stat-value">{{ selectedProject.team_member_count || 0 }}</span>
                    </div>
                  </div>
                  <div class="stat-tile">
                    <div class="stat-icon-box"><Flag :size="14" /></div>
                    <div class="stat-info">
                      <span class="stat-label">Milestones</span>
                      <span class="stat-value">{{ selectedProject.milestone_count || 0 }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Project Owner section -->
              <div class="d-section">
                <div class="d-section-title"><User :size="12" /> Project Owner</div>
                <div class="person-card">
                  <div class="person-avatar owner">{{ (selectedProject.created_by_name || '?').charAt(0).toUpperCase() }}</div>
                  <div class="person-info">
                    <span class="person-name">{{ selectedProject.created_by_name || 'Unknown' }}</span>
                    <span class="person-meta">Created · {{ formatDate(selectedProject.created_at) }}</span>
                  </div>
                </div>
              </div>

              <!-- Meta -->
              <div class="meta-section" v-if="selectedProject.completed_at">
                <Archive :size="11" /> Archived after 6+ months of completion ({{ getAgeSince(selectedProject.completed_at) }})
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
import { API } from '@/utils/api'

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

    const response = await axios.get(`${API}/projects/archived/list`, {
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
  position: relative;
  animation: page-enter 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
}

/* Floating ambient orbs — page-wide modern accent */
.archived-projects-page::before,
.archived-projects-page::after {
  content: "";
  position: fixed;
  border-radius: 50%;
  filter: blur(60px);
  pointer-events: none;
  z-index: 0;
}
.archived-projects-page::before {
  width: 380px; height: 380px;
  top: 80px; right: -100px;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.10), transparent 70%);
  animation: orb-drift-a 18s ease-in-out infinite;
}
.archived-projects-page::after {
  width: 320px; height: 320px;
  bottom: 80px; left: -80px;
  background: radial-gradient(circle, rgba(249, 115, 22, 0.08), transparent 70%);
  animation: orb-drift-b 22s ease-in-out infinite;
}
.archived-projects-page > * { position: relative; z-index: 1; }

@keyframes page-enter {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes orb-drift-a {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(-30px, 30px) scale(1.10); }
}
@keyframes orb-drift-b {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(20px, -25px) scale(1.08); }
}

/* Page Header */
.page-header {
  margin-bottom: 40px;
}

.header-left h1 {
  font-size: 32px;
  font-weight: 800;
  background: linear-gradient(135deg, #fff 0%, #fbbf24 60%, #f59e0b 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 8px;
  letter-spacing: -0.03em;
  animation: title-shimmer-in 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.10s both;
}
@keyframes title-shimmer-in {
  from { opacity: 0; transform: translateX(-12px); }
  to   { opacity: 1; transform: translateX(0); }
}

.subtitle {
  color: rgba(255, 255, 255, 0.55);
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
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: #fff;
  padding: 10px 16px 10px 40px;
  border-radius: 12px;
  font-size: 14px;
  width: 320px;
  outline: none;
  transition: border-color 0.25s ease, background 0.25s ease, box-shadow 0.25s ease;
}

.search-box input:focus {
  border-color: rgba(245, 158, 11, 0.50);
  background: rgba(245, 158, 11, 0.06);
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.12);
}

/* Stats pill — now AMBER (was purple) */
.stats-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.16), rgba(245, 158, 11, 0.06));
  border: 1px solid rgba(245, 158, 11, 0.32);
  border-radius: 999px;
  color: #fbbf24;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 4px 14px rgba(245, 158, 11, 0.16);
  animation: pill-breathe 3s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
@keyframes pill-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.03); }
}

.stats-icon { opacity: 0.8; }

/* Section Header (Table) */
.section-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;
}
.header-content h3 { font-size: 16px; font-weight: 600; color: #f5f5f7; margin-bottom: 2px; }
.header-content p { font-size: 13px; color: rgba(255,255,255,0.5); margin: 0; }

/* Table Structure — Matching ActiveMilestoneTable exactly */
.archive-table-wrapper {
  animation: table-enter 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.18s both;
}
@keyframes table-enter {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.ms-table { display: flex; flex-direction: column; width: 100%; }

.ms-row {
  display: grid;
  /* Name | Code (wider to fit PRJ-ARCHIVE-DEMO) | Type | Org | Budget | Used | Timeline | Completed | Owner | Status */
  grid-template-columns: 2fr 160px 110px 130px 110px 110px 90px 100px 50px 100px;
  align-items: center; padding: 12px 0;
  gap: 12px;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.ms-row.header {
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(245, 158, 11, 0.20);
  font-size: 10px; text-transform: uppercase;
  color: rgba(245, 158, 11, 0.75); font-weight: 700; letter-spacing: 0.10em;
}

.ms-row.item {
  transition: background 0.25s ease, transform 0.25s ease;
  border-radius: 12px;
  margin: 0 -8px;
  padding: 14px 8px;
  cursor: pointer;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  position: relative;
  overflow: hidden;
  animation: row-fade-in 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.ms-row.item:nth-child(2) { animation-delay: 0.05s; }
.ms-row.item:nth-child(3) { animation-delay: 0.10s; }
.ms-row.item:nth-child(4) { animation-delay: 0.15s; }
.ms-row.item:nth-child(5) { animation-delay: 0.20s; }
.ms-row.item:nth-child(6) { animation-delay: 0.25s; }
.ms-row.item:nth-child(n+7) { animation-delay: 0.30s; }

@keyframes row-fade-in {
  from { opacity: 0; transform: translateX(-8px); }
  to   { opacity: 1; transform: translateX(0); }
}

.ms-row.item::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(245, 158, 11, 0.10) 50%, transparent 100%);
  transform: translateX(-100%);
  pointer-events: none;
  transition: transform 0.9s cubic-bezier(0.16, 1, 0.3, 1);
}
.ms-row.item:hover {
  background: rgba(245, 158, 11, 0.06);
  transform: translateX(2px);
}
.ms-row.item:hover::before {
  transform: translateX(100%);
}

/* Columns */
.col-name { display: flex; flex-direction: column; min-width: 0; }
.ms-title { font-size: 13px; font-weight: 600; color: #f5f5f7; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.col-code { font-size: 11px; color: rgba(255,255,255,0.55); font-family: 'SF Mono', monospace; letter-spacing: 0.02em; min-width: 0; }
.code-mono {
  background: rgba(245, 158, 11, 0.08);
  border: 1px solid rgba(245, 158, 11, 0.20);
  color: #fbbf24;
  padding: 3px 8px; border-radius: 6px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  display: inline-block; max-width: 100%;
}

.col-type { font-size: 12px; color: rgba(255,255,255,0.6); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.col-org { font-size: 12px; color: rgba(255,255,255,0.6); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.col-budget, .col-used { font-size: 12px; color: #d4d4d8; font-weight: 500; }
.val-text { font-variant-numeric: tabular-nums; }

.col-timeline { font-size: 11px; color: rgba(255,255,255,0.6); font-family: 'SF Mono', monospace; }
.col-completed { font-size: 11px; color: rgba(255,255,255,0.6); font-family: 'SF Mono', monospace; }

.col-owner { display: flex; justify-content: center; }
.owner-avatar {
  width: 28px; height: 28px; border-radius: 50%;
  background: linear-gradient(135deg, #f59e0b, #f97316);
  color: #fff;
  font-size: 11px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.10);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.ms-row.item:hover .owner-avatar { transform: scale(1.10); }

.col-badge { display: flex; justify-content: flex-start; }
.ms-badge {
  font-size: 10px; padding: 4px 10px; border-radius: 999px;
  text-transform: uppercase; letter-spacing: 0.05em;
  border: 1px solid transparent;
  font-weight: 700; white-space: nowrap;
  display: inline-flex; align-items: center; gap: 4px;
}
/* Archived badge — AMBER (was purple) */
.ms-badge.archived {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(245, 158, 11, 0.06));
  color: #fbbf24;
  border-color: rgba(245, 158, 11, 0.40);
  box-shadow: 0 0 12px rgba(245, 158, 11, 0.18);
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

/* Drawer — frosted-glass with ambient amber glow */
.panel-overlay {
  position: fixed; inset: 0; z-index: 9998;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex; justify-content: flex-end;
}

.panel-content.glass-panel {
  width: 520px; max-width: 92vw; height: 100vh;
  display: flex; flex-direction: column;
  border-left: 1px solid rgba(245, 158, 11, 0.18);
  background: rgba(20, 18, 14, 0.62);
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
  box-shadow: -20px 0 60px rgba(0, 0, 0, 0.55), inset 1px 0 0 rgba(255, 255, 255, 0.04);
  position: relative; overflow: hidden;
}
.panel-content.glass-panel::before {
  content: "";
  position: absolute;
  top: -80px; right: -60px;
  width: 280px; height: 280px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.16), transparent 70%);
  filter: blur(40px);
  pointer-events: none;
  z-index: 0;
  animation: panel-orb 14s ease-in-out infinite;
}
.panel-content.glass-panel > * { position: relative; z-index: 1; }

@keyframes panel-orb {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(-25px, 30px); }
}

.panel-header {
  padding: 24px;
  display: flex; justify-content: space-between; align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}

.panel-header .header-left { display: flex; gap: 8px; align-items: center; }

.type-badge {
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
  background: rgba(255,255,255,0.06); border: 1px solid rgba(255, 255, 255, 0.10);
  padding: 4px 10px; border-radius: 999px; color: rgba(255,255,255,0.75);
}
.status-badge {
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
  padding: 4px 10px; border-radius: 999px;
  border: 1px solid transparent;
}
/* Archived badge — AMBER not purple */
.status-badge.archived {
  color: #fbbf24;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(245, 158, 11, 0.06));
  border-color: rgba(245, 158, 11, 0.36);
}

.completion-badge {
  font-size: 10px; font-weight: 700; padding: 4px 10px; border-radius: 999px;
  display: inline-flex; align-items: center; gap: 5px;
  color: #34d399;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.18), rgba(16, 185, 129, 0.06));
  border: 1px solid rgba(16, 185, 129, 0.32);
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

.title-section h2 {
  font-size: 22px; font-weight: 700;
  background: linear-gradient(135deg, #fff 30%, #fbbf24 100%);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  margin: 0 0 10px 0; letter-spacing: -0.01em;
  line-height: 1.3;
}
.project-code-pill {
  font-size: 10px; font-weight: 700;
  color: #fbbf24;
  background: rgba(245, 158, 11, 0.10);
  padding: 4px 10px; border-radius: 999px;
  font-family: 'SF Mono', monospace; letter-spacing: 0.08em;
  border: 1px solid rgba(245, 158, 11, 0.28);
  display: inline-block; margin-bottom: 14px;
}
.description {
  font-size: 13px; line-height: 1.6;
  color: rgba(255,255,255,0.70);
  white-space: pre-wrap; margin-top: 10px;
}

/* ─── Budget hero — big-deal money summary ─── */
.budget-hero {
  display: flex; align-items: stretch; gap: 0;
  margin-top: 20px;
  padding: 16px 18px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.10), rgba(249, 115, 22, 0.04));
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: 14px;
  box-shadow: 0 6px 20px rgba(245, 158, 11, 0.08);
  animation: bh-enter 0.5s cubic-bezier(0.16, 1, 0.3, 1) 0.10s both;
}
.bh-item { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.bh-divider {
  width: 1px;
  background: linear-gradient(180deg, transparent, rgba(245, 158, 11, 0.30), transparent);
  margin: 0 16px;
}
.bh-label {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
  color: rgba(245, 158, 11, 0.85);
}
.bh-value {
  font-size: 17px; font-weight: 700;
  color: #f5f5f7;
  font-variant-numeric: tabular-nums;
}
@keyframes bh-enter {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ─── Section structure ─── */
.d-section {
  margin-top: 22px;
  animation: section-enter 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.d-section:nth-of-type(1) { animation-delay: 0.12s; }
.d-section:nth-of-type(2) { animation-delay: 0.18s; }
.d-section:nth-of-type(3) { animation-delay: 0.24s; }
.d-section:nth-of-type(4) { animation-delay: 0.30s; }
.d-section:nth-of-type(5) { animation-delay: 0.36s; }
.d-section:nth-of-type(6) { animation-delay: 0.42s; }
.d-section:nth-of-type(7) { animation-delay: 0.48s; }

@keyframes section-enter {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.d-section-title {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 700; text-transform: uppercase;
  color: rgba(245, 158, 11, 0.85);
  letter-spacing: 0.10em;
  margin-bottom: 10px;
  padding-bottom: 6px;
  border-bottom: 2px solid rgba(245, 158, 11, 0.32);
  position: relative;
}
.d-section-title.gov { color: #fbbf24; }
.d-section-title svg { opacity: 0.85; }

.d-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
}

.d-card {
  display: flex; flex-direction: column; gap: 4px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  transition: background 0.20s ease, border-color 0.20s ease, transform 0.20s ease;
}
.d-card:hover {
  background: rgba(245, 158, 11, 0.06);
  border-color: rgba(245, 158, 11, 0.22);
  transform: translateY(-1px);
}
.d-card-label {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 10px; font-weight: 600;
  color: rgba(255,255,255,0.50);
  text-transform: uppercase; letter-spacing: 0.04em;
}
.d-card-value {
  font-size: 13px; font-weight: 600;
  color: #f5f5f7;
  display: inline-flex; align-items: center; gap: 5px;
  font-variant-numeric: tabular-nums;
}
.d-card-value.emerald { color: #34d399; }

.ic-amber { color: #fbbf24; flex-shrink: 0; }

/* ─── Government order card ─── */
.gov-card {
  display: flex; align-items: center; flex-wrap: wrap; gap: 8px;
  padding: 12px 14px;
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.10), rgba(245, 158, 11, 0.04));
  border: 1px solid rgba(251, 191, 36, 0.28);
  border-radius: 10px;
}
.gov-no {
  font-family: 'SF Mono', monospace; font-size: 13px;
  color: #fbbf24; font-weight: 700;
  letter-spacing: 0.04em;
}
.gov-meta { font-size: 12px; color: rgba(255,255,255,0.55); }

/* ─── Person card (project head, owner) ─── */
.person-card {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 14px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  transition: background 0.20s ease, border-color 0.20s ease;
}
.person-card:hover {
  background: rgba(245, 158, 11, 0.06);
  border-color: rgba(245, 158, 11, 0.22);
}
.person-avatar {
  width: 36px; height: 36px; border-radius: 50%;
  background: linear-gradient(135deg, #f59e0b, #f97316);
  color: #fff;
  font-size: 13px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.30);
  flex-shrink: 0;
}
.person-avatar.owner {
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
}
.person-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.person-name {
  font-size: 14px; font-weight: 600; color: #f5f5f7;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.person-meta {
  font-size: 11px; color: rgba(255,255,255,0.50);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* ─── Stat tiles (Team Members / Milestones) ─── */
.stat-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
}
.stat-tile {
  display: flex; align-items: center; gap: 12px;
  padding: 14px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 12px;
  transition: background 0.20s ease, border-color 0.20s ease, transform 0.20s ease;
}
.stat-tile:hover {
  background: rgba(245, 158, 11, 0.08);
  border-color: rgba(245, 158, 11, 0.24);
  transform: translateY(-2px);
}
.stat-icon-box {
  width: 36px; height: 36px; border-radius: 10px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.20), rgba(245, 158, 11, 0.06));
  color: #fbbf24;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid rgba(245, 158, 11, 0.28);
  flex-shrink: 0;
}
.stat-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.stat-label { font-size: 10px; font-weight: 600; color: rgba(255,255,255,0.50); text-transform: uppercase; letter-spacing: 0.05em; }
.stat-value { font-size: 18px; font-weight: 700; color: #f5f5f7; font-variant-numeric: tabular-nums; }

/* Meta footer */
.meta-section {
  margin-top: 28px; padding: 14px;
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 11px; color: rgba(245, 158, 11, 0.70);
  background: rgba(245, 158, 11, 0.05);
  border: 1px dashed rgba(245, 158, 11, 0.22);
  border-radius: 10px;
  font-style: italic;
}

/* Legacy avatar / utility classes — kept in case referenced elsewhere */
.avatar-xs { width: 24px; height: 24px; background: rgba(245, 158, 11, 0.20); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #fbbf24; }
.text-blue-400, .text-purple-400, .text-indigo-400, .text-cyan-400 { color: #fbbf24; }
.text-amber-400, .text-yellow-400, .text-orange-400 { color: #fbbf24; }
.text-green-400, .text-emerald-400 { color: #34d399; }
.text-red-400 { color: #f87171; }

.divider { height: 1px; background: rgba(245, 158, 11, 0.15); margin: 16px 0; }
.divider.full-width { grid-column: span 2; }

/* Legacy detail-item (no longer used by new template but kept harmless) */
.details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.detail-item { display: flex; flex-direction: column; gap: 4px; }
.detail-item.full-width { grid-column: span 2; }
.detail-item label { font-size: 11px; text-transform: uppercase; color: rgba(245, 158, 11, 0.70); font-weight: 700; letter-spacing: 0.05em; }
.detail-item .value { font-size: 14px; color: #f5f5f7; display: flex; align-items: center; gap: 6px; }
.detail-item .value.mono { font-variant-numeric: tabular-nums; }

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

/* ═════════ LIGHT THEME OVERRIDES ═════════════════════════════════════════ */
[data-theme="light"] .archived-projects-page { color: var(--text-primary); }
[data-theme="light"] .archived-projects-page::before {
  background: radial-gradient(circle, rgba(217, 119, 6, 0.16), transparent 70%);
}
[data-theme="light"] .archived-projects-page::after {
  background: radial-gradient(circle, rgba(234, 88, 12, 0.12), transparent 70%);
}
[data-theme="light"] .header-left h1 {
  background: linear-gradient(135deg, #1a1410, #92400e);
  -webkit-background-clip: text;
          background-clip: text;
  -webkit-text-fill-color: transparent;
}
[data-theme="light"] .subtitle { color: var(--text-secondary); }
[data-theme="light"] .search-box input {
  background: rgba(26, 20, 16, 0.05);
  border-color: rgba(26, 20, 16, 0.12);
  color: var(--text-primary);
}
[data-theme="light"] .search-box input:focus { border-color: rgba(217, 119, 6, 0.30); }
/* Stats pill — was PURPLE (off-palette). Now amber/golden. */
[data-theme="light"] .stats-pill {
  background: rgba(217, 119, 6, 0.12);
  border-color: rgba(217, 119, 6, 0.30);
  color: #92400e;
}

/* Table — no boxed border on the wrapper, let it blend into the page */
[data-theme="light"] .archive-table-wrapper {
  background: transparent;
  border: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  box-shadow: none;
}
[data-theme="light"] .section-header {
  border-bottom-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .section-header h3 { color: var(--text-primary); }
[data-theme="light"] .section-header p { color: #6b5840; }

[data-theme="light"] .ms-title { color: var(--text-primary); }
[data-theme="light"] .ms-row.header {
  color: #b45309;
  border-bottom-color: rgba(40, 25, 10, 0.16);
}
[data-theme="light"] .ms-row.item {
  border-bottom-color: rgba(40, 25, 10, 0.08);
}
[data-theme="light"] .ms-row.item:hover {
  background: rgba(217, 119, 6, 0.06);
}
[data-theme="light"] .ms-row.item::before {
  background: linear-gradient(90deg, rgba(217, 119, 6, 0.12), transparent);
}

/* Column text — all visible on cream */
[data-theme="light"] .col-code { color: #92400e; }
[data-theme="light"] .code-mono {
  background: rgba(217, 119, 6, 0.14);
  border-color: rgba(217, 119, 6, 0.32);
  color: #92400e;
}
[data-theme="light"] .ms-row.header { color: #b45309; border-bottom-color: rgba(217, 119, 6, 0.30); }
[data-theme="light"] .ms-row.item { border-bottom-color: rgba(40, 25, 10, 0.08); }
[data-theme="light"] .ms-row.item:hover { background: rgba(217, 119, 6, 0.08); }
[data-theme="light"] .ms-row.item::before {
  background: linear-gradient(90deg, transparent 0%, rgba(217, 119, 6, 0.14) 50%, transparent 100%);
}
[data-theme="light"] .ms-title { color: var(--text-primary); }

/* Owner avatar in row */
[data-theme="light"] .owner-avatar {
  background: linear-gradient(135deg, #d97706, #b45309);
  color: #fff;
  box-shadow: 0 4px 12px rgba(217, 119, 6, 0.30);
  border-color: rgba(255, 255, 255, 0.50);
}

/* Archived badge */
[data-theme="light"] .ms-badge.archived {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.20), rgba(217, 119, 6, 0.08));
  color: #92400e;
  border-color: rgba(217, 119, 6, 0.40);
  box-shadow: 0 0 12px rgba(217, 119, 6, 0.18);
}

/* Header title gradient in light theme */
[data-theme="light"] .header-left h1 {
  background: linear-gradient(135deg, #1a1410 0%, #b45309 60%, #d97706 100%);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
[data-theme="light"] .subtitle { color: #6b5840; }

/* Search */
[data-theme="light"] .search-box input {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(217, 119, 6, 0.22);
  color: var(--text-primary);
}
[data-theme="light"] .search-box input:focus {
  border-color: #d97706;
  background: rgba(255, 246, 226, 0.85);
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.18);
}
[data-theme="light"] .search-icon { color: #b45309; }

/* Stats pill */
[data-theme="light"] .stats-pill {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.18), rgba(217, 119, 6, 0.06));
  color: #92400e;
  border-color: rgba(217, 119, 6, 0.40);
  box-shadow: 0 4px 14px rgba(217, 119, 6, 0.16);
}
[data-theme="light"] .col-type,
[data-theme="light"] .col-org { color: #6b5840; }
[data-theme="light"] .col-budget,
[data-theme="light"] .col-used { color: var(--text-primary); }
[data-theme="light"] .col-timeline,
[data-theme="light"] .col-completed { color: #6b5840; }

/* Owner avatar in row */
[data-theme="light"] .owner-avatar {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.22), rgba(217, 119, 6, 0.10));
  border: 1px solid rgba(217, 119, 6, 0.32);
  color: #92400e;
}

/* Archived badge — replace purple with amber */
[data-theme="light"] .ms-badge.archived {
  color: #92400e;
  background: rgba(217, 119, 6, 0.14);
  border: 1px solid rgba(217, 119, 6, 0.34);
}

[data-theme="light"] .empty-row { color: #92400e; }

/* Pagination */
[data-theme="light"] .page-btn {
  background: rgba(255, 250, 240, 0.55);
  border: 1px solid rgba(217, 119, 6, 0.22);
  color: #6b5840;
}
[data-theme="light"] .page-btn:hover:not(:disabled) {
  background: rgba(217, 119, 6, 0.14);
  color: #92400e;
}
[data-theme="light"] .page-info { color: #6b5840; }

/* ─── DRAWER (panel) — frosted-glass cream, same transparency as dark ─── */
[data-theme="light"] .panel-overlay { background: rgba(26, 20, 16, 0.32); }
[data-theme="light"] .panel-content.glass-panel {
  background: rgba(255, 250, 240, 0.62);
  border-left: 1px solid rgba(217, 119, 6, 0.22);
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
  color: var(--text-primary);
  box-shadow:
    -20px 0 60px rgba(40, 25, 10, 0.22),
    inset 1px 0 0 rgba(255, 255, 255, 0.50);
}
[data-theme="light"] .panel-header { border-bottom-color: rgba(40, 25, 10, 0.10); }

/* Drawer header badges */
[data-theme="light"] .type-badge {
  background: rgba(40, 25, 10, 0.06);
  color: #6b5840;
}
[data-theme="light"] .status-badge.archived {
  color: #92400e;
  background: rgba(217, 119, 6, 0.14);
}
[data-theme="light"] .completion-badge {
  background: rgba(5, 150, 105, 0.14);
  color: #047857;
}
[data-theme="light"] .close-btn {
  background: rgba(255, 250, 240, 0.55);
  color: #6b5840;
}
[data-theme="light"] .close-btn:hover {
  background: rgba(217, 119, 6, 0.14);
  color: #92400e;
}

/* Drawer body — title, description, project code */
[data-theme="light"] .title-section h2 { color: var(--text-primary); }
[data-theme="light"] .project-code-pill {
  background: rgba(217, 119, 6, 0.12);
  color: #92400e;
  border: 1px solid rgba(217, 119, 6, 0.28);
}
[data-theme="light"] .description { color: #6b5840; }
[data-theme="light"] .divider { background: rgba(40, 25, 10, 0.10); }

/* Details grid */
[data-theme="light"] .detail-item label { color: #b45309; font-weight: 700; }
[data-theme="light"] .detail-item .value { color: var(--text-primary); }
[data-theme="light"] .avatar-xs {
  background: rgba(217, 119, 6, 0.16);
  color: #92400e;
}

/* Drawer icons — recolor off-palette utility classes to stay amber */
[data-theme="light"] .text-blue-400,
[data-theme="light"] .text-purple-400,
[data-theme="light"] .text-indigo-400,
[data-theme="light"] .text-cyan-400 { color: #b45309; }
[data-theme="light"] .text-amber-400,
[data-theme="light"] .text-yellow-400,
[data-theme="light"] .text-orange-400 { color: #b45309; }
[data-theme="light"] .text-green-400,
[data-theme="light"] .text-emerald-400 { color: #047857; }
[data-theme="light"] .text-red-400 { color: #b91c1c; }

/* Meta + footer */
[data-theme="light"] .meta-section {
  color: #92400e;
  border-top-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .panel-footer {
  border-top-color: rgba(40, 25, 10, 0.10);
  background: rgba(255, 250, 240, 0.30);
}
[data-theme="light"] .permission-note { color: #92400e; }

/* Empty / loading states */
[data-theme="light"] .empty-state { color: #92400e; }
[data-theme="light"] .empty-state h3 { color: var(--text-primary); }
[data-theme="light"] .empty-state p { color: #6b5840; }
[data-theme="light"] .empty-icon-wrapper {
  background: rgba(217, 119, 6, 0.10);
}
[data-theme="light"] .loading-state { color: #92400e; }

/* ─── Drawer (panel) light theme ─── */
[data-theme="light"] .panel-overlay {
  background: rgba(26, 20, 16, 0.32);
  backdrop-filter: blur(6px);
}
[data-theme="light"] .panel-content.glass-panel {
  background: rgba(255, 250, 240, 0.62);
  border-left: 1px solid rgba(217, 119, 6, 0.22);
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
  color: var(--text-primary);
  box-shadow: -20px 0 60px rgba(40, 25, 10, 0.22), inset 1px 0 0 rgba(255, 255, 255, 0.50);
}
[data-theme="light"] .panel-content.glass-panel::before {
  background: radial-gradient(circle, rgba(217, 119, 6, 0.18), transparent 70%);
}

[data-theme="light"] .panel-header { border-bottom-color: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .type-badge {
  background: rgba(40, 25, 10, 0.06);
  border-color: rgba(40, 25, 10, 0.14);
  color: #6b5840;
}
[data-theme="light"] .status-badge.archived {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.18), rgba(217, 119, 6, 0.06));
  color: #92400e;
  border-color: rgba(217, 119, 6, 0.40);
}
[data-theme="light"] .completion-badge {
  background: linear-gradient(135deg, rgba(5, 150, 105, 0.18), rgba(5, 150, 105, 0.06));
  color: #047857;
  border-color: rgba(5, 150, 105, 0.36);
}
[data-theme="light"] .close-btn {
  background: rgba(255, 250, 240, 0.55);
  color: #6b5840;
}
[data-theme="light"] .close-btn:hover {
  background: rgba(217, 119, 6, 0.14);
  color: #92400e;
}

/* Drawer body */
[data-theme="light"] .panel-body::-webkit-scrollbar-thumb { background: rgba(217, 119, 6, 0.30); }

[data-theme="light"] .title-section h2 {
  background: linear-gradient(135deg, #1a1410 30%, #b45309 100%);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
[data-theme="light"] .project-code-pill {
  background: rgba(217, 119, 6, 0.14);
  color: #92400e;
  border-color: rgba(217, 119, 6, 0.36);
}
[data-theme="light"] .description { color: #6b5840; }

/* Budget hero */
[data-theme="light"] .budget-hero {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.14), rgba(217, 119, 6, 0.04));
  border-color: rgba(217, 119, 6, 0.30);
  box-shadow: 0 6px 20px rgba(217, 119, 6, 0.10);
}
[data-theme="light"] .bh-divider {
  background: linear-gradient(180deg, transparent, rgba(217, 119, 6, 0.35), transparent);
}
[data-theme="light"] .bh-label { color: #b45309; }
[data-theme="light"] .bh-value { color: var(--text-primary); }

/* Sections */
[data-theme="light"] .d-section-title {
  color: #b45309;
  border-bottom-color: rgba(217, 119, 6, 0.40);
}
[data-theme="light"] .d-section-title.gov { color: #92400e; }

/* Detail cards */
[data-theme="light"] .d-card {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(217, 119, 6, 0.18);
}
[data-theme="light"] .d-card:hover {
  background: rgba(217, 119, 6, 0.10);
  border-color: rgba(217, 119, 6, 0.40);
}
[data-theme="light"] .d-card-label { color: #6b5840; }
[data-theme="light"] .d-card-value { color: var(--text-primary); }
[data-theme="light"] .d-card-value.emerald { color: #047857; }
[data-theme="light"] .ic-amber { color: #b45309; }

/* Government card */
[data-theme="light"] .gov-card {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.14), rgba(217, 119, 6, 0.04));
  border-color: rgba(217, 119, 6, 0.36);
}
[data-theme="light"] .gov-no { color: #92400e; }
[data-theme="light"] .gov-meta { color: #6b5840; }

/* Person card */
[data-theme="light"] .person-card {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(217, 119, 6, 0.18);
}
[data-theme="light"] .person-card:hover {
  background: rgba(217, 119, 6, 0.10);
  border-color: rgba(217, 119, 6, 0.40);
}
[data-theme="light"] .person-avatar {
  background: linear-gradient(135deg, #d97706, #b45309);
  box-shadow: 0 4px 12px rgba(217, 119, 6, 0.32);
}
[data-theme="light"] .person-avatar.owner {
  background: linear-gradient(135deg, #d97706, #f59e0b);
}
[data-theme="light"] .person-name { color: var(--text-primary); }
[data-theme="light"] .person-meta { color: #6b5840; }

/* Stat tiles */
[data-theme="light"] .stat-tile {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(217, 119, 6, 0.18);
}
[data-theme="light"] .stat-tile:hover {
  background: rgba(217, 119, 6, 0.10);
  border-color: rgba(217, 119, 6, 0.40);
}
[data-theme="light"] .stat-icon-box {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.22), rgba(217, 119, 6, 0.08));
  color: #b45309;
  border-color: rgba(217, 119, 6, 0.38);
}
[data-theme="light"] .stat-label { color: #6b5840; }
[data-theme="light"] .stat-value { color: var(--text-primary); }

/* Meta footer */
[data-theme="light"] .meta-section {
  color: #92400e;
  background: rgba(217, 119, 6, 0.06);
  border-color: rgba(217, 119, 6, 0.28);
}

/* Footer */
[data-theme="light"] .panel-footer {
  border-top-color: rgba(40, 25, 10, 0.10);
  background: rgba(255, 250, 240, 0.30);
}
[data-theme="light"] .permission-note { color: #92400e; }

/* Divider */
[data-theme="light"] .divider { background: rgba(40, 25, 10, 0.12); }

/* Pagination */
[data-theme="light"] .pagination-bar { border-top-color: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .page-btn {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(217, 119, 6, 0.22);
  color: #6b5840;
}
[data-theme="light"] .page-btn:hover:not(:disabled) {
  background: rgba(217, 119, 6, 0.14);
  color: #92400e;
}
[data-theme="light"] .page-info { color: #6b5840; }

/* Section header (Project Archive title) */
[data-theme="light"] .section-header h3 { color: var(--text-primary); }
[data-theme="light"] .section-header p { color: #6b5840; }
</style>
