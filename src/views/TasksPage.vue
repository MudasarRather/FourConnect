<template>
  <div class="nano-page">
    <!-- HEADER (Integrated with the Nano background) -->
    <header class="nano-header">
      <div class="nav-left">
        <div class="nano-tabs-dock">
          <button class="n-tab" :class="{ active: activeTab === 'dashboard' }" @click="activeTab = 'dashboard'">
            <LayoutGrid :size="14" class="tab-icon"/> Dashboard
          </button>
          <div class="tab-separator"></div>
          <button class="n-tab" :class="{ active: activeTab === 'all' }" @click="activeTab = 'all'">
            <LayoutList :size="14" class="tab-icon"/> All tasks
          </button>
          <button class="n-tab" :class="{ active: activeTab === 'my' }" @click="activeTab = 'my'">
            <CheckSquare :size="14" class="tab-icon"/> My tasks
          </button>
        </div>
      </div>
      
      <div class="nav-right">
      </div>
    </header>

    <!-- DASHBOARD TAB (NANO BANANA EXACT LAYOUT) -->
    <main class="nano-dashboard" v-if="activeTab === 'dashboard'">
      <!-- NEW LAYOUT: 
           Left: Tasks & Upcoming (col-mid)
           Right: New Task & Performance (col-right)
      -->
      
      <!-- ROW 1: Left = Tasks & Upcoming (mid-top), Right = New Task (hero-card) -->
      <!-- ROW 1: Tasks, Upcoming & New Task (Hero) -->
      <!-- Tasks Card -->
      <div class="n-card tasks-card">
        <div class="tc-header">
          <h2>Tasks</h2>
          <div class="tc-h-actions" style="display:flex; flex-direction:column; align-items:flex-end; gap:8px;">
            <button class="check-text" @click="handleDashboardCompleteTask"><CheckSquare :size="12" /> Mark as completed</button>
          </div>
        </div>
          
        <!-- Assignee Avatar Top Level (No pill background) -->
        <div class="tc-av-wrapper" v-if="dashboardSelectedTask" style="display: flex; justify-content: space-between; align-items: flex-end;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="tc-av" v-if="dashboardSelectedTask.assignee_avatar" style="background: transparent; padding: 0;">
                <img :src="dashboardSelectedTask.assignee_avatar" />
            </div>
            <div class="tc-av-circle" style="background: #8758FF; color: white;" v-else-if="dashboardSelectedTask.assignee_name">
                {{ dashboardSelectedTask.assignee_name.substring(0,2).toUpperCase() }}
            </div>
            <div class="tc-av-circle" style="background: rgba(255,255,255,0.1); color: white;" v-else>
                U
            </div>
          </div>

          <div class="tc-actions" style="display:flex; gap:8px; padding-bottom: 2px;">
             <button class="icon-tab-btn" style="background: rgba(135, 88, 255, 0.2); border: 1px solid #8758FF;" @click="prevDashboardTask"><ChevronLeft :size="14"/></button>
             <button class="icon-tab-btn" style="background: rgba(135, 88, 255, 0.2); border: 1px solid #8758FF;" @click="nextDashboardTask"><ChevronRight :size="14"/></button>
          </div>
        </div>
        
        <div class="task-draggable-list" v-if="dashboardSelectedTask">
          <!-- Task Item 1 -->
          <div class="n-task-item">
             <div class="nti-header">
               <!-- Creator Avatar -->
               <img v-if="dashboardSelectedTask.creator_avatar" :src="dashboardSelectedTask.creator_avatar" class="nti-av" />
               <div v-else-if="dashboardSelectedTask.creator_name" class="nti-av ntic-av" style="width: 32px; height: 32px;">{{ dashboardSelectedTask.creator_name.substring(0,2).toUpperCase() }}</div>
               <div v-else class="nti-av ntic-av" style="width: 32px; height: 32px;">S</div>

               <span class="nti-title">{{ dashboardSelectedTask.title }}</span>
               <div class="nti-count-wrapper">
                 <span class="nti-count">{{ dashboardSelectedTask.checklist?.filter(c => c.is_completed).length || '0' }}/{{ dashboardSelectedTask.checklist?.length || '0' }}</span>
                 <div class="nti-tooltip" v-if="dashboardSelectedTask.checklist?.length">
                   <div class="tooltip-header">Subtasks</div>
                   <div class="tooltip-list">
                     <div v-for="(item, i) in dashboardSelectedTask.checklist" :key="i" class="tooltip-item" :class="{ 'is-done': item.is_completed }">
                       <Check v-if="item.is_completed" :size="10" />
                       <Circle v-else :size="10" />
                       <span>{{ item.item_text }}</span>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
             <div class="nti-progress">
               <div class="n-prog-bg">
                   <div class="n-prog-fill" :class="{ 'is-zero': !dashboardSelectedTask.progress }" :style="{ width: dashboardSelectedTask.progress ? `calc(${dashboardSelectedTask.progress}% - 8px)` : '24px' }"></div>
                   <span class="n-prog-text" :style="{ color: !dashboardSelectedTask.progress ? 'rgba(255,255,255,0.4)' : '#1c1c1e' }"><b>{{ dashboardSelectedTask.progress }}%</b> in progress</span>
                   <div class="n-prog-check" style="cursor:pointer;" @click="selectedTaskId = dashboardSelectedTask.id"><Check :size="12"/></div>
               </div>
             </div>
             
             <!-- Comment / Subtask Info -->
             <div class="nti-comment" v-if="dashboardSelectedTask.checklist && dashboardSelectedTask.checklist.length > 0">
               <!-- Last Subtask/Creator Info -->
               <div class="ntic-av">{{ (dashboardSelectedTask.creator_name || 'U').substring(0,2).toUpperCase() }}</div>
               <div class="ntic-text">
                 <span class="ntic-name">{{ dashboardSelectedTask.creator_name || 'Creator' }}</span>
                 <span class="ntic-msg">{{ dashboardSelectedTask.checklist.find(c => !c.is_completed)?.item_text || 'All subtasks completed!' }}</span>
                 <div class="ntic-actions">
                   <span style="display:flex; align-items:center; gap:4px; margin-right:8px;"><AlertCircle :size="10" /> {{ capitalize(dashboardSelectedTask.priority) }}</span>
                   <span style="display:flex; align-items:center; gap:4px;"><Clock :size="10" /> {{ formatDate(dashboardSelectedTask.due_date) }}</span>
                 </div>
               </div>
             </div>
             <div class="nti-comment" v-else>
               <div class="ntic-av">{{ (dashboardSelectedTask.creator_name || 'U').substring(0,2).toUpperCase() }}</div>
               <div class="ntic-text">
                 <span class="ntic-name">{{ dashboardSelectedTask.creator_name || 'Creator' }}</span>
                 <span class="ntic-msg">No subtasks found</span>
                 <div class="ntic-actions">
                   <span style="display:flex; align-items:center; gap:4px; margin-right:8px;"><AlertCircle :size="10" /> {{ capitalize(dashboardSelectedTask.priority) }}</span>
                   <span style="display:flex; align-items:center; gap:4px;"><Clock :size="10" /> {{ formatDate(dashboardSelectedTask.due_date) }}</span>
                 </div>
               </div>
             </div>
          </div>

          <!-- Task Item 2: Attachments -->
          <div class="n-task-item compact" v-if="dashboardSelectedTask">
            <div class="nti-header compact-h">
               <div class="nti-av" style="background:#1c1c1e; display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,0.7);">
                 <Paperclip :size="14" />
               </div>
               <span class="nti-title">Documents & sorting</span>
               <span class="nti-count blue">{{ dashboardSelectedTask.attachments?.length || 0 }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Upcoming Card -->
      <div class="n-card upcoming-card">
        <div class="uc-header">
          <h2>Upcoming</h2>
          <div class="uc-actions"><Grid :size="14" /></div>
        </div>
        <div class="uc-tabs">
          <button class="u-tab" :class="{ active: upcomingTab === 'standalone' }" @click="upcomingTab = 'standalone'; currentUpcomingIndex = 0">
            <LayoutList :size="12"/> Standalone Tasks
          </button>
          <button class="u-tab" :class="{ active: upcomingTab === 'projects' }" @click="upcomingTab = 'projects'; currentUpcomingIndex = 0">
            <Folder :size="12"/> Projects
          </button>
          <button class="u-icon-tab"><Bookmark :size="12"/></button>
        </div>
        
        <div class="uc-meeting-box" v-if="selectedUpcomingTask">
          <div class="umb-title">
            <Circle :size="14" class="circle-blue" /> {{ selectedUpcomingTask.title }}
          </div>
          <div class="umb-field" v-if="selectedUpcomingTask.checklist?.length">
            <label>Subtasks</label>
            <div class="umb-tags">
              <span 
                v-for="(item, i) in selectedUpcomingTask.checklist.slice(0, 2)" 
                :key="i"
                class="u-tag"
                :class="i % 2 === 0 ? 'green' : 'yellow'"
              >
                <div class="u-tag-avatar">
                  <component :is="getSmartTaskIcon(item.item_text)" :size="10" />
                </div>
                {{ item.item_text }}
              </span>
              <span class="u-tag dark" v-if="selectedUpcomingTask.checklist.length > 2">
                +{{ selectedUpcomingTask.checklist.length - 2 }} more
              </span>
            </div>
          </div>
          <div class="umb-field">
            <label>Start Date</label>
            <div class="u-date-picker">
              <span>{{ formatDate(selectedUpcomingTask.start_date) }}</span>
              <div class="udp-actions">
                <button class="icon-tab-btn" style="background: rgba(250, 204, 21, 0.2); border: 1px solid #facc15;" @click="prevUpcomingTask"><ChevronLeft :size="12"/></button>
                <button class="icon-tab-btn" style="background: rgba(250, 204, 21, 0.2); border: 1px solid #facc15;" @click="nextUpcomingTask"><ChevronRight :size="12"/></button>
                <CompactDatePicker v-model="selectedUpcomingTask.start_date" :markers="upcomingMarkers" icon-only />
              </div>
            </div>
          </div>
          <div class="umb-field inline">
            <label>Time Remaining</label>
            <div class="timer-box" style="font-family: 'SF Mono', monospace; font-size: 14px; font-weight: 700; color: #facc15; display: flex; align-items: center; gap: 6px;">
              <Clock :size="14" />
              <span>{{ timeRemainingLabel }}</span>
            </div>
            <button class="edit-btn" @click="handleEditTask(selectedUpcomingTask)"><Edit2 :size="12"/></button>
          </div>
        </div>
        <div class="empty-state-enhanced" v-else>
          <div class="ese-icon-wrap">
            <CalendarClock :size="32" stroke-width="1.5" />
          </div>
          <h4>All caught up!</h4>
          <p>No upcoming {{ upcomingTab }} at the moment. Stay tuned for new assignments.</p>
        </div>
      </div>

      <!-- ROW 1 Right: New Task -->
      <div class="n-card hero-card">
        <div class="hero-illustration">
           <div class="wire-grid">
             <div class="w-box b1">
               <div class="w-line short"></div><div class="w-line"></div><div class="w-line"></div>
             </div>
             <div class="w-box b2"></div>
             <div class="w-box b3"></div>
             <div class="w-box b4"></div>
             <div class="w-box badd"><Plus :size="16" /></div>
           </div>
        </div>
        <div class="hero-content">
          <h3>New task</h3>
          <p>Involves creating and assigning a new task within the project management system.</p>
          <div class="hero-actions">
            <button class="n-btn primary" @click="$router.push(isAdmin ? '/admin/tasks/new' : '/user/tasks/new')">
              <Plus :size="14" /> Add new task
            </button>
            <button class="n-btn outline">Learn more</button>
          </div>
        </div>
      </div>

      <!-- ROW 2: Left = Recent Tasks -->
      <div class="n-card recent-table-card">
         <div class="rtc-header">
           <div class="rtc-title">
             <h2>Recent tasks <ChevronDown :size="14" /></h2>
             <span class="up-badge" v-if="dashboardStats">{{ dashboardStats.performance_pct }}%</span> 
             <span class="up-text">Task performance based on current period</span>
           </div>
           <div class="rtc-actions">
             <div class="rtc-toggle">
               <button class="t-btn" :class="{ active: dashboardPeriod === 'daily' }" @click="dashboardPeriod = 'daily'">Daily</button>
               <button class="t-btn" :class="{ active: dashboardPeriod === 'weekly' }" @click="dashboardPeriod = 'weekly'">Weekly</button>
             </div>
           </div>
         </div>
         
         <div class="rtc-tabs">
           <div class="rtct-left">
             <button class="r-tab" :class="{ active: rtcStatusTab === 'all' }" @click="rtcStatusTab = 'all'">All</button>
             <button class="r-tab" :class="{ active: rtcStatusTab === 'upcoming' }" @click="rtcStatusTab = 'upcoming'">Upcoming</button>
             <button class="r-tab" :class="{ active: rtcStatusTab === 'completed' }" @click="rtcStatusTab = 'completed'">Completed</button>
             <button class="r-tab" :class="{ active: rtcStatusTab === 'open' }" @click="rtcStatusTab = 'open'">Open</button>
             <button class="r-tab" :class="{ active: rtcStatusTab === 'in_progress' }" @click="rtcStatusTab = 'in_progress'">In Progress</button>
             <button class="r-tab" :class="{ active: rtcStatusTab === 'expired' }" @click="rtcStatusTab = 'expired'">Expired</button>
             <button class="r-tab" :class="{ active: rtcStatusTab === 'extended' }" @click="rtcStatusTab = 'extended'">Extended</button>
           </div>
           <button class="r-export" @click="exportRecentTasks">Export</button>
         </div>
         
         <div class="rtc-table" style="overflow-y: auto; max-height: 100%;">
           <div class="rt-row header">
             <div class="rt-col">Project Name</div>
             <div class="rt-col">Assign</div>
             <div class="rt-col">Start Date</div>
             <div class="rt-col">Updates</div>
             <div class="rt-col end">Status</div>
           </div>
           
           <!-- Real-time dynamic tasks -->
           <div class="rt-row" v-for="task in dashboardRecentTasks" :key="task.id" @click="selectedTaskId = task.id" style="cursor: pointer;">
             <div class="rt-col project-name">
               <span class="p-dot" :class="'dot-' + (['blue','orange','green','purple'][task.id.charCodeAt(0) % 4] || 'blue')">
                 {{ (task.project_name || 'NP').substring(0,2).toUpperCase() }}
               </span> 
               {{ task.title }}
             </div>
             <div class="rt-col assign-col">
               <img v-if="task.assignee_avatar" :src="task.assignee_avatar" />
               <span v-else style="display:inline-flex; width:20px; height:20px; border-radius:50%; background:rgba(255,255,255,0.1); align-items:center; justify-content:center; font-size:10px; font-weight: 600;">{{ (task.assignee_name || '?').charAt(0) }}</span>
               {{ task.assignee_name || 'Unassigned' }}
             </div>
             <div class="rt-col muted">{{ formatDate(task.start_date || task.due_date) }}</div>
             <div class="rt-col" :class="task.status?.toLowerCase() === 'expired' ? 'highlighted' : 'muted'">{{ getTaskUpdateInfo(task) }}</div>
             <div class="rt-col end"><span class="status-pill" :class="task.status?.toLowerCase() || 'open'">{{ task.status?.toLowerCase() === 'expired' ? 'Expired' : capitalize(task.status) }}</span></div>
           </div>
         </div>
      </div>

      <!-- ROW 2 Right: Performance Chart Card -->
      <div class="n-card perf-card">
          <div class="pc-header">
            <div style="display: flex; align-items: center; gap: 12px;">
              <h2>Performance</h2>
              <div class="rtc-toggle">
                <button class="t-btn" :class="{ active: perfPeriod === 'daily' }" @click="perfPeriod = 'daily'">Daily</button>
                <button class="t-btn" :class="{ active: perfPeriod === 'weekly' }" @click="perfPeriod = 'weekly'">Weekly</button>
              </div>
            </div>
            <div class="pc-actions">
              <ChevronLeft class="nav-btn" :size="14" @click="prevPerfUser" />
              <ChevronRight class="nav-btn" :size="14" @click="nextPerfUser" />
            </div>
          </div>
           <div class="pc-sub">
              <div class="pcs-av-group" v-if="selectedPerfUser">
                <img v-if="selectedPerfUser.avatar" :src="selectedPerfUser.avatar" class="pcs-av-img" />
                <span class="pcs-av-badge" :style="{ backgroundColor: getUserColor(selectedPerfUser.id), color: getContrastYIQ(getUserColor(selectedPerfUser.id)) }">
                  {{ (selectedPerfUser.full_name || selectedPerfUser.email || 'U').substring(0,2).toUpperCase() }}
                </span>
              </div>
              <button class="flag-btn"><Flag :size="14"/></button>
           </div>
          
          <div class="chart-area" v-if="perfData">
             <span class="chart-tasks-badge"><CheckSquare :size="10"/> {{ perfData?.total_tasks || 0 }} tasks</span>
             <div class="y-axis">
               <span v-for="label in chartLabels" :key="label">{{ label }}</span>
             </div>
             
             <!-- Dynamic SVG Chart -->
             <svg class="perf-svg" viewBox="0 0 200 100" preserveAspectRatio="none">
                <!-- Grid Lines -->
                <line x1="0" y1="20" x2="200" y2="20" stroke="rgba(255,255,255,0.05)" stroke-width="1" />
                <line x1="0" y1="50" x2="200" y2="50" stroke="rgba(255,255,255,0.05)" stroke-width="1" />
                <line x1="0" y1="80" x2="200" y2="80" stroke="rgba(255,255,255,0.05)" stroke-width="1" />
                
                <!-- Paths -->
                <path v-if="paths.completed" :d="paths.completed" fill="none" stroke="#4ade80" stroke-width="2" />
                <path v-if="paths.in_progress" :d="paths.in_progress" fill="none" stroke="#facc15" stroke-width="2" />
                <path v-if="paths.expired" :d="paths.expired" fill="none" stroke="#ef4444" stroke-width="2" />
                
                <!-- Dots -->
                <circle v-for="(dot, i) in dots.completed" :key="'c'+i" :cx="dot.x" :cy="dot.y" r="3" fill="#4ade80" stroke="#1c1c1f" stroke-width="1.5" />
                <circle v-for="(dot, i) in dots.in_progress" :key="'i'+i" :cx="dot.x" :cy="dot.y" r="3" fill="#facc15" stroke="#1c1c1f" stroke-width="1.5" />
                <circle v-for="(dot, i) in dots.expired" :key="'e'+i" :cx="dot.x" :cy="dot.y" r="3" fill="#ef4444" stroke="#1c1c1f" stroke-width="1.5" />
             </svg>
          </div>
          <div v-else class="chart-loading">Loading performance data...</div>
          
          <div class="pc-legend">
            <span class="l-item"><span class="l-dot yellow"></span> In Progress</span>
            <span class="l-item"><span class="l-dot green"></span> Completed</span>
            <span class="l-item"><span class="l-dot red"></span> Expired</span>
          </div>
      </div>
    </main>

    <!-- OTHER TABS (Modern Expense-Style Grid) -->
    <main class="main-canvas" v-if="activeTab !== 'dashboard'">
      <div class="table-container-modern">
        <div class="header-actions-modern">
          <div class="title-group">
            <h3>{{ activeTab === 'all' ? 'All Tasks' : 'My Tasks' }}</h3>
            <p>Viewing {{ (activeTab === 'all' ? allTasks : myTasks).length }} items</p>
          </div>
          <!-- Filters (Stubbed structure) -->
          <div class="table-controls" style="display: flex; gap: 12px; align-items: center;">
            <div class="search-box">
              <Search :size="14" />
              <input v-model="searchQuery" type="text" placeholder="Search tasks by ID or name..." />
            </div>
          </div>
        </div>
        
        <!-- Modern Grid Table -->
        <div class="pm-table-modern glass-card" style="padding:0; overflow:hidden;">
           <div class="pm-row-modern header">
             <div class="col sn">ID</div>
             <div class="col category">Task Name</div>
             <div class="col ref">Project</div>
             <div class="col assign">Assignee</div>
             <div class="col prior">Priority</div>
             <div class="col date">Due Date</div>
             <div class="col status">Status</div>
           </div>
           
           <div v-if="filteredTasks.length === 0" class="empty-state" style="padding:60px 0; text-align: center;">
                <CheckSquare :size="48" class="empty-icon" style="color: rgba(255,255,255,0.2)" />
                <h4 style="margin-top:16px; color: white;">No Tasks Found</h4>
           </div>

           <div class="pm-row-modern item" v-for="(task, i) in filteredTasks" :key="task.id" @click="selectedTaskId = task.id">
             <div class="col sn" style="font-family: 'SF Mono', monospace; font-size: 11px; color: rgba(255,255,255,0.5);">{{ task.task_code || task.id.substring(0,8).toUpperCase() }}</div>
             <div class="col category">
                 <span class="v-name" style="max-width:250px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block;">{{ task.title }}</span>
                 <div style="display:flex; gap:6px; margin-top:4px; align-items:center;">
                     <span class="v-ref" style="text-transform: capitalize; color:rgba(255,255,255,0.4); font-size:11px;">{{ capitalize((task.task_type || 'General').replace('_', ' ')) }}</span>
                 </div>
             </div>
             <div class="col ref">
                 <span style="color: rgba(255,255,255,0.7); font-size: 13px;">{{ task.project_name || 'Standalone' }}</span>
             </div>
             <div class="col assign" style="display:flex; align-items:center; gap:8px;">
               <img v-if="task.assignee_avatar" :src="task.assignee_avatar" style="width:24px; height:24px; border-radius:50%;"/>
               <div v-else class="fallback-av" style="width:24px; height:24px; border-radius:50%; background:rgba(255,255,255,0.1); display:flex; align-items:center; justify-content:center; font-size:10px;">{{ (task.assignee_name || '?').charAt(0) }}</div>
               <span class="v-name" style="color:rgba(255,255,255,0.85); font-weight:500;">{{ task.assignee_name || 'Unassigned' }}</span>
             </div>
             <div class="col prior">
               <span class="pill" :style="{ background: task.priority === 'high' ? 'rgba(239,68,68,0.1)' : 'rgba(255,255,255,0.05)', color: task.priority === 'high' ? '#f87171' : 'rgba(255,255,255,0.7)', padding:'4px 8px', fontSize:'11px', borderRadius:'4px', letterSpacing:'0.02em', textTransform:'capitalize' }">{{ capitalize(task.priority || 'Medium') }}</span>
             </div>
             <div class="col date" style="color:rgba(255,255,255,0.5); font-size:12px;">
               {{ formatDate(task.due_date) }}
             </div>
             <div class="col status">
                 <div class="status-badge compact" :class="task.status?.toLowerCase() || 'open'">
                    <Check v-if="task.status === 'completed'" :size="10" />
                    <AlertCircle v-else-if="task.status?.toLowerCase() === 'expired'" :size="10" />
                    <Clock v-else-if="task.status?.toLowerCase() === 'extended'" :size="10" />
                    <Clock v-else :size="10" />
                    <span>{{ task.status?.toLowerCase() === 'expired' ? 'Expired' : (task.status?.toLowerCase() === 'extended' ? 'Extended' : capitalize(task.status)) }}</span>
                 </div>
             </div>
           </div>
        </div>
      </div>
    </main>

    <!-- Drawer -->
    <TaskDetailsDrawer 
      :is-open="!!selectedTaskId"
      :task="selectedTask"
      :users="allUsers"
      :allTasks="allTasks"
      :is-admin="isAdmin"
      @close="selectedTaskId = null"
      @delete="handleDeleteTask"
      @start="handleStartTask"
      @updateChecklist="handleUpdateChecklist"
      @edit="handleEditTask"
    />

    <!-- Edit Task Modal -->
    <EditTaskModal
      v-model="showEditModal"
      :task="editingTask"
      @updated="fetchData"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import axios from 'axios'
import { useToast } from '../composables/useToast'
import TaskDetailsDrawer from '../components/tasks/TaskDetailsDrawer.vue'
import EditTaskModal from '../components/tasks/EditTaskModal.vue'
import CompactDatePicker from '../components/ui/CompactDatePicker.vue'
import {
  Search, Plus, Bell, Folder, LayoutGrid, Clock, CalendarDays, Video,
  CheckSquare, Check, Heart, MessageSquare, Send, MoreHorizontal,
  GitMerge, Settings, Bookmark, Circle, X, ChevronLeft, ChevronRight, Code,
  Calendar, Edit2, ChevronDown, MessageCircle, Phone, Flag, LayoutList, AlertCircle, Paperclip,
  CalendarClock
} from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()
const { success: toastSuccess, error: toastError } = useToast()
const isAdmin = computed(() => window.location.pathname.startsWith('/admin'))

const activeTab = ref('dashboard')
const dashboardPeriod = ref('daily')
const rtcStatusTab = ref('all')

const allTasks = ref([])
const myTasks = ref([])
const allUsers = ref([])
const dashboardStats = ref(null)
const selectedTaskId = ref(null)
const searchQuery = ref('')

// Upcoming Card State
const upcomingTab = ref('standalone')
const currentUpcomingIndex = ref(0)
const timerNow = ref(new Date())
let timerInterval = null

const showEditModal = ref(false)
const editingTask = ref(null)

const handleEditTask = (task) => {
  editingTask.value = task
  selectedTaskId.value = null // Close drawer
  showEditModal.value = true
}

const filteredTasks = computed(() => {
  let list = activeTab.value === 'all' ? allTasks.value : myTasks.value
  
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase()
    list = list.filter(t => {
      const matchId = (t.task_code || '').toLowerCase().includes(q)
      const matchName = (t.title || '').toLowerCase().includes(q)
      return matchId || matchName
    })
  }
  
  return list
})

const dashboardRecentTasks = computed(() => {
  if (!dashboardStats.value?.recent_tasks) return []
  let tasks = dashboardStats.value.recent_tasks
  if (rtcStatusTab.value !== 'all') {
    tasks = tasks.filter(t => t.status?.toLowerCase() === rtcStatusTab.value.toLowerCase())
  }
  return tasks.slice(0, 5)
})

// Dashboard Tasks Card State
const currentDashboardTaskIndex = ref(0)

const dashboardSourceTasks = computed(() => isAdmin.value ? allTasks.value : myTasks.value)

const dashboardSelectedTask = computed(() => {
   if (!dashboardSourceTasks.value || !dashboardSourceTasks.value.length) return null
   return dashboardSourceTasks.value[currentDashboardTaskIndex.value % dashboardSourceTasks.value.length]
})
const nextDashboardTask = () => {
   if (dashboardSourceTasks.value.length) currentDashboardTaskIndex.value = (currentDashboardTaskIndex.value + 1) % dashboardSourceTasks.value.length
}
const prevDashboardTask = () => {
   if (dashboardSourceTasks.value.length) currentDashboardTaskIndex.value = (currentDashboardTaskIndex.value - 1 + dashboardSourceTasks.value.length) % dashboardSourceTasks.value.length
}

const upcomingTasks = computed(() => {
  // Only tasks with 'upcoming' status, assigned to me (or all if admin), sorted by start date
  const sourceTasks = isAdmin.value ? allTasks.value : myTasks.value;
  return sourceTasks
    .filter(t => t.status === 'upcoming')
    .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))
})

const filteredUpcomingTasks = computed(() => {
  if (upcomingTab.value === 'standalone') {
    return upcomingTasks.value.filter(t => !t.project_id)
  } else {
    return upcomingTasks.value.filter(t => !!t.project_id)
  }
})

const selectedUpcomingTask = computed(() => {
  if (!filteredUpcomingTasks.value.length) return null
  return filteredUpcomingTasks.value[currentUpcomingIndex.value % filteredUpcomingTasks.value.length]
})

const upcomingMarkers = computed(() => {
  return upcomingTasks.value.map(t => ({
    date: (t.start_date || t.due_date),
    title: t.title
  })).filter(m => !!m.date)
})

const timeRemainingLabel = computed(() => {
  if (!selectedUpcomingTask.value) return '00:00:00'
  const target = new Date(selectedUpcomingTask.value.start_date || selectedUpcomingTask.value.due_date)
  const diff = target - timerNow.value
  if (diff <= 0) return 'Due Now'
  
  const h = Math.floor(diff / (1000 * 60 * 60))
  const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const s = Math.floor((diff % (1000 * 60)) / 1000)
  
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const getSmartTaskIcon = (text) => {
  const t = (text || '').toLowerCase()
  if (t.includes('design') || t.includes('wireframe') || t.includes('ui') || t.includes('ux')) return GitMerge
  if (t.includes('code') || t.includes('develop') || t.includes('fix') || t.includes('bug') || t.includes('refactor')) return Code
  if (t.includes('test') || t.includes('qa') || t.includes('verify') || t.includes('check')) return ShieldCheck
  if (t.includes('meet') || t.includes('call') || t.includes('discuss')) return Video
  if (t.includes('phone') || t.includes('call')) return Phone
  if (t.includes('send') || t.includes('mail') || t.includes('message')) return MessageSquare
  if (t.includes('doc') || t.includes('file') || t.includes('pdf') || t.includes('sorting')) return Paperclip
  if (t.includes('alert') || t.includes('warn') || t.includes('urgent')) return AlertCircle
  if (t.includes('list') || t.includes('task') || t.includes('checklist')) return LayoutList
  return Circle
}

const prevUpcomingTask = () => {
  if (filteredUpcomingTasks.value.length) {
    currentUpcomingIndex.value = (currentUpcomingIndex.value - 1 + filteredUpcomingTasks.value.length) % filteredUpcomingTasks.value.length
  }
}

const nextUpcomingTask = () => {
  if (filteredUpcomingTasks.value.length) {
    currentUpcomingIndex.value = (currentUpcomingIndex.value + 1) % filteredUpcomingTasks.value.length
  }
}

const exportRecentTasks = () => {
  const tasks = dashboardRecentTasks.value
  if (!tasks.length) return toastError("No tasks to export")
  
  const headers = ['ID', 'Task Name', 'Project', 'Assignee', 'Start Date', 'Due Date', 'Status']
  const rows = tasks.map(t => [
    t.task_code || t.id,
    `"${(t.title || '').replace(/"/g, '""')}"`,
    `"${(t.project_name || 'Standalone').replace(/"/g, '""')}"`,
    `"${(t.assignee_name || 'Unassigned').replace(/"/g, '""')}"`,
    t.start_date || '',
    t.due_date || '',
    t.status || 'open'
  ])
  
  const csvContent = "data:text/csv;charset=utf-8," 
    + headers.join(',') + '\n'
    + rows.map(e => e.join(',')).join('\n')
    
  const encodedUri = encodeURI(csvContent)
  const link = document.createElement("a")
  link.setAttribute("href", encodedUri)
  link.setAttribute("download", `recent_tasks_${dashboardPeriod.value}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  toastSuccess("Tasks exported successfully")
}

const selectedTask = ref(null)

// Performance Card State
const perfPeriod = ref('weekly')
const selectedPerfUserId = ref(null)
const perfData = ref(null)

const getContrastYIQ = (hexcolor) => {
  if (!hexcolor) return '#1c1c1e';
  hexcolor = hexcolor.replace("#", "");
  const r = parseInt(hexcolor.substr(0,2),16);
  const g = parseInt(hexcolor.substr(2,2),16);
  const b = parseInt(hexcolor.substr(4,2),16);
  const yiq = ((r*299)+(g*587)+(b*114))/1000;
  return (yiq >= 128) ? '#1c1c1e' : '#ffffff';
}

const getUserColor = (idStr) => {
  if(!idStr) return '#facc15';
  
  // A palette heavily featuring our core yellow (#facc15) and other warm tones
  const warmColors = [
      '#facc15', '#facc15', '#facc15', // Core Yellow (highly weighted)
      '#fcd34d', '#fbbf24', '#f59e0b', '#d97706', '#b45309', // Ambers
      '#fdba74', '#fb923c', '#f97316', '#ea580c', '#c2410c', // Oranges
      '#fca5a5', '#f87171', '#ef4444', '#dc2626', '#b91c1c', // Reds
      '#fef08a', '#fde047', '#eab308', '#ca8a04',            // Light Yellows
      '#fed7aa', '#ffedd5',                                  // Peaches
      '#fda4af', '#fb7185', '#f43f5e', '#e11d48', '#be123c'  // Roses/Pinks
  ];
  
  let hash = 0;
  for (let i = 0; i < idStr.length; i++) {
    hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  return warmColors[Math.abs(hash) % warmColors.length];
}

const perfUsersList = computed(() => {
  if (isAdmin.value) return allUsers.value;
  return allUsers.value.filter(u => !(u.is_superuser === true || (u.email && u.email.includes('admin'))));
})

const selectedPerfUser = computed(() => {
  if (!perfUsersList.value.length) return null
  return perfUsersList.value.find(u => u.id === selectedPerfUserId.value) || perfUsersList.value[0]
})

const nextPerfUser = () => {
  if (!perfUsersList.value.length) return
  const idx = perfUsersList.value.findIndex(u => u.id === selectedPerfUser.value?.id)
  const nextIdx = (idx + 1) % perfUsersList.value.length
  selectedPerfUserId.value = perfUsersList.value[nextIdx].id
  fetchPerfData()
}

const prevPerfUser = () => {
  if (!perfUsersList.value.length) return
  const idx = perfUsersList.value.findIndex(u => u.id === selectedPerfUser.value?.id)
  const prevIdx = (idx - 1 + perfUsersList.value.length) % perfUsersList.value.length
  selectedPerfUserId.value = perfUsersList.value[prevIdx].id
  fetchPerfData()
}

// Chart Calculations
const generateChartPath = (dataPoints, statusKey, maxVal) => {
    if (!dataPoints || !dataPoints.length || maxVal === 0) return null;
    
    // Do not draw a completely flat line at the bottom if there is no data for this status
    if (dataPoints.every(pt => pt[statusKey] === 0)) return null;

    const w = 200;
    const h = 100;
    const paddingY = 20; // Keep away from edges
    const usableH = h - (paddingY * 2);
    
    let path = `M 0,${h}`; // Start at bottom left visually before moving to actual point
    const stepX = w / (dataPoints.length - 1 || 1);
    
    dataPoints.forEach((pt, i) => {
        const x = i * stepX;
        // Invert Y mapping (0 at bottom, 100 at top)
        const val = pt[statusKey];
        const normalized = val / maxVal;
        const y = h - paddingY - (normalized * usableH);
        
        if (i === 0) {
            path = `M ${x},${y}`;
        } else {
             // Simple bezier for smoothing
             const prevX = (i - 1) * stepX;
             const prevY = h - paddingY - ((dataPoints[i-1][statusKey] / maxVal) * usableH);
             const cp1x = prevX + (stepX * 0.5);
             const cp2x = x - (stepX * 0.5);
             path += ` C ${cp1x},${prevY} ${cp2x},${y} ${x},${y}`;
        }
    });
    return path;
}

const getDotsForLine = (dataPoints, statusKey, maxVal) => {
    if (!dataPoints || !dataPoints.length || maxVal === 0) return [];
    const w = 200;
    const h = 100;
    const paddingY = 20;
    const usableH = h - (paddingY * 2);
    const stepX = w / (dataPoints.length - 1 || 1);
    
    return dataPoints.map((pt, i) => {
        const val = pt[statusKey]
        const normalized = val / maxVal
        const y = h - paddingY - (normalized * usableH)
        return { x: i * stepX, y, val }
    }).filter(d => d.val > 0) // Only show dots for non-zero values
}

const chartLabels = computed(() => {
  if (!perfData.value?.chart_data) return []
  return perfData.value.chart_data.map(d => d.label)
})

const paths = computed(() => {
    if (!perfData.value?.chart_data) return { completed: null, in_progress: null, expired: null }
    const data = perfData.value.chart_data
    // Find absolute max across all statuses to scale chart correctly
    let maxVal = 1; // Default min max to avoid / 0
    data.forEach(d => {
       const m = Math.max(d.completed, d.in_progress, d.expired)
       if (m > maxVal) maxVal = m
    });
    
    maxVal = maxVal * 1.2; // Add 20% headroom

    return {
        completed: generateChartPath(data, 'completed', maxVal),
        in_progress: generateChartPath(data, 'in_progress', maxVal),
        expired: generateChartPath(data, 'expired', maxVal)
    }
})

const dots = computed(() => {
    if (!perfData.value?.chart_data) return { completed: [], in_progress: [], expired: [] }
    const data = perfData.value.chart_data
    let maxVal = 1;
    data.forEach(d => {
       const m = Math.max(d.completed, d.in_progress, d.expired)
       if (m > maxVal) maxVal = m
    });
    maxVal = maxVal * 1.2;

    return {
        completed: getDotsForLine(data, 'completed', maxVal),
        in_progress: getDotsForLine(data, 'in_progress', maxVal),
        expired: getDotsForLine(data, 'expired', maxVal)
    }
})

const fetchPerfData = async () => {
    try {
       const h = getHeaders();
       if (!h.Authorization.includes('null')) {
           const uid = selectedPerfUser.value ? selectedPerfUser.value.id : '';
           const res = await axios.get(`${API}/tasks/performance?period=${perfPeriod.value}&user_id=${uid}`, { headers: h });
           perfData.value = res.data;
       }
    } catch (err) {
        console.error("Failed to fetch perf data", err)
    }
}

watch(perfPeriod, () => {
  fetchPerfData()
})

watch(selectedTaskId, async (newVal) => {
  if (newVal) {
    try {
      const res = await axios.get(`${API}/tasks/${newVal}`, { headers: getHeaders() })
      selectedTask.value = res.data
    } catch (err) {
      console.error("Failed to fetch task details:", err)
      selectedTask.value = allTasks.value.find(t => t.id === newVal) || myTasks.value.find(t => t.id === newVal)
    }
  } else {
    selectedTask.value = null
  }
})

const API = 'http://localhost:8000/api'
const getHeaders = () => {
  const token = localStorage.getItem(isAdmin.value ? 'admin_token' : 'user_token')
  return { Authorization: `Bearer ${token}` }
}

const handleDeleteTask = async (taskId) => {
  try {
     await axios.delete(`${API}/tasks/${taskId}`, { headers: getHeaders() })
     toastSuccess("Task deleted successfully")
     selectedTaskId.value = null
     fetchData()
  } catch (err) {
     toastError("Failed to delete task")
  }
}

const handleStartTask = async (taskId) => {
  try {
     await axios.put(`${API}/tasks/${taskId}`, { status: "in_progress" }, { headers: getHeaders() })
     toastSuccess("Task started successfully")
     fetchData()
  } catch (err) {
     toastError("Failed to start task")
  }
}

const handleCompleteTask = async (taskId) => {
  try {
     await axios.put(`${API}/tasks/${taskId}`, { status: "completed" }, { headers: getHeaders() })
     toastSuccess("Task marked as finished")
     selectedTaskId.value = null
     fetchData()
  } catch (err) {
     toastError("Failed to complete task")
  }
}

const handleDashboardCompleteTask = async () => {
  const task = dashboardSelectedTask.value
  if (!task) return

  // 0. Check if already completed
  if (task.status === "completed") {
    return toastError("The task has been completed already")
  }

  // 1. Check if expired
  if (task.status === "expired" && !isAdmin.value) {
    return toastError("Expired tasks cannot be marked as completed")
  }

  // 2. Check if all subtasks are finished
  if (task.checklist && task.checklist.length > 0 && !isAdmin.value) {
    const incomplete = task.checklist.filter(c => !c.is_completed)
    if (incomplete.length > 0) {
      return toastError(`Please complete all subtasks first (${incomplete.length} remaining)`)
    }
  }

  // 3. Proceed to complete
  handleCompleteTask(task.id)
}

const handleUpdateChecklist = async ({ taskId, checklist }) => {
  try {
     const h = getHeaders()
     for (const item of checklist) {
        await axios.put(`${API}/tasks/${taskId}/checklist/${item.id}?is_completed=${item.is_completed}`, null, { headers: h })
     }
     toastSuccess("Subtasks updated")
     fetchData()
  } catch (err) {
     toastError("Failed to update subtasks")
  }
}

const isDueSoon = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const diff = d - new Date();
  return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000;
}

const formatDate = (d) => {
  if (!d) return '--';
  return new Date(d).toLocaleDateString();
}

const capitalize = (s) => {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ');
}

const getTaskUpdateInfo = (task) => {
  if (!task || !task.status) return 'On Track';
  const status = task.status.toLowerCase();
  
  if (status === 'completed') return 'Finished';
  if (status === 'expired') return 'Incompleted';
  if (status === 'in_progress') return 'Working...';
  if (status === 'upcoming') return `Starts ${formatDate(task.start_date)}`;
  if (status === 'open') {
    if (isDueSoon(task.due_date)) return 'Due Soon';
    return 'Ready to Start';
  }
  return 'On Track';
}

const fetchData = async () => {
  try {
    const h = getHeaders();
    if (!h.Authorization.includes('null')) {
      const dbRes = await axios.get(`${API}/tasks/dashboard?period=${dashboardPeriod.value}`, { headers: h });
      dashboardStats.value = dbRes.data;

      const allRes = await axios.get(`${API}/tasks/?scope=all&limit=50`, { headers: h });
      allTasks.value = allRes.data.items;

      const myRes = await axios.get(`${API}/tasks/?scope=my&limit=50`, { headers: h });
      myTasks.value = myRes.data.items;

      const usersRes = await axios.get(`${API}/tasks/users/list`, { headers: h });
      allUsers.value = usersRes.data.items || usersRes.data;
      
      // Update performance chart data to reflect real-time changes
      if (selectedPerfUserId.value) {
         fetchPerfData()
      }
    }
  } catch (err) {
    console.error('Error fetching tasks:', err);
  }
}

onMounted(() => {
  fetchData().then(() => {
    if (!selectedPerfUserId.value && perfUsersList.value.length > 0) {
      try {
        const token = localStorage.getItem(isAdmin.value ? 'admin_token' : 'user_token')
        if (token) {
           const payload = JSON.parse(atob(token.split('.')[1]))
           const myId = payload.sub
           const me = perfUsersList.value.find(u => u.id === myId || u.email === myId)
           if (me) selectedPerfUserId.value = me.id
        }
      } catch(e) { /* ignore parse error */ }
      
      if (!selectedPerfUserId.value) {
         selectedPerfUserId.value = perfUsersList.value[0].id
      }
    }
    fetchPerfData()
    
    if (route.query.taskId) {
      selectedTaskId.value = route.query.taskId
    }

    timerInterval = setInterval(() => {
      timerNow.value = new Date()
    }, 1000)
  });
})

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})

watch(dashboardPeriod, () => {
  fetchData()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

/* ── Base Layout ── */
.nano-page {
  min-height: 100vh;
  font-family: 'Inter', -apple-system, sans-serif;
  color: white;
}

/* ── Header ── */
.nano-header {
  height: 64px;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  border-bottom: 1px solid rgba(255,255,255,0.03);
  position: relative;
}
.nav-left, .nav-right { display: flex; align-items: center; gap: 16px; }

.logo-mark { width: 28px; height: 28px; background: #8758FF; border-radius: 8px 8px 8px 2px; }
.nano-search {
  display: flex; align-items: center; gap: 8px;
  background: #27272a; border-radius: 20px;
  padding: 8px 16px; width: 200px; color: rgba(255,255,255,0.5);
}
.nano-search input {
  background: transparent; border: none; outline: none; color: white;
  font-size: 13px; font-family: 'Inter', sans-serif; width: 100%;
}

.user-pill {
  display: flex; align-items: center; gap: 12px;
  background: #27272a; padding: 4px 4px 4px 12px; border-radius: 20px;
}
.u-av { width: 24px; height: 24px; border-radius: 50%; }
.u-name { font-size: 12px; font-weight: 600; }
.u-btn {
  background: rgba(255,255,255,0.1); border: none;
  padding: 6px 12px; border-radius: 16px; color: rgba(255,255,255,0.7);
  font-size: 11px; display: flex; align-items: center; gap: 4px; cursor: pointer;
}
.icon-btn {
  width: 32px; height: 32px; border-radius: 50%;
  background: transparent; border: 1px solid rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.7); display: flex; align-items: center; justify-content: center;
}
.top-avatar { width: 32px; height: 32px; border-radius: 50%; margin: 0 8px; }
.menu-btn {
  background: transparent; border: none; display: flex; align-items: center; gap: 8px;
  color: rgba(255,255,255,0.7); font-size: 13px; cursor: pointer;
}

/* Header Tabs */
.nano-tabs-dock { display: flex; align-items: center; gap: 16px; background: rgba(255,255,255,0.03); padding: 4px; border-radius: 12px; }
.tab-separator { width: 1px; height: 14px; background: rgba(255,255,255,0.1); margin: 0 4px; }
.tab-icon { margin-right: 6px; color: rgba(255,255,255,0.4); }
.n-tab {
  background: transparent; border: none; color: rgba(255,255,255,0.5);
  font-size: 13px; font-weight: 500; cursor: pointer; padding: 6px 12px;
  border-radius: 8px; transition: all 0.2s; display: flex; align-items: center;
}
.n-tab:hover { color: rgba(255,255,255,0.8); }
.n-tab.active { background: rgba(255,255,255,0.1); color: white; font-weight: 600; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }
.n-tab.active .tab-icon { color: #8758FF; }

/* ── Dashboard Grid ── */
.nano-dashboard {
  padding: 24px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 320px;
  grid-auto-rows: auto;
  gap: 20px;
  max-width: 1540px; margin: 0 auto;
}
@media (max-width: 1200px) {
  .nano-dashboard { grid-template-columns: 1fr; }
}

.mid-top { display: contents; }

/* ── Generic Card ── */
.n-card {
  background: rgba(255,255,255,0.03);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 24px;
  padding: 24px;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.02);
  display: flex;
  flex-direction: column;
  height: 100%;
}
.full-width-card { margin: 0 24px; padding: 32px; min-height: 400px; display: flex; flex-direction: column; }
.empty-state { flex: 1; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.3); font-size: 14px; }
.empty-state-enhanced {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  gap: 16px;
  animation: fadeIn 0.6s ease both;
}
.ese-icon-wrap {
  width: 64px;
  height: 64px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #facc15;
  margin-bottom: 8px;
  box-shadow: 0 8px 32px rgba(250, 204, 21, 0.1), inset 0 0 20px rgba(255,255,255,0.02);
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.empty-state-enhanced:hover .ese-icon-wrap {
  transform: translateY(-8px) scale(1.05);
  background: rgba(250, 204, 21, 0.1);
  border-color: rgba(250, 204, 21, 0.4);
  box-shadow: 0 15px 45px rgba(250, 204, 21, 0.2);
}
.empty-state-enhanced h4 {
  font-size: 17px;
  font-weight: 700;
  color: white;
  margin: 0;
  letter-spacing: -0.01em;
}
.empty-state-enhanced p {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.4);
  max-width: 220px;
  line-height: 1.6;
  margin: 0;
}

/* ── Column 1: New Task / Meta ── */
/* ── Column 1: New Task / Meta ── */
.hero-card { 
  padding: 20px; 
  position: relative; 
  overflow: hidden; 
  transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  background: linear-gradient(145deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01));
}
.hero-card:hover {
  transform: translateY(-5px);
  border-color: rgba(250, 204, 21, 0.4);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 20px rgba(250, 204, 21, 0.1);
}
.hero-card::after {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(250, 204, 21, 0.05) 0%, transparent 70%);
  opacity: 0;
  transition: opacity 0.5s ease;
  pointer-events: none;
}
.hero-card:hover::after {
  opacity: 1;
}

.hero-illustration {
  background: #1c1c1e; border-radius: 16px; padding: 20px;
  height: 200px; margin-bottom: 20px; display: flex; align-items: center; justify-content: center;
  position: relative;
  overflow: hidden;
  box-shadow: inset 0 0 40px rgba(0,0,0,0.4);
}
.hero-illustration::before,
.hero-illustration::after {
  content: '';
  position: absolute;
  width: 140px;
  height: 140px;
  background: radial-gradient(circle, rgba(250, 204, 21, 0.15) 0%, transparent 70%);
  filter: blur(40px);
  border-radius: 50%;
  pointer-events: none;
}

.hero-illustration::before {
  top: -20px;
  left: -20px;
  animation: morphOrbit1 12s ease-in-out infinite;
}

.hero-illustration::after {
  bottom: -20px;
  right: -20px;
  animation: morphOrbit2 15s ease-in-out infinite reverse;
}

@keyframes morphOrbit1 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(120px, 40px) scale(1.2); }
  66% { transform: translate(60px, 100px) scale(0.8); }
}

@keyframes morphOrbit2 {
  0%, 100% { transform: translate(0, 0) scale(1); }
  33% { transform: translate(-100px, -60px) scale(1.3); }
  66% { transform: translate(-40px, -120px) scale(0.9); }
}

.wire-grid {
  display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr 1fr;
  gap: 12px; width: 140px; height: 160px;
  z-index: 1;
  animation: float 4s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  50% { transform: translateY(-10px) rotate(2deg); }
}

.w-box { 
  background: rgba(255,255,255,0.05); 
  border-radius: 10px; 
  border: 1px solid rgba(255,255,255,0.05); 
  backdrop-filter: blur(4px);
  transition: all 0.3s ease;
}
.hero-card:hover .w-box {
  background: rgba(255,255,255,0.08);
  border-color: rgba(255,255,255,0.1);
}

.b1 { grid-column: 1; grid-row: 1 / span 2; padding: 12px; display: flex; flex-direction: column; gap: 8px; justify-content: flex-end; }
.w-line { height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; position: relative; overflow: hidden; }
.w-line::after {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 100%; height: 100%;
  background: linear-gradient(90deg, transparent, rgba(250, 204, 21, 0.2), transparent);
  animation: shimmer 2s infinite;
}
@keyframes shimmer {
  100% { left: 100%; }
}

.w-line.short { width: 60%; }
.b2 { grid-column: 2; grid-row: 1; }
.b3 { grid-column: 2; grid-row: 2; }
.b4 { grid-column: 1; grid-row: 3; }
.badd { grid-column: 2; grid-row: 3; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.3); }
.badd svg { transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
.hero-card:hover .badd svg { transform: scale(1.4) rotate(90deg); color: #facc15; }

.hero-content h3 { font-size: 18px; font-weight: 700; margin: 0 0 8px 0; color: #fff; letter-spacing: -0.02em; }
.hero-content p { font-size: 12px; color: rgba(255,255,255,0.5); line-height: 1.6; margin: 0 0 24px 0; }
.hero-actions { display: flex; gap: 12px; }

.n-btn {
  padding: 12px 16px; border-radius: 12px; font-size: 13px; font-weight: 600;
  border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; flex: 1;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.n-btn.primary { 
  background: #facc15; 
  color: #1c1c1e; 
  box-shadow: 0 4px 15px rgba(250, 204, 21, 0.2);
  position: relative;
  overflow: hidden;
}
.n-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(250, 204, 21, 0.3);
  filter: brightness(1.1);
}
.n-btn.primary::before {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 100%; height: 100%;
  background: linear-gradient(120deg, transparent, rgba(255,255,255,0.3), transparent);
  transition: all 0.6s;
}
.n-btn.primary:hover::before {
  left: 100%;
}

.n-btn.outline { 
  background: rgba(255,255,255,0.05); 
  color: rgba(255,255,255,0.7); 
  border: 1px solid rgba(255,255,255,0.1);
}
.n-btn.outline:hover {
  background: rgba(255,255,255,0.1);
  color: #fff;
  border-color: rgba(255,255,255,0.2);
}

.meeting-card { padding: 20px; position: relative; }
.blur-text { font-size: 12px; color: #3b82f6; font-weight: 600; }
.meeting-card h3 { font-size: 18px; margin: 4px 0 16px 0; font-weight: 600; }
.add-new-text {
  position: absolute; top: 20px; right: 20px;
  background: transparent; border: none; color: #8758FF; font-size: 12px; font-weight: 600;
  display: flex; align-items: center; gap: 4px; cursor: pointer;
}
.m-avatars { display: flex; align-items: center; margin-bottom: 20px; }
.m-avatars.no-margin { margin-bottom: 0; }
.m-avatars img { width: 28px; height: 28px; border-radius: 50%; border: 2px solid #232326; margin-left: -8px; }
.m-avatars img:first-child { margin-left: 0; }
.m-more {
  width: 28px; height: 28px; border-radius: 50%; background: #4ade80; color: #1c1c1e;
  font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center;
  margin-left: -8px; border: 2px solid #232326; z-index: 1;
}
.m-details { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
.md-box { display: flex; align-items: center; gap: 12px; background: #1c1c1e; padding: 12px; border-radius: 14px; }
.md-icon { color: rgba(255,255,255,0.4); }
.md-l { font-size: 10px; color: #8b8b93; margin-bottom: 2px; }
.md-v { font-size: 12px; font-weight: 600; color: white; }
.swipe-btn {
  width: 100%; background: #1c1c1e; border: none; border-radius: 20px;
  padding: 6px; display: flex; align-items: center; position: relative; cursor: pointer;
}
.swipe-thumb {
  width: 36px; height: 36px; border-radius: 16px; background: rgba(255,255,255,0.1);
  display: flex; align-items: center; justify-content: center; color: #4ade80;
}
.swipe-btn span { flex: 1; text-align: center; font-size: 13px; color: rgba(255,255,255,0.6); padding-right: 36px; }

/* ── Tasks Card ── */
.tasks-card { padding: 24px; height: 100%; }
.tc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.tc-header h2 { font-size: 16px; margin: 0; font-weight: 600; }
.check-text { background: transparent; border: none; font-size: 11px; color: rgba(255,255,255,0.5); display: flex; align-items: center; gap: 6px; cursor: pointer; }
.tc-sub { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.tc-av { display: flex; align-items: center; background: rgba(255,255,255,0.05); padding: 4px 12px 4px 4px; border-radius: 20px; gap: 8px; font-size: 11px; font-weight: 600; }
.tc-av img { width: 20px; height: 20px; border-radius: 50%; }

.task-draggable-list { display: flex; flex-direction: column; gap: 12px; height: 100%; min-height: 0; overflow-y: auto; overflow-x: hidden; padding-right: 4px; }
.n-task-item { background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); border-radius: 16px; padding: 16px; display: flex; flex-direction: column; gap: 16px; }
.n-task-item.compact { gap: 0; padding: 12px 16px; }
.nti-header { display: flex; align-items: center; gap: 12px; }
.nti-header.compact-h { gap: 12px; }
.nti-av { width: 32px; height: 32px; border-radius: 50%; }
.nti-title { font-size: 14px; font-weight: 600; flex: 1; }
.nti-count { 
  width: auto; 
  height: 24px; 
  min-width: 24px;
  padding: 0 8px;
  border-radius: 12px; 
  background: rgba(255,255,255,0.1); 
  font-size: 10px; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  font-weight: 700; 
}
.nti-count.blue { background: #8758FF; }

.nti-count-wrapper {
  position: relative;
}

.nti-tooltip {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  width: 200px;
  background: rgba(20, 20, 22, 0.95);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  padding: 12px;
  z-index: 1000;
  box-shadow: 0 10px 40px rgba(0,0,0,0.5);
  opacity: 0;
  visibility: hidden;
  transform: translateY(10px);
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.nti-count-wrapper:hover .nti-tooltip {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.tooltip-header {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.4);
  letter-spacing: 0.05em;
  margin-bottom: 8px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.tooltip-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tooltip-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.7);
}

.tooltip-item.is-done {
  color: #4ade80;
}

.tooltip-item.is-done span {
  text-decoration: line-through;
  opacity: 0.6;
}
.icon-tab-btn { background: rgba(255,255,255,0.05); border: none; border-radius: 6px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.4); cursor: pointer; transition: all 0.2s; }
.icon-tab-btn:hover { background: rgba(255,255,255,0.1); color: white; }

.nti-progress { display: flex; flex-direction: column; gap: 8px; }
.n-prog-bg { background: #1c1c1e; height: 48px; border-radius: 24px; position: relative; display: flex; align-items: center; padding: 0 4px; border: 1px solid rgba(255,255,255,0.05); overflow: hidden; }
.n-prog-fill { position: absolute; left: 4px; top: 4px; bottom: 4px; background: #4ade80; border-radius: 20px; z-index: 0; transition: width 0.3s ease; }
.n-prog-fill.is-zero { background: rgba(255,255,255,0.08); }


.tc-av-wrapper { margin-bottom: 24px; }
.tc-av-circle { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; border: 2px solid #232326; }

.n-prog-text { position: relative; z-index: 1; font-size: 11px; margin-left: 12px; color: #1c1c1e; }
.n-prog-check { 
  position: relative; 
  z-index: 1; 
  margin-left: auto; 
  width: 24px; 
  height: 24px; 
  border-radius: 50%; 
  background: rgba(0,0,0,0.2); 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  color: #1c1c1e; 
  margin-right: 4px; 
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.n-prog-check:hover {
  background: #facc15;
  transform: scale(1.15) rotate(5deg);
  box-shadow: 0 0 15px rgba(250, 204, 21, 0.4);
}
.n-prog-check svg {
  transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.n-prog-check:hover svg {
  transform: scale(1.1);
  animation: checkPop 0.4s ease forwards;
}

@keyframes checkPop {
  0% { stroke-dasharray: 0 100; stroke-dashoffset: 0; }
  100% { stroke-dasharray: 100 0; stroke-dashoffset: 0; }
}

.nti-comment { display: flex; gap: 12px; background: rgba(255,255,255,0.02); padding: 12px; border-radius: 12px; }
.ntic-av { width: 28px; height: 28px; border-radius: 50%; background: #facc15; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 600; color: #1c1c1e; }
.ntic-text { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.ntic-name { font-size: 12px; font-weight: 600; }
.ntic-msg { font-size: 11px; color: rgba(255,255,255,0.5); }
.ntic-actions { display: flex; gap: 12px; color: rgba(255,255,255,0.4); margin-top: 4px; }
.ntic-more { color: rgba(255,255,255,0.3); }

/* Upcoming Card */
.upcoming-card { padding: 20px; }
.uc-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.uc-header h2 { font-size: 18px; margin: 0; font-weight: 600; }
.uc-actions { display: flex; gap: 12px; color: rgba(255,255,255,0.4); }

.uc-tabs { display: flex; gap: 8px; margin-bottom: 24px; }
.u-tab {
  background: rgba(255,255,255,0.05); border: none; border-radius: 8px;
  padding: 8px 12px; font-size: 12px; color: rgba(255,255,255,0.6);
  display: flex; align-items: center; gap: 6px; cursor: pointer;
}
.u-tab.active { background: rgba(255,255,255,0.1); color: white; }
.u-icon-tab { background: rgba(255,255,255,0.05); border: none; border-radius: 8px; padding: 8px; color: rgba(255,255,255,0.6); margin-left: auto; }

.uc-meeting-box { background: #1c1c1e; border-radius: 16px; padding: 20px; }
.umb-title { font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px; margin-bottom: 20px; }
.circle-blue { color: #8758FF; }
.umb-field { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.umb-field.inline { flex-direction: row; justify-content: space-between; align-items: center; margin-bottom: 0; }
.umb-field label { font-size: 11px; color: #8b8b93; }

.umb-tags { display: flex; gap: 8px; }
.u-tag { display: flex; align-items: center; gap: 6px; padding: 4px 8px 4px 4px; border-radius: 12px; font-size: 11px; font-weight: 600; color: #1c1c1e; }
.u-tag img, .u-tag svg { width: 16px; height: 16px; border-radius: 50%; }
.u-tag svg { padding: 2px; }
.u-tag.green { background: #4ade80; }
.u-tag.yellow { background: #facc15; }
.u-tag-avatar {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: rgba(0,0,0,0.15);
  display: flex;
  align-items: center;
  justify-content: center;
}
.u-tag.dark { background: rgba(255,255,255,0.1); color: white; padding: 4px 10px; }

.timer-box svg { color: #facc15; }
.timer-box span { letter-spacing: 0.05em; }

.u-date-picker {
  display: flex; justify-content: space-between; align-items: center;
  background: rgba(250, 204, 21, 0.1); border: 1px solid rgba(250, 204, 21, 0.3);
  padding: 10px 14px; border-radius: 10px; font-size: 13px; color: #facc15;
}
.udp-actions { display: flex; gap: 12px; align-items: center; }
.cal-icon { background: rgba(250, 204, 21, 0.2); padding: 4px; border-radius: 6px; box-sizing: content-box; color: #facc15; }

.umb-dots { display: flex; gap: 8px; }
.umb-dots span { width: 14px; height: 14px; border-radius: 50%; }
.d-red { background: #ef4444; } .d-purple { background: #8758FF; } .d-yellow { background: #facc15; } .d-green { background: #4ade80; }
.edit-btn { background: transparent; border: none; color: rgba(255,255,255,0.4); }

/* ── Recent Task Table ── */
.recent-table-card { padding: 24px; display: flex; flex-direction: column; gap: 20px; grid-column: span 2; }
@media (max-width: 1200px) {
  .recent-table-card { grid-column: span 1; }
}
.rtc-header { display: flex; justify-content: space-between; align-items: flex-end; }
.rtc-title h2 { font-size: 20px; margin: 0 0 8px 0; font-weight: 600; display: flex; align-items: center; gap: 6px; }
.up-badge { background: #4ade80; color: #1c1c1e; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 700; margin-right: 8px; }
.up-text { font-size: 12px; color: #8b8b93; }

.rtc-actions { display: flex; align-items: center; gap: 16px; }
.rtc-search { color: rgba(255,255,255,0.4); }
.rtc-toggle { display: flex; background: rgba(255,255,255,0.05); border-radius: 20px; padding: 2px; }
.t-btn { background: transparent; border: none; color: rgba(255,255,255,0.5); font-size: 11px; padding: 6px 12px; border-radius: 18px; cursor: pointer; }
.t-btn.active { background: #232326; color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.2); }

.rtc-tabs { display: flex; justify-content: space-between; align-items: center; }
.rtct-left { display: flex; gap: 8px; }
.r-tab { background: transparent; border: 1px solid rgba(255,255,255,0.1); border-radius: 20px; padding: 6px 16px; font-size: 12px; color: rgba(255,255,255,0.6); cursor: pointer; }
.r-tab.active { background: rgba(255,255,255,0.1); color: white; }
.r-export { background: #8758FF; border: none; color: white; padding: 6px 16px; border-radius: 10px; font-size: 12px; font-weight: 600; }

.rtc-table { display: flex; flex-direction: column; background: #1c1c1e; border-radius: 16px; padding: 8px; }
.rt-row { display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr 100px; padding: 16px; align-items: center; }
.rt-row:not(:last-child) { border-bottom: 1px solid rgba(255,255,255,0.03); }
.rt-row.header { font-size: 11px; color: rgba(255,255,255,0.4); font-weight: 500; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 12px; }
.rt-col { font-size: 13px; display: flex; align-items: center; }
.rt-col.end { justify-content: flex-end; }

.project-name { font-weight: 500; color: rgba(255,255,255,0.9); gap: 12px; }
.p-dot { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; color: white; }
.dot-blue { background: #3b82f6; } .dot-orange { background: #f59e0b; } .dot-green { background: #22c55e; } .dot-purple { background: #8758FF; }

.assign-col { gap: 8px; color: rgba(255,255,255,0.9); }
.assign-col img { width: 20px; height: 20px; border-radius: 50%; }

.muted { color: rgba(255,255,255,0.5); }
.date-highlight { color: #facc15; padding: 6px 16px; border: 1px solid rgba(250,204,21,0.3); border-radius: 20px; display: inline-block; background: rgba(250,204,21,0.05); }
.highlighted { color: #8758FF; }

.status-pill { padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600; text-transform: capitalize; }
.status-pill.pending, .status-pill.open, .status-pill.in_progress, .status-pill.upcoming { background: #facc15; color: #1c1c1e; }
.status-pill.completed { background: #4ade80; color: #1c1c1e; }
.status-pill.expired { background: #ef4444; color: white; }
.status-pill.extended { background: #8758FF; color: white; }
.status-pill.paused, .status-pill.blocked { background: #f59e0b; color: #1c1c1e; opacity: 0.8; }

/* ── Performance Chart Card ── */
.perf-card { padding: 20px; display: flex; flex-direction: column; gap: 20px; height: 100%; min-height: 0; }
.pc-header { display: flex; justify-content: space-between; align-items: center; flex-shrink: 0; }
.pc-header h2 { font-size: 16px; margin: 0; font-weight: 600; }
.pc-actions { display: flex; gap: 12px; color: rgba(255,255,255,0.4); align-items: center; }
.pc-actions svg:last-child { background: rgba(255,255,255,0.05); padding: 4px; border-radius: 6px; box-sizing: content-box; }

.pc-sub { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
.pcs-av-group { display: flex; align-items: center; }
.pcs-av-img { width: 32px; height: 32px; border-radius: 50%; border: 2px solid #1c1c1e; position: relative; z-index: 2; object-fit: cover; }
.pcs-av-badge { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #1c1c1e; border: 2px solid #1c1c1e; position: relative; z-index: 1; }
.pcs-av-group img + .pcs-av-badge { margin-left: -12px; }
.flag-btn { background: rgba(255,255,255,0.05); border: none; padding: 8px; border-radius: 8px; color: rgba(255,255,255,0.4); margin-left: auto; cursor: pointer; }

.chart-area { position: relative; height: 220px; background: #1c1c1e; border-radius: 16px; padding: 12px; display: flex; flex-direction: column; justify-content: flex-end; }
.chart-tasks-badge { position: absolute; top: 12px; right: 12px; background: rgba(74,222,128,0.15); color: #4ade80; font-size: 10px; font-weight: 600; padding: 4px 8px; border-radius: 12px; border: 1px solid rgba(74,222,128,0.3); display: flex; align-items: center; gap: 4px; }
.y-axis { display: flex; flex-direction: column; justify-content: space-between; height: 160px; font-size: 9px; color: rgba(255,255,255,0.3); position: absolute; left: 12px; top: 40px; }
.perf-svg { position: absolute; bottom: 12px; left: 40px; right: 12px; width: calc(100% - 52px); height: 180px; }

.pc-legend { display: flex; gap: 16px; padding-left: 8px; margin-top: 12px; }
.l-item { font-size: 10px; color: rgba(255,255,255,0.5); display: flex; align-items: center; gap: 6px; }
.l-dot { width: 6px; height: 6px; border-radius: 50%; }
.pcs-name { font-size: 14px; font-weight: 600; color: white; }
.nav-btn { cursor: pointer; color: rgba(255,255,255,0.4); transition: color 0.2s; }
.nav-btn:hover { color: white; }
.chart-loading { height: 100px; display: flex; align-items: center; justify-content: center; font-size: 12px; color: rgba(255,255,255,0.5); }

.l-dot.green { background: #4ade80; }
.l-dot.yellow { background: #facc15; }
.l-dot.red { background: #ef4444; }

/* ── Main Canvas ── */
.main-canvas { padding: 28px 40px; max-width: 1540px; margin: 0 auto; min-height: 80vh; }

/* ── Modern Table Layout ── */
.table-container-modern { display: flex; flex-direction: column; gap: 16px; animation: fadeIn 0.4s ease both; }
.header-actions-modern { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px; }
.title-group h3 { font-size: 18px; font-weight: 600; color: white; margin: 0; letter-spacing: -0.02em; }
.title-group p { font-size: 13px; color: rgba(255,255,255,0.5); margin-top: 4px; border: none; }

.search-box {
  display: flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
  padding: 6px 12px; border-radius: 8px;
}
.search-box input { background: transparent; border: none; outline: none; color: white; font-size: 12px; width: 160px; }
.search-box input::placeholder { color: rgba(255,255,255,0.3); }

.pm-table-modern { display: flex; flex-direction: column; width: 100%; border-radius: 16px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); }
.pm-row-modern {
    display: grid; 
    grid-template-columns: 80px 1.5fr 1fr 180px 100px 120px 120px;
    align-items: center; 
    padding: 12px 12px;
    border-bottom: 1px solid rgba(255,255,255,0.05);
    transition: background 0.2s;
}
.pm-row-modern.header {
    padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); background: transparent;
    font-size: 11px; text-transform: uppercase; color: rgba(255,255,255,0.4); font-weight: 600; letter-spacing: 0.05em;
    padding-left: 12px; padding-right: 12px;
}
.pm-row-modern.item {
    font-size: 14px; border-radius: 0;
    cursor: pointer;
    padding-left: 12px; padding-right: 12px;
}
.pm-row-modern.item:hover { background: rgba(255,255,255,0.03); }
.pm-row-modern.item:last-child { border-bottom: none; }

.v-name { font-size: 14px; font-weight: 600; color: #f5f5f7; }
.v-ref { font-family: 'SF Mono', monospace; }
.pill { display: inline-block; }

.status-badge {
    display: inline-flex; align-items: center; gap: 4px;
    padding: 2px 6px; border-radius: 4px; 
    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.05);
    font-size: 9px; font-weight: 600; letter-spacing: 0.02em; text-transform: uppercase;
}
.status-badge.compact { padding: 3px 8px; font-size: 10px; border-radius: 6px; }
.status-badge.completed { background: rgba(74, 222, 128, 0.1); color: #4ade80; }
.status-badge.expired { background: rgba(239, 68, 68, 0.1); color: #ef4444; }
.status-badge.open, .status-badge.upcoming { background: rgba(251, 191, 36, 0.1); color: #fbbf24; }
.status-badge.pending, .status-badge.in_progress { background: rgba(250, 204, 21, 0.1); border-color: rgba(250, 204, 21, 0.2); color: #facc15; } 
.status-badge.blocked { background: rgba(239, 68, 68, 0.1); border-color: rgba(239, 68, 68, 0.2); color: #f87171; }

@keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
</style>
