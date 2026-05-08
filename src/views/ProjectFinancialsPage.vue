<template>
  <div class="financials-page-container">
    
    <!-- HEADER SECTION -->
    <header class="glass-header">
       <div class="header-content">
          <div class="project-identity">
             <div class="project-icon-box" v-if="selectedProject">
                {{ selectedProject.name.charAt(0) }}
             </div>
             <div class="identity-text">
                <label>Financial Control Center</label>
                <div class="project-selector" v-click-outside="() => switcherOpen = false">
                   <h1 @click="switcherOpen = !switcherOpen">
                     {{ selectedProject?.name || 'Select Project' }}
                     <ChevronDown :size="18" class="chevron" :class="{ open: switcherOpen }" />
                   </h1>
                   
                   <!-- Dropdown -->
                   <transition name="scale-fade">
                      <div v-if="switcherOpen" class="project-dropdown">
                         <div class="search-wrap">
                            <Search :size="14" />
                            <input v-model="projectSearch" placeholder="Filter projects..." autofocus />
                         </div>
                         <div class="dropdown-scroll">
                            <button 
                              v-for="p in filteredProjects" :key="p.id" 
                              class="dropdown-item"
                              :class="{ active: selectedProject?.id === p.id }"
                              @click="selectProject(p)"
                            >
                               <span class="p-icon">{{ p.name.charAt(0) }}</span>
                               <span class="p-name">{{ p.name }}</span>
                               <Check v-if="selectedProject?.id === p.id" :size="14" class="p-check" />
                            </button>
                         </div>
                      </div>
                   </transition>
                </div>
             </div>
          </div>

          <!-- Header Actions / Metrics -->
          <div class="header-actions">
             <div class="mini-metric" v-if="selectedProject">
                <span class="label">Budget Usage</span>
                <div class="bar-container">
                   <div class="bar-fill" :style="{ width: usagePercentage + '%' }"></div>
                </div>
                <span class="value">{{ usagePercentage }}%</span>
             </div>
             <button class="action-btn" v-if="isAdmin">
                <Download :size="16" /> Export Report
             </button>
          </div>
       </div>

       <!-- NAVIGATION TABS -->
       <div class="tabs-dock">
          <button 
            v-for="tab in tabs" 
            :key="tab.id"
            class="dock-item"
            :class="{ active: currentTab === tab.id }"
            @click="currentTab = tab.id"
          >
            <component :is="tab.icon" :size="16" />
            <span>{{ tab.label }}</span>
            <div class="active-glow" v-if="currentTab === tab.id"></div>
          </button>
       </div>
    </header>

    <!-- CONTENT AREA -->
    <main class="main-canvas" v-if="!isPending">
       <transition name="fade-slide" mode="out-in">
          <component 
             :is="activeComponent" 
             :project-id="selectedProject?.id"
             :project="selectedProject"
             :token="token"
             :is-admin="isAdmin"
             class="tab-view"
          />
       </transition>
    </main>

    <!-- ACCESS RESTRICTED STATE -->
    <div v-else class="empty-container">
       <div class="empty-box flex-layout">
         <div class="icon-glow">
            <ShieldAlert :size="40" class="text-yellow-500" />
         </div>
         <h2 class="mt-4 text-xl font-semibold">Access Restricted</h2>
         <p class="text-base opacity-70 mb-4 max-w-md mx-auto">
            You must accept the team invitation to view this project's financials.
         </p>
         <button class="action-btn primary" @click="$router.push(`/user/projects/assignteam`)">
             Respond to Invitation
         </button>
       </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, defineAsyncComponent } from 'vue'
import axios from 'axios'
import { useRoute, useRouter } from 'vue-router'
import { 
  ChevronDown, Search, Check, Download, 
  LayoutDashboard, CreditCard, 
  TrendingUp, BookOpen, FileText, History, ShieldAlert
} from 'lucide-vue-next'

// Components
const FinancialsOverview = defineAsyncComponent(() => import('../components/financials/FinancialsOverview.vue'))
const PaymentList = defineAsyncComponent(() => import('../components/financials/PaymentList.vue'))
const FinancialLedger = defineAsyncComponent(() => import('../components/financials/FinancialLedger.vue'))
const FinancialForecast = defineAsyncComponent(() => import('../components/financials/FinancialForecast.vue'))
const FinancialAudit = defineAsyncComponent(() => import('../components/financials/FinancialAudit.vue'))
const FinancialDocuments = defineAsyncComponent(() => import('../components/financials/FinancialDocuments.vue'))

const route = useRoute()
const router = useRouter()
const isAdmin = computed(() => route.path.startsWith('/admin'))
const token = computed(() => isAdmin.value ? localStorage.getItem('admin_token') : localStorage.getItem('user_token'))

// State
const projects = ref([])
const selectedProject = ref(null)
const switcherOpen = ref(false)
const projectSearch = ref('')
const currentTab = ref('overview')

const tabs = [
  { id: 'overview', label: 'Dashboard', icon: LayoutDashboard, component: FinancialsOverview },
  { id: 'payments', label: 'Payments', icon: CreditCard, component: PaymentList },
  { id: 'forecast', label: 'Forecast', icon: TrendingUp, component: FinancialForecast },
  { id: 'ledger', label: 'Ledger', icon: BookOpen, component: FinancialLedger },
  { id: 'documents', label: 'Documents', icon: FileText, component: FinancialDocuments },
  { id: 'audit', label: 'Audit', icon: History, component: FinancialAudit },
]

const activeComponent = computed(() => tabs.find(t => t.id === currentTab.value)?.component || FinancialsOverview)

const filteredProjects = computed(() => {
  if (!projectSearch.value) return projects.value
  return projects.value.filter(p => p.name.toLowerCase().includes(projectSearch.value.toLowerCase()))
})

const usagePercentage = computed(() => {
   if (!selectedProject.value?.budget_amount) return 0
   return Math.min(Math.round((selectedProject.value.budget_utilized || 0) / selectedProject.value.budget_amount * 100), 100)
})

const isPending = computed(() => {
    return selectedProject.value && selectedProject.value.current_user_membership_status === 'pending'
})

// Methods
const fetchProjects = async () => {
   try {
      const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token')
      const response = await axios.get('http://localhost:8000/api/projects/', {
         headers: { Authorization: `Bearer ${token}` }
      })
      // Keep full project objects to ensure all data is available
      projects.value = response.data.items.map(p => ({
         ...p, // Keep ALL project fields
         name: p.name // Ensure name is available for display
      }))

      // Auto-select from route or first available
      if (route.query.projectId) {
         const p = projects.value.find(p => p.id === route.query.projectId)
         if (p) selectProject(p)
      } else if (projects.value.length > 0) {
         selectProject(projects.value[0])
      }
   } catch (error) {
      console.error("Failed to fetch projects", error)
   }
}

const selectProject = async (project) => {
   // Set basic info first for immediate UI feedback
   selectedProject.value = project
   switcherOpen.value = false 
   
   // Update URL without reload
   router.replace({ query: { ...route.query, projectId: project.id } })

   // Fetch full details (includes status for access check)
   try {
     const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token')
     const res = await axios.get(`http://localhost:8000/api/projects/${project.id}`, {
         headers: { Authorization: `Bearer ${token}` }
     })
     selectedProject.value = res.data
   } catch (e) {
     console.warn("Failed to fetch full project details", e)
   }
}

const vClickOutside = {
  mounted(el, binding) {
    el.clickOutsideEvent = function(event) {
      if (!(el === event.target || el.contains(event.target))) binding.value(event, el);
    };
    document.body.addEventListener('click', el.clickOutsideEvent);
  },
  unmounted(el) { document.body.removeEventListener('click', el.clickOutsideEvent); }
};

onMounted(fetchProjects)
</script>

<style scoped>
/* PAGE CONTAINER */
.financials-page-container {
  min-height: 100vh;
  /* background: transparent; Let global theme handle it, or use a very subtle gradient if needed */
  color: #f5f5f7;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  overflow-x: hidden;
}

/* HEADER */
.glass-header {
  position: sticky; top: 0; z-index: 50;
  background: rgba(9, 9, 11, 0.7); backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  padding: 0 40px;
}

.header-content {
  height: 80px; display: flex; align-items: center; justify-content: space-between;
}

.project-identity { display: flex; align-items: center; gap: 16px; }
.project-icon-box {
  width: 40px; height: 40px; background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  border-radius: 12px; display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 18px; color: white; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.identity-text { display: flex; flex-direction: column; gap: 2px; }
.identity-text label {
  font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: rgba(255, 255, 255, 0.4); font-weight: 600;
}
.project-selector { position: relative; }
.project-selector h1 {
  font-size: 20px; font-weight: 700; margin: 0; cursor: pointer; display: flex; align-items: center; gap: 8px;
  transition: opacity 0.2s;
}
.project-selector h1:hover { opacity: 0.8; }
.chevron { opacity: 0.4; transition: transform 0.2s; }
.chevron.open { transform: rotate(180deg); opacity: 1; }

/* PROJECT DROPDOWN */
.project-dropdown {
  position: absolute; top: 100%; left: -10px; margin-top: 12px; width: 300px;
  background: #18181b; border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px; padding: 12px; box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  z-index: 100;
}
.search-wrap {
  display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.05);
  padding: 8px 12px; border-radius: 8px; margin-bottom: 8px;
}
.search-wrap input { background: transparent; border: none; outline: none; color: white; width: 100%; font-size: 13px; }
.dropdown-scroll { max-height: 240px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
.dropdown-item {
  display: flex; align-items: center; gap: 10px; padding: 8px 10px;
  background: transparent; border: none; color: #a1a1aa; cursor: pointer;
  border-radius: 8px; transition: all 0.2s; text-align: left;
}
.dropdown-item:hover { background: rgba(255,255,255,0.05); color: white; }
.dropdown-item.active { background: #27272a; color: white; }
.p-icon { 
  width: 24px; height: 24px; background: rgba(255,255,255,0.1); border-radius: 6px; 
  display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; 
}
.p-name { flex: 1; font-size: 13px; font-weight: 500; }
.p-check { color: #8b5cf6; }

/* HEADER ACTIONS */
.header-actions { display: flex; align-items: center; gap: 24px; }
.mini-metric { display: flex; align-items: center; gap: 12px; font-size: 12px; }
.mini-metric .label { color: rgba(255,255,255,0.5); }
.bar-container { width: 80px; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden; }
.bar-fill { height: 100%; background: #22c55e; border-radius: 3px; }
.mini-metric .value { font-family: 'SF Mono', monospace; font-weight: 600; color: #22c55e; }

.action-btn {
  background: white; color: black; border: none; padding: 8px 16px; border-radius: 20px;
  font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 6px; cursor: pointer;
  transition: transform 0.1s;
}
.action-btn:hover { transform: translateY(-1px); }

/* TABS DOCK */
.tabs-dock {
  display: flex; gap: 24px; padding-bottom: 0px; margin-top: 4px; border-bottom: 1px solid transparent;
}
.dock-item {
  background: transparent; border: none; padding: 12px 4px; color: rgba(255,255,255,0.5);
  font-size: 13px; font-weight: 500; cursor: pointer; position: relative;
  display: flex; align-items: center; gap: 8px; transition: color 0.2s;
}
.dock-item:hover { color: rgba(255,255,255,0.8); }
.dock-item.active { color: white; font-weight: 600; }
.active-glow {
  position: absolute; bottom: -1px; left: 0; width: 100%; height: 2px;
  background: #8b5cf6; box-shadow: 0 -2px 8px rgba(139, 92, 246, 0.5);
  border-radius: 2px 2px 0 0;
}

/* MAIN CANVAS */
.main-canvas {
  padding: 32px 40px; max-width: 1600px; margin: 0 auto;
}

/* ANIMATIONS */
.scale-fade-enter-active, .scale-fade-leave-active { transition: all 0.2s ease; }
.scale-fade-enter-from, .scale-fade-leave-to { opacity: 0; transform: scale(0.95); }

.fade-slide-enter-active, .fade-slide-leave-active { transition: all 0.3s ease; }
.fade-slide-enter-from { opacity: 0; transform: translateY(10px); }
.fade-slide-leave-to { opacity: 0; transform: translateY(-10px); }

/* RESTRICTED ACCESS STYLES */
.empty-container { 
  height: 60vh; 
  display: flex; align-items: center; justify-content: center; 
  animation: fadeSlideUp 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.empty-box { 
  text-align: center; color: rgba(255, 255, 255, 0.5); 
  display: flex; flex-direction: column; align-items: center; gap: 24px;
}

.empty-box.flex-layout {
    background: rgba(255, 255, 255, 0.03); 
    backdrop-filter: blur(40px);
    -webkit-backdrop-filter: blur(40px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 32px;
    padding: 60px 40px;
    max-width: 480px;
    width: 90%;
    /* Removed large shadow and inner stroke for cleaner look */
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2); 
    position: relative;
    overflow: hidden;
}

.icon-glow {
    position: relative; z-index: 1;
    width: 80px; height: 80px;
    background: rgba(255, 255, 255, 0.05); /* Neutral/Subtle */
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 24px;
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 8px;
    /* Removed glow shadow */
}

.text-yellow-500 { color: #eab308; }
.mt-4 { margin-top: 0; position: relative; z-index: 1; }
.mb-4 { margin-bottom: 0px; position: relative; z-index: 1; }

.text-xl { 
  font-size: 24px; letter-spacing: -0.02em; 
  color: #f5f5f7; /* Solid color */
}
.font-semibold { font-weight: 700; }

.text-base { 
  font-size: 15px; line-height: 1.6; max-width: 320px;
}
.opacity-70 { color: rgba(255,255,255,0.6); }
.mx-auto { margin-left: auto; margin-right: auto; }

.action-btn.primary {
    position: relative; z-index: 1;
    margin-top: 8px;
    background: #eab308; color: black;
    padding: 14px 32px; font-size: 14px;
    border-radius: 12px;
    border: none;
    font-weight: 600;
    transition: all 0.2s;
}
.action-btn.primary:hover {
    background: #facc15;
    transform: translateY(-1px);
}

@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

</style>
