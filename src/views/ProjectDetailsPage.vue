<template>
  <div ref="pageRoot" class="project-details-page">
    <!-- Loading State -->
    <div v-if="isLoading" class="page-loading">
      <Loader2 :size="32" class="spinner" />
      <p>Loading Project Details...</p>
    </div>

    <!-- Access Denied State -->
    <div v-else-if="errorState" class="error-container">
      <div class="access-card">
         <div class="icon-circle">
           <ShieldAlert :size="40" class="text-amber-warning" />
         </div>
         <h2>Access Restricted</h2>
         <p>"{{ errorState }}"</p>
         
         <div class="actions">
            <button class="btn-secondary" @click="$router.push(backPath)">
              <ArrowLeft :size="16" /> Go Back
            </button>
         </div>
      </div>
    </div>

    <!-- Project Expired Restricted View -->
    <div v-else-if="isProjectExpired && !isAdmin" class="expiry-overlay">
      <Motion as="div" class="premium-expiry-card"
        :initial="{ opacity: 0, y: 32, scale: 0.92, filter: 'blur(8px)' }"
        :animate="{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }"
        :transition="{ duration: 0.75, ease: easeOutSpring }">
         <Motion as="div" class="expired-icon-box"
           :initial="{ opacity: 0, scale: 0.6, rotate: -12 }"
           :animate="{ opacity: 1, scale: 1, rotate: 0 }"
           :transition="{ duration: 0.7, ease: easeOutSpring, delay: 0.15 }">
           <div class="expiry-icon-aura" aria-hidden="true"></div>
           <Clock :size="48" stroke-width="1.5" class="icon-mono tick-anim" />
         </Motion>
         <Motion as="div" class="expiry-content"
           :initial="{ opacity: 0, y: 14 }"
           :animate="{ opacity: 1, y: 0 }"
           :transition="{ duration: 0.6, ease: easeOutSpring, delay: 0.28 }">
            <h2 class="premium-title">Project Expired</h2>
            <p class="premium-subtitle">Timeline Concluded</p>
            <div class="expiry-divider"></div>
            <p class="expiry-description">
              The professional timeline for this project has reached its conclusion.
              Further modifications and milestone creation are currently restricted.
            </p>
         </Motion>

         <Motion as="div" class="expiry-actions"
           :initial="{ opacity: 0, y: 10 }"
           :animate="{ opacity: 1, y: 0 }"
           :transition="{ duration: 0.55, ease: easeOutSpring, delay: 0.42 }">
            <Motion as="button" class="btn-premium-back" @click="$router.push(backPath)"
              :whileHover="{ y: -3, scale: 1.025 }"
              :whileTap="{ scale: 0.96 }"
              :transition="{ duration: 0.3, ease: easeOutSpring }">
              <ArrowLeft :size="16" /> Return to Projects
            </Motion>
         </Motion>
      </Motion>
    </div>

    <!-- Main Content -->
    <div v-else class="content-wrapper">
      <!-- Breadcrumb / Back -->
      <nav class="breadcrumb" data-anim="breadcrumb">
        <button class="btn-text" @click="$router.push(backPath)">
          <ArrowLeft :size="16" />
          Back to Projects
        </button>
      </nav>

      <!-- Page Header -->
      <header class="page-header">
        <div class="header-main">
          <div class="title-row">
             <div class="project-icon" data-anim="header-icon">
               <Briefcase :size="24" />
             </div>
             <div>
               <h1 class="page-title" data-anim="hero-title">{{ project.name }}</h1>
               <div class="meta-row">
                 <span class="code">{{ project.code }}</span>
                 <span class="dot">•</span>
                 <span class="status-badge" data-anim="status-badge" :class="project.status?.toLowerCase().replace(' ', '-')">
                   {{ project.status }}
                 </span>
               </div>
             </div>
          </div>

          <!-- Completed Watermark -->
          <div v-if="project.completion_percentage >= 100" class="completed-watermark" data-anim="watermark">
             <div class="watermark-content">
               <Check :size="16" stroke-width="3" />
               <span>COMPLETED</span>
             </div>
          </div>
        </div>
      </header>

      <!-- Two Column Layout -->
      <div class="details-grid">
        <!-- Main Column -->
        <main class="main-column">
          


          <!-- Milestones Section -->
          <MilestoneList 
            :milestones="milestones" 
            :loading="milestonesLoading"
            :can-create="canCreateMilestone"
            :can-edit="canEdit"
            @create="showCreateMilestone = true"
            @select="handleMilestoneSelect"
            @refresh="fetchProjectDetails"
          />



        </main>

        <!-- Sidebar Column -->
        <aside class="sidebar-column">
          <!-- Description Section (New Location) -->
          <ProjectDescription :description="project.description" />
          

          <!-- Key Metrics -->
          <div class="content-card metrics-card" data-anim="detail-card">
            <div class="card-header">
              <BarChart2 :size="18" class="icon" />
              <h3>Project Stats</h3>
            </div>
            <div class="card-content">
              <div class="metrics-list">
                <div class="metric-item">
                  <span class="label icon-label">
                    <DollarSign :size="12" /> Total Budget
                  </span>
                  <span class="value main">{{ project.currency }} {{ formatNumber(project.budget_amount) }}</span>
                </div>
                <div class="metric-item">
                  <span class="label icon-label">
                    <Clock :size="12" /> Duration
                  </span>
                  <span class="value">{{ getDuration(project.start_date, project.end_date) }}</span>
                </div>
                <div class="metric-item">
                  <span class="label icon-label">
                    <CalendarRange :size="12" /> Dates
                  </span>
                  <span class="value text-sm">{{ formatDate(project.start_date) }} - {{ formatDate(project.end_date) }}</span>
                </div>
                <div class="metric-item">
                  <span class="label icon-label">
                    <PieChart :size="12" /> Budget Utilisation
                  </span>
                  <span class="value">{{ project.currency }} {{ formatNumber(project.budget_utilized) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Team Summary -->
          <div class="content-card team-card" data-anim="detail-card">
            <div class="card-header">
              <Users :size="18" class="icon" />
              <h3>Team ({{ allTeamMembers.length }})</h3>
            </div>
            
            <div class="card-content">
              <div class="team-list">
                <div v-for="member in allTeamMembers" :key="member.id" class="team-member-row">
                   <div class="avatar" :style="{ background: getGradient(member.name) }">
                     {{ getInitials(member.name) }}
                   </div>
                   <div class="user-info">
                     <span class="name">{{ member.name }}</span>
                     <span class="role">{{ member.role }}</span>
                   </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Info -->
          <div class="content-card info-card" data-anim="detail-card">
             <div class="card-header">
              <Info :size="18" class="icon" />
              <h3>Details</h3>
            </div>
            <div class="card-content">
              <div class="info-row">
                <span class="label icon-label">
                  <Building2 :size="13" /> Organization
                </span>
                <span class="value">{{ project.organization }}</span>
              </div>
               <div class="info-row">
                <span class="label icon-label">
                  <Tag :size="13" /> Type
                </span>
                <span class="value">{{ project.project_type }}</span>
              </div>
              <div class="info-row" v-if="project.category">
                <span class="label icon-label"><Tag :size="13"/> Category</span>
                <span class="value">{{ project.category }}</span>
              </div>
              <div class="info-row" v-if="project.priority">
                <span class="label icon-label"><Flame :size="13"/> Priority</span>
                <span class="value">{{ project.priority }}</span>
              </div>
              <div class="info-row" v-if="project.lifecycle_status">
                <span class="label icon-label"><Activity :size="13"/> Lifecycle</span>
                <span class="value">{{ project.lifecycle_status }}</span>
              </div>
            </div>
          </div>

          <!-- Government Order (only when present) -->
          <div class="content-card info-card" data-anim="detail-card" v-if="project.government_order_no || project.issuing_authority || project.order_date || project.order_received_date || project.department">
            <div class="card-header">
              <Crown :size="18" class="icon"/>
              <h3>Government Order</h3>
            </div>
            <div class="card-content">
              <div class="info-row" v-if="project.government_order_no">
                <span class="label icon-label"><Hash :size="13"/> Order No.</span>
                <span class="value mono">{{ project.government_order_no }}</span>
              </div>
              <div class="info-row" v-if="project.issuing_authority">
                <span class="label icon-label"><Building2 :size="13"/> Authority</span>
                <span class="value">{{ project.issuing_authority }}</span>
              </div>
              <div class="info-row" v-if="project.department">
                <span class="label icon-label"><Briefcase :size="13"/> Department</span>
                <span class="value">{{ project.department }}</span>
              </div>
              <div class="info-row" v-if="project.order_date">
                <span class="label icon-label"><CalendarRange :size="13"/> Order Date</span>
                <span class="value">{{ formatGovtDate(project.order_date) }}</span>
              </div>
              <div class="info-row" v-if="project.order_received_date">
                <span class="label icon-label"><CalendarRange :size="13"/> Received</span>
                <span class="value">{{ formatGovtDate(project.order_received_date) }}</span>
              </div>
              <div class="info-row" v-if="project.funding_type">
                <span class="label icon-label"><Coins :size="13"/> Funding</span>
                <span class="value">{{ project.funding_type }}</span>
              </div>
            </div>
          </div>

          <!-- Location (only when present) -->
          <div class="content-card info-card" data-anim="detail-card" v-if="project.state || project.district">
            <div class="card-header">
              <MapPin :size="18" class="icon"/>
              <h3>Location</h3>
            </div>
            <div class="card-content">
              <div class="info-row" v-if="project.state">
                <span class="label icon-label"><MapPin :size="13"/> State</span>
                <span class="value">{{ project.state }}</span>
              </div>
              <div class="info-row" v-if="project.district">
                <span class="label icon-label"><MapPin :size="13"/> District</span>
                <span class="value">{{ project.district }}</span>
              </div>
            </div>
          </div>

          <!-- Project Head (only when present) -->
          <div class="content-card info-card" data-anim="detail-card" v-if="project.project_head_name || project.nodal_officer || project.contractor">
            <div class="card-header">
              <User :size="18" class="icon"/>
              <h3>Project Head</h3>
            </div>
            <div class="card-content">
              <div class="info-row" v-if="project.project_head_name">
                <span class="label icon-label"><User :size="13"/> Head</span>
                <span class="value">{{ project.project_head_name }}</span>
              </div>
              <div class="info-row" v-if="project.project_head_designation">
                <span class="label icon-label"><Briefcase :size="13"/> Designation</span>
                <span class="value">{{ project.project_head_designation }}</span>
              </div>
              <div class="info-row" v-if="project.project_head_contact">
                <span class="label icon-label"><Mail :size="13"/> Contact</span>
                <span class="value">{{ project.project_head_contact }}</span>
              </div>
              <div class="info-row" v-if="project.nodal_officer">
                <span class="label icon-label"><User :size="13"/> Nodal Officer</span>
                <span class="value">{{ project.nodal_officer }}</span>
              </div>
              <div class="info-row" v-if="project.contractor">
                <span class="label icon-label"><Briefcase :size="13"/> Contractor</span>
                <span class="value">{{ project.contractor }}</span>
              </div>
            </div>
          </div>

        </aside>
      </div>

      <!-- Modals -->
      <CreateMilestoneModal 
        v-model="showCreateMilestone"
        :project-id="project.id"
        :token="token"
        :team-members="allTeamMembers"
        :project-start-date="project.start_date"
        :project-end-date="project.end_date"
        :project-budget="project.budget_amount"
        :budget-utilized="project.budget_utilized"
        :currency="project.currency"
        :is-admin="isAdmin"
        :current-user="currentUser"
        @created="fetchMilestones"
      />

      <MilestoneDetailsPanel
        :is-open="showDetailsPanel"
        @close="showDetailsPanel = false"
        :milestone="selectedMilestone"
        :project-id="project.id"
        :token="token"
        :current-user="currentUser"
        :project-owner-id="project.created_by_id"
        :project-start-date="project.start_date"
        :project-end-date="project.end_date"
        :is-admin="isAdmin"
        :team-members="allTeamMembers"
        @updated="handleMilestoneUpdate"
        @deleted="handleMilestoneDelete"
      />

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import { Loader2, ArrowLeft, ShieldAlert, Briefcase, BarChart2, Users, Info, DollarSign, Clock, CalendarRange, Building2, Hash, Tag, PieChart, Check, Crown, MapPin, Coins, Flame, Activity, User, Mail } from 'lucide-vue-next'
import { Motion } from 'motion-v'

const easeOutSpring = [0.16, 1, 0.3, 1]
import MilestoneList from '../components/milestones/MilestoneList.vue'
import CreateMilestoneModal from '../components/milestones/CreateMilestoneModal.vue'
import ProjectDescription from '../components/project-console/ProjectDescription.vue'
import MilestoneDetailsPanel from '../components/milestones/MilestoneDetailsPanel.vue'
import { useToast } from '../composables/useToast'
import { useGsapAnim } from '../composables/useGsapAnim'
import { projectDetailsEntry } from '../animations/pageChoreography'
import { API } from '@/utils/api'

const pageRoot = ref(null)
const route = useRoute()
const router = useRouter()
const projectId = route.params.id

// State
const project = ref({})
const milestones = ref([])
const isLoading = ref(true)
const milestonesLoading = ref(false)
const errorState = ref(null)
const showCreateMilestone = ref(false)
const showDetailsPanel = ref(false)
const selectedMilestone = ref(null)

const { addToast } = useToast()

// Computeds
const isAdmin = computed(() => route.path.startsWith('/admin'))
const backPath = computed(() => {
  const base = isAdmin.value ? '/admin/projects/details' : '/user/projects/details'
  return `${base}?selected=${projectId}`
})
const token = computed(() => isAdmin.value ? localStorage.getItem('admin_token') : localStorage.getItem('user_token'))

const canEdit = computed(() => isAdmin.value || !isProjectExpired.value)
// New: Restrict creation if 100% complete
const canCreateMilestone = computed(() => {
  if (isAdmin.value) return true
  if (isProjectExpired.value) return false
  
  // Check completion %
  const pct = project.value.completion_percentage || 0
  return pct < 100
})

const isProjectExpired = computed(() => {
  if (!project.value || !project.value.end_date) return false
  const endDate = new Date(project.value.end_date)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return endDate < today
})

const currentUser = computed(() => {
  if (isAdmin.value) {
      const adminStr = localStorage.getItem('admin_user')
      return adminStr ? JSON.parse(adminStr) : null
  }
  const userStr = localStorage.getItem('user')
  return userStr ? JSON.parse(userStr) : null
}) 

// Unified Team List
const allTeamMembers = computed(() => {
  if (!project.value.id) return []
  
  const list = []
  
  // 1. Owner (Always first)
  if (project.value.created_by_id) {
    list.push({
      id: project.value.created_by_id, // Use User ID to dedup
      name: project.value.created_by_name || 'Unknown',
      role: 'Project Owner',
      isOwner: true
    })
  }
  
  // 2. Team Members (from API)
  if (project.value.team_members && Array.isArray(project.value.team_members)) {
    project.value.team_members.forEach(tm => {
      // Avoid duplicate if owner is also in list (check by User ID)
      if (tm.user_id !== project.value.created_by_id) {
         list.push({
           id: tm.user_id,
           name: tm.user_name || 'Unknown',
           role: tm.role || 'Team Member',
           isOwner: false,
           is_superuser: tm.is_superuser // Pass backend flag
         })
      }
    })
  }
  
  return list
})

// Methods
const fetchProject = async () => {
  try {
    const res = await axios.get(`${API}/projects/${projectId}`, {
      headers: { Authorization: `Bearer ${token.value}` }
    })
    project.value = res.data
  } catch (e) {
    if (e.response && e.response.status === 403) {
      errorState.value = e.response.data.detail || 'Access Denied'
    } else if (e.response && e.response.status === 404) {
      errorState.value = 'Project not found'
    } else {
      errorState.value = 'Failed to load project'
    }
  }
}

const fetchMilestones = async () => {
  milestonesLoading.value = true
  try {
    const res = await axios.get(`${API}/projects/${projectId}/milestones`, {
      headers: { Authorization: `Bearer ${token.value}` }
    })
    milestones.value = res.data.sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
  } catch (e) {
    console.warn('Failed to fetch milestones', e)
    addToast('Failed to load milestones', 'error')
  } finally {
    milestonesLoading.value = false
  }
}

// Alias for template usage
const fetchProjectDetails = fetchMilestones

// GSAP wiring — defer entry until the v-else content tree is actually rendered.
// (Otherwise pageRoot.querySelectorAll('[data-anim=*]') returns nothing because
// `v-if="isLoading"` keeps the content out of the DOM.)
const { run } = useGsapAnim(pageRoot)

onMounted(async () => {
  if (!projectId) return
  await fetchProject()
  if (!errorState.value) {
    await fetchMilestones()
  }
  isLoading.value = false
  await nextTick()
  run(() => { projectDetailsEntry(pageRoot.value) })
})

// Formatters
const formatNumber = (num) => new Intl.NumberFormat('en-US').format(num || 0)
const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
const formatGovtDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
const getInitials = (n) => n ? n.split(' ').map(c => c[0]).join('').slice(0, 2).toUpperCase() : '??'

const getDuration = (start, end) => {
  if (!start || !end) return '—'
  const diff = Math.ceil(Math.abs(new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24))
  return diff > 365 ? `${(diff/365).toFixed(1)} Years` : diff > 30 ? `${(diff/30).toFixed(1)} Months` : `${diff} Days`
}

const getGradient = (name) => {
   return 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)'
}

// Handlers
const handleMilestoneSelect = (m) => {
  selectedMilestone.value = m
  showDetailsPanel.value = true
}

const handleMilestoneUpdate = async (updatedM) => {
  // Update local selected reference so the panel shows new data immediately
  selectedMilestone.value = updatedM
  
  // Force refresh from server to ensure list logic (sorting/grouping) matches
  await fetchMilestones()
}

const handleMilestoneDelete = (deletedId) => {
  milestones.value = milestones.value.filter(x => x.id !== deletedId)
  showDetailsPanel.value = false
}

</script>

<style scoped>
/* Main Page Styles */
.project-details-page {
  /* Removed padding/min-height from root to prevent expiry overflow */
  margin: 0 auto;
  color: #f5f5f7;
}

/* Page Loading/Error */
.page-loading {
  height: 60vh;
  display: flex; /* ... */
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 16px;
  color: rgba(255, 255, 255, 0.5);
}

.error-container {
  height: 80vh; display: flex; align-items: center; justify-content: center;
}

.access-card {
  background: rgba(30, 30, 33, 0.6);
  backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
  padding: 48px;
  text-align: center;
  max-width: 420px;
  display: flex; flex-direction: column; align-items: center; gap: 16px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.4);
}

.icon-circle {
  width: 80px; height: 80px; 
  background: rgba(244, 63, 94, 0.1); 
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  margin-bottom: 8px;
  border: 1px solid rgba(244, 63, 94, 0.2);
}

.access-card h2 { font-size: 24px; font-weight: 700; color: #f5f5f7; margin: 0; }
.access-card p { font-size: 15px; color: rgba(255, 255, 255, 0.6); line-height: 1.5; font-style: italic; }

.access-card .actions { margin-top: 16px; }

.btn-secondary {
  background: rgba(255, 255, 255, 0.1); border: none; color: white;
  padding: 10px 20px; border-radius: 12px; font-weight: 600; font-size: 13px;
  cursor: pointer; display: flex; align-items: center; gap: 8px;
  transition: all 0.2s;
}
.btn-secondary:hover { background: rgba(255, 255, 255, 0.15); }

/* Premium Expiry Design (Minimalist Monochromatic) */
.expiry-overlay {
  position: fixed;
  top: 60px; /* Rough height of navbar to ensure we don't cover it if strict fixed */
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 40; /* High enough to block content, low enough for nav if z-index > 40 */
  background: rgba(0, 0, 0, 0.6); /* Slightly darker for focus */
  backdrop-filter: blur(20px); /* Reduced blur slightly for performance/clarity */
  -webkit-backdrop-filter: blur(20px);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 8vh; /* Moved further up */
  overflow: hidden; /* Strict no scroll */
  animation: expiryFadeIn 0.5s ease-out;
}

.premium-expiry-card {
  position: relative;
  background: linear-gradient(180deg, rgba(28, 28, 32, 0.55) 0%, rgba(18, 18, 22, 0.70) 100%);
  backdrop-filter: blur(40px) saturate(160%);
  -webkit-backdrop-filter: blur(40px) saturate(160%);
  border: 1px solid rgba(245, 158, 11, 0.18);
  border-radius: 24px;
  padding: 36px 32px 32px;
  text-align: center;
  max-width: 420px;
  width: 90%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  box-shadow:
    0 40px 100px rgba(0, 0, 0, 0.65),
    0 0 0 1px rgba(255, 255, 255, 0.04) inset,
    0 0 60px rgba(245, 158, 11, 0.08);
  overflow: hidden;
}
.premium-expiry-card::before {
  content: ''; position: absolute; inset: -1px; pointer-events: none; z-index: 0; border-radius: inherit;
  background:
    radial-gradient(45% 55% at 0% 0%, rgba(245, 158, 11, 0.10), transparent 70%),
    radial-gradient(45% 55% at 100% 100%, rgba(249, 115, 22, 0.06), transparent 70%);
}
.premium-expiry-card > * { position: relative; z-index: 1; }

.expired-icon-box {
  position: relative;
  width: 72px;
  height: 72px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.16), rgba(249, 115, 22, 0.08));
  border: 1px solid rgba(245, 158, 11, 0.32);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(245, 158, 11, 0.18);
}
.expiry-icon-aura {
  position: absolute;
  inset: -8px;
  border-radius: 28px;
  background: radial-gradient(circle, rgba(245, 158, 11, 0.32), transparent 65%);
  filter: blur(12px);
  z-index: -1;
  animation: expiry-aura-pulse 3.2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
@keyframes expiry-aura-pulse {
  0%, 100% { opacity: 0.55; transform: scale(1); }
  50%      { opacity: 1;    transform: scale(1.12); }
}

.icon-mono {
  color: #fbbf24;
  filter: drop-shadow(0 4px 10px rgba(245, 158, 11, 0.35));
}
.tick-anim { animation: tick-tilt 4.2s cubic-bezier(0.4, 0, 0.6, 1) infinite; transform-origin: 50% 50%; }
@keyframes tick-tilt {
  0%, 100% { transform: rotate(0deg); }
  25%      { transform: rotate(-6deg); }
  75%      { transform: rotate(6deg); }
}

.expiry-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.premium-title {
  font-size: 26px;
  font-weight: 700;
  background: linear-gradient(120deg, #ffffff 0%, #fbbf24 100%);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
  margin: 0;
  letter-spacing: -0.02em;
}

.premium-subtitle {
  font-size: 11px;
  font-weight: 700;
  color: #fbbf24;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  margin: 0;
}

.expiry-divider {
  width: 48px;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(245, 158, 11, 0.40), transparent);
  margin: 14px 0;
}

.expiry-description {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.6;
  max-width: 380px;
  margin: 0;
}

.expiry-actions {
  margin-top: 16px;
  width: 100%;
}

.btn-premium-back {
  background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
  border: none;
  color: #1a1208;
  padding: 14px 32px;
  border-radius: 16px;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  transition: box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1), background 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow:
    0 6px 22px rgba(245, 158, 11, 0.32),
    0 0 0 1px rgba(255, 255, 255, 0.18) inset;
}

.btn-premium-back:hover {
  background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
  box-shadow:
    0 10px 30px rgba(245, 158, 11, 0.45),
    0 0 0 1px rgba(255, 255, 255, 0.30) inset;
}

@keyframes expiryFadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.content-wrapper {
  animation: fadeIn 0.4s ease-out;
  /* Restore padding here for normal view */
  padding: 40px;
  max-width: 1400px;
  margin: 0 auto;
  min-height: calc(100vh - 80px);
}

/* Breadcrumb */
.breadcrumb { margin-bottom: 20px; }
.btn-text {
  background: none; border: none;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer; display: flex; align-items: center; gap: 8px;
  font-size: 13px; font-weight: 500;
  transition: color 0.2s;
}
.btn-text:hover { color: white; }

/* Header */
.page-header { margin-bottom: 32px; position: relative; }
.header-main { display: flex; justify-content: space-between; align-items: flex-start; }

.completed-watermark {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.18) 0%, rgba(249, 115, 22, 0.06) 100%);
  border: 1px solid rgba(245, 158, 11, 0.30);
  color: #fbbf24;
  padding: 8px 16px;
  border-radius: 99px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 0 20px rgba(245, 158, 11, 0.15);
  animation: stampIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.watermark-content {
  display: flex; align-items: center; gap: 8px;
  font-family: 'SF Mono', monospace;
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 0.1em;
}

@keyframes stampIn {
  0% { opacity: 0; transform: scale(1.5); }
  100% { opacity: 1; transform: scale(1); }
}

.title-row { display: flex; align-items: flex-start; gap: 20px; }
.project-icon {
  width: 52px; height: 52px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  color: #f5f5f7;
}

.page-title {
  font-size: 28px; font-weight: 700; color: #f5f5f7;
  line-height: 1.2; margin-bottom: 8px; letter-spacing: -0.01em;
}

.meta-row { display: flex; align-items: center; gap: 12px; font-size: 13px; color: rgba(255, 255, 255, 0.6); }
.code { font-family: 'SF Mono', monospace; opacity: 0.8; }
.dot { opacity: 0.3; }

.status-badge {
  padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; text-transform: uppercase;
  border: 1px solid transparent;
}
.status-badge.approved { background: rgba(245, 158, 11, 0.10); color: #fbbf24; border-color: rgba(245, 158, 11, 0.28); }
.status-badge.pending-approval { background: rgba(249, 115, 22, 0.10); color: #fdba74; border-color: rgba(249, 115, 22, 0.28); }
.status-badge.rejected { background: rgba(217, 119, 6, 0.10); color: #d97706; border-color: rgba(217, 119, 6, 0.28); }

/* Grid */
.details-grid {
  display: grid;
  grid-template-columns: 2.2fr 1fr; /* Give more space to main content */
  gap: 24px;
  align-items: start;
}

/* Sidebar */
.sidebar-column { display: flex; flex-direction: column; gap: 24px; }

/* Common Card & Header Style */
.content-card {
  background: rgba(30, 30, 33, 0.4);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  overflow: hidden;
  display: flex; flex-direction: column;
}

.card-header {
  padding: 16px 20px 12px;
  display: flex; align-items: center; gap: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}

.card-header .icon { color: #a1a1aa; }

.card-header h3 {
  font-size: 14px; font-weight: 600; color: #f5f5f7; margin: 0; letter-spacing: -0.01em;
}

.card-content { padding: 20px; }

/* Metrics */
.metrics-list { display: grid; gap: 16px; }
.metric-item .label { font-size: 11px; color: rgba(255,255,255,0.5); display: block; margin-bottom: 4px; }
.metric-item .icon-label, .info-row .icon-label { display: flex; align-items: center; gap: 6px; }
.metric-item .value { font-size: 18px; font-weight: 600; color: #f5f5f7; }
.metric-item .value.text-sm { font-size: 14px; color: rgba(255,255,255,0.8); }

/* Team List */
.team-list { 
  display: flex; flex-direction: column; gap: 10px; 
  /* Scroll config: 3 items approx (48px per item + gap) */
  max-height: 180px; 
  overflow-y: auto;
  padding-right: 4px; /* Space for scrollbar */
}

/* Custom Scrollbar */
.team-list::-webkit-scrollbar { width: 4px; }
.team-list::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
.team-list::-webkit-scrollbar-track { background: transparent; }

.team-member-row {
  display: flex; align-items: center; gap: 12px;
  padding: 8px 10px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 10px;
  transition: background 0.2s;
}
.team-member-row:hover { background: rgba(255,255,255,0.06); }

.avatar { 
  width: 32px; height: 32px; border-radius: 8px; 
  display: flex; align-items: center; justify-content: center; 
  font-weight: 600; font-size: 12px; color: white;
}
.user-info { display: flex; flex-direction: column; gap: 0px; }
.name { font-size: 13px; font-weight: 500; color: #f5f5f7; }
.role { font-size: 11px; color: rgba(255,255,255,0.5); }

/* Info Card */
.info-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.05);
}
.info-row:last-child { border-bottom: none; padding-bottom: 0; }
.info-row:first-child { padding-top: 0; }
.info-row .label { font-size: 12px; color: rgba(255,255,255,0.5); }
.info-row .value { font-size: 13px; color: #e4e4e7; font-weight: 500; }
.mono { font-family: 'SF Mono', monospace; font-size: 12px; }

.spinner { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

/* Orange/amber utility classes (replacing prior rose/emerald/blue usages) */
.text-amber-warning { color: #f97316; }

/* ═════════ LIGHT THEME OVERRIDES ═════════════════════════════════════════ */
[data-theme="light"] .project-details-page { color: var(--text-primary); }
[data-theme="light"] .page-loading { color: var(--text-tertiary); }
[data-theme="light"] .access-card {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(26, 20, 16, 0.10);
  box-shadow: 0 10px 30px rgba(26, 20, 16, 0.06);
}
[data-theme="light"] .access-card h2 { color: var(--text-primary); }
[data-theme="light"] .access-card p { color: var(--text-secondary); }
[data-theme="light"] .btn-secondary {
  background: rgba(26, 20, 16, 0.08);
  color: var(--text-primary);
  border-color: rgba(26, 20, 16, 0.12);
}
[data-theme="light"] .btn-secondary:hover { background: rgba(26, 20, 16, 0.15); }
[data-theme="light"] .page-title { color: var(--text-primary); }
[data-theme="light"] .meta-row { color: var(--text-secondary); }
[data-theme="light"] .code { color: var(--text-tertiary); }
[data-theme="light"] .card-header h3 { color: var(--text-primary); }
[data-theme="light"] .metric-item .label { color: var(--text-tertiary); }
[data-theme="light"] .metric-item .value { color: var(--text-primary); }
[data-theme="light"] .name { color: var(--text-primary); }
[data-theme="light"] .role { color: var(--text-secondary); }
[data-theme="light"] .info-row .label { color: var(--text-secondary); }
[data-theme="light"] .info-row .value { color: var(--text-primary); }

/* Content cards — cream surface + visible separators (header border-bottom + row borders) */
[data-theme="light"] .content-card {
  background: rgba(255, 250, 240, 0.85);
  border-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .card-header {
  border-bottom-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .card-header .icon { color: #b45309; }

/* Metric labels — deep amber for the eyebrow style */
[data-theme="light"] .metric-item .label { color: #6b5840; }
[data-theme="light"] .metric-item .icon-label svg { color: #b45309; }
[data-theme="light"] .metric-item .value.text-sm { color: #6b5840; }

/* Team rows — cream tile with warm border, separator preserved on hover */
[data-theme="light"] .team-member-row {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(217, 119, 6, 0.18);
}
[data-theme="light"] .team-member-row:hover {
  background: rgba(217, 119, 6, 0.10);
  border-color: rgba(217, 119, 6, 0.32);
}
[data-theme="light"] .role { color: #92400e; }

[data-theme="light"] .team-list::-webkit-scrollbar-thumb {
  background: rgba(217, 119, 6, 0.30);
}

/* Info rows — visible separator between each row */
[data-theme="light"] .info-row {
  border-bottom-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .info-row .label { color: #6b5840; }
[data-theme="light"] .info-row .icon-label svg { color: #b45309; }
[data-theme="light"] .info-row .value.mono { color: #b45309; }
[data-theme="light"] .mono { color: #b45309; }

[data-theme="light"] .text-amber-warning { color: #c2410c; }

/* Header — back link, project icon, status badge */
[data-theme="light"] .btn-text { color: #6b5840; }
[data-theme="light"] .btn-text:hover { color: #92400e; }
[data-theme="light"] .project-icon {
  background: rgba(217, 119, 6, 0.14);
  border-color: rgba(217, 119, 6, 0.32);
  color: #b45309;
}
[data-theme="light"] .meta-row { color: #6b5840; }
[data-theme="light"] .code { color: #92400e; opacity: 1; }
[data-theme="light"] .dot { color: #b45309; opacity: 0.6; }
[data-theme="light"] .status-badge.approved {
  background: rgba(217, 119, 6, 0.14);
  color: #92400e;
  border-color: rgba(217, 119, 6, 0.32);
}
[data-theme="light"] .status-badge.pending-approval {
  background: rgba(249, 115, 22, 0.12);
  color: #c2410c;
  border-color: rgba(249, 115, 22, 0.32);
}
[data-theme="light"] .status-badge.rejected {
  background: rgba(220, 38, 38, 0.10);
  color: #991b1b;
  border-color: rgba(220, 38, 38, 0.28);
}

/* Completed watermark — keep gold-on-cream */
[data-theme="light"] .completed-watermark {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.20) 0%, rgba(249, 115, 22, 0.08) 100%);
  border-color: rgba(217, 119, 6, 0.40);
  color: #92400e;
  box-shadow: 0 0 20px rgba(217, 119, 6, 0.18);
}

/* ─── "Project Expired" premium card ─────────────────────────────────────── */
/* Overlay backdrop — dark base is rgba(0,0,0,0.6), which leaves a muddy
   black wash on the cream page. Replace with a warm cream-tinted scrim
   and stronger blur so the card sits in a frosted glass field. */
[data-theme="light"] .expiry-overlay {
  background: rgba(255, 246, 226, 0.45);
  backdrop-filter: blur(28px) saturate(150%);
  -webkit-backdrop-filter: blur(28px) saturate(150%);
}
[data-theme="light"] .premium-expiry-card {
  background: linear-gradient(180deg, rgba(255, 250, 240, 0.82) 0%, rgba(255, 246, 226, 0.90) 100%);
  border: 1px solid rgba(217, 119, 6, 0.28);
  box-shadow:
    0 40px 90px rgba(40, 25, 10, 0.22),
    0 0 0 1px rgba(255, 255, 255, 0.55) inset,
    0 0 60px rgba(217, 119, 6, 0.10);
}
[data-theme="light"] .premium-expiry-card::before {
  background:
    radial-gradient(45% 55% at 0% 0%, rgba(217, 119, 6, 0.12), transparent 70%),
    radial-gradient(45% 55% at 100% 100%, rgba(249, 115, 22, 0.08), transparent 70%);
}
[data-theme="light"] .expired-icon-box {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.20), rgba(249, 115, 22, 0.10));
  border-color: rgba(217, 119, 6, 0.38);
  box-shadow: 0 8px 24px rgba(217, 119, 6, 0.22);
}
[data-theme="light"] .expiry-icon-aura {
  background: radial-gradient(circle, rgba(217, 119, 6, 0.38), transparent 65%);
}
[data-theme="light"] .icon-mono {
  color: #b45309;
  filter: drop-shadow(0 4px 10px rgba(217, 119, 6, 0.32));
}
[data-theme="light"] .premium-title {
  background: linear-gradient(120deg, #92400e 0%, #d97706 60%, #b45309 100%);
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent;
}
[data-theme="light"] .premium-subtitle { color: #b45309; }
[data-theme="light"] .expiry-divider {
  background: linear-gradient(90deg, transparent, rgba(217, 119, 6, 0.50), transparent);
}
[data-theme="light"] .expiry-description { color: #6b5840; }
[data-theme="light"] .btn-premium-back {
  background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
  color: #fff;
  box-shadow:
    0 6px 22px rgba(217, 119, 6, 0.34),
    0 0 0 1px rgba(255, 255, 255, 0.22) inset;
}
[data-theme="light"] .btn-premium-back:hover {
  background: linear-gradient(135deg, #c2410c 0%, #92400e 100%);
  box-shadow:
    0 10px 30px rgba(217, 119, 6, 0.45),
    0 0 0 1px rgba(255, 255, 255, 0.30) inset;
}
</style>
