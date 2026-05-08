<template>
  <div class="projects-page">
    <!-- Debug Block (Restored) -->

    <!-- Header / Stats -->
    <div class="page-header">
      <div class="header-left">
        <h1>All Projects</h1>
        <p class="subtitle">Manage and track all ongoing operational initiatives</p>
      </div>
      <div class="header-right">
        <router-link to="/dashboard/projects/new" class="btn-primary" v-if="!isAdmin">
          <Plus :size="16" />
          <span>New Project</span>
        </router-link>
      </div>
    </div>

    <!-- Filters -->
    <div class="filter-bar">
      <div class="filter-tabs">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          class="filter-tab"
          :class="{ active: currentTab === tab.id }"
          @click="currentTab = tab.id"
        >
          {{ tab.label }}
          <span class="count-badge" v-if="countByStatus[tab.id]">{{ countByStatus[tab.id] }}</span>
        </button>
      </div>
      <div class="view-controls">
         <!-- User Filter (Admin only on User Projects page) -->
         <UserFilterSelect 
           v-if="props.ownerType === 'user'"
           v-model="selectedUserId"
           @change="handleUserFilterChange"
         />
         <div class="date-filters">
           <DatePicker v-model="startDate" placeholder="From" small />
           <span class="divider">-</span>
           <DatePicker v-model="endDate" placeholder="To" small />
         </div>
         <div class="search-box">
           <Search :size="14" class="search-icon" />
           <input type="text" v-model="searchQuery" placeholder="Search projects..." />
         </div>
      </div>
    </div>
    
    <!-- Loading State -->
    <div v-if="isLoading" class="loading-state">
      <Loader2 :size="32" class="spin" />
      <p>Loading projects...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredProjects.length === 0" class="empty-state">
       <FolderOpen :size="48" class="empty-icon" />
       <h3>No projects found</h3>
       <p>Try adjusting your filters or create a new project.</p>
    </div>

    <!-- Project Grid -->
    <div v-else class="project-grid">
      <ProjectCard 
        v-for="project in filteredProjects" 
        :key="project.id" 
        :project="project"
        :is-admin="isAdmin"
        :current-user-id="currentUserId"
        @edit="editProject"
        @view="viewProject"
        @remove="confirmDelete"
        @click="viewProject"
      />
    </div>

    <PaginationControls 
       v-if="!isLoading && projects.length > 0"
       v-model:page="page"
       v-model:limit="limit"
       :total="totalRecords"
       :totalPages="totalPages"
    />

    <!-- Edit/View Modal -->
    <ProjectEditModal
      :is-open="isModalOpen"
      :project="selectedProject"
      :mode="modalMode"
      :card-rect="selectedCardRect"
      :is-admin="isAdmin"
      @close="closeModal"
      @updated="handleProjectUpdated"
    />

    <ConfirmationModal 
      :is-open="showDeleteModal"
      title="Delete Project"
      :message="`Are you sure you want to delete '${projectToDelete?.project_name}'? This action cannot be undone.`"
      confirm-text="Yes, Delete"
      @close="showDeleteModal = false"
      @confirm="handleDeleteConfirm"
    />

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, toRef } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'
import { Plus, Search, Filter, Loader2, FolderOpen } from 'lucide-vue-next'
import { useToast } from '../composables/useToast'
import ProjectCard from '../components/projects/ProjectCard.vue'
import ProjectEditModal from '../components/projects/ProjectEditModal.vue'
import ConfirmationModal from '../components/ui/ConfirmationModal.vue'
import DatePicker from '../components/ui/DatePicker.vue'
import PaginationControls from '../components/ui/PaginationControls.vue'
import UserFilterSelect from '../components/ui/UserFilterSelect.vue'

const router = useRouter()
const route = useRoute()
const { success, error } = useToast()

// Props
const props = defineProps({
  ownerType: { type: String, default: null } // 'user' | 'admin' | null
})

// State
const projects = ref([])
const isLoading = ref(true)
const searchQuery = ref('')
const currentTab = ref('All')
const isAdmin = ref(false)
const currentUserId = ref(null)

// Pagination & Filtering
const page = ref(1)
const limit = ref(10)
const totalRecords = ref(0)
const totalPages = ref(1)
const startDate = ref('')
const endDate = ref('')
const selectedUserId = ref(null)

// Modal state
const isModalOpen = ref(false)
const selectedProject = ref(null)
const selectedCardRect = ref(null)
const modalMode = ref('edit') // 'edit' or 'view'

const showDeleteModal = ref(false)
const projectToDelete = ref(null)

// Tabs - conditionally hide Drafts for 'user' ownerType
const tabs = computed(() => {
  const baseTabs = [
    { id: 'All', label: 'All Projects' },
    { id: 'Draft', label: 'Drafts' },
    { id: 'Pending', label: 'Pending' },
    { id: 'Approved', label: 'Approved' },
    { id: 'Rejected', label: 'Rejected' }
  ]
  // Hide Drafts tab for 'user' ownerType (Admin viewing User Projects)
  if (props.ownerType === 'user') {
    return baseTabs.filter(t => t.id !== 'Draft')
  }
  
  // Hide Pending & Rejected for 'admin' ownerType (Admin viewing Admin Projects)
  if (props.ownerType === 'admin') {
    return baseTabs.filter(t => ['All', 'Draft', 'Approved'].includes(t.id))
  }
  
  return baseTabs
})

// Computed
const filteredProjects = computed(() => {
  let result = (Array.isArray(projects.value) ? projects.value : []).filter(p => p && typeof p === 'object')
  
  // Status filtering now done server-side
  
  // Search (client-side for quick filtering)
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(p => 
      (p.project_name || '').toLowerCase().includes(q) || 
      (p.description && p.description.toLowerCase().includes(q))
    )
  }
  
  return result
})

// Reset page to 1 when tab changes (independent pagination per tab)
watch(currentTab, () => {
  page.value = 1
})

// Handle user filter change - reset to page 1
const handleUserFilterChange = () => {
  page.value = 1
}

// Update fetch on filter change or route navigation
watch([startDate, endDate, page, limit, currentTab, selectedUserId, () => route.path], () => {
   fetchProjects()
})

const countByStatus = computed(() => {
  const counts = {}
  projects.value.forEach(p => {
     const status = p.status || 'Draft'
     counts[status] = (counts[status] || 0) + 1
  })
  return counts
})

// Actions
const fetchProjects = async () => {
  isLoading.value = true
  try {
    const isAdminRoute = route.path.startsWith('/admin')
    const token = isAdminRoute ? localStorage.getItem('admin_token') : localStorage.getItem('user_token')
    
    if (!token) return

    // Fetch user info to determine admin status
    const userResponse = await axios.get('http://localhost:8000/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
    isAdmin.value = userResponse.data.is_superuser === true
    currentUserId.value = userResponse.data.id

    const response = await axios.get('http://localhost:8000/api/projects/', {
      headers: { Authorization: `Bearer ${token}` },
      params: {
        page: page.value,
        limit: limit.value,
        start_date: startDate.value || null,
        end_date: endDate.value || null,
        status: currentTab.value !== 'All' ? currentTab.value : null,
        owner_type: props.ownerType || null,
        created_by_id: selectedUserId.value || null
      }
    })
    
    // Handle paginated response
    const rawData = response.data.items || []
    
    projects.value = rawData
      .filter(p => p && typeof p === 'object')
      .map(p => ({
        ...p,
        project_name: p.name || p.project_name || 'Untitled',
        estimated_budget: p.budget_amount || p.estimated_budget || 0,
        owner_id: p.created_by_id || p.owner_id,
        status: p.status === 'Pending Approval' ? 'Pending' : p.status // Normalize status
      }))

    totalRecords.value = response.data.total || 0
    totalPages.value = response.data.pages || 1
  } catch (e) {
    console.error('Projects Fetch Error:', e)
    error('Failed to load projects: ' + e.message)
  } finally {
    isLoading.value = false
  }
}

const editProject = (project, event) => {
  // Open modal in edit mode (works for admin and users on their own drafts)
  const card = event?.target?.closest('.project-card')
  if (card) {
    selectedCardRect.value = card.getBoundingClientRect()
  }
  selectedProject.value = project
  modalMode.value = 'edit'
  isModalOpen.value = true
}

const viewProject = (project, event) => {
  // Always open modal in view/preview mode
  const card = event?.target?.closest('.project-card')
  if (card) {
    selectedCardRect.value = card.getBoundingClientRect()
  }
  selectedProject.value = project
  modalMode.value = 'view'
  isModalOpen.value = true
}

const confirmDelete = (project) => {
  projectToDelete.value = project
  showDeleteModal.value = true
}

const handleDeleteConfirm = async () => {
  if (!projectToDelete.value) return
  
  try {
    const isAdminRoute = route.path.startsWith('/admin')
    const token = isAdminRoute ? localStorage.getItem('admin_token') : localStorage.getItem('user_token')

    await axios.delete(`http://localhost:8000/api/projects/${projectToDelete.value.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    success('Project deleted')
    // Remove locally
    projects.value = projects.value.filter(p => p.id !== projectToDelete.value.id)
  } catch(e) {
     error('Failed to delete project')
  } finally {
    showDeleteModal.value = false
    projectToDelete.value = null
  }
}

// Modal handlers
const closeModal = () => {
  isModalOpen.value = false
  selectedProject.value = null
  selectedCardRect.value = null
  modalMode.value = 'edit'
}

const handleProjectUpdated = () => {
  // Refresh projects list after update
  fetchProjects()
}

onMounted(() => {
  fetchProjects()
})

</script>

<style scoped>
.projects-page {
  width: 100%;
  padding-bottom: 40px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32px;
}

.header-left h1 {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8px;
  letter-spacing: -0.02em;
}

.subtitle {
  color: #8e8e93;
  font-size: 14px;
}

/* Filter Bar */
.filter-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 16px;
}

.filter-tabs {
  display: flex;
  gap: 8px;
}

.filter-tab {
  background: transparent;
  border: none;
  color: #8e8e93;
  font-size: 14px;
  font-weight: 500;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-tab:hover { color: #fff; background: rgba(255,255,255,0.05); }
.filter-tab.active { color: #fff; background: rgba(255,255,255,0.1); font-weight: 600; }

.count-badge {
  background: rgba(255,255,255,0.1);
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
}

.view-controls {
  display: flex;
  gap: 16px;
  align-items: center;
}

.date-filters {
  display: flex;
  align-items: center;
  gap: 8px;
}

.divider { color: #52525b; }

.search-box {
  position: relative;
}

.search-icon {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: #6e6e73;
}

.search-box input {
  background: #1c1c1e;
  border: 1px solid #3a3a3c;
  color: #fff;
  padding: 8px 12px 8px 32px;
  border-radius: 8px;
  font-size: 13px;
  width: 240px;
  outline: none;
  transition: border-color 0.2s;
}

.search-box input:focus { border-color: #007aff; }



/* Grid */
.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 24px;
}

/* Animations */
.fade-in { animation: fadeIn 0.4s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

.loading-state, .empty-state {
  text-align: center;
  padding: 60px;
  color: #8e8e93;
}
.empty-icon { margin-bottom: 16px; opacity: 0.5; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Button */
.btn-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #007aff;
  color: white;
  padding: 8px 16px;
  border-radius: 8px;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
  transition: background 0.2s;
}
.btn-primary:hover { background: #0063ce; }
</style>
