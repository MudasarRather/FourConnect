<template>
  <div ref="pageRoot" class="financials-page-container">

    <!-- HEADER SECTION -->
    <header class="glass-header" data-anim="page-header">
       <div class="header-content">
          <div class="project-identity">
             <div class="project-icon-box" v-if="selectedProject">
                {{ selectedProject.name.charAt(0) }}
             </div>
             <div class="identity-text">
                <label>Financial Control Center</label>
                <div class="project-selector" v-click-outside="() => switcherOpen = false">
                   <h1 ref="triggerRef" @click="switcherOpen = !switcherOpen">
                     {{ selectedProject?.name || 'Select Project' }}
                     <ChevronDown :size="18" class="chevron" :class="{ open: switcherOpen }" />
                   </h1>

                   <!-- Dropdown teleported to <body> to escape the header's
                        stacking context (see recalcDropdownPos comment).
                        @mousedown.stop prevents v-click-outside on the parent
                        .project-selector from firing for clicks inside the
                        teleported dropdown (which is now DOM-outside it). -->
                   <Teleport to="body">
                      <transition name="scale-fade">
                         <div v-if="switcherOpen" class="project-dropdown project-dropdown--floating" :style="dropdownStyle" @mousedown.stop @click.stop>
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
                   </Teleport>
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
       <div class="tabs-dock" data-anim="tabs-dock">
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
    <main class="main-canvas" data-anim="tab-canvas" v-if="!isPending">
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
            <ShieldAlert :size="40" class="text-amber-warning" />
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
import { ref, computed, onMounted, onUnmounted, watch, nextTick, defineAsyncComponent } from 'vue'
import axios from 'axios'
import { useRoute, useRouter } from 'vue-router'
import { 
  ChevronDown, Search, Check, Download, 
  LayoutDashboard, CreditCard, 
  TrendingUp, BookOpen, FileText, History, ShieldAlert
} from 'lucide-vue-next'
import { useGsapAnim } from '../composables/useGsapAnim'
import { projectFinancialsEntry } from '../animations/pageChoreography'
import { API } from '@/utils/api'

const pageRoot = ref(null)

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

// Project-selector dropdown is teleported to <body> to escape the
// .glass-header stacking context (isolation: isolate + a GSAP entry
// animation that leaves transform on each .dock-item, both of which
// would otherwise paint the tabs above the dropdown).
const triggerRef = ref(null)
const dropdownPos = ref({ top: 0, left: 0 })

const recalcDropdownPos = () => {
  if (!triggerRef.value) return
  const r = triggerRef.value.getBoundingClientRect()
  dropdownPos.value = { top: r.bottom + 12, left: r.left - 10 }
}

const dropdownStyle = computed(() => ({
  position: 'fixed',
  top: `${dropdownPos.value.top}px`,
  left: `${dropdownPos.value.left}px`,
}))

watch(switcherOpen, (open) => {
  if (open) nextTick(recalcDropdownPos)
})

onMounted(() => {
  window.addEventListener('resize', recalcDropdownPos)
  // 'true' = capture: catches scrolls inside any ancestor (sticky header etc.)
  window.addEventListener('scroll', recalcDropdownPos, true)
})
onUnmounted(() => {
  window.removeEventListener('resize', recalcDropdownPos)
  window.removeEventListener('scroll', recalcDropdownPos, true)
})
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
      const response = await axios.get(`${API}/projects/`, {
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
     const res = await axios.get(`${API}/projects/${project.id}`, {
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

const { run } = useGsapAnim(pageRoot)
run(() => { projectFinancialsEntry(pageRoot.value) })

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

/* HEADER — ultra modern, blended directly into background */
.glass-header {
  position: sticky; top: 0; z-index: 50;
  background: transparent;
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding: 0 40px;
  isolation: isolate;
  animation: header-enter 0.7s cubic-bezier(0.16, 1, 0.3, 1) both;
}

/* Animated gold accent at the bottom edge */
.glass-header::after {
  content: "";
  position: absolute;
  bottom: -1px; left: 0; right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent 0%, rgba(245, 158, 11, 0.45) 35%, rgba(249, 115, 22, 0.55) 50%, rgba(245, 158, 11, 0.45) 65%, transparent 100%);
  background-size: 200% 100%;
  animation: gold-flow 8s linear infinite;
  pointer-events: none;
}

/* Subtle ambient orb in the header background */
.glass-header::before {
  content: "";
  position: absolute;
  top: -60px; right: 10%;
  width: 280px; height: 200px;
  background: radial-gradient(ellipse, rgba(245, 158, 11, 0.10), transparent 70%);
  filter: blur(40px);
  pointer-events: none;
  z-index: -1;
  animation: orb-drift 16s ease-in-out infinite;
}

@keyframes header-enter {
  from { opacity: 0; transform: translateY(-12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes gold-flow {
  0% { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}
@keyframes orb-drift {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(-40px, 20px); }
}

.header-content {
  height: 88px; display: flex; align-items: center; justify-content: space-between;
  position: relative;
}

.project-identity { display: flex; align-items: center; gap: 16px; }
.project-icon-box {
  width: 44px; height: 44px;
  background: linear-gradient(135deg, #f59e0b, #f97316);
  border-radius: 13px;
  display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 18px; color: white;
  box-shadow:
    0 6px 18px rgba(249, 115, 22, 0.40),
    inset 0 1px 0 rgba(255, 255, 255, 0.20);
  position: relative;
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease;
}
.project-icon-box::before {
  content: "";
  position: absolute; inset: -3px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.45), rgba(249, 115, 22, 0.25));
  filter: blur(8px);
  z-index: -1;
  opacity: 0.6;
  animation: icon-pulse 3.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
.project-icon-box:hover {
  transform: scale(1.06) rotate(-3deg);
  box-shadow:
    0 10px 26px rgba(249, 115, 22, 0.55),
    inset 0 1px 0 rgba(255, 255, 255, 0.30);
}
@keyframes icon-pulse {
  0%, 100% { opacity: 0.45; }
  50% { opacity: 0.85; }
}

.identity-text { display: flex; flex-direction: column; gap: 4px; }
.identity-text label {
  font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em;
  color: rgba(245, 158, 11, 0.70); font-weight: 700;
}
.project-selector { position: relative; }
.project-selector h1 {
  font-size: 22px; font-weight: 800; margin: 0; cursor: pointer;
  display: flex; align-items: center; gap: 10px;
  letter-spacing: -0.02em;
  background: linear-gradient(135deg, #fff 30%, #fde68a 100%);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
  transition: transform 0.25s ease;
}
.project-selector h1:hover { transform: translateX(2px); }
.chevron { opacity: 0.6; transition: transform 0.30s cubic-bezier(0.16, 1, 0.3, 1); color: #fbbf24; -webkit-text-fill-color: #fbbf24; }
.chevron.open { transform: rotate(180deg); opacity: 1; }

/* PROJECT DROPDOWN — frosted glass with amber-tinted edge.
   Background is intentionally near-opaque (96%+): the .glass-header parent uses
   `isolation: isolate`, so the dropdown's stacking is local to the header and
   the tabs-dock would otherwise bleed through a translucent panel. */
.project-dropdown {
  position: absolute; top: 100%; left: -10px; margin-top: 12px;
  width: 320px; max-width: calc(100vw - 80px);
  background: linear-gradient(180deg, rgba(22, 22, 26, 0.97) 0%, rgba(16, 16, 20, 0.98) 100%);
  border: 1px solid rgba(245, 158, 11, 0.22);
  border-radius: 16px; padding: 10px;
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
  box-shadow:
    0 24px 70px rgba(0, 0, 0, 0.65),
    0 0 0 1px rgba(255, 255, 255, 0.04) inset,
    0 0 40px rgba(245, 158, 11, 0.08);
  z-index: 1500;
}
.scale-fade-enter-active, .scale-fade-leave-active {
  transition: opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1), transform 0.22s cubic-bezier(0.16, 1, 0.3, 1);
  transform-origin: top left;
}
.scale-fade-enter-from, .scale-fade-leave-to { opacity: 0; transform: scale(0.96) translateY(-6px); }

.search-wrap {
  display: flex; align-items: center; gap: 8px;
  background: rgba(0, 0, 0, 0.30);
  border: 1px solid rgba(245, 158, 11, 0.14);
  padding: 9px 12px; border-radius: 10px; margin-bottom: 8px;
  transition: border-color 0.2s ease, background 0.2s ease;
}
.search-wrap:focus-within {
  background: rgba(245, 158, 11, 0.06);
  border-color: rgba(245, 158, 11, 0.40);
  box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.08);
}
.search-wrap svg { color: rgba(245, 158, 11, 0.65); flex-shrink: 0; }
.search-wrap input { background: transparent; border: none; outline: none; color: white; width: 100%; font-size: 13px; }
.search-wrap input::placeholder { color: rgba(255, 255, 255, 0.35); }
.dropdown-scroll { max-height: 280px; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; padding: 2px 0; }
.dropdown-scroll::-webkit-scrollbar { width: 4px; }
.dropdown-scroll::-webkit-scrollbar-thumb { background: rgba(245, 158, 11, 0.25); border-radius: 99px; }
.dropdown-scroll::-webkit-scrollbar-track { background: transparent; }
.dropdown-item {
  display: flex; align-items: center; gap: 10px; padding: 9px 10px;
  background: transparent; border: none; color: #c9c9cf; cursor: pointer;
  border-radius: 10px; transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1); text-align: left;
}
.dropdown-item:hover {
  background: rgba(245, 158, 11, 0.08);
  border-color: rgba(245, 158, 11, 0.22);
  color: #fff;
  transform: translateX(2px);
}
.dropdown-item.active {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.16), rgba(249, 115, 22, 0.08));
  color: #fff;
  box-shadow: 0 0 0 1px rgba(245, 158, 11, 0.32) inset;
}
.p-icon {
  width: 26px; height: 26px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.20), rgba(249, 115, 22, 0.10));
  border: 1px solid rgba(245, 158, 11, 0.28);
  border-radius: 7px;
  color: #fbbf24;
  display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700;
  flex-shrink: 0;
}
.dropdown-item.active .p-icon {
  background: linear-gradient(135deg, #f59e0b, #f97316);
  border-color: rgba(255, 255, 255, 0.20);
  color: #1a1208;
}
.p-name { flex: 1; font-size: 13px; font-weight: 500; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.p-check { color: #fbbf24; flex-shrink: 0; }

/* HEADER ACTIONS */
.header-actions { display: flex; align-items: center; gap: 20px; }
.mini-metric {
  display: flex; align-items: center; gap: 12px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 999px;
  font-size: 12px;
  transition: background 0.25s ease, border-color 0.25s ease;
}
.mini-metric:hover {
  background: rgba(245, 158, 11, 0.08);
  border-color: rgba(245, 158, 11, 0.28);
}
.mini-metric .label { color: rgba(255, 255, 255, 0.55); font-weight: 600; }
.bar-container {
  width: 90px; height: 6px;
  background: rgba(255, 255, 255, 0.10);
  border-radius: 99px;
  overflow: hidden;
  position: relative;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.20);
}
.bar-fill {
  height: 100%; border-radius: 99px;
  background: linear-gradient(90deg, #f59e0b, #f97316);
  position: relative; overflow: hidden;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.45);
  transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
}
.bar-fill::after {
  content: ""; position: absolute; inset: 0;
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.55) 50%, transparent 100%);
  transform: translateX(-100%);
  animation: ledgerShimmer 2.4s linear infinite;
}
@keyframes ledgerShimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
.mini-metric .value {
  font-family: 'SF Mono', monospace; font-weight: 700; color: #fbbf24;
  min-width: 36px; text-align: right;
}

.action-btn {
  background: linear-gradient(135deg, #f59e0b, #f97316);
  color: white; border: none;
  padding: 10px 18px; border-radius: 999px;
  font-size: 12px; font-weight: 700;
  display: flex; align-items: center; gap: 8px;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(245, 158, 11, 0.30);
  transition: transform 0.20s ease, box-shadow 0.25s ease;
}
.action-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 10px 22px rgba(245, 158, 11, 0.45);
}

/* TABS DOCK — modern pill bar with sliding active indicator */
.tabs-dock {
  display: flex; gap: 6px;
  padding: 4px;
  margin-top: 6px;
  margin-bottom: -1px;
  border-bottom: none;
  width: fit-content;
}
.dock-item {
  background: transparent; border: none;
  padding: 10px 16px;
  color: rgba(255, 255, 255, 0.55);
  font-size: 13px; font-weight: 600;
  cursor: pointer; position: relative;
  display: flex; align-items: center; gap: 8px;
  border-radius: 10px 10px 0 0;
  transition: color 0.25s ease, background 0.25s ease, transform 0.20s ease;
  letter-spacing: 0.01em;
}
.dock-item svg {
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), color 0.25s ease;
}
.dock-item:hover {
  color: rgba(255, 255, 255, 0.95);
  background: rgba(245, 158, 11, 0.06);
}
.dock-item:hover svg { transform: scale(1.10); color: #fbbf24; }
.dock-item.active {
  color: #fff; font-weight: 700;
  background: rgba(245, 158, 11, 0.10);
}
.dock-item.active svg { color: #fbbf24; }
.active-glow {
  position: absolute; bottom: -5px; left: 12px; right: 12px;
  height: 3px;
  background: linear-gradient(90deg, #f59e0b, #f97316, #fbbf24);
  background-size: 200% 100%;
  box-shadow: 0 -2px 14px rgba(249, 115, 22, 0.70);
  border-radius: 3px 3px 0 0;
  animation: tab-glow-flow 3s ease-in-out infinite, tab-enter 0.40s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes tab-glow-flow {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
@keyframes tab-enter {
  from { transform: scaleX(0.3); opacity: 0; }
  to { transform: scaleX(1); opacity: 1; }
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

.text-amber-warning { color: #f97316; }

/* ═════════ LIGHT THEME OVERRIDES ═════════════════════════════════════════ */
[data-theme="light"] .financials-page-container { color: var(--text-primary); }
[data-theme="light"] .glass-header {
  background: transparent;
  border-bottom-color: rgba(40, 25, 10, 0.10);
  backdrop-filter: blur(28px) saturate(180%);
  -webkit-backdrop-filter: blur(28px) saturate(180%);
}
[data-theme="light"] .glass-header::after {
  background: linear-gradient(90deg, transparent 0%, rgba(217, 119, 6, 0.40) 35%, rgba(180, 83, 9, 0.55) 50%, rgba(217, 119, 6, 0.40) 65%, transparent 100%);
  background-size: 200% 100%;
}
[data-theme="light"] .glass-header::before {
  background: radial-gradient(ellipse, rgba(217, 119, 6, 0.14), transparent 70%);
}
[data-theme="light"] .project-icon-box {
  background: linear-gradient(135deg, #d97706, #b45309);
  box-shadow:
    0 6px 18px rgba(217, 119, 6, 0.40),
    inset 0 1px 0 rgba(255, 255, 255, 0.40);
  color: #fff;
}
[data-theme="light"] .project-icon-box::before {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.45), rgba(180, 83, 9, 0.25));
}
[data-theme="light"] .identity-text label { color: #b45309; }
[data-theme="light"] .project-selector h1 {
  background: linear-gradient(135deg, #1a1410 30%, #b45309 100%);
  -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
}
[data-theme="light"] .chevron { color: #b45309; -webkit-text-fill-color: #b45309; }

/* Mini metric pill on light */
[data-theme="light"] .mini-metric {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(217, 119, 6, 0.22);
}
[data-theme="light"] .mini-metric:hover {
  background: rgba(217, 119, 6, 0.12);
  border-color: rgba(217, 119, 6, 0.40);
}
[data-theme="light"] .bar-container {
  background: rgba(40, 25, 10, 0.10);
  box-shadow: inset 0 1px 2px rgba(40, 25, 10, 0.08);
}
[data-theme="light"] .bar-fill {
  background: linear-gradient(90deg, #d97706, #b45309);
  box-shadow: 0 0 10px rgba(217, 119, 6, 0.40);
}
[data-theme="light"] .bar-fill::after {
  background: linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.55) 50%, transparent 100%);
}

/* Action button — golden gradient */
[data-theme="light"] .action-btn {
  background: linear-gradient(135deg, #d97706, #b45309);
  color: #fff;
  box-shadow: 0 6px 16px rgba(217, 119, 6, 0.32);
}
[data-theme="light"] .action-btn:hover {
  background: linear-gradient(135deg, #c2410c, #92400e);
  box-shadow: 0 10px 22px rgba(217, 119, 6, 0.45);
}

/* Tabs dock */
[data-theme="light"] .dock-item { color: #6b5840; }
[data-theme="light"] .dock-item:hover {
  color: #92400e;
  background: rgba(217, 119, 6, 0.08);
}
[data-theme="light"] .dock-item:hover svg { color: #b45309; }
[data-theme="light"] .dock-item.active {
  color: #92400e;
  background: rgba(217, 119, 6, 0.14);
}
[data-theme="light"] .dock-item.active svg { color: #b45309; }
[data-theme="light"] .active-glow {
  background: linear-gradient(90deg, #d97706, #b45309, #f59e0b);
  background-size: 200% 100%;
  box-shadow: 0 -2px 14px rgba(217, 119, 6, 0.55);
}
[data-theme="light"] .project-dropdown {
  /* Near-opaque cream — see comment on .project-dropdown above for why. */
  background: linear-gradient(180deg, rgba(255, 250, 240, 0.97) 0%, rgba(255, 246, 226, 0.98) 100%);
  border-color: rgba(217, 119, 6, 0.30);
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
  box-shadow:
    0 24px 70px rgba(40, 25, 10, 0.26),
    0 0 0 1px rgba(255, 255, 255, 0.55) inset,
    0 0 40px rgba(217, 119, 6, 0.12);
}
[data-theme="light"] .search-wrap {
  background: rgba(255, 250, 240, 0.55);
  border-color: rgba(217, 119, 6, 0.22);
}
[data-theme="light"] .search-wrap:focus-within {
  background: rgba(255, 246, 226, 0.92);
  border-color: rgba(217, 119, 6, 0.55);
  box-shadow: 0 0 0 3px rgba(217, 119, 6, 0.14);
}
[data-theme="light"] .search-wrap svg { color: rgba(217, 119, 6, 0.65); }
[data-theme="light"] .search-wrap input { color: var(--text-primary); }
[data-theme="light"] .search-wrap input::placeholder { color: rgba(26, 20, 16, 0.42); }
[data-theme="light"] .dropdown-scroll::-webkit-scrollbar-thumb { background: rgba(217, 119, 6, 0.30); }
[data-theme="light"] .dropdown-item { color: #6b5840; }
[data-theme="light"] .dropdown-item:hover {
  background: rgba(217, 119, 6, 0.10);
  color: var(--text-primary);
}
[data-theme="light"] .dropdown-item.active {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.18), rgba(249, 115, 22, 0.08));
  color: var(--text-primary);
  box-shadow: 0 0 0 1px rgba(217, 119, 6, 0.40) inset;
}
[data-theme="light"] .p-icon {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.18), rgba(180, 83, 9, 0.10));
  border-color: rgba(217, 119, 6, 0.32);
  color: #b45309;
}
[data-theme="light"] .dropdown-item.active .p-icon {
  background: linear-gradient(135deg, #d97706, #b45309);
  color: #fff;
}
[data-theme="light"] .p-check { color: #d97706; }
[data-theme="light"] .mini-metric .label { color: var(--text-tertiary); }
[data-theme="light"] .mini-metric .value { color: #d97706; }
[data-theme="light"] .action-btn { background: #d97706; color: #fff; }
[data-theme="light"] .dock-item { color: var(--text-tertiary); }
[data-theme="light"] .dock-item.active { color: var(--text-primary); }
[data-theme="light"] .empty-box h2 { color: var(--text-primary); }
[data-theme="light"] .empty-box p { color: var(--text-secondary); }

/* Header eyebrow + main title */
[data-theme="light"] .control-center-label,
[data-theme="light"] .financial-eyebrow { color: #b45309; font-weight: 700; }
[data-theme="light"] .project-selector { color: var(--text-primary); }

/* Tabs (Dashboard / Payments / Forecast / Ledger / Documents / Audit) */
[data-theme="light"] .tab-bar { border-bottom-color: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .tab-btn,
[data-theme="light"] .nav-tab,
[data-theme="light"] .financial-tab { color: var(--text-tertiary); }
[data-theme="light"] .tab-btn:hover,
[data-theme="light"] .nav-tab:hover { color: var(--text-primary); }
[data-theme="light"] .tab-btn.active,
[data-theme="light"] .nav-tab.active,
[data-theme="light"] .financial-tab.active { color: #92400e; }
[data-theme="light"] .tab-btn.active::after,
[data-theme="light"] .nav-tab.active::after,
[data-theme="light"] .financial-tab.active::after {
  background: linear-gradient(90deg, #d97706, #c2410c);
}

/* Stat / KPI cards: PROJECT BUDGET / ACTUAL SPEND / MILESTONE BUDGET / REMAINING BUDGET */
[data-theme="light"] .kpi-card,
[data-theme="light"] .stat-card,
[data-theme="light"] .budget-card,
[data-theme="light"] .metric-card {
  background: rgba(255, 250, 240, 0.78);
  border-color: rgba(40, 25, 10, 0.10);
  backdrop-filter: blur(16px) saturate(150%);
  -webkit-backdrop-filter: blur(16px) saturate(150%);
}
[data-theme="light"] .kpi-label,
[data-theme="light"] .budget-label,
[data-theme="light"] .metric-card .label,
[data-theme="light"] .kpi-card .label,
[data-theme="light"] .stat-card .label { color: #6b5840; font-weight: 700; }
[data-theme="light"] .kpi-value,
[data-theme="light"] .budget-value,
[data-theme="light"] .metric-card .value,
[data-theme="light"] .kpi-card .value,
[data-theme="light"] .stat-card .value { color: var(--text-primary); }
[data-theme="light"] .kpi-sub,
[data-theme="light"] .budget-sub,
[data-theme="light"] .kpi-card .sub { color: var(--text-secondary); }

/* Spend velocity widget */
[data-theme="light"] .velocity-card,
[data-theme="light"] .spend-velocity {
  background: rgba(255, 250, 240, 0.78);
  border-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .velocity-title { color: var(--text-primary); }
[data-theme="light"] .velocity-tab,
[data-theme="light"] .period-tab { color: var(--text-tertiary); }
[data-theme="light"] .velocity-tab.active,
[data-theme="light"] .period-tab.active {
  background: rgba(34, 197, 94, 0.12);
  color: #166534;
}
[data-theme="light"] .velocity-stat-label { color: #6b5840; }
[data-theme="light"] .velocity-stat-value { color: var(--text-primary); }
[data-theme="light"] .no-milestones-msg { color: var(--text-secondary); }

/* Budget allocation chart */
[data-theme="light"] .allocation-card,
[data-theme="light"] .budget-allocation {
  background: rgba(255, 250, 240, 0.78);
  border-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .allocation-title,
[data-theme="light"] .allocated-label { color: var(--text-primary); }
[data-theme="light"] .free-pill,
[data-theme="light"] .allocation-pill {
  background: rgba(34, 197, 94, 0.12);
  color: #166534;
  border-color: rgba(34, 197, 94, 0.30);
}
[data-theme="light"] .allocation-ring { stroke: rgba(40, 25, 10, 0.10); }
[data-theme="light"] .allocation-percentage { color: var(--text-primary); }
[data-theme="light"] .remaining-label { color: var(--text-secondary); }
[data-theme="light"] .remaining-amount { color: var(--text-primary); }

/* Budget vs Actual widget */
[data-theme="light"] .vs-actual-card,
[data-theme="light"] .budget-vs-actual {
  background: rgba(255, 250, 240, 0.78);
  border-color: rgba(40, 25, 10, 0.10);
}
[data-theme="light"] .under-budget-pill {
  background: rgba(34, 197, 94, 0.12);
  color: #166534;
  border-color: rgba(34, 197, 94, 0.30);
}
[data-theme="light"] .vs-actual-title { color: var(--text-primary); }

/* Generic widget text (catch-all) */
[data-theme="light"] .widget-title { color: var(--text-primary); }
[data-theme="light"] .widget-subtitle { color: var(--text-secondary); }

/* Budget Usage progress bar header */
[data-theme="light"] .budget-usage-label { color: #6b5840; }
[data-theme="light"] .budget-usage-value { color: var(--text-primary); }
</style>
