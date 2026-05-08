<template>
  <div class="project-landing-page">
    
    <!-- Header / Switcher Section -->
    <header class="page-header">
      <div class="header-content">
        <label class="section-label">Project Console</label>
        
        <div class="project-switcher" v-click-outside="() => switcherOpen = false">
           <button class="switcher-btn" @click="switcherOpen = !switcherOpen">
             <h1 class="current-project-name">
               {{ selectedProject?.name || 'Select a Project' }}
             </h1>
             <ChevronDown :size="24" class="chevron" :class="{ open: switcherOpen }" />
           </button>

           <transition name="fade-scale">
              <div v-if="switcherOpen" class="switcher-dropdown">
                <div class="search-wrap">
                  <Search :size="14" />
                  <input v-model="projectSearch" placeholder="Find project..." autofocus />
                </div>
                <div class="project-list-scroll">
                  <button 
                    v-for="p in filteredProjects" 
                    :key="p.id" 
                    class="project-option"
                    :class="{ active: selectedProject?.id === p.id }"
                    @click="selectProject(p)"
                  >
                    <div class="opt-icon">{{ p.name.charAt(0) }}</div>
                    <div class="opt-info">
                      <span class="opt-name">{{ p.name }}</span>
                      <span class="opt-code">{{ p.code }}</span>
                    </div>
                    <Check v-if="selectedProject?.id === p.id" :size="14" class="check" />
                  </button>
                  <div v-if="filteredProjects.length === 0" class="no-results">
                    No results found
                  </div>
                </div>
              </div>
           </transition>
        </div>
      </div>

      <div class="header-actions">
         <button 
           class="action-btn primary" 
           v-if="selectedProject" 
           :disabled="isPending"
           @click="!isPending && $router.push(`${isAdmin ? '/admin' : '/user'}/projects/projectdetails/${selectedProject.id}`)"
           :class="{ disabled: isPending }"
         >
           <span v-if="isPending">Invitation Pending</span>
           <span v-else>View Full Details</span>
           <ArrowRight :size="16" v-if="!isPending" />
         </button>
      </div>
    </header>

    <!-- Main Content -->



    <main class="content-body" v-if="selectedProject && !isPending">
      
      <!-- Component: HERO -->
      <ConsoleHero 
        :project="selectedProject" 
        :progress="progressPercentage" 
        :milestones="milestones"
      />

      <div v-if="activeMilestones.length > 0">
         <DashboardSeparator :icon="Activity" label="Live Updates" />
         
         <div class="mb-8 mt-6">
            <ActiveMilestoneTable 
               :milestones="activeMilestones"
               @select="openTrackerModal"
            />
         </div>
         
         <DashboardSeparator :icon="Activity" label="In Progress" />
      </div>



      <!-- Component: BENTO GRID -->
      <ConsoleBentoGrid 
        :project="selectedProject"
        :team="team"
        :milestones="milestones"
      />

      <!-- Component: TIMELINE -->
      <ProjectTimeline 
        v-if="milestones.length > 0" 
        :milestones="milestones" 
      />

    </main>

    <!-- Pending State -->
    <div v-else-if="selectedProject && isPending" class="empty-container">
       <div class="empty-box flex-layout">
         <ShieldAlert :size="48" class="text-yellow-500" />
         <h2 class="mt-4 text-xl font-semibold">Access Restricted</h2>
         <p class="text-base opacity-70 mb-4 max-w-md mx-auto">
            You must accept the team invitation to view this project's console and details.
         </p>
         <button class="action-btn primary" @click="$router.push(`/user/projects/assignteam`)">
             Respond to Invitation
         </button>
       </div>
    </div>

    <!-- Loading State -->
    <div v-else-if="isLoading" class="loading-container">
       <Loader2 :size="40" class="spin-huge" />
    </div>
    <div v-else class="empty-container">
       <div class="empty-box">
         <FolderOpen :size="48" />
         <p>Select a project to view console.</p>
       </div>
    </div>

    <MilestoneTrackerModal
       v-if="showTrackerModal"
       v-model="showTrackerModal"
       :milestone="selectedTrackerMilestone"
       :current-user="currentUser"
       @refresh="handleTrackerRefresh"
    />

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import axios from 'axios'
import { useRoute } from 'vue-router'
import { 
  ChevronDown, Search, Check, ArrowRight, Loader2, FolderOpen, ShieldAlert
} from 'lucide-vue-next'

// Components
import ConsoleHero from '../components/project-console/ConsoleHero.vue'
import ConsoleBentoGrid from '../components/project-console/ConsoleBentoGrid.vue'
import ProjectTimeline from '../components/project-console/ProjectTimeline.vue'
import ActiveMilestoneTable from '../components/milestones/ActiveMilestoneTable.vue'
import MilestoneTrackerModal from '../components/milestones/MilestoneTrackerModal.vue'
import DashboardSeparator from '../components/ui/DashboardSeparator.vue'
import { Activity } from 'lucide-vue-next'

const route = useRoute()
const isAdmin = computed(() => route.path.startsWith('/admin'))
const token = computed(() => isAdmin.value ? localStorage.getItem('admin_token') : localStorage.getItem('user_token'))
const currentUser = computed(() => {
   const u = localStorage.getItem('user')
   return u ? JSON.parse(u) : null
})

const projects = ref([])
const selectedProject = ref(null)
const milestones = ref([])
const team = ref([])
const globalActiveMilestones = ref([])
const showTrackerModal = ref(false)
const selectedTrackerMilestone = ref(null)
const isLoading = ref(true)
const switcherOpen = ref(false)
const projectSearch = ref('')

const activeMilestones = computed(() => {
   return milestones.value.filter(m => m.status === 'in_progress').map(m => ({
      ...m,
      project_name: selectedProject.value?.name // Enrich with known project name
   }))
})

const isPending = computed(() => {
    return selectedProject.value && selectedProject.value.current_user_membership_status === 'pending'
})

// Computed
const filteredProjects = computed(() => {
  if (!projectSearch.value) return projects.value
  const q = projectSearch.value.toLowerCase()
  return projects.value.filter(p => p.name.toLowerCase().includes(q))
})

// Exchange Rates (Matched with Cards/Hero for Consistency)
const EXCHANGE_RATES = {
  'USD': 1, 'EUR': 0.92, 'GBP': 0.79, 'INR': 83.5, 
  'AUD': 1.52, 'CAD': 1.35, 'JPY': 150.0
}
const convertAmount = (amt, from, to) => {
  if (!amt) return 0
  if (from === to) return amt
  const fromRate = EXCHANGE_RATES[from] || 1
  const toRate = EXCHANGE_RATES[to] || 1
  return (amt / fromRate) * toRate
}

const progressPercentage = computed(() => {
  if (!selectedProject.value) return 0
  
  // Use backend computed value for consistency
  const used = selectedProject.value.budget_consumed || 0
  const total = selectedProject.value.budget_amount || 1
  
  if (total === 0) return 0
  
  const pct = (used / total) * 100
  return Math.min(Math.round(pct), 100)
})

// Navigation / Actions
const fetchProjects = async () => {
   try {
     const res = await axios.get('http://localhost:8000/api/projects/', {
        headers: { Authorization: `Bearer ${token.value}` },
        params: { limit: 100, status: 'Approved' }
     })
     projects.value = res.data.items || []
     
     // Check for selected query param
     const selectedId = route.query.selected
     const target = selectedId ? projects.value.find(p => p.id === selectedId) : null
     
     if (target) {
       selectProject(target)
     } else if (projects.value.length > 0) {
       selectProject(projects.value[0])
     }

   } catch (e) {
     console.error('Err', e)
   } finally {
     isLoading.value = false
   }
}

const fetchGlobalActiveMilestones = async () => {
   try {
      const res = await axios.get('http://localhost:8000/api/milestones/active', {
          headers: { Authorization: `Bearer ${token.value}` }
      })
      globalActiveMilestones.value = res.data
   } catch (e) {
      console.warn("Failed to fetch global active milestones", e)
   }
}

const fetchMilestones = async (pid) => {
   try {
     const res = await axios.get(`http://localhost:8000/api/projects/${pid}/milestones`, {
         headers: { Authorization: `Bearer ${token.value}` }
     })
     milestones.value = res.data
   } catch (e) {
     // Don't clear milestones on transient error to prevent flicker
     console.warn("Failed to fetch milestones", e)
   }
}

const fetchTeam = async (pid) => {
    try {
        const res = await axios.get(`http://localhost:8000/api/team/${pid}`, {
            headers: { Authorization: `Bearer ${token.value}` }
        })
        team.value = res.data
    } catch (e) {
        team.value = []
    }
}

const selectProject = async (p) => {
   // Set basic info first for immediate UI feedback
   selectedProject.value = p
   switcherOpen.value = false
   
   // Fetch full details (includes file_size, etc.)
   try {
     const res = await axios.get(`http://localhost:8000/api/projects/${p.id}`, {
         headers: { Authorization: `Bearer ${token.value}` }
     })
     selectedProject.value = res.data
   } catch (e) {
     console.warn("Failed to fetch full project details", e)
   }

   fetchMilestones(p.id)
   fetchTeam(p.id)
}

const openTrackerModal = (m) => {
   selectedTrackerMilestone.value = m
   showTrackerModal.value = true
}

const handleTrackerRefresh = () => {
   fetchGlobalActiveMilestones()
   // If current project matches updated milestone project, refresh project milestones too
   if (selectedProject.value && selectedTrackerMilestone.value && 
       selectedTrackerMilestone.value.project_id === selectedProject.value.id) {
       fetchMilestones(selectedProject.value.id)
   }
}

// Polling Logic
let pollInterval = null
const pollData = () => {
  if (currentUser.value) fetchGlobalActiveMilestones()
  if (selectedProject.value && !isPending.value) {
     fetchMilestones(selectedProject.value.id)
  }
}

onMounted(() => {
   fetchProjects()
   fetchGlobalActiveMilestones()
   // Poll every 10 seconds for real-time updates
   pollInterval = setInterval(pollData, 10000)
})

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval)
})

const vClickOutside = {
  mounted(el, binding) {
    el.clickOutsideEvent = function(event) {
      if (!(el === event.target || el.contains(event.target))) binding.value(event, el);
    };
    document.body.addEventListener('click', el.clickOutsideEvent);
  },
  unmounted(el) { document.body.removeEventListener('click', el.clickOutsideEvent); }
};
</script>

<style scoped>
/* RESET & BASE */
.project-landing-page {
  font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  color: #f5f5f7;
  max-width: 1400px; 
  margin: 0 auto;
  padding-bottom: 40px;
}

/* HEADER SECTION */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 32px;
  position: relative;
  z-index: 20;
}

.section-label {
  display: block; font-size: 11px; text-transform: uppercase; color: rgba(255, 255, 255, 0.4);
  letter-spacing: 0.1em; margin-bottom: 4px; font-weight: 700;
}

.switcher-btn {
  background: none; border: none; padding: 0; display: flex; align-items: center; gap: 12px;
  cursor: pointer; color: white; transition: opacity 0.2s;
}
.switcher-btn:hover { opacity: 0.8; }
.current-project-name { font-size: 32px; font-weight: 700; margin: 0; line-height: 1; letter-spacing: -0.03em; }
.chevron { opacity: 0.4; transition: transform 0.3s; }
.chevron.open { transform: rotate(180deg); opacity: 1; }

.switcher-dropdown {
  position: absolute; top: 100%; left: 0; margin-top: 16px; width: 360px;
  background: rgba(30, 30, 33, 0.95); backdrop-filter: blur(50px);
  border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 18px; padding: 16px;
  box-shadow: 0 40px 80px rgba(0,0,0,0.6), 0 12px 24px rgba(0,0,0,0.3); z-index: 100;
  display: flex; flex-direction: column; gap: 12px;
  transform-origin: top left;
}
.search-wrap {
  display: flex; align-items: center; gap: 10px; background: rgba(0, 0, 0, 0.2);
  padding: 10px 14px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05);
  color: rgba(255, 255, 255, 0.5); transition: border-color 0.2s;
}
.search-wrap:focus-within { border-color: rgba(59, 130, 246, 0.4); color: white; }
.search-wrap input { background: transparent; border: none; outline: none; color: white; width: 100%; font-size: 13px; font-weight: 500; }

.project-list-scroll { 
  max-height: 320px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding-right: 4px; 
}

/* Custom Scrollbar (Apple Style) */
.project-list-scroll::-webkit-scrollbar { width: 6px; }
.project-list-scroll::-webkit-scrollbar-track { background: transparent; }
.project-list-scroll::-webkit-scrollbar-thumb { 
  background: rgba(255, 255, 255, 0.1); border-radius: 10px; 
  border: 2px solid transparent; background-clip: content-box; 
}
.project-list-scroll::-webkit-scrollbar-thumb:hover { background-color: rgba(255, 255, 255, 0.2); }

.project-option {
  display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: transparent; border: none;
  cursor: pointer; color: #d4d4d8; text-align: left; border-radius: 12px; transition: all 0.2s;
}
.project-option:hover { background: rgba(255, 255, 255, 0.04); color: white; }
.project-option.active { background: rgba(59, 130, 246, 0.15); color: #fff; }

.separator-line {
  height: 1px; width: 100%;
  background: rgba(255,255,255,0.15); /* Increased visibility */
  margin: 32px 0; /* Increased spacing */
  box-shadow: 0 1px 0 rgba(0,0,0,0.5); /* Depth */
}
.opt-icon {
  width: 36px; height: 36px; background: rgba(255, 255, 255, 0.06);
  border-radius: 10px; display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; color: #a1a1aa; transition: background 0.2s;
}
.project-option.active .opt-icon { background: #3b82f6; color: white; }

.opt-info { display: flex; flex-direction: column; gap: 2px; flex: 1; }
.opt-name { font-size: 14px; font-weight: 500; }
.opt-code { font-size: 11px; color: rgba(255,255,255,0.4); font-family: 'SF Mono', monospace; letter-spacing: 0.05em; }
.project-option.active .opt-code { color: rgba(255,255,255,0.7); }

.check { color: #3b82f6; }
.project-option.active .check { color: white; }

.no-results { padding: 20px; text-align: center; color: rgba(255,255,255,0.3); font-size: 13px; }

.action-btn.primary {
  display: flex; align-items: center; gap: 8px; background: white; color: black;
  border: none; padding: 10px 20px; border-radius: 30px; font-size: 13px; font-weight: 600;
  cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 4px 12px rgba(255, 255, 255, 0.1);
}
.action-btn.primary:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(255, 255, 255, 0.2); }
.action-btn.primary.disabled { 
  opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.5);
}

/* LOADING/EMPTY */
.spin-huge { animation: spin 1s linear infinite; color: #3b82f6; }
@keyframes spin { 100% { transform: rotate(360deg); } }

.loading-container, .empty-container { height: 60vh; display: flex; align-items: center; justify-content: center; }
.empty-box { 
  text-align: center; color: rgba(255, 255, 255, 0.2); 
  display: flex; flex-direction: column; align-items: center; gap: 16px;
}
.empty-box p { margin-top: 0; font-size: 14px; }
</style>
