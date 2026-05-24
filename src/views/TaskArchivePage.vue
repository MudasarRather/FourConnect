<template>
  <div class="nano-page vault-archive">
    <!-- HEADER (Integrated with Nano DNA) -->
    <header class="nano-header archive-vault-header">
      <div class="nav-left">
        <div class="nano-tabs-dock archive-dock">
          <button class="n-tab active">
            <Archive :size="14" class="tab-icon"/> Task Vault
          </button>
          <div class="tab-separator"></div>
          <button class="n-tab" @click="$router.push('/user/tasks')">
            <ArrowLeft :size="14" class="tab-icon"/> Back to Active
          </button>
        </div>
      </div>
      
      <div class="nav-right">
        <div class="vault-status">
          <Lock :size="12" /> READ-ONLY RECORDS
        </div>
      </div>
    </header>

    <main class="vault-container">
      <!-- HERO: THE DUSTY RECORDS COUNTER -->
      <section class="vault-hero">
        <div class="hero-content">
          <div class="vault-icon-wrapper">
             <div class="vault-rings">
                <div class="ring-1"></div>
                <div class="ring-2"></div>
             </div>
             <Archive :size="48" class="main-vault-icon" />
          </div>
          <h1 class="vault-title">The Archive Vault</h1>
          <p class="vault-subtitle">Historical records of tasks completed over 180 days ago. Preserved for eternity.</p>
          
          <div class="vault-stats">
            <div class="stat-card">
              <span class="stat-val">{{ totalTasks }}</span>
              <span class="stat-label">Archived Documents</span>
            </div>
            <div class="stat-card">
              <span class="stat-val">{{ totalHours }}h</span>
              <span class="stat-label">Hours Preserved</span>
            </div>
          </div>
        </div>
      </section>

      <!-- SEARCH & FILTERS -->
      <div class="vault-controls">
         <div class="v-search-wrapper">
            <Search :size="16" class="v-search-icon" />
            <input 
              type="text" 
              v-model="searchQuery" 
              placeholder="Search dusty records by title or code..." 
              @input="debouncedFetch"
            />
         </div>
      </div>

      <!-- THE VOID: CONTENT AREA -->
      <div class="vault-void">
        <div v-if="isLoading" class="vault-loading">
          <div class="nano-spinner"></div>
          <span>Unlocking records...</span>
        </div>

        <div v-else-if="tasks.length === 0" class="vault-empty">
          <div class="empty-glass">
            <Library :size="40" />
            <h3>No records found</h3>
            <p>The vault is currently empty. Tasks will automatically shift here 6 months after completion.</p>
          </div>
        </div>

        <TransitionGroup 
          v-else 
          name="vault-list" 
          tag="div" 
          class="vault-grid"
        >
          <div 
            v-for="(task, i) in tasks" 
            :key="task.id" 
            class="vault-card"
            :style="{ '--delay': `${i * 0.05}s` }"
            @click="openDrawer(task)"
          >
            <div class="vc-glow"></div>
            <div class="vc-content">
              <div class="vc-top">
                <span class="vc-code">{{ task.task_code }}</span>
                <span class="vc-date">{{ formatDate(task.completed_at) }}</span>
              </div>
              <h3 class="vc-title">{{ task.title }}</h3>
              <p class="vc-desc">{{ task.description || 'No additional records available.' }}</p>
              
              <div class="vc-footer">
                <div class="vc-participants">
                  <div class="v-av" :title="task.assignee_name">{{ (task.assignee_name || 'U').charAt(0) }}</div>
                  <span class="v-name">{{ task.assignee_name || 'Unassigned' }}</span>
                </div>
                <div class="vc-hours" v-if="task.actual_hours">
                  {{ task.actual_hours }}h logged
                </div>
              </div>
            </div>
            <div class="vc-shimmer"></div>
          </div>
        </TransitionGroup>

        <!-- PAGINATION -->
        <div v-if="totalPages > 1" class="vault-pagination">
          <button @click="changePage(currentPage - 1)" :disabled="currentPage === 1" class="v-page-btn">
            <ChevronLeft :size="16" />
          </button>
          <span class="v-page-info">{{ currentPage }} / {{ totalPages }}</span>
          <button @click="changePage(currentPage + 1)" :disabled="currentPage === totalPages" class="v-page-btn">
            <ChevronRight :size="16" />
          </button>
        </div>
      </div>
    </main>

    <!-- DRAWER: PRESERVED DETAILS (GLASSMORPHISM) -->
    <Teleport to="body">
      <Transition name="vault-drawer">
        <div v-if="drawerOpen" class="vd-overlay" @click="closeDrawer">
          <div class="vd-panel glass-panel" @click.stop>
            <div class="vd-header">
               <div class="vd-h-type">ARCHIVED RECORD</div>
               <button class="vd-close" @click="closeDrawer"><X :size="20" /></button>
            </div>
            
            <div class="vd-body">
               <div class="vd-title-box">
                  <span class="vd-code">{{ selectedTask.task_code }}</span>
                  <div class="vd-proj-chip" v-if="selectedTask.project_name">
                     {{ selectedTask.project_name }}
                  </div>
                  <h2>{{ selectedTask.title }}</h2>
                  <div class="vd-status-pill">COMPLETED & ARCHIVED</div>
               </div>

               <div class="vd-stats-grid">
                  <div class="vd-stat">
                    <label>Module / Type</label>
                    <span>{{ selectedTask.module || 'General' }} / {{ selectedTask.task_type }}</span>
                  </div>
                  <div class="vd-stat">
                    <label>Priority</label>
                    <span :class="['priority-val', selectedTask.priority]">{{ selectedTask.priority }}</span>
                  </div>
                  <div class="vd-stat">
                    <label>Completed On</label>
                    <span>{{ formatDate(selectedTask.completed_at) }}</span>
                  </div>
                  <div class="vd-stat">
                    <label>Duration</label>
                    <span>{{ getDuration(selectedTask.start_date, selectedTask.completed_at) }}</span>
                  </div>
                  <div class="vd-stat">
                    <label>Assignee</label>
                    <div class="v-av-row">
                      <div class="v-av sm">{{ (selectedTask.assignee_name || 'U').charAt(0) }}</div>
                      <span>{{ selectedTask.assignee_name || 'Unassigned' }}</span>
                    </div>
                  </div>
                  <div class="vd-stat">
                    <label>Preserved Effort</label>
                    <span>{{ selectedTask.actual_hours || selectedTask.estimated_hours || 0 }} Hours Logged</span>
                  </div>
               </div>

               <div class="vd-section">
                  <label>Original Description</label>
                  <p>{{ selectedTask.description || 'No description provided.' }}</p>
               </div>

               <div class="vd-section" v-if="selectedTask.checklist?.length">
                  <label>Original Checklist Items</label>
                  <div class="vd-checklist">
                    <div v-for="(item, i) in selectedTask.checklist" :key="i" class="vd-cl-item">
                      <CheckCircle2 :size="14" class="done-icon" />
                      <span>{{ item.item_text }}</span>
                    </div>
                  </div>
               </div>

               <div class="vd-archive-meta">
                  <Info :size="14" />
                  <span>This task was moved to the vault on {{ formatDate(selectedTask.completed_at) }}. It is now in a read-only state for historical purposes, protecting the integrity of the record.</span>
               </div>
            </div>
            
            <div class="vd-footer">
               <button class="btn-vault-back" @click="closeDrawer">Close Record</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import { 
  Archive, Lock, ArrowLeft, Search, Library, ChevronLeft, ChevronRight,
  X, CheckCircle2, Info, Clock, CheckCircle
} from 'lucide-vue-next'

const tasks = ref([])
const totalTasks = ref(0)
const totalHours = ref(0)
const isLoading = ref(false)
const searchQuery = ref('')
const currentPage = ref(1)
const totalPages = ref(1)

const drawerOpen = ref(false)
const selectedTask = ref({})

const API = 'http://localhost:8000/api'
const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem('user_token') || localStorage.getItem('admin_token')}`
})

const fetchArchived = async () => {
  isLoading.value = true
  try {
    const res = await axios.get(`${API}/tasks/`, {
      headers: getHeaders(),
      params: {
        scope: 'archived',
        search: searchQuery.value,
        page: currentPage.value,
        limit: 12
      }
    })
    tasks.value = res.data.items || []
    totalTasks.value = res.data.total || 0
    totalPages.value = res.data.pages || 1
    
    // Sum hours as a fun stat
    totalHours.value = tasks.value.reduce((acc, t) => acc + (parseFloat(t.actual_hours) || 0), 0)
  } catch (err) {
    console.error('Failed to fetch vault:', err)
  } finally {
    isLoading.value = false
  }
}

let debounceTimer = null
const debouncedFetch = () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    currentPage.value = 1
    fetchArchived()
  }, 400)
}

const changePage = (p) => {
  currentPage.value = p
  fetchArchived()
}

const openDrawer = (task) => {
  selectedTask.value = task
  drawerOpen.value = true
}

const closeDrawer = () => {
  drawerOpen.value = false
}

const formatDate = (d) => {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const getDuration = (start, end) => {
  if (!start || !end) return 'Unknown'
  const s = new Date(start)
  const e = new Date(end)
  const diff = Math.abs(e - s)
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  return `${days} Days`
}

onMounted(() => {
  fetchArchived()
})
</script>

<style scoped>
.vault-archive {
  min-height: 100vh;
  /* background: #09090b; */ /* Use global background */
  color: #fff;
  overflow: hidden; /* Ensure container handles all scroll */
}

/* Header UI - Standard Nano DNA */
.archive-vault-header {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 40px;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-left {
  display: flex;
}

.nano-tabs-dock {
  display: flex;
  background: rgba(255, 255, 255, 0.03);
  padding: 4px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  align-items: center;
}

.n-tab {
  background: transparent;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.5);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.n-tab.active {
  background: rgba(250, 204, 21, 0.1);
  color: #facc15;
}

.tab-separator {
  width: 1px;
  height: 16px;
  background: rgba(255, 255, 255, 0.1);
  margin: 0 4px;
}

.vault-status {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: #facc15;
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(250, 204, 21, 0.1);
  padding: 6px 12px;
  border-radius: 20px;
  border: 1px solid rgba(250, 204, 21, 0.2);
}

/* Content Grid */
.vault-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 40px;
  height: calc(100vh - 64px); /* Subtract header */
  display: flex;
  flex-direction: column;
  overflow: hidden; /* Prevent body scroll */
}

.vault-hero {
  flex-shrink: 0;
  padding: 40px 20px 30px; /* Reduced padding */
  text-align: center;
  background: radial-gradient(circle at center, rgba(250, 204, 21, 0.08) 0%, transparent 70%);
}

.vault-controls {
  flex-shrink: 0;
  margin-bottom: 40px;
  display: flex;
  justify-content: center;
}

.vault-void {
  flex: 1;
  overflow-y: auto;
  padding: 10px 20px 100px 0; /* Huge bottom padding to ensure cards are clear of pagination */
  margin-bottom: 0;
  /* Scrollbar Styling */
  scrollbar-width: auto; /* Standard width */
  scrollbar-color: #facc15 rgba(255, 255, 255, 0.05); /* Brighter thumb and visible track */
}

.vault-void::-webkit-scrollbar { width: 10px; } /* Wider scrollbar */
.vault-void::-webkit-scrollbar-track { background: rgba(255, 255, 255, 0.03); border-radius: 10px; }
.vault-void::-webkit-scrollbar-thumb { 
  background: #facc15; 
  border-radius: 10px;
  border: 2px solid #09090b; /* Contrast edge */
}

.vault-icon-wrapper {
  position: relative;
  width: 100px;
  height: 100px;
  margin: 0 auto 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.main-vault-icon {
  color: #facc15;
  filter: drop-shadow(0 0 15px rgba(250, 204, 21, 0.4));
  z-index: 2;
}

.vault-rings {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ring-1, .ring-2 {
  position: absolute;
  border: 1px solid rgba(250, 204, 21, 0.2);
  border-radius: 50%;
  animation: ring-pulse 4s infinite ease-in-out;
}

.ring-1 { width: 80%; height: 80%; }
.ring-2 { width: 120%; height: 120%; animation-delay: 2s; }

@keyframes ring-pulse {
  0%, 100% { transform: scale(1); opacity: 0.2; }
  50% { transform: scale(1.1); opacity: 0.5; }
}

.vault-title {
  font-size: 48px;
  font-weight: 900;
  letter-spacing: -0.04em;
  margin-bottom: 12px;
  background: linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.6) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.vault-subtitle {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.5);
  max-width: 500px;
  margin: 0 auto 40px;
}

.vault-stats {
  display: flex;
  justify-content: center;
  gap: 24px;
}

.stat-card {
  background: rgba(255, 255, 255, 0.03);
  padding: 20px 32px;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-val { font-size: 24px; font-weight: 800; color: #fff; }
.stat-label { font-size: 12px; color: rgba(255, 255, 255, 0.4); text-transform: uppercase; letter-spacing: 0.05em; }

.v-search-wrapper {
  position: relative;
  width: 100%;
  max-width: 600px;
}

.v-search-icon {
  position: absolute;
  left: 20px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.3);
}

.v-search-wrapper input {
  width: 100%;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 40px;
  padding: 16px 20px 16px 52px;
  color: #fff;
  font-size: 15px;
  outline: none;
  transition: all 0.3s;
}

.v-search-wrapper input:focus {
  background: rgba(255, 255, 255, 0.06);
  border-color: #facc15;
  box-shadow: 0 0 20px rgba(250, 204, 21, 0.15);
}

.vault-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

.vault-card {
  position: relative;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  padding: 24px;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  opacity: 0;
  animation: vault-pop 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  animation-delay: var(--delay);
}

@keyframes vault-pop {
  from { opacity: 0; transform: translateY(20px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.vault-card:hover {
  transform: translateY(-8px) scale(1.02);
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(250, 204, 21, 0.3);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
}

.vc-top {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.vc-code {
  font-size: 11px;
  font-weight: 700;
  color: #facc15;
  padding: 4px 10px;
  background: rgba(250, 204, 21, 0.1);
  border-radius: 6px;
  letter-spacing: 0.05em;
}

.vc-date {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.vc-title {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 12px;
  color: #fff;
}

.vc-desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.6;
  margin-bottom: 24px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.vc-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.vc-participants {
  display: flex;
  align-items: center;
  gap: 8px;
}

.v-av {
  width: 28px;
  height: 28px;
  background: linear-gradient(135deg, #facc15, #b45309);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 800;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #000;
}

.v-name { font-size: 12px; color: rgba(255, 255, 255, 0.7); font-weight: 500; }
.vc-hours { font-size: 11px; color: rgba(255, 255, 255, 0.4); }

/* Shimmer & Glow FX */
.vc-shimmer {
  position: absolute;
  top: 0; left: -100%;
  width: 50%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.03), transparent);
  transition: left 0.5s;
}

.vault-card:hover .vc-shimmer { left: 150%; }

/* Glassmorphism Drawer */
.vd-overlay {
  position: fixed; inset: 0; z-index: 1000;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(8px);
  display: flex; justify-content: flex-end;
}

.vd-panel.glass-panel {
  width: 500px;
  height: 100%;
  background: rgba(15, 15, 18, 0.8);
  backdrop-filter: blur(40px);
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  box-shadow: -20px 0 50px rgba(0, 0, 0, 0.5);
}

.vd-header {
  padding: 32px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.vd-h-type {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.3);
}

.vd-close {
  background: none; border: none; color: #fff; opacity: 0.4;
  cursor: pointer; padding: 8px; border-radius: 50%;
  transition: all 0.3s;
}

.vd-close:hover { opacity: 1; background: rgba(255,255,255,0.05); }

.vd-body {
  flex: 1;
  padding: 40px;
  overflow-y: auto;
}

.vd-title-box { margin-bottom: 40px; }
.vd-proj-chip {
  display: inline-block;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  margin: 12px 0;
}

.vd-title-box h2 { font-size: 28px; font-weight: 800; margin: 8px 0 16px; letter-spacing: -0.02em; }
.vd-status-pill {
  display: inline-block;
  padding: 6px 12px;
  background: rgba(74, 222, 128, 0.1);
  color: #4ade80;
  font-size: 11px;
  font-weight: 800;
  border-radius: 6px;
}

.vd-stats-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 40px;
}

.vd-stat label { font-size: 11px; color: rgba(255, 255, 255, 0.3); text-transform: uppercase; display: block; margin-bottom: 6px; }
.vd-stat span { font-size: 15px; color: #fff; font-weight: 500; }

.priority-val.high { color: #ef4444; }
.priority-val.medium { color: #facc15; }
.priority-val.low { color: #4ade80; }

.v-av-row { display: flex; align-items: center; gap: 10px; }
.v-av.sm { width: 24px; height: 24px; font-size: 9px; }

.vd-section { margin-bottom: 32px; }
.vd-section label { font-size: 11px; color: rgba(255, 255, 255, 0.3); text-transform: uppercase; display: block; margin-bottom: 12px; }
.vd-section p { font-size: 15px; line-height: 1.7; color: rgba(255, 255, 255, 0.8); }

.vd-checklist { display: flex; flex-direction: column; gap: 12px; }
.vd-cl-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 12px;
  font-size: 14px;
}

.done-icon { color: #4ade80; }

.vd-archive-meta {
  margin-top: 60px;
  padding: 20px;
  background: rgba(250, 204, 21, 0.05);
  border-radius: 16px;
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  line-height: 1.5;
}

.vd-footer {
  padding: 32px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.btn-vault-back {
  width: 100%;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  border-radius: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-vault-back:hover { background: rgba(255, 255, 255, 0.08); border-color: #facc15; }

/* Pagination Styling */
.vault-pagination {
  flex-shrink: 0;
  margin-top: auto;
  padding: 20px 0 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.v-page-btn {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.3s;
}

.v-page-btn:hover:not(:disabled) {
  background: rgba(250, 204, 21, 0.1);
  border-color: #facc15;
  color: #facc15;
}

.v-page-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.v-page-info {
  font-size: 14px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
}

/* Transitions */
.vault-drawer-enter-active, .vault-drawer-leave-active { transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1); }
.vault-drawer-enter-from, .vault-drawer-leave-to { transform: translateX(100%); }

/* Spinner */
.nano-spinner {
  width: 24px; height: 24px;
  border: 2px solid rgba(250, 204, 21, 0.1);
  border-top-color: #facc15;
  border-radius: 50%;
  animation: nano-spin 0.8s linear infinite;
  margin: 0 auto 12px;
}
@keyframes nano-spin { to { transform: rotate(360deg); } }

/* Empty State */
.vault-empty {
  padding: 100px 0;
  text-align: center;
}

.empty-glass {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  padding: 60px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 40px;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.empty-glass h3 { font-size: 20px; font-weight: 700; margin: 0; }
.empty-glass p { color: rgba(255, 255, 255, 0.4); max-width: 300px; font-size: 14px; line-height: 1.6; }

/* Responsive */
@media (max-width: 768px) {
  .vault-title { font-size: 32px; }
  .vault-stats { flex-direction: column; align-items: center; }
  .vd-panel.glass-panel { width: 100%; }
}

/* ═════════ LIGHT THEME OVERRIDES ═════════════════════════════════════════ */
[data-theme="light"] .vault-archive { color: var(--text-primary); }
[data-theme="light"] .archive-vault-header {
  background: rgba(26, 20, 16, 0.05);
  border-bottom-color: rgba(26, 20, 16, 0.10);
}
[data-theme="light"] .n-tab { color: var(--text-secondary); }
[data-theme="light"] .n-tab.active {
  background: rgba(217, 119, 6, 0.10);
  color: #92400e;
}
[data-theme="light"] .vault-status {
  color: #92400e;
  background: rgba(217, 119, 6, 0.10);
  border-color: rgba(217, 119, 6, 0.20);
}
[data-theme="light"] .vault-title {
  background: none;
  -webkit-text-fill-color: unset;
  color: var(--text-primary);
}
[data-theme="light"] .vault-subtitle { color: var(--text-secondary); }
[data-theme="light"] .stat-val { color: var(--text-primary); }
[data-theme="light"] .stat-label { color: #6b5840; }
[data-theme="light"] .vc-title { color: var(--text-primary); }
[data-theme="light"] .vc-desc { color: var(--text-secondary); }
[data-theme="light"] .v-name { color: var(--text-primary); }
[data-theme="light"] .vd-title-box h2 { color: var(--text-primary); }
[data-theme="light"] .vd-stat label { color: var(--text-tertiary); }
[data-theme="light"] .vd-stat span { color: var(--text-primary); }
</style>
