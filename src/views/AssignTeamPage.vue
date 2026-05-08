<template>
  <div class="assign-team-page">
    <!-- Header -->
    <header class="page-header">
      <div class="header-left">
        <div class="header-icon">
          <UsersRound :size="24" />
        </div>
        <div class="header-text">
          <h1>Team Assignment</h1>
          <p>Manage teams for approved projects</p>
        </div>
      </div>
      <div class="header-right">
        <!-- Search Bar -->
        <div class="search-bar">
          <Search :size="14" class="search-icon" />
          <input v-model="searchQuery" type="text" placeholder="Search projects..." />
        </div>
      </div>
    </header>

    <!-- Stats Dashboard -->
    <div class="stats-dashboard">
      <StatsCard label="Active Projects" :value="totalRecords">
        <template #icon>
          <FolderKanban :size="24" />
        </template>
      </StatsCard>

      <StatsCard label="Unassigned Projects" :value="unassignedProjectsCount">
        <template #icon>
          <AlertCircle :size="24" />
        </template>
      </StatsCard>

      <StatsCard label="Pending Invites" :value="pendingInvitesCount">
        <template #icon>
          <Clock :size="24" />
        </template>
      </StatsCard>

      <StatsCard label="Total Budget" :value="formatCompactNumber(totalBudget)">
        <template #icon>
          <span class="currency-symbol">$</span>
        </template>
      </StatsCard>
    </div>

    <!-- Invitation Status Filter (User Panel Only) -->
    <div v-if="!isAdmin" class="filter-tabs">
      <button 
        class="filter-tab" 
        :class="{ active: inviteFilter === 'all' }"
        @click="setInviteFilter('all')"
      >
        All
      </button>
      <button 
        class="filter-tab" 
        :class="{ active: inviteFilter === 'pending' }"
        @click="setInviteFilter('pending')"
      >
        <Clock :size="14" />
        Pending
      </button>
      <button 
        class="filter-tab" 
        :class="{ active: inviteFilter === 'accepted' }"
        @click="setInviteFilter('accepted')"
      >
        <Check :size="14" />
        Accepted
      </button>
      <button 
        class="filter-tab declined" 
        :class="{ active: inviteFilter === 'declined' }"
        @click="setInviteFilter('declined')"
      >
        <X :size="14" />
        Rejected
      </button>
      <button 
        class="filter-tab received" 
        :class="{ active: inviteFilter === 'received' }"
        @click="setInviteFilter('received')"
      >
        <Briefcase :size="14" />
        Received
      </button>
    </div>

    <!-- Admin Filters -->
    <div v-if="isAdmin" class="admin-filters">
      <DatePicker 
        v-model="startDate" 
        placeholder="Start Date" 
        class="filter-date"
      />
      
      <DatePicker 
        v-model="endDate" 
        placeholder="End Date" 
        class="filter-date"
        :min-date="startDate"
        :disabled="!startDate"
      />
      
      <ProjectOwnerSelect 
        v-model="projectOwnerId" 
        @change="handleFilterChange" 
      />
      
      <CustomSelect
        v-model="invitationStatus"
        :options="invitationStatusOptions"
        label-key="label"
        value-key="value"
        placeholder="Invitation Status"
        class="filter-status"
        @change="handleFilterChange"
      />

      <button v-if="hasActiveFilters" class="clear-filters-btn" @click="clearFilters">
        <X :size="14" />
        Clear
      </button>
    </div>

    <!-- Custom Geometric Table -->
    <GeoTable
      :title="tableTitle"
      :columns="tableColumns"
      :items="filteredProjects"
      :loading="isLoading"
      empty-text="No approved projects available"
      @row-click="openProjectDetails"
    >
      <!-- Project Name Column -->
      <template #name="{ item }">
        <div class="cell-project">
          <div class="project-indicator"></div>
          <div class="project-info">
            <span class="project-name">{{ item.name }}</span>
            <span class="project-code">{{ item.code }}</span>
          </div>
        </div>
      </template>

      <!-- Focus Area Column -->
      <template #focus="{ item }">
        <div class="cell-focus">
          <span class="focus-org" :title="item.organization">{{ item.organization || '—' }}</span>
          <span class="focus-type">{{ item.project_type || 'General' }}</span>
        </div>
      </template>

      <template #timeline="{ item }">
        <div class="cell-timeline">
          <div class="timeline-pill">
            <div class="timeline-row dates">
              <Calendar :size="12" class="icon-muted" />
              <span>{{ formatDateCompact(item.start_date) }} - {{ formatDateCompact(item.end_date) }}</span>
            </div>
            <div class="timeline-row duration">
              <Clock :size="12" class="icon-muted" />
              <span>{{ getDuration(item.start_date, item.end_date) }}</span>
            </div>
          </div>
        </div>
      </template>

      <!-- Budget Column -->
      <template #budget="{ item }">
        <div class="cell-budget">
          <span class="currency">{{ item.currency || 'USD' }}</span>
          <span class="amount">{{ formatBudget(item.budget_amount) }}</span>
        </div>
      </template>

      <!-- Status Column -->
      <template #status="{ item }">
         <StatusBadge :status="item.status" />
      </template>

      <!-- Team Column -->
      <template #team="{ item }">
        <div class="cell-team">
          <div class="avatar-stack" v-if="item.team_members && item.team_members.length">
            <div 
              v-for="(member, idx) in item.team_members.slice(0, 3)" 
              :key="idx"
              class="stack-avatar"
              :class="{ 'declined': member.status === 'declined' }"
              :style="{ 
                background: getAvatarColor(member),
                zIndex: 3 - idx 
              }"
            >
              {{ getInitials(member.user_name || 'User') }}
            </div>
            <div v-if="item.team_members.length > 3" class="avatar-more">
              +{{ item.team_members.length - 3 }}
            </div>
          </div>
          <span v-else class="no-team">No team</span>
        </div>
      </template>

      <!-- Owner Column -->
      <template #owner="{ item }">
        <div class="cell-owner">
          <div class="owner-avatar" :style="{ background: getGradient(item.created_by_name) }">
            {{ getInitials(item.created_by_name) }}
          </div>
          <span>{{ item.created_by_name }}</span>
        </div>
      </template>

      <!-- Action Column -->
      <template #action="{ item }">
        <div class="cell-action">
          <div v-if="inviteFilter === 'received'" class="action-buttons">
             <button 
              class="btn-icon-action accept" 
              title="Accept Invitation"
              @click.stop="respondToInvite(item, true)"
            >
              <Check :size="16" />
            </button>
            <button 
              class="btn-icon-action decline" 
              title="Decline Invitation"
              @click.stop="respondToInvite(item, false)"
            >
              <X :size="16" />
            </button>
          </div>
          <TableManageButton 
            v-else
            @click.stop="openTeamPanel(item)" 
            label="Manage" 
          />
        </div>
      </template>
    </GeoTable>

    <!-- Pagination -->
    <PaginationControls 
       v-if="!isLoading && projects.length > 0"
       v-model:page="page"
       v-model:limit="limit"
       :total="totalRecords"
       :totalPages="totalPages"
       @update:page="fetchProjects"
       @update:limit="fetchProjects"
    />

    <!-- Project Details Modal -->
    <GeoModal
      v-model="showDetailsModal"
      :title="selectedProject?.name || 'Project Details'"
      :subtitle="selectedProject?.code"
      icon-bg="rgba(255, 255, 255, 0.05)"
    >
      <template #icon>
        <Briefcase :size="20" />
      </template>

      <ProjectDetailsPanel v-if="selectedProject" :project="selectedProject" @refresh="fetchProjects" />

      <template #footer>
        <div class="modal-actions-right">
           <button class="btn-text" @click="showDetailsModal = false">Close</button>
           <button class="btn-primary" @click="openTeamPanelFromDetails">
             Manage Team
           </button>
        </div>
      </template>
    </GeoModal>

    <!-- Team Management Modal -->
    <GeoModal
      v-model="showTeamModal"
      :title="'Assign Team'"
      :subtitle="teamProject?.name"
      icon-bg="rgba(255, 255, 255, 0.05)"
      width="750px"
    >
      <template #icon>
        <UsersRound :size="20" />
      </template>

      <!-- Structured Content -->
      <div class="team-modal-content">
        <!-- Search Section -->
        <div class="search-section">
          <label class="section-label">Find Team Members</label>
          <div class="team-search">
            <Search :size="14" />
            <input v-model="memberSearch" type="text" placeholder="Search users..." />
          </div>
        </div>

        <!-- Divider -->
        <div class="section-divider"></div>

        <!-- Users Section -->
        <div class="users-section">
          <label class="section-label">Available Users <span class="count">({{ filteredUsers.length }})</span></label>
          <div class="users-list">
        <div 
          v-for="user in filteredUsers" 
          :key="user.id"
          class="user-item"
          :class="{ selected: isSelected(user.id) }"
          @click="toggleUser(user)"
        >
          <div class="user-avatar" :style="{ background: getGradient(user.full_name) }">
            {{ getInitials(user.full_name) }}
          </div>
          <div class="user-info">
            <span class="user-name">{{ user.full_name }}</span>
            <span class="user-email">{{ user.email }}</span>
          </div>
          <div class="user-check">
            <Check v-if="isSelected(user.id)" :size="16" />
            <Plus v-else :size="16" />
          </div>
          </div>
        </div>
      </div>

        <!-- Divider -->
        <div class="section-divider" v-if="isAdmin && assignedMembers.length"></div>

        <!-- Assigned Users Section (Admin Only) -->
        <div class="assigned-section" v-if="isAdmin && assignedMembers.length">
          <div class="assigned-header">
            <label class="section-label">Assigned Team</label>
            <span class="member-count">{{ assignedMembers.length }} {{ assignedMembers.length === 1 ? 'member' : 'members' }}</span>
          </div>
          <div class="assigned-list">
            <div 
              v-for="member in assignedMembers" 
              :key="member.id"
              class="assigned-item"
              :class="{ 'is-owner': member.role === 'Owner' }"
            >
              <div class="assigned-avatar" :style="{ background: getGradient(member.user_name) }">
                {{ getInitials(member.user_name) }}
              </div>
              <div class="assigned-info">
                <div class="assigned-name-row">
                  <span class="assigned-name">{{ member.user_name }}</span>
                  <span v-if="member.role === 'Owner'" class="owner-badge">
                    <Crown :size="10" />
                    Owner
                  </span>
                </div>
                <span class="assigned-status" :class="member.status">{{ member.status }}</span>
              </div>
              <button 
                v-if="member.status === 'declined' && isAdmin"
                class="override-btn"
                @click="openOverrideDialog(member)"
                title="Override and Add to Team"
              >
                <UserCheck :size="14" />
              </button>

              <!-- Only show remove button for non-owners -->
              <button 
                v-if="member.role !== 'Owner'"
                class="remove-btn" 
                @click="openRemoveDialog(member)"
                :disabled="removingMember === member.id"
                title="Remove from team"
              >
                <Loader2 v-if="removingMember === member.id" :size="14" class="spin" />
                <Trash2 v-else :size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="modal-actions-right">
          <button class="btn-secondary" @click="clearSelected">
            <span>Clear</span>
          </button>
          <button 
            class="btn-primary" 
            @click="submitTeam"
            :disabled="!selectedUsers.length || isSubmitting"
          >
            <Loader2 v-if="isSubmitting" :size="16" class="spin" />
            <Send v-else :size="16" />
            <span>Assign {{ selectedUsers.length ? `(${selectedUsers.length})` : '' }}</span>
          </button>
        </div>
      </template>
    </GeoModal>

    <!-- Remove Reason Dialog using ConfirmationModal -->
    <ConfirmationModal
      :isOpen="showRemoveDialog"
      title="Remove Team Member"
      :message="`You are about to remove ${memberToRemove?.user_name} from this project. This action cannot be undone.`"
      confirmText="Remove Member"
      cancelText="Cancel"
      :icon="Trash2"
      :loading="!!removingMember"
      @close="cancelRemove"
      @confirm="confirmRemove"
    >
      <!-- Custom slot for reason input -->
      <div class="reason-input-group">
        <label class="reason-label">Reason for removal <span class="required">*</span></label>
        <textarea 
          v-model="removeReason" 
          class="reason-textarea"
          :class="{ 'has-error': reasonError }"
          placeholder="Please provide a reason for removing this team member..."
          rows="3"
        ></textarea>
        <span v-if="reasonError" class="reason-error">Reason is required</span>
      </div>
    </ConfirmationModal>

    <!-- Decline Invitation Dialog -->
    <ConfirmationModal
      :isOpen="showDeclineModal"
      title="Decline Team Invitation"
      :message="`Are you sure you want to decline the invitation for '${declineItem?.name || 'this project'}'?`"
      confirmText="Decline Invitation"
      cancelText="Cancel"
      :icon="X"
      :loading="declining"
      @close="cancelDecline"
      @confirm="confirmDecline"
    >
      <div class="reason-input-group">
        <label class="reason-label">Reason for declining <span class="required">*</span></label>
        <textarea 
          v-model="declineReason" 
          class="reason-textarea"
          :class="{ 'has-error': declineError }"
          placeholder="Please provide a reason..."
          rows="3"
        ></textarea>
        <span v-if="declineError" class="reason-error">Reason is required</span>
      </div>
    </ConfirmationModal>


    <!-- Override Confirmation Dialog -->
    <ConfirmationModal
      :isOpen="showOverrideDialog"
      title="Override Declined Invitation"
      :message="`Are you sure you want to force-add ${memberToOverride?.user_name} to the team? They previously declined the invitation.`"
      confirmText="Override & Add"
      cancelText="Cancel"
      :icon="UserCheck"
      :loading="!!overridingMember"
      @close="cancelOverride"
      @confirm="confirmOverride"
    >
      <!-- Override Reason Input -->
      <div class="reason-input-group">
        <label class="reason-label">Override Reason</label>
        <textarea 
          v-model="overrideReason" 
          class="reason-textarea"
          placeholder="Provide a reason for overriding this decline (optional)..."
          rows="3"
        ></textarea>
      </div>
    </ConfirmationModal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { useToast } from '../composables/useToast'
import GeoTable from '../components/ui/GeoTable.vue'
import GeoModal from '../components/ui/GeoModal.vue'
import ProjectDetailsPanel from '../components/projects/ProjectDetailsPanel.vue'
import DatePicker from '../components/ui/DatePicker.vue'
import CustomSelect from '../components/ui/CustomSelect.vue'
import ProjectOwnerSelect from '../components/ui/ProjectOwnerSelect.vue'
import StatusBadge from '../components/ui/StatusBadge.vue'
import TableManageButton from '../components/ui/TableManageButton.vue'
import StatsCard from '../components/ui/StatsCard.vue'
import ConfirmationModal from '../components/ui/ConfirmationModal.vue'
import { 
  UsersRound, Search, FolderKanban, Briefcase, UserPlus, Users, Calendar,
  Check, Plus, Send, Loader2, AlertCircle, Clock, X, UserMinus, Crown, Trash2, UserCheck
} from 'lucide-vue-next'
import PaginationControls from '../components/ui/PaginationControls.vue'

const route = useRoute()
const { success, error } = useToast()

// State
const projects = ref([])
const users = ref([])
const isLoading = ref(true)
const memberSearch = ref('')
const currentUserId = ref(null) // To track current user for "Received" filter

// Pagination
const page = ref(1)
const limit = ref(10)
const totalRecords = ref(0)
const totalPages = ref(1)

// Modals
const showDetailsModal = ref(false)
const showTeamModal = ref(false)
const teamProject = ref(null)
const selectedUsers = ref([])
const isSubmitting = ref(false)

// Decline Modal State (for Received tab)
const showDeclineModal = ref(false)
const declineReason = ref('')
const declineError = ref(false)
const declineItem = ref(null)
const declining = ref(false)

// Remove Dialog State
const showRemoveDialog = ref(false)
const memberToRemove = ref(null)
const removeReason = ref('')
const removingMember = ref(null)
const reasonError = ref(false)

// Invitation Filter (User Panel Only)
const inviteFilter = ref('all') // 'all', 'pending', 'accepted', 'declined', 'received'
const searchQuery = ref('')
const selectedProject = ref(null) // For details panel

// Admin Filters State
const startDate = ref('')
const endDate = ref('')
const projectOwnerId = ref(null)
const invitationStatus = ref(null)

const invitationStatusOptions = [
  { label: 'All Statuses', value: null },
  { label: 'Pending', value: 'pending' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Declined', value: 'declined' },
  { label: 'Removed', value: 'removed' }
]

const hasActiveFilters = computed(() => {
  return startDate.value || endDate.value || projectOwnerId.value || invitationStatus.value
})

const clearFilters = () => {
  startDate.value = ''
  endDate.value = ''
  projectOwnerId.value = null
  invitationStatus.value = null
  fetchProjects()
}

// Debounced filter handler to prevent multiple rapid API calls
let filterDebounceTimeout = null
const debouncedFetchProjects = () => {
  if (filterDebounceTimeout) clearTimeout(filterDebounceTimeout)
  filterDebounceTimeout = setTimeout(() => {
    page.value = 1
    fetchProjects()
  }, 300) // 300ms debounce
}

// Watch general filters (Owner, Status) to refresh with debounce
watch([projectOwnerId, invitationStatus], debouncedFetchProjects)

// Watch Date Filters specifically to enforce "Combined" logic
watch([startDate, endDate], ([newStart, newEnd]) => {
  // If Start Date changes and matches or exceeds End Date, clear End Date (Validation)
  if (newStart && newEnd && new Date(newStart) > new Date(newEnd)) {
    endDate.value = ''
    return // Exit, don't fetch yet (wait for valid end date)
  }

  // Only fetch if BOTH are set, or BOTH are empty (cleared)
  const bothSet = newStart && newEnd
  const bothEmpty = !newStart && !newEnd

  if (bothSet || bothEmpty) {
    debouncedFetchProjects()
  }
})

const isAdmin = computed(() => route.path.startsWith('/admin'))

const tableTitle = computed(() => {
  if (isAdmin.value) {
    if (!invitationStatus.value) return 'All Projects'
    const statusLabels = {
      pending: 'Pending Projects',
      accepted: 'Accepted Projects',
      declined: 'Declined Projects',
      removed: 'Removed Projects'
    }
    return statusLabels[invitationStatus.value] || 'Projects'
  }
  
  const titles = {
    all: 'Approved Projects',
    pending: 'Pending Invitations',
    accepted: 'Accepted Projects',
    declined: 'Declined Invitations',
    received: 'Received Invitations'
  }
  return titles[inviteFilter.value] || 'Projects'
})

const handleFilterChange = () => {
  // Triggered by selects explicitly if needed, but watch handles it
}


const setInviteFilter = (filter) => {
  inviteFilter.value = filter
}



// Assigned team members for current project
const assignedMembers = computed(() => {
  if (!teamProject.value?.team_members) return []
  // Show accepted members, plus declined members (so admins can override)
  return teamProject.value.team_members.filter(m => m.status === 'accepted' || m.status === 'declined')
})

// Table Columns
const tableColumns = [
  { key: 'name', label: 'Project', flex: '1.5' },
  { key: 'focus', label: 'Focus Area', width: '220px' },
  { key: 'timeline', label: 'Timeline', width: '200px' },
  { key: 'budget', label: 'Budget', width: '120px' },
  { key: 'status', label: 'Status', width: '110px' },
  { key: 'team', label: 'Team', width: '140px' },
  { key: 'owner', label: 'Owner', width: '150px' },
  { key: 'action', label: '', width: '100px' }
]

// Computed
const totalMembers = computed(() => 
  projects.value.reduce((sum, p) => sum + (p.team_members?.length || p.team_count || 0), 0)
)

const serverUnassignedCount = ref(0)
const serverPendingCount = ref(0)
const unassignedProjectsCount = computed(() => serverUnassignedCount.value)
const pendingInvitesCount = computed(() => serverPendingCount.value)

const serverTotalBudget = ref(0) // New state for server-side total

const totalBudget = computed(() => serverTotalBudget.value) // Use server total

const filteredProjects = computed(() => {
  let result = projects.value
  
  // Apply search filter
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    result = result.filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.code.toLowerCase().includes(q)
    )
  }
  
  // Apply invitation status filter (User Panel Only)
  if (!isAdmin.value && inviteFilter.value !== 'all') {
    result = result.filter(p => {
      const members = p.team_members || []
      const isOwner = p.created_by_id === currentUserId.value

      if (inviteFilter.value === 'received') {
        // "Received" tab: Only show projects where CURRENT USER is invited and Pending
        // Never show owned projects here (since you don't receive invites for your own projects)
        if (isOwner) return false
        return members.some(m => m.user_id === currentUserId.value && m.status === 'pending')
      }

      if (isOwner) {
        // OWNER VIEW: Check status of people I invited (excluding myself)
        const invitedMembers = members.filter(m => m.user_id !== p.created_by_id)
        
        if (inviteFilter.value === 'pending') {
          return invitedMembers.some(m => m.status === 'pending')
        } else if (inviteFilter.value === 'accepted') {
          return invitedMembers.some(m => m.status === 'accepted')
        } else if (inviteFilter.value === 'declined') {
          return invitedMembers.some(m => m.status === 'declined')
        }
      } else {
        // MEMBER VIEW: Check MY status in this project
        const myMembership = members.find(m => m.user_id === currentUserId.value)
        if (!myMembership) return false // Should not notify/list if not a member

        if (inviteFilter.value === 'pending') {
          // "Invitation Sent" tab - usually for owners showing sent invites. 
          // If I am just a member, I shouldn't see projects in "Invitation Sent" 
          // unless I have a role that allows inviting? Assuming purely "My Status" for now:
          return false 
        } else if (inviteFilter.value === 'accepted') {
           // Show if I accepted
          return myMembership.status === 'accepted'
        } else if (inviteFilter.value === 'declined') {
           // Show if I declined
          return myMembership.status === 'declined'
        }
      }
      
      return true
    })
  }
  
  return result
})

const filteredUsers = computed(() => {
  // Only exclude members who are currently on the team (not removed)
  const existingIds = teamProject.value?.team_members
    ?.filter(m => m.status !== 'removed')
    .map(m => m.user_id) || []
    
  let result = users.value.filter(u => !existingIds.includes(u.id))
  
  if (memberSearch.value) {
    const q = memberSearch.value.toLowerCase()
    result = result.filter(u => u.full_name.toLowerCase().includes(q))
  }
  return result
})

// Helpers
const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'

const getGradient = (name) => {
  return '#f97316' // Solid orange as requested
}

// Get avatar color based on member status - color coded for each status
const getAvatarColor = (member) => {
  if (member.status === 'declined') return '#a855f7' // Purple for declined
  if (member.status === 'pending') return '#f59e0b' // Amber for pending
  if (member.status === 'removed') return '#ef4444' // Red for removed
  return '#f97316' // Orange for accepted/others
}

const formatCompactNumber = (num) => {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(num)
}

const formatBudget = (amount) => {
  if (!amount) return '0'
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)
}

const formatDate = (dateStr) => {
  if (!dateStr) return 'Not set'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const formatDateCompact = (dateStr) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

const getDuration = (start, end) => {
  if (!start || !end) return '—'
  const startDate = new Date(start)
  const endDate = new Date(end)
  const diffTime = Math.abs(endDate - startDate)
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 30) return `${diffDays} days`
  if (diffDays < 365) {
    const months = Math.round(diffDays / 30 * 10) / 10
    return `${months} months`
  }
  const years = Math.round(diffDays / 365 * 10) / 10
  return `${years} years`
}

const isSelected = (userId) => selectedUsers.value.some(u => u.id === userId)

const getToken = () => route.path.startsWith('/admin') 
  ? localStorage.getItem('admin_token') 
  : localStorage.getItem('user_token')

// Actions
const fetchProjects = async (background = false) => {
  if (!background) isLoading.value = true
  try {
    const params = {
      page: page.value,
      limit: limit.value,
      search: searchQuery.value || undefined
    }

    if (isAdmin.value) {
      if (startDate.value) params.start_date = startDate.value
      if (endDate.value) params.end_date = endDate.value
      if (projectOwnerId.value) params.owner_id = projectOwnerId.value
      if (invitationStatus.value) params.invite_status = invitationStatus.value
    } else {
      // User specific filters (handled by backend or existing logic)
      if (inviteFilter.value !== 'all' && inviteFilter.value !== 'received') {
        // Current backend doesn't support 'invite_status' for users in this way, 
        // but 'received' logic is client side or separate logic?
        // Wait, current fetchProjects didn't send inviteFilter before.
        // Looking at lines 650-660 of view_file earlier, it didn't send invites status.
        // It seems purely client side filtering? 
        // "filteredProjects" computed property handles it?
        // Let's check filteredProjects
      }
    }

    const res = await axios.get('http://localhost:8000/api/team/projects', {
      headers: { Authorization: `Bearer ${getToken()}` },
      params
    })
    
    const projectItems = res.data.items || []
    totalRecords.value = res.data.total || 0
    totalPages.value = res.data.pages || 1
    serverTotalBudget.value = res.data.total_budget || 0
    serverUnassignedCount.value = res.data.unassigned_count || 0
    serverPendingCount.value = res.data.pending_count || 0

    // Team members are now included in project response (optimized)
    projects.value = projectItems.map(p => ({
      ...p,
      team_members: p.team_members || []
    }))
    console.log('[Projects] Total:', projectItems.length, 'with teams:', projectItems.filter(p => p.team_members?.length > 0).length)
  } catch (e) {
    if (!background) error('Failed to load projects') // Don't show toast on background fail to avoid spam
    console.error('[Projects] Failed to load:', e)
  } finally {
    if (!background) isLoading.value = false
  }
}

const fetchUsers = async () => {
  try {
    const isUserPanel = !route.path.startsWith('/admin')
    const res = await axios.get('http://localhost:8000/api/team/users', {
      headers: { Authorization: `Bearer ${getToken()}` },
      params: { 
        exclude_admins: isUserPanel,
        exclude_self: isUserPanel  // Users can't invite themselves
      }
    })
    users.value = res.data
  } catch (e) {
    error('Failed to load users')
  }
}

const openProjectDetails = async (project) => {
  // Show modal immediately with basic project data
  selectedProject.value = { ...project, team_members: project.team_members || [] }
  showDetailsModal.value = true
  
  // Fetch fresh team members data
  try {
    const teamRes = await axios.get(`http://localhost:8000/api/team/${project.id}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    // Update selectedProject with fresh team data
    selectedProject.value = { ...project, team_members: teamRes.data }
  } catch (e) {
    console.error('Failed to fetch team members:', e)
  }
}

const openTeamPanel = async (project) => {
  // Ensure details modal is fully closed before opening team modal
  showDetailsModal.value = false
  
  // Fetch fresh team members from database
  try {
    const teamRes = await axios.get(`http://localhost:8000/api/team/${project.id}`, {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    teamProject.value = { ...project, team_members: teamRes.data }
  } catch (e) {
    console.error('Failed to fetch team members:', e)
    teamProject.value = { ...project, team_members: project.team_members || [] }
  }
  
  selectedUsers.value = []
  memberSearch.value = ''
  showTeamModal.value = true
}

const openTeamPanelFromDetails = () => {
  showDetailsModal.value = false
  openTeamPanel(selectedProject.value)
}

const toggleUser = (user) => {
  const idx = selectedUsers.value.findIndex(u => u.id === user.id)
  if (idx >= 0) {
    selectedUsers.value.splice(idx, 1)
  } else {
    selectedUsers.value.push(user)
  }
}

const clearSelected = () => { selectedUsers.value = [] }

const submitTeam = async () => {
  if (!selectedUsers.value.length) return
  isSubmitting.value = true
  try {
    await axios.post(
      `http://localhost:8000/api/team/${teamProject.value.id}/assign`,
      { user_ids: selectedUsers.value.map(u => u.id) },
      { headers: { Authorization: `Bearer ${getToken()}` } }
    )
    success('Team assigned successfully')
    showTeamModal.value = false
    // Refresh
    fetchProjects()
  } catch (e) {
    console.error('Failed to assign team:', e)
    if (e.response && e.response.data && e.response.data.detail) {
      error(e.response.data.detail)
    } else {
      error('Failed to assign team')
    }
  } finally {
    isSubmitting.value = false
  }
}

// Actions for Invitation Received Tab
const respondToInvite = async (project, accept) => {
  // Find the team member record for the current user in this project
  const member = project.team_members.find(m => m.user_id === currentUserId.value)
  if (!member) return

  if (!accept) {
    declineItem.value = member
    declineReason.value = ''
    declineError.value = false
    showDeclineModal.value = true
    return
  }

  try {
    await axios.post(
      `http://localhost:8000/api/team/${member.id}/respond`,
      { accept: true },
      { headers: { Authorization: `Bearer ${getToken()}` } }
    )
    success('Invitation accepted successfully')
    fetchProjects() // Refresh list
  } catch (e) {
    console.error('Failed to accept:', e)
    error('Failed to accept invitation')
  }
}

const confirmDecline = async () => {
  if (!declineReason.value.trim()) {
    declineError.value = true
    return
  }
  
  declining.value = true
  try {
    await axios.post(
      `http://localhost:8000/api/team/${declineItem.value.id}/respond`,
      { accept: false, reason: declineReason.value },
      { headers: { Authorization: `Bearer ${getToken()}` } }
    )
    success('Invitation declined')
    showDeclineModal.value = false
    fetchProjects() // Refresh list
  } catch (e) {
    console.error('Failed to decline:', e)
    error('Failed to decline invitation')
  } finally {
    declining.value = false
    declineItem.value = null
  }
}

const cancelDecline = () => {
  showDeclineModal.value = false
  declineItem.value = null
}

// Remove Team Member Dialog Functions
const openRemoveDialog = (member) => {
  // Prevent removal of project owner
  if (member.role === 'Owner') {
    error('Cannot remove the project owner')
    return
  }
  memberToRemove.value = member
  removeReason.value = ''
  reasonError.value = false
  showRemoveDialog.value = true
}

const cancelRemove = () => {
  showRemoveDialog.value = false
  memberToRemove.value = null
  removeReason.value = ''
  reasonError.value = false
}



// Override Dialog State & Functions
const showOverrideDialog = ref(false)
const memberToOverride = ref(null)
const overridingMember = ref(null)
const overrideReason = ref('')

const openOverrideDialog = (member) => {
  memberToOverride.value = member
  overrideReason.value = ''
  showOverrideDialog.value = true
}

const cancelOverride = () => {
  showOverrideDialog.value = false
  memberToOverride.value = null
  overrideReason.value = ''
}

const confirmOverride = async () => {
  if (!memberToOverride.value) return
  overridingMember.value = memberToOverride.value.id
  
  try {
    await axios.post(
      `http://localhost:8000/api/team/${memberToOverride.value.id}/override`,
      {},
      { 
        headers: { Authorization: `Bearer ${getToken()}` },
        params: { reason: overrideReason.value.trim() }
      }
    )
    success('Member forced added to team')
    showOverrideDialog.value = false
    memberToOverride.value = null
    overrideReason.value = ''
    
    // Refresh team data
    if (teamProject.value) {
      const teamRes = await axios.get(`http://localhost:8000/api/team/${teamProject.value.id}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      teamProject.value = { ...teamProject.value, team_members: teamRes.data }
    }
    await fetchProjects()
  } catch (e) {
    error(e.response?.data?.detail || 'Failed to override')
  } finally {
    overridingMember.value = null
  }
}

const confirmRemove = async () => {
  // Validate reason is not empty
  if (!removeReason.value.trim()) {
    reasonError.value = true
    return
  }
  reasonError.value = false
  
  if (!memberToRemove.value) return
  removingMember.value = memberToRemove.value.id
  
  try {
    await axios.delete(
      `http://localhost:8000/api/team/${memberToRemove.value.id}/remove`,
      { 
        headers: { Authorization: `Bearer ${getToken()}` },
        params: { reason: removeReason.value.trim() }
      }
    )
    success('Team member removed successfully')
    showRemoveDialog.value = false
    memberToRemove.value = null
    removeReason.value = ''
    reasonError.value = false
    
    // Refresh team data for current project
    if (teamProject.value) {
      const teamRes = await axios.get(`http://localhost:8000/api/team/${teamProject.value.id}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      teamProject.value = { ...teamProject.value, team_members: teamRes.data }
    }
    await fetchProjects()
  } catch (e) {
    error(e.response?.data?.detail || 'Failed to remove team member')
  } finally {
    removingMember.value = null
  }
}

// Data Fetching
const fetchCurrentUser = async () => {
  if (isAdmin.value) return 
  try {
    const res = await axios.get('http://localhost:8000/api/auth/me', {
      headers: { Authorization: `Bearer ${getToken()}` }
    })
    currentUserId.value = res.data.id
  } catch (e) {
    console.error('Failed to fetch current user:', e)
  }
}

// Polling for Real-time Updates
const pollingInterval = ref(null)

const startPolling = () => {
  stopPolling() // Ensure only one interval runs
  // Poll every 30 seconds for updates (reduced frequency to improve performance)
  pollingInterval.value = setInterval(() => {
    // Only fetch if tab is visible AND no admin filters are active
    // This prevents polling from overwriting filtered results
    if (!document.hidden && !(isAdmin.value && hasActiveFilters.value)) {
      fetchProjects(true) // Silent background refresh
    }
  }, 30000) // Increased to 30 seconds to reduce load
}

const stopPolling = () => {
  if (pollingInterval.value) {
    clearInterval(pollingInterval.value)
    pollingInterval.value = null
  }
}

onMounted(() => {
  fetchCurrentUser()
  fetchProjects()
  fetchUsers()
  startPolling()
})

onUnmounted(() => {
  stopPolling()
})
</script>

<style scoped>
.assign-team-page {
  padding: 32px 40px;
  max-width: 1400px;
  margin: 0 auto;
}

/* Header */
.page-header {
  display: flex;
  justify-content: space-between; /* Search on right */
  align-items: center;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  width: 48px; /** Reduced size */
  height: 48px;
  background: rgba(255, 255, 255, 0.03); /** Neutral bg */
  border: 1px solid rgba(255, 255, 255, 0.06); /** Neutral border */
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #e5e5e5; /** Standard text color */
}

.header-text h1 {
  font-size: 28px;
  font-weight: 700;
  color: #f5f5f7;
  letter-spacing: -0.02em;
  margin-bottom: 4px;
}

.header-text p {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
}

/* Stats Dashboard */
.stats-dashboard {
  display: grid;
  grid-template-columns: repeat(4, 1fr); /* 4 Columns */
  gap: 20px; /* Reduced gap */
  margin-bottom: 40px;
}

.currency-symbol {
  font-family: -apple-system, BlinkMacSystemFont, sans-serif;
  font-weight: 500;
}

/* Search Bar */
.search-bar {
  position: relative;
  width: 200px; /* Very small width */
}

.search-bar input {
  width: 100%;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 8px 12px 8px 36px;
  font-size: 13px;
  color: #fff;
  transition: all 0.2s ease;
}

.search-bar input:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.2);
}

.search-bar input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.search-bar svg {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.4);
}

/* Filter Tabs (User Panel) */
.filter-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  padding: 0 4px;
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-tab:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.8);
}

.filter-tab.active {
  background: rgba(249, 115, 22, 0.1);
  border-color: rgba(249, 115, 22, 0.3);
  color: #f97316;
}

.filter-tab.active:hover {
  background: rgba(249, 115, 22, 0.15);
}

/* Declined filter tab - purple theme */
.filter-tab.received.active {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  border-color: rgba(16, 185, 129, 0.3);
}

.admin-filters {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.filter-date {
  width: 140px;
}

.filter-status {
  width: 160px;
}

.clear-filters-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 36px;
  padding: 0 12px;
  border-radius: 6px;
  border: 1px solid #3a3a3c;
  background: transparent;
  color: #8e8e93;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.clear-filters-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: #f5f5f5;
  border-color: #52525b;
}
/* Declined filter tab - purple theme */
.filter-tab.declined.active {
  background: rgba(168, 85, 247, 0.1);
  border-color: rgba(168, 85, 247, 0.3);
  color: #a855f7;
}

.filter-tab.declined.active:hover {
  background: rgba(168, 85, 247, 0.15);
}

/* Received filter tab - blue theme */
.filter-tab.received.active {
  background: rgba(59, 130, 246, 0.1);
  border-color: rgba(59, 130, 246, 0.3);
  color: #3b82f6;
}

.filter-tab.received.active:hover {
  background: rgba(59, 130, 246, 0.15);
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.btn-icon-action {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s ease;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.6);
}

.btn-icon-action:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}

.btn-icon-action.accept:hover {
  background: rgba(16, 185, 129, 0.15);
  border-color: rgba(16, 185, 129, 0.3);
  color: #10b981;
}

.btn-icon-action.decline:hover {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

/* Table Cell Content Animations */
.cell-project, .cell-focus, .cell-timeline, .cell-budget, .cell-team, .cell-owner {
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), opacity 0.3s ease;
}

/* On Row Hover - Subtle Lift/Shift */
:deep(.table-row:hover) .cell-project { transform: translateX(6px); }
:deep(.table-row:hover) .cell-focus { transform: translateX(4px); opacity: 1; }
:deep(.table-row:hover) .cell-timeline { transform: translateX(2px); }
:deep(.table-row:hover) .cell-budget { transform: scale(1.05); transform-origin: left center; }
:deep(.table-row:hover) .cell-owner { transform: translateX(-4px); }

.cell-focus {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.focus-org {
  font-size: 13px;
  color: #e5e5e7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  max-width: 100%;
}

.focus-type {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
}

.cell-project {
  display: flex;
  align-items: center;
  gap: 14px;
}

.project-indicator {
  width: 3px;
  height: 24px;
  background: #f97316; /* Orange as requested */
  border-radius: 2px;
}

.project-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.project-name {
  font-size: 14px;
  font-weight: 600;
  color: #f5f5f7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.project-code {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  font-family: monospace;
}

.cell-budget {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.currency {
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
}

.amount {
  font-size: 14px;
  font-weight: 600;
  color: #10b981;
}

.cell-team {
  display: flex;
  align-items: center;
}

.cell-calendar {
  color: rgba(255, 255, 255, 0.5);
  display: flex;
  align-items: center;
}

.timeline-pill {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 8px 12px;
  border-radius: 12px;
  font-size: 12px;
  color: #f5f5f7;
  white-space: nowrap;
  width: fit-content;
}

.icon-muted {
  color: rgba(255, 255, 255, 0.4);
}

.avatar-stack {
  display: flex;
}

.stack-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  color: white;
  border: 2px solid #141417;
  margin-left: -8px;
}

.stack-avatar:first-child {
  margin-left: 0;
}

.avatar-more {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.7);
  margin-left: -8px;
  border: 2px solid #141417;
}

.no-team {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.3);
}

.cell-owner {
  display: flex;
  align-items: center;
  gap: 10px;
}

.owner-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  color: white;
}

.btn-manage {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-manage:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

/* Details Modal Sections */
.details-grid {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.detail-section {
  padding-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.detail-section:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.section-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.count-badge {
  background: rgba(59, 130, 246, 0.2);
  color: #60a5fa;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 10px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
}

.detail-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

.detail-value {
  font-size: 13px;
  font-weight: 500;
  color: #f5f5f7;
}

.detail-value.mono {
  font-family: monospace;
  color: #a5b4fc;
}

.description-text {
  font-size: 13px;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.7);
}

.budget-display {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 16px;
}

.budget-currency {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
}

.budget-amount {
  font-size: 32px;
  font-weight: 700;
  color: #10b981;
}

.timeline-display {
  display: flex;
  align-items: center;
  gap: 16px;
}

.timeline-item {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #60a5fa;
}

.timeline-label {
  display: block;
  font-size: 10px;
  color: rgba(255, 255, 255, 0.4);
  text-transform: uppercase;
}

.timeline-date {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: #f5f5f7;
}

.timeline-arrow {
  color: rgba(255, 255, 255, 0.3);
}

.team-list-detail {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.team-member-detail {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 10px;
}

.member-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: white;
}

.member-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.member-name {
  font-size: 13px;
  font-weight: 600;
  color: #f5f5f7;
}

.member-role {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

/* Modal Actions Right Aligned */
.modal-actions-right {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  width: 100%;
}

.btn-primary, .btn-secondary, .btn-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  height: 40px;
}

.btn-primary {
  background: #f97316; /* Orange */
  color: white;
  border: none;
}

.btn-primary:hover:not(:disabled) {
  background: #ea580c;
  transform: translateY(-1px);
}

.btn-primary:disabled {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.3);
  cursor: not-allowed;
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
}

.btn-text {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
}

.btn-text:hover {
  color: #fff;
}

/* Team Modal Structure */
.team-modal-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.search-section,
.users-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.4);
}

.section-label .count {
  font-weight: 500;
  color: rgba(255, 255, 255, 0.25);
}

.section-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
  margin: 4px 0;
}

/* User List Styling Fixes */
.users-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 400px;
  overflow-y: auto;
  margin-top: 16px;
  padding-right: 4px; /* Space for scrollbar */
}

.user-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.user-item:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

.user-item.selected {
  background: rgba(249, 115, 22, 0.1); /* Orange Tint */
  border-color: rgba(249, 115, 22, 0.3);
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: #fff;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 13px;
  font-weight: 600;
  color: #f5f5f7;
}

.user-email {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
}

.user-check {
  margin-left: auto;
  color: rgba(255, 255, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  transition: all 0.2s;
}

.user-item.selected .user-check {
  background: #f97316;
  color: white;
}

.team-search {
  position: relative;
  margin-bottom: 16px;
}

.team-search input {
  width: 100%;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 12px 12px 12px 40px;
  border-radius: 10px;
  color: white;
  font-size: 14px;
}

.team-search input:focus {
  outline: none;
  border-color: #f97316;
  background: rgba(0, 0, 0, 0.4);
}

.team-search svg {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(255, 255, 255, 0.4);
}

/* Remove Button */
.remove-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #ef4444;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.remove-btn:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.2);
  border-color: #ef4444;
}

.remove-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Override Button */
.override-btn {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background: rgba(245, 158, 11, 0.1); /* Amber */
  border: 1px solid rgba(245, 158, 11, 0.2);
  color: #f59e0b;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  margin-right: 8px; /* Spacing between buttons */
}

.override-btn:hover {
  background: rgba(245, 158, 11, 0.2);
  border-color: #f59e0b;
  transform: translateY(-1px);
}

/* User Role Badge */
.user-role {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  padding: 2px 6px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.05);
  color: rgba(255, 255, 255, 0.5);
}

.user-role.accepted {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

/* Remove Dialog */
.remove-dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(4px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-dialog {
  width: 400px;
  max-width: 90vw;
  background: linear-gradient(180deg, #1a1a1d 0%, #141417 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  overflow: hidden;
}

.remove-dialog-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.remove-icon {
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ef4444;
}

.remove-dialog-header h3 {
  font-size: 16px;
  font-weight: 600;
  color: #f5f5f7;
  margin: 0;
}

.remove-dialog-header p {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  margin: 2px 0 0 0;
}

.remove-dialog-body {
  padding: 20px;
}

.remove-dialog-body label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 8px;
}

.remove-dialog-body textarea {
  width: 100%;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 12px;
  font-size: 13px;
  color: #fff;
  resize: none;
  font-family: inherit;
}

.remove-dialog-body textarea:focus {
  outline: none;
  border-color: rgba(239, 68, 68, 0.5);
}

.remove-dialog-body textarea::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.remove-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(0, 0, 0, 0.2);
}

.btn-danger {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: #ef4444;
  border: none;
  border-radius: 8px;
  color: white;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-danger:hover:not(:disabled) {
  background: #dc2626;
}

.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Assigned Team Section */
.assigned-section {
  margin-top: 8px;
}

.assigned-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.member-count {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
  background: rgba(255, 255, 255, 0.05);
  padding: 4px 10px;
  border-radius: 12px;
}

.assigned-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.assigned-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px;
  transition: all 0.2s ease;
}

.assigned-item:hover {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.1);
}

.assigned-item.is-owner {
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.05) 0%, rgba(0, 0, 0, 0) 100%);
  border-color: rgba(249, 115, 22, 0.15);
}

.assigned-avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: white;
  flex-shrink: 0;
}

.assigned-info {
  flex: 1;
  min-width: 0;
}

.assigned-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.assigned-name {
  font-size: 13px;
  font-weight: 500;
  color: #f5f5f7;
}

.owner-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #f97316;
  background: rgba(249, 115, 22, 0.1);
  padding: 3px 8px;
  border-radius: 6px;
  border: 1px solid rgba(249, 115, 22, 0.2);
}

.assigned-status {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  text-transform: capitalize;
}

.assigned-status.accepted {
  color: #10b981;
}

/* Remove Button */
.remove-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.15);
  color: rgba(239, 68, 68, 0.7);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.remove-btn:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.15);
  border-color: rgba(239, 68, 68, 0.3);
  color: #ef4444;
}

.remove-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Confirm Dialog Overlay */
.confirm-dialog-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.confirm-dialog {
  width: 420px;
  max-width: 100%;
  background: linear-gradient(180deg, #1f1f23 0%, #18181b 100%);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 32px;
  text-align: center;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
}

.confirm-dialog-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 20px;
}

.confirm-dialog-icon.danger {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

.confirm-dialog-content {
  margin-bottom: 24px;
}

.confirm-dialog-title {
  font-size: 20px;
  font-weight: 600;
  color: #f5f5f7;
  margin: 0 0 8px 0;
}

.confirm-dialog-desc {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1.5;
  margin: 0;
}

.confirm-dialog-desc strong {
  color: #f5f5f7;
}

.confirm-dialog-input {
  text-align: left;
  margin-bottom: 24px;
}

.confirm-dialog-input label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.confirm-dialog-input .required {
  color: #ef4444;
}

.confirm-dialog-input textarea {
  width: 100%;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 14px 16px;
  font-size: 14px;
  color: #fff;
  resize: none;
  font-family: inherit;
  line-height: 1.5;
  transition: all 0.2s ease;
}

.confirm-dialog-input textarea:focus {
  outline: none;
  border-color: rgba(249, 115, 22, 0.5);
  background: rgba(0, 0, 0, 0.4);
}

.confirm-dialog-input textarea::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

.confirm-dialog-input textarea.has-error {
  border-color: #ef4444;
}

.input-error {
  font-size: 12px;
  color: #ef4444;
  margin-top: 6px;
  display: block;
}

.confirm-dialog-actions {
  display: flex;
  gap: 12px;
}

.btn-cancel {
  flex: 1;
  padding: 14px 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
  color: #fff;
}

.btn-confirm {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 14px 20px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-confirm.danger {
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: white;
}

.btn-confirm.danger:hover:not(:disabled) {
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  transform: translateY(-1px);
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* Reason Input for ConfirmationModal Slot */
.reason-input-group {
  width: 100%;
}

.reason-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: #a1a1aa;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.reason-label .required {
  color: #ef4444;
}

.reason-textarea {
  width: 100%;
  background: #27272a;
  border: 1px solid #3f3f46;
  border-radius: 8px;
  padding: 12px;
  font-size: 14px;
  color: #fff;
  resize: none;
  font-family: inherit;
  line-height: 1.5;
  transition: all 0.2s ease;
}

.reason-textarea:focus {
  outline: none;
  border-color: #f97316;
}

.reason-textarea::placeholder {
  color: #71717a;
}

.reason-textarea.has-error {
  border-color: #ef4444;
}

.reason-error {
  font-size: 12px;
  color: #ef4444;
  margin-top: 6px;
  display: block;
}
/* Timeline Column */
.cell-timeline {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.timeline-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #e4e4e7;
}

.timeline-row.duration {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.4);
}

.timeline-row .icon-muted {
  color: rgba(255, 255, 255, 0.3);
}
</style>
