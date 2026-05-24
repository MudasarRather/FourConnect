<template>
  <div ref="pageRoot" class="atlas-root">
    <!-- Ambient backdrop unique to the project section -->
    <div class="atlas-backdrop" aria-hidden="true" data-anim="backdrop">
      <div class="atlas-base"></div>
      <svg class="atlas-grid" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          <pattern id="atlas-bp" width="6" height="6" patternUnits="userSpaceOnUse">
            <path d="M 6 0 L 0 0 0 6" fill="none" stroke="rgba(245,158,11,0.05)" stroke-width="0.2"/>
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#atlas-bp)"/>
      </svg>
      <div class="atlas-orb a-orb-1" data-orb="1"></div>
      <div class="atlas-orb a-orb-2" data-orb="2"></div>
    </div>

    <!-- HERO -->
    <header class="atlas-hero">
      <div class="hero-left">
        <div class="hero-eyebrow" data-anim="hero-eyebrow"><Compass :size="11"/> CIVIC ATLAS</div>
        <h1 class="hero-title" data-anim="hero-title">Your portfolio at a glance.</h1>
        <p class="hero-sub" data-anim="hero-subtitle">{{ heroSubtitle }}</p>
      </div>
      <router-link
        v-if="!isAdmin"
        :to="createRoute"
        class="hero-cta"
        data-anim="hero-cta"
        v-magnetic="{ strength: 0.25 }"
      >
        <Plus :size="14"/>
        <span>New Project</span>
      </router-link>
    </header>

    <!-- STATS STRIP -->
    <div class="stat-strip">
      <div
        v-for="s in stats"
        :key="s.key"
        class="stat-tile"
        data-anim="stat-tile"
      >
        <div class="stat-icon" :class="`stat-${s.key}`"><component :is="s.icon" :size="14"/></div>
        <div class="stat-meta">
          <div class="stat-eyebrow">{{ s.label }}</div>
          <div class="stat-num">{{ s.display }}</div>
        </div>
      </div>
    </div>

    <!-- COMMAND BAR — compact search + active filter chips + Filters dropdown -->
    <div class="command-bar" :class="{ 'panel-open': filtersPanelOpen }" data-anim="command-bar">
      <div class="cmd-row">
        <div class="cmd-search">
          <Search :size="14" class="cmd-search-icon"/>
          <input v-model="searchQuery" type="text" placeholder="Search projects, codes, departments…"/>
          <button v-if="searchQuery" class="cmd-clear" @click="searchQuery = ''" aria-label="Clear search">
            <X :size="11"/>
          </button>
        </div>

        <!-- Active filter chips — animated insert/leave -->
        <transition-group name="chip-anim" tag="div" class="cmd-chips">
          <button
            v-for="chip in activeChips"
            :key="chip.key"
            class="cmd-chip"
            @click="clearChip(chip)"
            :title="`Remove ${chip.label}`"
          >
            <component :is="chip.icon" :size="11"/>
            <span>{{ chip.label }}</span>
            <X :size="11" class="chip-x"/>
          </button>
        </transition-group>

        <button class="cmd-filters-btn" :class="{ active: filtersPanelOpen }" @click="filtersPanelOpen = !filtersPanelOpen">
          <SlidersHorizontal :size="13"/>
          <span>Filters</span>
          <span v-if="activeChips.length" class="cmd-filters-badge">{{ activeChips.length }}</span>
          <ChevronDown :size="12" class="cmd-filters-chev" :class="{ flip: filtersPanelOpen }"/>
        </button>
      </div>

      <!-- Expanding panel -->
      <transition name="panel-grow">
        <div v-if="filtersPanelOpen" class="cmd-panel">
          <div class="cmd-grid">
            <div class="cmd-field">
              <label>Category</label>
              <CustomSelect v-model="selectedCategory" :options="categoryFilter" labelKey="label" valueKey="value"/>
            </div>
            <div class="cmd-field">
              <label>Priority</label>
              <CustomSelect v-model="selectedPriority" :options="priorityFilter" labelKey="label" valueKey="value"/>
            </div>
            <div class="cmd-field" v-if="props.ownerType === 'user'">
              <label>Owner</label>
              <UserFilterSelect v-model="selectedUserId" @change="handleUserFilterChange"/>
            </div>
            <div class="cmd-field cmd-field-wide">
              <label>Date Range</label>
              <div class="cmd-date-row">
                <DatePicker v-model="startDate" placeholder="From" small/>
                <span class="cmd-date-sep">→</span>
                <DatePicker v-model="endDate" placeholder="To" small/>
              </div>
            </div>
          </div>
          <div class="cmd-panel-foot">
            <button class="cmd-clear-all" v-if="activeChips.length" @click="clearAllFilters">
              <X :size="11"/> Clear all
            </button>
            <span class="cmd-panel-meta" v-else>Apply filters to narrow your portfolio.</span>
            <button class="cmd-apply" @click="filtersPanelOpen = false">Done</button>
          </div>
        </div>
      </transition>

      <!-- Nano status tabs with sliding pill -->
      <div class="cmd-tabs" ref="tabsRef">
        <span class="cmd-tab-pill" :style="tabPillStyle"></span>
        <button
          v-for="(tab, i) in tabs"
          :key="tab.id"
          class="cmd-tab"
          :class="{ active: currentTab === tab.id }"
          :data-tab-index="i"
          @click="currentTab = tab.id"
        >
          {{ tab.label }}
          <span class="cmd-tab-count" v-if="countByStatus[tab.id]">{{ countByStatus[tab.id] }}</span>
        </button>
      </div>
    </div>

    <!-- LOADING -->
    <div v-if="isLoading" class="atlas-loading">
      <Loader2 :size="28" class="spin"/>
      <p>Loading projects…</p>
    </div>

    <!-- EMPTY -->
    <div v-else-if="filteredProjects.length === 0" class="atlas-empty">
      <div class="empty-folder"><FolderOpen :size="40"/></div>
      <h3>No projects match this view</h3>
      <p>Try adjusting filters, or create a new project.</p>
    </div>

    <!-- GRID -->
    <transition-group v-else name="atlas-grid" tag="div" class="project-grid">
      <ProjectCard
        v-for="project in filteredProjects"
        :key="project.id"
        :project="project"
        :is-admin="isAdmin"
        :current-user-id="currentUserId"
        data-anim="project-card"
        @edit="editProject"
        @view="viewProject"
        @remove="confirmDelete"
        @click="viewProject"
      />
    </transition-group>

    <PaginationControls
      v-if="!isLoading && projects.length > 0"
      v-model:page="page"
      v-model:limit="limit"
      :total="totalRecords"
      :totalPages="totalPages"
    />

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
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'
import {
  Plus, Search, Loader2, FolderOpen, Compass,
  LayoutGrid, Coins, Activity, Flame,
  X, SlidersHorizontal, ChevronDown, Tag, User
} from 'lucide-vue-next'
import { nextTick } from 'vue'
import { useToast } from '../composables/useToast'
import ProjectCard from '../components/projects/ProjectCard.vue'
import ProjectEditModal from '../components/projects/ProjectEditModal.vue'
import ConfirmationModal from '../components/ui/ConfirmationModal.vue'
import DatePicker from '../components/ui/DatePicker.vue'
import PaginationControls from '../components/ui/PaginationControls.vue'
import UserFilterSelect from '../components/ui/UserFilterSelect.vue'
import CustomSelect from '../components/ui/CustomSelect.vue'
import { useGsapAnim } from '../composables/useGsapAnim'
import { useParallaxOrbs } from '../composables/useParallaxOrbs'
import { projectsPageEntry } from '../animations/pageChoreography'

const pageRoot = ref(null)

const router = useRouter()
const route = useRoute()
const { success, error } = useToast()

const props = defineProps({
  ownerType: { type: String, default: null }
})

// State (unchanged from prior file)
const projects = ref([])
const isLoading = ref(true)
const searchQuery = ref('')
const currentTab = ref('All')
const isAdmin = ref(false)
const currentUserId = ref(null)
const page = ref(1)
const limit = ref(12)
const totalRecords = ref(0)
const totalPages = ref(1)
const startDate = ref('')
const endDate = ref('')
const selectedUserId = ref(null)

// New filters (govt fields)
const selectedCategory = ref('')
const selectedPriority = ref('')

// Command Bar — panel expand state + tab pill geometry
const filtersPanelOpen = ref(false)
const tabsRef = ref(null)
const tabPillStyle = ref({ width: '0px', transform: 'translateX(0)' })

const categoryFilter = [
  { value: '', label: 'All Categories' },
  { value: 'Infrastructure', label: 'Infrastructure' },
  { value: 'Roads & Bridges', label: 'Roads & Bridges' },
  { value: 'Water & Sanitation', label: 'Water & Sanitation' },
  { value: 'Buildings & Construction', label: 'Buildings & Construction' },
  { value: 'IT & Digital', label: 'IT & Digital' },
  { value: 'Social Welfare', label: 'Social Welfare' },
  { value: 'Defence', label: 'Defence' },
  { value: 'Energy', label: 'Energy' },
  { value: 'Other', label: 'Other' },
]
const priorityFilter = [
  { value: '', label: 'All Priorities' },
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
]

// Modal state
const isModalOpen = ref(false)
const selectedProject = ref(null)
const selectedCardRect = ref(null)
const modalMode = ref('edit')
const showDeleteModal = ref(false)
const projectToDelete = ref(null)

// Tabs
const tabs = computed(() => {
  const baseTabs = [
    { id: 'All', label: 'All' },
    { id: 'Draft', label: 'Drafts' },
    { id: 'Pending', label: 'Pending' },
    { id: 'Approved', label: 'Approved' },
    { id: 'Rejected', label: 'Rejected' }
  ]
  if (props.ownerType === 'user') return baseTabs.filter(t => t.id !== 'Draft')
  if (props.ownerType === 'admin') return baseTabs.filter(t => ['All', 'Draft', 'Approved'].includes(t.id))
  return baseTabs
})

const heroSubtitle = computed(() => {
  if (props.ownerType === 'user')  return 'Browse every user-initiated project across the agency.'
  if (props.ownerType === 'admin') return 'Admin-curated projects and approvals.'
  return 'All ongoing initiatives, sanctioned and in-flight.'
})

const createRoute = computed(() => route.path.startsWith('/admin') ? '/admin/projects/createproject' : '/user/projects/createproject')

// Filter: tab + search + category + priority (client-side)
const filteredProjects = computed(() => {
  let r = (Array.isArray(projects.value) ? projects.value : []).filter(p => p && typeof p === 'object')
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    r = r.filter(p =>
      (p.project_name || '').toLowerCase().includes(q) ||
      (p.code || '').toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.department || '').toLowerCase().includes(q) ||
      (p.state || '').toLowerCase().includes(q)
    )
  }
  if (selectedCategory.value) r = r.filter(p => (p.category || '') === selectedCategory.value)
  if (selectedPriority.value) r = r.filter(p => (p.priority || '') === selectedPriority.value)
  return r
})

// Hero stats — purely client-side over the visible page slice
const stats = computed(() => {
  const list = projects.value || []
  const totalSanctioned = list.reduce((acc, p) => acc + Number(p.budget_amount || p.estimated_budget || 0), 0)
  const inProgress = list.filter(p => (p.lifecycle_status || '').toLowerCase() === 'in progress').length
  const highPri = list.filter(p => (p.priority || '') === 'High').length
  return [
    { key: 'total',      label: 'Total Projects',  display: totalRecords.value || list.length, icon: LayoutGrid },
    { key: 'sanctioned', label: 'Total Order Value', display: formatBudget(totalSanctioned), icon: Coins },
    { key: 'progress',   label: 'In Progress',     display: inProgress,                       icon: Activity },
    { key: 'priority',   label: 'High Priority',   display: highPri,                          icon: Flame },
  ]
})

const formatBudget = (n) => {
  const v = Number(n)
  if (!v) return '—'
  if (v >= 1e7) return (v / 1e7).toFixed(1) + ' Cr'
  if (v >= 1e5) return (v / 1e5).toFixed(1) + ' L'
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K'
  return v.toLocaleString()
}

const countByStatus = computed(() => {
  const counts = {}
  ;(projects.value || []).forEach(p => {
    const s = p.status || 'Draft'
    counts[s] = (counts[s] || 0) + 1
  })
  return counts
})

// Watchers
watch(currentTab, () => { page.value = 1 })
watch([startDate, endDate, page, limit, currentTab, selectedUserId, () => route.path], () => { fetchProjects() })
const handleUserFilterChange = () => { page.value = 1 }

// Actions (unchanged plumbing)
const fetchProjects = async () => {
  isLoading.value = true
  try {
    const isAdminRoute = route.path.startsWith('/admin')
    const token = isAdminRoute ? localStorage.getItem('admin_token') : localStorage.getItem('user_token')
    if (!token) return
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

    const raw = response.data.items || []
    projects.value = raw
      .filter(p => p && typeof p === 'object')
      .map(p => ({
        ...p,
        project_name: p.name || p.project_name || 'Untitled',
        estimated_budget: p.budget_amount || p.estimated_budget || 0,
        owner_id: p.created_by_id || p.owner_id,
        status: p.status === 'Pending Approval' ? 'Pending' : p.status
      }))

    totalRecords.value = response.data.total || 0
    totalPages.value = response.data.pages || 1
  } catch (e) {
    console.error('Projects fetch error:', e)
    error('Failed to load projects: ' + e.message)
  } finally { isLoading.value = false }
}

const editProject = (project, event) => {
  const card = event?.target?.closest('.project-card')
  if (card) selectedCardRect.value = card.getBoundingClientRect()
  selectedProject.value = project
  modalMode.value = 'edit'
  isModalOpen.value = true
}

const viewProject = (project, event) => {
  const card = event?.target?.closest('.project-card')
  if (card) selectedCardRect.value = card.getBoundingClientRect()
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
    projects.value = projects.value.filter(p => p.id !== projectToDelete.value.id)
  } catch(e) {
    error('Failed to delete project')
  } finally {
    showDeleteModal.value = false
    projectToDelete.value = null
  }
}

const closeModal = () => {
  isModalOpen.value = false
  selectedProject.value = null
  selectedCardRect.value = null
  modalMode.value = 'edit'
}

const handleProjectUpdated = () => fetchProjects()

// ---- Command Bar plumbing ----
// Render only the user-toggled filters as removable chips. Status (currentTab) is
// shown separately as the nano-tab strip; date range stays only inside the panel.
const activeChips = computed(() => {
  const out = []
  if (selectedCategory.value) out.push({ key: 'category', icon: Tag, label: selectedCategory.value })
  if (selectedPriority.value) out.push({ key: 'priority', icon: Flame, label: selectedPriority.value })
  if (selectedUserId.value)   out.push({ key: 'owner',    icon: User, label: 'Owner filter' })
  if (startDate.value || endDate.value) {
    const l = [startDate.value, endDate.value].filter(Boolean).join(' → ') || 'Date range'
    out.push({ key: 'date', icon: Activity, label: l })
  }
  return out
})

const clearChip = (chip) => {
  if (chip.key === 'category') selectedCategory.value = ''
  else if (chip.key === 'priority') selectedPriority.value = ''
  else if (chip.key === 'owner') selectedUserId.value = null
  else if (chip.key === 'date') { startDate.value = ''; endDate.value = '' }
}
const clearAllFilters = () => {
  selectedCategory.value = ''
  selectedPriority.value = ''
  selectedUserId.value = null
  startDate.value = ''
  endDate.value = ''
}

// Animate the segmented tab pill to align with the active tab.
const positionTabPill = async () => {
  await nextTick()
  const el = tabsRef.value?.querySelector('.cmd-tab.active')
  if (!el || !tabsRef.value) return
  const offsetLeft = el.offsetLeft
  const width = el.offsetWidth
  tabPillStyle.value = { width: `${width}px`, transform: `translateX(${offsetLeft}px)` }
}
watch([currentTab, tabs, () => tabsRef.value], positionTabPill, { flush: 'post' })

const { run } = useGsapAnim(pageRoot)
useParallaxOrbs(pageRoot, { strength: 26 })
run(() => { projectsPageEntry(pageRoot.value) })

onMounted(() => {
  fetchProjects()
  positionTabPill()
})
</script>

<style scoped>
/* ============================================================
   CIVIC ATLAS — All Projects listing
   Same Civic Blueprint tokens as CreateProject (sapphire/cyan).
   ============================================================ */
.atlas-root {
  position: relative;
  min-height: calc(100vh - 52px);
  width: 100%;
  max-width: 1500px;
  margin: 0 auto;
  padding: 24px 28px 80px;
  color: #f5f5f7;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Outfit", sans-serif;
}

/* ----- BACKDROP ----- */
.atlas-backdrop { position: fixed; inset: 52px 0 0 0; pointer-events: none; z-index: -1; overflow: hidden; }
.atlas-base { position: absolute; inset: 0; background: radial-gradient(ellipse at top left, #061018 0%, #04070b 60%, #02030a 100%); }
.atlas-grid { position: absolute; inset: 0; width: 100%; height: 100%; opacity: 0.55; }
.atlas-orb { position: absolute; border-radius: 50%; filter: blur(90px); will-change: transform; transform: translate(var(--orb-parallax-x, 0px), var(--orb-parallax-y, 0px)); }
.a-orb-1 { width: 480px; height: 480px; top: -120px; right: -100px; background: radial-gradient(circle, rgba(245, 158, 11, 0.16), transparent 70%); animation: a-orb-drift-1 24s ease-in-out infinite; }
.a-orb-2 { width: 360px; height: 360px; bottom: -90px; left: -60px; background: radial-gradient(circle, rgba(249, 115, 22, 0.12), transparent 70%); animation: a-orb-drift-2 30s ease-in-out infinite; }
@keyframes a-orb-drift-1 { 0%, 100% { transform: translate(0,0); } 50% { transform: translate(-30px, 25px); } }
@keyframes a-orb-drift-2 { 0%, 100% { transform: translate(0,0); } 50% { transform: translate(40px, -20px); } }

/* ----- HERO ----- */
.atlas-hero {
  display: flex; align-items: flex-end; justify-content: space-between; gap: 32px;
  padding: 6px 0 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 22px;
}
.hero-left { flex: 1; min-width: 0; }
.hero-eyebrow {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 10px; font-weight: 700; letter-spacing: 0.22em; color: #f97316;
  padding: 5px 12px; border-radius: 999px;
  background: rgba(249, 115, 22, 0.08); border: 1px solid rgba(249, 115, 22, 0.20);
  margin-bottom: 14px;
}
.hero-title {
  font-family: 'Outfit', sans-serif;
  font-size: 38px; font-weight: 700; line-height: 1.05; margin: 0 0 8px;
  letter-spacing: -0.02em;
  background: linear-gradient(120deg, #fff 30%, #fde68a 75%, #fbbf24 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
}
.hero-sub { font-size: 13px; color: rgba(255, 255, 255, 0.50); margin: 0; max-width: 500px; }
.hero-cta {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 11px 18px; border-radius: 12px;
  background: linear-gradient(135deg, #f59e0b, #f97316);
  color: #fff; font-size: 13px; font-weight: 600;
  text-decoration: none; border: none;
  box-shadow: 0 6px 18px rgba(245, 158, 11, 0.30);
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.hero-cta:hover { transform: translateY(-2px); box-shadow: 0 10px 28px rgba(245, 158, 11, 0.42); }

/* ----- STATS STRIP ----- */
.stat-strip {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px;
  margin-bottom: 22px;
}
.stat-tile {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 18px;
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.025), rgba(255, 255, 255, 0.005));
  border: 1px solid rgba(255, 255, 255, 0.06);
}
.stat-icon {
  flex-shrink: 0; width: 36px; height: 36px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(245, 158, 11, 0.10); color: #fde68a;
  border: 1px solid rgba(245, 158, 11, 0.18);
}
.stat-icon.stat-priority { background: rgba(239, 68, 68, 0.10); color: #fca5a5; border-color: rgba(239, 68, 68, 0.20); }
.stat-icon.stat-progress { background: rgba(249, 115, 22, 0.10); color: #fbbf24; border-color: rgba(249, 115, 22, 0.20); }
.stat-icon.stat-sanctioned { background: rgba(251, 191, 36, 0.10); color: #fbbf24; border-color: rgba(251, 191, 36, 0.20); }
.stat-eyebrow { font-size: 10px; font-weight: 600; letter-spacing: 0.10em; color: rgba(255, 255, 255, 0.45); text-transform: uppercase; }
.stat-num {
  font-family: 'Outfit', sans-serif; font-size: 22px; font-weight: 700; color: #fff; line-height: 1.1;
  margin-top: 2px;
}

/* ============================================================
   COMMAND BAR — replaces the old filter-rail. Three layers:
     1. cmd-row     — search input + animated chips + Filters button
     2. cmd-panel   — expanding filter grid + apply footer
     3. cmd-tabs    — segmented nano-tab strip with sliding pill
   ============================================================ */
.command-bar {
  position: relative;
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.025) 0%, rgba(255, 255, 255, 0.005) 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  margin-bottom: 22px;
  overflow: hidden;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
}
.command-bar.panel-open {
  border-color: rgba(245, 158, 11, 0.25);
  box-shadow: 0 14px 40px rgba(0,0,0,0.35), 0 0 0 1px rgba(245, 158, 11, 0.06) inset;
}

/* Row 1: search + chips + filters btn */
.cmd-row {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px;
}
.cmd-search {
  position: relative; display: flex; align-items: center;
  flex: 0 1 320px; min-width: 200px;
  background: rgba(0, 0, 0, 0.30);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px; padding: 0 10px 0 36px;
  transition: all 0.25s ease;
}
.cmd-search-icon { position: absolute; left: 12px; color: rgba(245, 158, 11, 0.55); pointer-events: none; }
.cmd-search input {
  flex: 1; background: transparent; border: none; color: #fff;
  font-size: 13px; padding: 10px 0; outline: none;
}
.cmd-search input::placeholder { color: rgba(255, 255, 255, 0.30); }
.cmd-search:focus-within {
  border-color: rgba(245, 158, 11, 0.45);
  background: rgba(245, 158, 11, 0.04);
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.08);
}
.cmd-clear {
  width: 22px; height: 22px; border-radius: 50%; border: none;
  background: rgba(255, 255, 255, 0.05); color: rgba(255, 255, 255, 0.55); cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s ease;
}
.cmd-clear:hover { background: rgba(245, 158, 11, 0.20); color: #fff; }

.cmd-chips {
  display: flex; gap: 6px; flex: 1; min-width: 0;
  align-items: center;
  overflow-x: auto;
  -webkit-mask-image: linear-gradient(to right, #000 88%, transparent);
          mask-image: linear-gradient(to right, #000 88%, transparent);
}
.cmd-chips::-webkit-scrollbar { display: none; }
.cmd-chip {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 5px 10px 5px 11px; border-radius: 999px;
  font-size: 11px; font-weight: 600; color: #fde68a;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(249, 115, 22, 0.06));
  border: 1px solid rgba(245, 158, 11, 0.30);
  cursor: pointer; flex-shrink: 0;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.cmd-chip svg { color: #fbbf24; }
.cmd-chip:hover {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.20), rgba(249, 115, 22, 0.10));
  border-color: rgba(245, 158, 11, 0.50);
  color: #fff;
  transform: translateY(-1px);
}
.cmd-chip .chip-x { opacity: 0.55; transition: opacity 0.2s ease; }
.cmd-chip:hover .chip-x { opacity: 1; }

/* Chip enter/leave animations */
.chip-anim-enter-from { opacity: 0; transform: scale(0.85); }
.chip-anim-enter-active, .chip-anim-leave-active { transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
.chip-anim-leave-to { opacity: 0; transform: scale(0.4); }
.chip-anim-leave-active { position: absolute; }
.chip-anim-move { transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1); }

.cmd-filters-btn {
  position: relative;
  display: inline-flex; align-items: center; gap: 7px;
  padding: 8px 14px; border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.75); font-size: 12px; font-weight: 600;
  cursor: pointer; flex-shrink: 0;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.cmd-filters-btn:hover {
  background: rgba(245, 158, 11, 0.08);
  border-color: rgba(245, 158, 11, 0.35);
  color: #fff;
  box-shadow: 0 0 0 6px rgba(245, 158, 11, 0.08);
}
.cmd-filters-btn.active {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.22), rgba(249, 115, 22, 0.12));
  border-color: rgba(245, 158, 11, 0.55);
  color: #fff;
  box-shadow: 0 6px 18px rgba(245, 158, 11, 0.18);
}
.cmd-filters-btn svg:first-child { color: #fbbf24; }
.cmd-filters-badge {
  min-width: 18px; height: 18px; padding: 0 6px; border-radius: 999px;
  background: linear-gradient(135deg, #f59e0b, #f97316); color: #1a1208;
  font-size: 10px; font-weight: 800;
  display: inline-flex; align-items: center; justify-content: center;
}
.cmd-filters-chev { transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); color: rgba(255, 255, 255, 0.45); }
.cmd-filters-chev.flip { transform: rotate(180deg); color: #fbbf24; }

/* Panel */
.panel-grow-enter-from, .panel-grow-leave-to {
  opacity: 0; transform: translateY(-6px);
  max-height: 0;
}
.panel-grow-enter-to, .panel-grow-leave-from {
  opacity: 1; transform: translateY(0);
  max-height: 360px;
}
.panel-grow-enter-active, .panel-grow-leave-active {
  transition: opacity 0.30s ease, transform 0.30s cubic-bezier(0.16, 1, 0.3, 1), max-height 0.40s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
}
.cmd-panel {
  padding: 8px 14px 14px;
  border-top: 1px dashed rgba(255, 255, 255, 0.06);
  background: rgba(245, 158, 11, 0.025);
}
.cmd-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
  padding: 8px 4px 12px;
}
.cmd-field { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.cmd-field label { font-size: 9px; font-weight: 700; letter-spacing: 0.18em; color: rgba(245, 158, 11, 0.65); text-transform: uppercase; }
.cmd-field-wide { grid-column: span 2; }
.cmd-date-row { display: flex; align-items: center; gap: 8px; }
.cmd-date-sep { color: rgba(255, 255, 255, 0.30); font-size: 12px; }
.cmd-panel-foot {
  display: flex; justify-content: space-between; align-items: center;
  padding-top: 8px; border-top: 1px dashed rgba(255, 255, 255, 0.05);
  gap: 10px;
}
.cmd-clear-all {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 6px 12px; border-radius: 999px;
  background: rgba(239, 68, 68, 0.06); border: 1px solid rgba(239, 68, 68, 0.25);
  color: #fda4a4; font-size: 11px; font-weight: 600;
  cursor: pointer; transition: all 0.2s ease;
}
.cmd-clear-all:hover { background: rgba(239, 68, 68, 0.12); color: #fff; }
.cmd-panel-meta { font-size: 11px; color: rgba(255, 255, 255, 0.40); }
.cmd-apply {
  padding: 8px 18px; border-radius: 999px;
  background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
  color: #1a1208; border: none; font-size: 12px; font-weight: 700;
  cursor: pointer; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.25);
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
.cmd-apply:hover { transform: translateY(-1px); box-shadow: 0 8px 22px rgba(245, 158, 11, 0.40); }

/* Nano tab strip */
.cmd-tabs {
  position: relative;
  display: flex; gap: 2px;
  padding: 4px;
  margin: 0 12px 10px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.30);
  border: 1px solid rgba(255, 255, 255, 0.05);
  width: fit-content;
}
.cmd-tab-pill {
  position: absolute; top: 4px; bottom: 4px; left: 0;
  border-radius: 999px;
  background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.30);
  transition: width 0.40s cubic-bezier(0.16, 1, 0.3, 1), transform 0.40s cubic-bezier(0.16, 1, 0.3, 1);
  z-index: 0;
}
.cmd-tab {
  position: relative; z-index: 1;
  display: inline-flex; align-items: center; gap: 6px;
  padding: 7px 14px; border-radius: 999px;
  background: transparent; border: none;
  color: rgba(255, 255, 255, 0.55);
  font-size: 12px; font-weight: 600;
  cursor: pointer; transition: color 0.25s ease;
}
.cmd-tab:hover { color: #fff; }
.cmd-tab.active { color: #1a1208; font-weight: 700; }
.cmd-tab-count {
  font-size: 9px; padding: 1px 6px; border-radius: 999px;
  background: rgba(255, 255, 255, 0.10);
  color: inherit;
}
.cmd-tab.active .cmd-tab-count { background: rgba(26, 18, 8, 0.20); }

/* ----- GRID ----- */
.project-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 18px;
  margin-bottom: 28px;
}

/* ----- LOADING / EMPTY ----- */
.atlas-loading, .atlas-empty {
  display: flex; flex-direction: column; align-items: center; gap: 14px;
  padding: 80px 20px;
  color: rgba(255, 255, 255, 0.55);
}
.atlas-loading p { font-size: 13px; }
.empty-folder {
  width: 80px; height: 80px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 22px;
  background: rgba(245, 158, 11, 0.06);
  border: 1px solid rgba(245, 158, 11, 0.15);
  color: rgba(245, 158, 11, 0.50);
}
.atlas-empty h3 { font-family: 'Outfit'; font-size: 17px; margin: 0; color: #fff; }
.atlas-empty p { font-size: 12px; color: rgba(255, 255, 255, 0.40); margin: 0; }

/* transition-group FLIP for filter changes */
.atlas-grid-enter-from { opacity: 0; transform: translateY(12px) scale(0.96); }
.atlas-grid-enter-active, .atlas-grid-leave-active { transition: all 0.40s cubic-bezier(0.16, 1, 0.3, 1); }
.atlas-grid-leave-to { opacity: 0; transform: translateY(-12px) scale(0.96); }
.atlas-grid-leave-active { position: absolute; }
.atlas-grid-move { transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1); }

/* ----- shared ----- */
.fade-up { animation: fade-up-anim 0.65s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes fade-up-anim {
  0%   { opacity: 0; transform: translateY(16px); }
  100% { opacity: 1; transform: translateY(0); }
}
.pop-in { animation: pop-in-anim 0.55s cubic-bezier(0.16, 1, 0.3, 1) both; }
@keyframes pop-in-anim {
  0%   { opacity: 0; transform: scale(0.94); }
  60%  { opacity: 1; transform: scale(1.02); }
  100% { opacity: 1; transform: scale(1); }
}
.spin { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Responsive */
@media (max-width: 980px) {
  .stat-strip { grid-template-columns: repeat(2, 1fr); }
  .filter-rail { flex-direction: column; align-items: stretch; }
}
@media (max-width: 600px) {
  .hero-title { font-size: 30px; }
  .stat-strip { grid-template-columns: 1fr; }
}

/* ─── Light theme overrides ───────────────────────────────────────────────
   Re-cast the white-on-black hero, command rail, stat icons, and tabs for
   cream surface. Gold/orange accents stay vivid; neutrals invert.
   ────────────────────────────────────────────────────────────────────── */
[data-theme="light"] .hero-section,
[data-theme="light"] .hero-title { color: var(--text-primary); }
[data-theme="light"] .hero-eyebrow { color: var(--accent-gold); }
[data-theme="light"] .hero-sub { color: var(--text-secondary); }

[data-theme="light"] .stat-icon.stat-priority {
  background: rgba(220, 38, 38, 0.10); color: #b91c1c;
  border-color: rgba(220, 38, 38, 0.30);
}
[data-theme="light"] .stat-icon.stat-progress {
  background: rgba(234, 88, 12, 0.12); color: #c2410c;
  border-color: rgba(234, 88, 12, 0.30);
}
[data-theme="light"] .stat-icon.stat-sanctioned {
  background: rgba(217, 119, 6, 0.16); color: #92400e;
  border-color: rgba(217, 119, 6, 0.35);
}
[data-theme="light"] .stat-eyebrow { color: #6b5840; font-weight: 700; }
[data-theme="light"] .stat-value { color: var(--text-primary); }
[data-theme="light"] .stat-num { color: var(--text-primary); }

/* Filter panel labels (CATEGORY / PRIORITY / DATE RANGE / OWNER) — deep amber so they pop on cream */
[data-theme="light"] .cmd-field label { color: #b45309; font-weight: 800; }
[data-theme="light"] .cmd-panel-meta { color: #6b5840; }
[data-theme="light"] .cmd-apply {
  background: linear-gradient(135deg, #d97706, #c2410c);
  color: #fff;
  box-shadow: 0 6px 18px rgba(217, 119, 6, 0.30);
}
[data-theme="light"] .cmd-clear-all {
  background: rgba(220, 38, 38, 0.08);
  color: #991b1b;
  border-color: rgba(220, 38, 38, 0.28);
}
[data-theme="light"] .cmd-clear-all:hover {
  background: rgba(220, 38, 38, 0.14);
}
[data-theme="light"] .cmd-search input { color: var(--text-primary); }
[data-theme="light"] .cmd-search input::placeholder { color: var(--text-placeholder); }
[data-theme="light"] .cmd-search svg { color: var(--text-secondary); }
[data-theme="light"] .cmd-chip { color: #92400e; }

[data-theme="light"] .cmd-search {
  background: rgba(255, 250, 240, 0.78);
  border-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .cmd-search input { color: var(--text-primary); }
[data-theme="light"] .cmd-search input::placeholder { color: var(--text-placeholder); }
[data-theme="light"] .cmd-clear {
  background: rgba(40, 25, 10, 0.06); color: var(--text-secondary);
}
[data-theme="light"] .cmd-clear:hover {
  background: rgba(217, 119, 6, 0.18); color: var(--text-primary);
}
[data-theme="light"] .cmd-chip { color: #92400e; }
[data-theme="light"] .cmd-chip svg { color: #b45309; }

[data-theme="light"] .cmd-filters-btn {
  background: rgba(40, 25, 10, 0.05);
  color: var(--text-primary);
}
[data-theme="light"] .cmd-filters-btn span { color: var(--text-secondary); }
[data-theme="light"] .cmd-filters-chev { color: var(--text-secondary); }

[data-theme="light"] .cmd-date-sep { color: var(--text-tertiary); }
[data-theme="light"] .cmd-panel { color: var(--text-secondary); }
[data-theme="light"] .cmd-panel-meta { color: var(--text-tertiary); }

/* cmd-tabs rail: cream pill track + warm border */
[data-theme="light"] .cmd-tabs {
  background: rgba(40, 25, 10, 0.06);
  border-color: rgba(40, 25, 10, 0.12);
}
[data-theme="light"] .cmd-tab { color: var(--text-secondary); }
[data-theme="light"] .cmd-tab:hover { color: var(--text-primary); }
[data-theme="light"] .cmd-tab.active { color: #1a1208; }
[data-theme="light"] .cmd-tab-count {
  background: rgba(40, 25, 10, 0.10);
  color: var(--text-secondary);
}
[data-theme="light"] .cmd-tab.active .cmd-tab-count {
  background: rgba(26, 18, 8, 0.18);
  color: #1a1208;
}

[data-theme="light"] .atlas-empty { color: var(--text-secondary); }
[data-theme="light"] .atlas-empty h3 { color: var(--text-primary); }
[data-theme="light"] .atlas-empty p { color: var(--text-secondary); }
</style>
