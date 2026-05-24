<template>
  <div ref="pageRoot" class="completed-projects-page">
    <div class="page-header" data-anim="page-header">
      <div class="header-left">
        <h1>Completed Projects</h1>
        <p class="subtitle">Showcase of successfully delivered initiatives</p>
      </div>
      <div class="header-right">
        <!-- Optional Actions -->
      </div>
    </div>

    <!-- Search/Filter -->
    <div class="filter-bar" data-anim="filter-bar">
      <div class="search-box">
         <Search :size="16" class="search-icon" />
         <input type="text" v-model="searchQuery" placeholder="Search completed projects..." />
      </div>
      <div class="stats-pill">
        <CheckCircle2 :size="14" class="success-icon" />
        <span>{{ filteredProjects.length }} Projects Delivered</span>
      </div>
    </div>

    <!-- Loading -->
    <div v-if="isLoading" class="loading-state">
      <Loader2 :size="32" class="spin" />
      <p>Loading achievements...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredProjects.length === 0" class="empty-state">
       <div class="empty-icon-wrapper">
         <Award :size="48" class="empty-icon" />
       </div>
       <h3>No completed projects yet</h3>
       <p>Projects will appear here when they reach 100% completion.</p>
    </div>

    <!-- Grid -->
    <div v-else class="project-grid">
      <div
        v-for="project in filteredProjects"
        :key="project.id"
        class="project-card-glass"
        data-anim="completed-card"
        v-tilt="{ max: 6 }"
        @click="viewProject(project)"
      >
         <div class="card-content">
            <!-- Header: Icon + Status -->
            <div class="card-top">
               <div class="icon-box-glass">
                  <span class="initials">{{ getInitials(project.project_name) }}</span>
               </div>
               <div class="status-pill-compact success-glass">
                  <CheckCircle2 :size="10" />
                  <span>100%</span>
               </div>
            </div>

            <!-- Title & Code -->
            <div class="project-identity">
               <h3 class="title">{{ project.project_name }}</h3>
               <span class="project-code-glass" v-if="project.code">{{ project.code }}</span>
               <div class="govt-chips-row" v-if="project.category || project.priority">
                  <span class="g-chip cat" v-if="project.category">{{ project.category }}</span>
                  <span class="g-chip prio" :class="`prio-${(project.priority || 'low').toLowerCase()}`" v-if="project.priority">
                    <span class="g-prio-dot"></span> {{ project.priority }}
                  </span>
               </div>
            </div>

            <p class="desc">{{ truncate(project.description, 80) }}</p>

            <!-- Metrics Grid -->
            <div class="metrics-grid">
               <div class="metric-item">
                  <span class="label">BUDGET USED</span>
                  <span class="value">{{ formatCurrency(project.budget_utilized, project.currency) }}</span>
               </div>
               <div class="metric-item">
                  <span class="label">TIMELINE</span>
                  <span class="value">{{ getDuration(project.start_date, project.end_date) }}</span>
               </div>
            </div>
            
            <!-- Completion Date -->
             <div class="date-row">
                <span class="label">COMPLETED</span>
                <span class="date-value">{{ formatDate(project.completed_at || project.updated_at) }}</span>
            </div>

            <div class="separator-glass"></div>

            <!-- Footer: Owner -->
            <div class="card-footer">
               <div class="owner-info">
                  <div class="avatar-glass" :title="project.created_by_name">
                    {{ getInitials(project.created_by_name || 'User') }}
                  </div>
                  <span class="owner-name">{{ project.created_by_name || 'Unknown' }}</span>
               </div>
               <div class="view-action">
                  <ArrowRight :size="14" />
               </div>
            </div>
            
            <!-- Decorative Gradient Blob -->
            <div class="glass-blob"></div>
         </div>
      </div>
    </div>

    <!-- View Modal (Reusing existing component) -->
    <ProjectEditModal
      :is-open="isModalOpen"
      :project="selectedProject"
      mode="view"
      customStatusLabel="Completed"
      @close="closeModal"
    />

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import { Search, Loader2, Award, CheckCircle2, Calendar, ArrowRight } from 'lucide-vue-next'
import { useToast } from '../composables/useToast'
import ProjectEditModal from '../components/projects/ProjectEditModal.vue'
import { useGsapAnim } from '../composables/useGsapAnim'
import { completedProjectsEntry } from '../animations/pageChoreography'

const pageRoot = ref(null)

const { error } = useToast()

const projects = ref([])
const isLoading = ref(true)
const searchQuery = ref('')
const isModalOpen = ref(false)
const selectedProject = ref(null)

// Filtering
const filteredProjects = computed(() => {
  let result = projects.value.filter(p => {
    const pct = Number(p.completion_percentage)
    return !isNaN(pct) && pct >= 100
  })
  
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(p => 
      (p.project_name || '').toLowerCase().includes(q) || 
      (p.description && p.description.toLowerCase().includes(q))
    )
  }
  return result
})

const fetchProjects = async () => {
  isLoading.value = true
  try {
     const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token')
     if (!token) return

     // Fetch ALL projects to filter client-side 
     const response = await axios.get('http://localhost:8000/api/projects/', {
       headers: { Authorization: `Bearer ${token}` },
       params: { limit: 100 } 
     })
     
     // The API returns { items: [], ... }
     projects.value = (response.data.items || []).map(p => ({
        ...p,
        project_name: p.name || p.project_name, 
        budget_utilized: p.budget_utilized || 0,
        budget_amount: p.budget_amount || 0,
        completion_percentage: p.completion_percentage || 0,
        description: p.description || '',
        code: p.code || '',
        created_by_name: p.created_by_name || 'Unknown'
     }))


     
  } catch (e) {
    console.error(e)
    error('Failed to load completed projects')
  } finally {
    isLoading.value = false
  }
}

const viewProject = (project) => {
  selectedProject.value = project
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  selectedProject.value = null
}

// Helpers
const getSymbol = (curr) => {
   const map = { 'USD': '$', 'EUR': '€', 'GBP': '£', 'INR': '₹', 'JPY': '¥' }
   return map[curr] || '$'
}

const formatCurrency = (amount, currency) => {
  const symbols = { 'USD': '$', 'EUR': '€', 'GBP': '£', 'INR': '₹' }
  return `${symbols[currency] || '$'}${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}


const getInitials = (name) => name ? name.substring(0, 2).toUpperCase() : 'PR'
const truncate = (text, len) => text && text.length > len ? text.substring(0, len) + '...' : text

const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
const getDuration = (start, end) => {
   if (!start || !end) return '-'
   const s = new Date(start)
   const e = new Date(end)
   const diffTime = Math.abs(e - s)
   const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
   return `${diffDays} days`
}

const { run } = useGsapAnim(pageRoot)
run(() => { completedProjectsEntry(pageRoot.value) })

onMounted(() => {
  fetchProjects()
})
</script>

<style scoped>
.completed-projects-page {
  width: 100%;
  padding-bottom: 60px;
}

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
  background: rgba(245, 158, 11, 0.10);
  border: 1px solid rgba(245, 158, 11, 0.25);
  border-radius: 20px;
  color: #fbbf24;
  font-size: 13px;
  font-weight: 600;
}
.success-icon { color: #fbbf24; }

/* Grid */
.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 24px;
}

/* GLASSMORPHISM CARD DESIGN */
.project-card-glass {
  /* Ultra-premium glass effect */
  background: rgba(30, 30, 35, 0.5); /* Semi-transparent dark */
  backdrop-filter: blur(24px); /* Heavy Blur */
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2); /* Deep shadow */
  
  border-radius: 24px;
  padding: 28px;
  position: relative;
  overflow: hidden;
  cursor: pointer;
  
  transition: all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.project-card-glass:hover {
  transform: translateY(-6px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(245, 158, 11, 0.18);
  background: rgba(40, 40, 45, 0.6);
  border-color: rgba(245, 158, 11, 0.32);
}

/* Trophy "gold gleam" — single diagonal sweep on hover */
.project-card-glass::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent 35%, rgba(255, 230, 170, 0.14) 50%, transparent 65%);
  transform: translate(-100%, -100%) rotate(0deg);
  pointer-events: none;
  transition: transform 0.9s cubic-bezier(0.16, 1, 0.3, 1);
  border-radius: 24px;
  z-index: 3;
}
.project-card-glass:hover::after {
  transform: translate(100%, 100%) rotate(0deg);
}

/* Stats-pill entry gleam (toggled by JS for one-shot) */
.stats-pill.trophy-gleam {
  position: relative;
  overflow: hidden;
}
.stats-pill.trophy-gleam::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent 35%, rgba(255, 255, 255, 0.32) 50%, transparent 65%);
  transform: translateX(-100%);
  animation: pillSweepOnce 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
@keyframes pillSweepOnce {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

/* Card Header */
.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  position: relative; z-index: 2;
}

/* Glassy Icon Box */
.icon-box-glass {
  width: 44px; height: 44px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.1);
  box-shadow: inset 0 0 12px rgba(255,255,255,0.05);
}
.initials { font-weight: 700; font-size: 15px; color: #fff; }

/* Compact Status Pill */
.status-pill-compact {
  display: flex; align-items: center; gap: 6px;
  padding: 4px 10px; border-radius: 20px;
  font-size: 11px; font-weight: 700;
  letter-spacing: 0.02em;
}
.success-glass {
    background: rgba(245, 158, 11, 0.12);
    color: #fbbf24;
    border: 1px solid rgba(245, 158, 11, 0.30);
    box-shadow: 0 0 10px rgba(245, 158, 11, 0.18);
}

/* Identity */
.project-identity { margin-bottom: 8px; position: relative; z-index: 2; }

.title {
  font-size: 19px; font-weight: 700; color: #fff; margin-bottom: 6px; letter-spacing: -0.01em;
}

.project-code-glass {
  font-size: 10px; color: rgba(255,255,255,0.5); 
  background: rgba(255,255,255,0.03); padding: 3px 6px; border-radius: 6px;
  font-family: 'SF Mono', monospace; letter-spacing: 0.05em; border: 1px solid rgba(255,255,255,0.05);
  display: inline-block; margin-bottom: 12px;
}

.desc {
  font-size: 13px; color: #a1a1aa; line-height: 1.5; margin-bottom: 28px;
  min-height: 40px; position: relative; z-index: 2;
}

/* Metrics */
.metrics-grid {
    display: grid; grid-template-columns: 1fr 1fr; gap: 24px;
    margin-bottom: 16px; position: relative; z-index: 2;
}

.date-row {
  margin-bottom: 28px;
  display: flex; flex-direction: column; gap: 4px; position: relative; z-index: 2;
}

.metric-item, .date-row { display: flex; flex-direction: column; gap: 6px; }

.label { 
    font-size: 10px; color: rgba(255,255,255,0.4); text-transform: uppercase; 
    font-weight: 700; letter-spacing: 0.05em; 
}

.value, .date-value { 
    font-size: 16px; font-weight: 600; color: #f4f4f5; 
    letter-spacing: -0.01em; 
}

/* Footer & Separator */
.separator-glass {
    height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent); 
    width: 100%; margin-bottom: 20px;
}

.card-footer {
    display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 2;
}

.owner-info { display: flex; align-items: center; gap: 10px; }

.avatar-glass {
  width: 28px; height: 28px; border-radius: 50%;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 700; color: #e4e4e7;
}
.owner-name { font-size: 12px; color: #a1a1aa; font-weight: 500; }

.view-action { color: #52525b; transition: color 0.3s; }
.project-card-glass:hover .view-action { color: #fff; }

/* Decoration - Glass Blob */
.glass-blob {
  position: absolute; right: -80px; top: -80px;
  width: 200px; height: 200px; border-radius: 50%;
  background: radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 60%);
  filter: blur(40px);
  pointer-events: none; z-index: 1;
}

/* Empty State */
.empty-state { text-align: center; padding: 80px 0; color: #71717a; }
.empty-icon-wrapper {
  width: 80px; height: 80px; background: rgba(255, 255, 255, 0.03);
  border-radius: 50%; margin: 0 auto 24px;
  display: flex; align-items: center; justify-content: center;
}
.empty-icon { opacity: 0.4; }
.loading-state { text-align: center; padding: 60px; color: #71717a; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }

/* Government-aware chips inside completed-project cards (additive, non-disruptive) */
.govt-chips-row { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 6px; }
.g-chip {
  display: inline-flex; align-items: center; gap: 5px;
  font-size: 9px; font-weight: 700; letter-spacing: 0.04em;
  padding: 3px 9px; border-radius: 999px;
  white-space: nowrap; max-width: 160px; overflow: hidden; text-overflow: ellipsis;
}
.g-chip.cat {
  background: rgba(59, 130, 246, 0.10); color: #93c5fd;
  border: 1px solid rgba(59, 130, 246, 0.22);
}
.g-chip.prio .g-prio-dot { width: 6px; height: 6px; border-radius: 50%; }
.g-chip.prio.prio-high { background: rgba(217, 119, 6, 0.12); color: #fdba74; border: 1px solid rgba(217, 119, 6, 0.32); }
.g-chip.prio.prio-high .g-prio-dot { background: #d97706; box-shadow: 0 0 6px rgba(217, 119, 6, 0.7); }
.g-chip.prio.prio-medium { background: rgba(251, 191, 36, 0.10); color: #fde68a; border: 1px solid rgba(251, 191, 36, 0.30); }
.g-chip.prio.prio-medium .g-prio-dot { background: #fbbf24; }
.g-chip.prio.prio-low { background: rgba(245, 158, 11, 0.10); color: #fde68a; border: 1px solid rgba(245, 158, 11, 0.28); }
.g-chip.prio.prio-low .g-prio-dot { background: #facc15; }

/* ═════════ LIGHT THEME OVERRIDES ═════════════════════════════════════════ */
[data-theme="light"] .completed-projects-page { color: var(--text-primary); }
[data-theme="light"] .header-left h1 {
  background: linear-gradient(135deg, #1a1410 0%, #92400e 100%);
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
[data-theme="light"] .search-box input:focus {
  border-color: rgba(217, 119, 6, 0.30);
  background: rgba(217, 119, 6, 0.05);
}
[data-theme="light"] .stats-pill {
  background: rgba(217, 119, 6, 0.08);
  border-color: rgba(217, 119, 6, 0.20);
  color: #92400e;
}
/* Card surface — match dark mode's translucency (50% + heavy blur) */
[data-theme="light"] .project-card-glass {
  background: rgba(255, 250, 240, 0.50);
  border: 1px solid rgba(217, 119, 6, 0.18);
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  box-shadow:
    0 8px 32px rgba(40, 25, 10, 0.10),
    inset 0 1px 0 rgba(255, 255, 255, 0.50);
}
[data-theme="light"] .project-card-glass:hover {
  background: rgba(255, 246, 226, 0.65);
  border-color: rgba(217, 119, 6, 0.40);
  box-shadow:
    0 20px 50px rgba(40, 25, 10, 0.18),
    0 0 0 1px rgba(217, 119, 6, 0.28),
    inset 0 1px 0 rgba(255, 255, 255, 0.60);
}

/* Gold gleam sweep — keep visible on cream */
[data-theme="light"] .project-card-glass::after {
  background: linear-gradient(120deg, transparent 35%, rgba(217, 119, 6, 0.18) 50%, transparent 65%);
}

/* Glass blob decoration */
[data-theme="light"] .glass-blob {
  background: radial-gradient(circle, rgba(217, 119, 6, 0.10) 0%, transparent 60%);
}

/* Header: icon box + status pill */
[data-theme="light"] .icon-box-glass {
  background: rgba(217, 119, 6, 0.14);
  border-color: rgba(217, 119, 6, 0.32);
  box-shadow: inset 0 0 12px rgba(217, 119, 6, 0.10);
}
[data-theme="light"] .initials { color: #92400e; }

[data-theme="light"] .success-glass {
  background: rgba(217, 119, 6, 0.16);
  color: #92400e;
  border-color: rgba(217, 119, 6, 0.40);
  box-shadow: 0 0 10px rgba(217, 119, 6, 0.18);
}

/* Identity */
[data-theme="light"] .title { color: var(--text-primary); }
[data-theme="light"] .project-code-glass {
  color: #92400e;
  background: rgba(217, 119, 6, 0.10);
  border-color: rgba(217, 119, 6, 0.28);
}
[data-theme="light"] .desc { color: #6b5840; }

/* Metrics + dates */
[data-theme="light"] .label { color: #b45309; font-weight: 700; }
[data-theme="light"] .value,
[data-theme="light"] .date-value { color: var(--text-primary); }

/* Separator */
[data-theme="light"] .separator-glass {
  background: linear-gradient(90deg, transparent, rgba(40, 25, 10, 0.18), transparent);
}

/* Footer: avatar + owner + view-action */
[data-theme="light"] .avatar-glass {
  background: linear-gradient(135deg, rgba(217, 119, 6, 0.22), rgba(217, 119, 6, 0.10));
  border-color: rgba(217, 119, 6, 0.32);
  color: #92400e;
}
[data-theme="light"] .owner-name { color: #6b5840; }
[data-theme="light"] .view-action { color: #92400e; }
[data-theme="light"] .project-card-glass:hover .view-action { color: #b45309; }

/* Empty / loading states */
[data-theme="light"] .empty-state { color: #92400e; }
[data-theme="light"] .empty-state h3 { color: var(--text-primary); }
[data-theme="light"] .empty-state p { color: #6b5840; }
[data-theme="light"] .empty-icon-wrapper {
  background: rgba(217, 119, 6, 0.10);
}
[data-theme="light"] .loading-state { color: #92400e; }

/* Government chip — category was BLUE (off-palette); recolor to amber */
[data-theme="light"] .g-chip.cat {
  background: rgba(217, 119, 6, 0.10);
  color: #92400e;
  border-color: rgba(217, 119, 6, 0.32);
}

/* Status & priority pills get cream-readable variants — gold accent stays */
[data-theme="light"] .g-chip.prio.prio-high {
  background: rgba(220, 38, 38, 0.10); color: #991b1b;
  border-color: rgba(220, 38, 38, 0.32);
}
[data-theme="light"] .g-chip.prio.prio-medium {
  background: rgba(217, 119, 6, 0.14); color: #92400e;
  border-color: rgba(217, 119, 6, 0.32);
}
[data-theme="light"] .g-chip.prio.prio-low {
  background: rgba(217, 119, 6, 0.10); color: #92400e;
  border-color: rgba(217, 119, 6, 0.28);
}
</style>
