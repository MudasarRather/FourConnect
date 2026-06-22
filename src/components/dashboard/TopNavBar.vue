<template>
  <header class="top-nav">
    <div class="nav-content">
      <!-- Left: Brand & Menu -->
      <div class="nav-left">
        <router-link :to="isSuperuser && $route.path.startsWith('/admin') ? '/admin' : '/dashboard'" class="brand-link">
          <Logo class="brand-icon" />
          <span class="brand-name">Fourconnect</span>
        </router-link>

        <nav class="main-menu">
          <div 
            v-for="(item, index) in visibleMenuItems" 
            :key="index"
            class="menu-item-wrapper"
            @mouseenter="handleMenuEnter(index)"
            @mouseleave="handleMenuLeave"
          >
             <button 
              v-if="item.children"
              class="menu-btn" 
              :class="{ active: activeMenuIndex === index || isMenuActive(item) }"
            >
              <span class="btn-label">{{ item.label }}</span>
              <ChevronDown :size="12" class="chevron" />
            </button>
            <router-link 
              v-else
              :to="item.to"
              class="menu-btn link-btn"
              active-class="active"
            >
              <span class="btn-label">{{ item.label }}</span>
            </router-link>

            <!-- Dropdown -->
            <transition name="dropdown-fade">
              <div 
                v-if="item.children && activeMenuIndex === index" 
                class="dropdown-menu"
              >
                <div class="dropdown-content">
                  <div class="dropdown-column" v-for="(col, cIndex) in item.columns" :key="cIndex">
                    <div class="dropdown-group" v-for="(group, gIndex) in col" :key="gIndex">
                      <div v-if="group.title" class="group-title">{{ group.title }}</div>
                      <router-link 
                        v-for="sub in group.items" 
                        :key="sub.label" 
                        :to="sub.to || '#'" 
                        class="dropdown-link"
                        :class="{ 'danger': sub.danger }"
                        @click="handleMenuLeave"
                      >
                        <component :is="sub.icon" v-if="sub.icon" :size="14" class="link-icon" />
                        {{ sub.label }}
                      </router-link>
                    </div>
                  </div>
                </div>
              </div>
            </transition>
          </div>
        </nav>
      </div>

      <!-- Right: User Profile -->
      <div class="nav-right">
        <ThemeToggle />
        <!-- Notification Bell -->
        <NotificationBell />
        
        <div class="user-menu-wrapper" @mouseenter="userMenuOpen = true" @mouseleave="userMenuOpen = false">
           <button class="profile-btn">
            <div class="avatar" v-if="!user.avatar_url">{{ user.initials }}</div>
            <img v-else :src="user.avatar_url" class="avatar-img" alt="User" />
            <span class="user-name">{{ user.full_name }}</span>
          </button>
           <transition name="dropdown-fade">
              <div v-if="userMenuOpen" class="dropdown-menu user-dropdown">
                <router-link :to="$route.path.startsWith('/admin') ? '/admin/settings/profile' : '/dashboard/settings'" class="dropdown-link">
                  <User :size="14" class="link-icon" />
                  Settings
                </router-link>
                <button class="dropdown-link danger" @click="handleLogout">
                  <LogOut :size="14" class="link-icon" />
                  Logout
                </button>
              </div>
           </transition>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'
import { useToast } from '../../composables/useToast'
import Logo from '../icons/Logo.vue'
import NotificationBell from '../ui/NotificationBell.vue'
import ThemeToggle from '../common/ThemeToggle.vue'
import { API } from '@/utils/api'
import {
  ChevronDown, LayoutDashboard, User, AlertCircle, History, Bookmark,
  Briefcase, Plus, Edit, Users, BarChart3, FileText, StickyNote, Archive, RotateCcw,
  CheckSquare, List, UserPlus, XCircle, Info, GitBranch, Copy, UsersRound,
  Wallet, Send, Clock, CheckCircle, Settings, Paperclip,
  Calculator, PieChart, TrendingUp, Coins, BookOpen, Target, Lock,
  Upload, Eye, Grid, Link, ShieldCheck, Download, Calendar,
  Building, Globe, CreditCard, Zap, Bell, UserCheck, Shield,
  ShieldAlert, LogOut, Banknote, KeyRound, Handshake, FilePieChart, FileBox,
  DollarSign,
  UserCog, Fingerprint, CalendarOff, CalendarClock, Receipt,
  BadgeCheck, GraduationCap, Boxes, Plane, Scale, LineChart, IdCard,
  LogIn, ClipboardList, Award, FileSignature, HeartPulse
} from 'lucide-vue-next'

const router = useRouter()
const { info } = useToast()
const activeMenuIndex = ref(null)
const userMenuOpen = ref(false)

// Hydrate from localStorage immediately so HR menu renders on first paint
// (no flash, no required refresh). The /me fetch refreshes the cache.
const _isAdminPath = () => router.currentRoute.value.path.startsWith('/admin')
const _readCachedUser = () => {
  try {
    const key = _isAdminPath() ? 'admin_user' : 'user'
    const raw = localStorage.getItem(key)
    if (!raw) return null
    return JSON.parse(raw)
  } catch { return null }
}
const _cached = _readCachedUser()

const isSuperuser = ref(
  _cached?.is_superuser === true || (_isAdminPath() && !!localStorage.getItem('admin_token'))
)

const user = ref({
  full_name: _cached?.full_name || 'User',
  initials: ((_cached?.full_name || 'U').split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('') || 'U').toUpperCase(),
  avatar_url: _cached?.avatar_url || null,
})

const fetchUser = async () => {
  try {
    const isAdmin = _isAdminPath()
    const token = isAdmin ? localStorage.getItem('admin_token') : localStorage.getItem('user_token')

    if (!token) {
      // No token at all — clear stale state
      isSuperuser.value = false
      return
    }

    const response = await axios.get(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const data = response.data
    user.value = {
      full_name: data.full_name || 'User',
      initials: (data.full_name || 'U').split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'U',
      avatar_url: data.avatar_url || null
    }
    isSuperuser.value = data.is_superuser === true
    // Refresh the localStorage cache so next page-load hydrates instantly
    try {
      const cacheKey = isAdmin ? 'admin_user' : 'user'
      localStorage.setItem(cacheKey, JSON.stringify({
        full_name: data.full_name,
        avatar_url: data.avatar_url,
        is_superuser: data.is_superuser,
      }))
    } catch {}
  } catch (err) {
    // Network/auth failure: keep optimistic hydration if path implies admin + admin_token exists,
    // otherwise fall back to non-admin.
    if (!_isAdminPath() || !localStorage.getItem('admin_token')) {
      isSuperuser.value = false
    }
    console.warn('Failed to fetch user for nav')
  }
}

onMounted(() => {
  fetchUser()
})

const handleLogout = () => {
  const isAdmin = router.currentRoute.value.path.startsWith('/admin')
  
  if (isAdmin) {
      localStorage.removeItem('admin_token')
      // localStorage.removeItem('is_superuser') // Keep for other session potentially? No, safe to remove if checking explicitly.
      // But wait, if we are logged in as User in another tab, removing global flags might affect them if they shared them.
      // We moved to separate keys, so 'is_superuser' is the only shared flag remaining?
      // Actually Admin Login sets 'is_superuser' to 'true'. User login sets it to 'false'.
      // This is a conflict if using shared storage. 
      // We should probably rely on the TOKEN to determine permissions, not the flag.
      // For now, let's just remove the token.
      info('Admin logged out')
      router.push('/authentication/admin/login')
  } else {
      localStorage.removeItem('user_token')
      localStorage.removeItem('user_is_activated')
      info('Logged out successfully')
      router.push('/authentication/user/login')
  }
}

// Check if current route matches any child links in a menu item
const isMenuActive = (item) => {
  if (!item.columns) return false
  const currentPath = router.currentRoute.value.path
  
  for (const column of item.columns) {
    for (const group of column) {
      for (const subItem of group.items) {
        if (subItem.to && currentPath.startsWith(subItem.to)) {
          return true
        }
      }
    }
  }
  return false
}

// Menu hover with improved debounce for fast cursor movements
let menuLeaveTimeout = null
let menuEnterTimeout = null
let pendingMenuIndex = null

const handleMenuEnter = (index) => {
  // Clear any pending leave
  if (menuLeaveTimeout) {
    clearTimeout(menuLeaveTimeout)
    menuLeaveTimeout = null
  }
  // Clear any pending enter
  if (menuEnterTimeout) {
    clearTimeout(menuEnterTimeout)
  }
  // Immediately switch if already open, otherwise add tiny delay
  if (activeMenuIndex.value !== null) {
    activeMenuIndex.value = index
  } else {
    pendingMenuIndex = index
    menuEnterTimeout = setTimeout(() => {
      activeMenuIndex.value = pendingMenuIndex
    }, 50)
  }
}

const handleMenuLeave = () => {
  // Clear any pending enter
  if (menuEnterTimeout) {
    clearTimeout(menuEnterTimeout)
    menuEnterTimeout = null
  }
  // Delay closing to allow moving between items
  menuLeaveTimeout = setTimeout(() => {
    activeMenuIndex.value = null
    pendingMenuIndex = null
  }, 350) // Increased delay for stability
}

// Computed base path
const basePath = computed(() => {
  return router.currentRoute.value.path.startsWith('/admin') ? '/admin' : '/user'
})

const isAdminContext = computed(() => {
  return router.currentRoute.value.path.startsWith('/admin')
})

// Dynamic Menu Items
const visibleMenuItems = computed(() => {
  const base = basePath.value
  
  // Helper to replace path
  const adjustPath = (path) => {
    if (!path) return '#'
    // If it's the admin menu block, leave as is (it's already hardcoded to /dashboard/admin which was WRONG, wait)
    // Actually, Admin Administration menu points to /dashboard/admin/users. It should be /admin/users.
    
    // Logic: 
    // If we are in Admin mode, replaces '/dashboard' with '/admin'.
    // If we are in User mode, keeps '/dashboard'.
    // Exception: 'Administration' menu is only for admin, so it should always verify.
    
    return path.replace('/dashboard', base)
  }

  // Deep copy and adjust
  return rawMenuItems.map(item => {
    // Check role visibility
    if (item.superadminOnly && !isSuperuser.value) return null
    if (item.adminOnlyMenu && !isAdminContext.value) return null
    if (item.userOnlyMenu && isAdminContext.value) return null
    if (item.label === 'Administration' && !isSuperuser.value) return null // Double check

    // Adjust item to
    const newItem = { ...item }
    if (newItem.to) newItem.to = adjustPath(newItem.to)

    // Adjust columns/children
    if (newItem.columns) {
      newItem.columns = newItem.columns.map(col => {
         return col.map(group => {
            return {
               ...group,
               items: group.items
                 .filter(sub => {
                   // Hide 'Admin Projects' from user context
                   if (sub.label === 'Admin Projects' && !isAdminContext.value) return false
                   // Hide 'Project Settings' from user context
                   if (sub.label === 'Project Settings' && !isAdminContext.value) return false
                   return true
                 })
                 .map(sub => ({
                   ...sub,
                   // For user context: rename 'User Projects' to 'All Projects'
                   label: (!isAdminContext.value && sub.label === 'User Projects') ? 'All Projects' : sub.label,
                   to: adjustPath(sub.to)
                 }))
            }
         })
      })
    }
    return newItem
  }).filter(Boolean)
})

// Menu Data Architecture (renamed to rawMenuItems)
const rawMenuItems = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    to: '/dashboard',
    children: false
  },
  {
    label: 'Projects',
    icon: Briefcase,
    children: true,
    columns: [[
      { title: 'Manage', items: [
        { label: 'User Projects', to: '/dashboard/projects/userprojects', icon: Briefcase },
        { label: 'Admin Projects', to: '/dashboard/projects/adminprojects', icon: Briefcase },
        { label: 'Create Project', to: '/dashboard/projects/createproject', icon: Plus },
        { label: 'Assign Team', to: '/dashboard/projects/assignteam', icon: UsersRound }
      ]},
      { title: 'Views', items: [
        { label: 'Project Details', to: '/dashboard/projects/details', icon: Info },

        { label: 'Project Settings', to: '/dashboard/projects/settings', icon: Settings }
      ]}
    ], [
      { title: 'Financials & Docs', items: [
         { label: 'Project Financials', to: '/dashboard/projects/financials', icon: BarChart3 },

         { label: 'Project Notes', to: '/dashboard/projects/notes', icon: StickyNote }
      ]},
      { title: 'Actions', items: [
        { label: 'Archive Project', to: '/dashboard/projects/archive', icon: Archive },
        { label: 'Projects Completed', to: '/dashboard/projects/completed', icon: RotateCcw }
      ]}
    ]]
  },
  {
    label: 'Tasks',
    icon: CheckSquare,
    children: true,
    columns: [[
      { title: 'Task Lists', items: [
        { label: 'All Tasks', to: '/dashboard/tasks', icon: List }
      ]},
      { title: 'Actions', items: [
         { label: 'Create Task', to: '/dashboard/tasks/new', icon: Plus },
         { label: 'Assign / Reassign', to: '/dashboard/tasks/assign', icon: UserPlus }
      ]}
    ], [
      { title: 'Archive', items: [
         { label: 'Archive Task', to: '/dashboard/tasks/archive', icon: Archive }
      ]}
    ]]
  },
  {
    label: 'Expenses',
    icon: Wallet,
    children: true,
    columns: [[
       { title: 'Management', items: [
         { label: 'All Expenses', to: '/dashboard/expenses/all', icon: Wallet },
         { label: 'New Expense', to: '/dashboard/expenses/new', icon: Plus },
         { label: 'Draft Expenses', to: '/dashboard/expenses/draftexpenses', icon: Edit },
         { label: 'Rejected Expenses', to: '/dashboard/expenses/rejectedexpenses', icon: Info }
       ]}
    ], [
       { title: '', items: [
         { label: 'Reverse / Void', to: '/dashboard/expenses/void', icon: RotateCcw, danger: true },
         { label: 'Archive', to: '/dashboard/expenses/archive', icon: Archive }
       ]}
    ]]
  },
  {
    label: 'Documents',
    icon: FileText,
    children: true,
    columns: [[
      { title: 'Contracts & Agreements', items: [
         { label: 'All Documents', to: '/dashboard/documents', icon: FileText },
         { label: 'Generate SLA Agreement', to: '/dashboard/documents/sla', icon: Handshake },
         { label: 'Generate Project Handover', to: '/dashboard/documents/handover', icon: FileBox },
         { label: 'Generate DPR', to: '/dashboard/documents/dpr', icon: FilePieChart }
      ]}
    ], [
       { title: 'Records & Compliance', items: [
         { label: 'Document Drive', to: '/dashboard/documents/document-drive', icon: ShieldCheck },
         { label: 'Document Archive', to: '/dashboard/documents/archive', icon: Archive }
       ]}
    ]]
  },
  {
    label: 'HR',
    icon: UserCog,
    children: true,
    adminOnlyMenu: true, // Only render in admin panel context
    superadminOnly: true, // Belt-and-suspenders: only superadmins
    columns: [[
      { title: 'Overview', items: [
         { label: 'HR Dashboard', to: '/dashboard/hr/dashboard', icon: LayoutDashboard },
         { label: 'Reports & Analytics', to: '/dashboard/hr/reports', icon: LineChart }
      ]},
      { title: 'People', items: [
         { label: 'Employees', to: '/dashboard/hr/employees', icon: Users },
         { label: 'Employee Documents', to: '/dashboard/hr/employee-documents', icon: FileSignature }
      ]},
      { title: 'Hiring', items: [
         { label: 'Recruitment', to: '/dashboard/hr/recruitment', icon: UserPlus },
         { label: 'Onboarding', to: '/dashboard/hr/onboarding', icon: ClipboardList }
      ]}
    ], [
      { title: 'Time & Attendance', items: [
         { label: 'Attendance', to: '/dashboard/hr/attendance', icon: Fingerprint },
         { label: 'Leave Management', to: '/dashboard/hr/leave', icon: CalendarOff },
         { label: 'Shifts & Rosters', to: '/dashboard/hr/shifts', icon: CalendarClock }
      ]},
      { title: 'Pay & Benefits', items: [
         { label: 'Payroll', to: '/dashboard/hr/payroll', icon: Banknote },
         { label: 'Reimbursements', to: '/dashboard/hr/reimbursements', icon: Receipt }
      ]},
      { title: 'Growth', items: [
         { label: 'Training & Certifications', to: '/dashboard/hr/training', icon: GraduationCap }
      ]}
    ], [
      { title: 'Lifecycle', items: [
         { label: 'Assets Management', to: '/dashboard/hr/assets', icon: Boxes },
         { label: 'Travel Management', to: '/dashboard/hr/travel', icon: Plane },
         { label: 'Exit Management', to: '/dashboard/hr/exit', icon: LogOut }
      ]},
      { title: 'Governance', items: [
         { label: 'HR Settings', to: '/dashboard/hr/settings', icon: Settings },
         { label: 'Audit Logs', to: '/dashboard/hr/audit-logs', icon: History }
      ]}
    ]]
  },
  {
    label: 'Self Service Portal',
    icon: IdCard,
    children: true,
    userOnlyMenu: true, // Only render in user panel context (hidden in admin)
    columns: [[
      { title: 'Profile & Documents', items: [
         { label: 'My Profile', to: '/dashboard/self-service/profile', icon: User },
         { label: 'My Documents', to: '/dashboard/self-service/documents', icon: FileSignature }
      ]},
      { title: 'Time', items: [
         { label: 'My Attendance', to: '/dashboard/self-service/attendance', icon: Fingerprint },
         { label: 'My Leave', to: '/dashboard/self-service/leave', icon: CalendarOff },
         { label: 'Team Approvals', to: '/dashboard/self-service/team-approvals', icon: UserCheck }
      ]}
    ], [
      { title: 'Pay', items: [
         { label: 'My Payslips', to: '/dashboard/self-service/payslips', icon: Banknote },
         { label: 'My Tax Documents', to: '/dashboard/self-service/tax-documents', icon: Scale },
         { label: 'My Reimbursements', to: '/dashboard/self-service/reimbursements', icon: Receipt }
      ]},
      { title: 'Growth & Assets', items: [
         { label: 'My Training', to: '/dashboard/self-service/training', icon: GraduationCap },
         { label: 'My Performance Reviews', to: '/dashboard/self-service/performance', icon: Award },
         { label: 'My Assets', to: '/dashboard/self-service/assets', icon: Boxes },
         { label: 'My Travel', to: '/dashboard/self-service/travel', icon: Plane }
      ]}
    ]]
  },
  {
    label: 'Notes',
    icon: StickyNote,
    children: true,
    columns: [[
      { title: 'General', items: [
         { label: 'All Notes', to: '/dashboard/notes', icon: StickyNote },
         { label: 'Create Note', to: '/dashboard/notes/new', icon: Plus },
         { label: 'Edit Note', to: '/dashboard/notes/edit', icon: Edit },
         { label: 'View Note', to: '/dashboard/notes/view', icon: Eye }
      ]},
      { title: 'Contextual', items: [
         { label: 'Project Notes', to: '/dashboard/notes/project', icon: Briefcase },
         { label: 'Expense Notes', to: '/dashboard/notes/expense', icon: Wallet }
      ]}
    ], [
       { title: 'Privacy', items: [
         { label: 'Private Notes', to: '/dashboard/notes/private', icon: Lock },
         { label: 'Shared Notes', to: '/dashboard/notes/shared', icon: UserPlus },
         { label: 'Lock Note', to: '/dashboard/notes/lock', icon: Lock }
       ]},
       { title: '', items: [
           { label: 'Archive Note', to: '/dashboard/notes/archive', icon: Archive }
       ]}
    ]]
  },
   {
    label: 'Reports',
    icon: BarChart3,
    children: true,
    columns: [[
      { title: 'General', items: [
         { label: 'Standard Reports', to: '/dashboard/reports/standard', icon: BarChart3 },
         { label: 'Custom Reports', to: '/dashboard/reports/custom', icon: PieChart },
         { label: 'Saved Reports', to: '/dashboard/reports/saved', icon: Bookmark }
      ]},
      { title: 'Financial', items: [
         { label: 'Expense Reports', to: '/dashboard/reports/expense', icon: Wallet },
         { label: 'Project Cost', to: '/dashboard/reports/project-cost', icon: TrendingUp },
         { label: 'Budget Reports', to: '/dashboard/reports/budget', icon: Target },
         { label: 'Audit Reports', to: '/dashboard/reports/audit', icon: ShieldCheck }
      ]}
    ], [
       { title: 'Tools', items: [
         { label: 'Export Center', to: '/dashboard/reports/export', icon: Download },
         { label: 'Schedule Reports', to: '/dashboard/reports/schedule', icon: Calendar }
       ]}
    ]]
  },
  {
    label: 'Settings',
    icon: Settings,
    children: true,
    columns: [[
      { title: 'General', items: [
         { label: 'Organization Profile', to: '/dashboard/settings/profile', icon: Building },
         { label: 'Fiscal Settings', to: '/dashboard/settings/fiscal', icon: Clock },
         { label: 'Currency & Tax', to: '/dashboard/settings/tax', icon: Coins },
         { label: 'Localization', to: '/dashboard/settings/localization', icon: Globe }
      ]},
      { title: 'Configuration', items: [
         { label: 'Expense Categories', to: '/dashboard/settings/categories', icon: PieChart },
         { label: 'Task Statuses', to: '/dashboard/settings/task-statuses', icon: CheckSquare },
         { label: 'Project Types', to: '/dashboard/settings/project-types', icon: Briefcase },
         { label: 'Document Types', to: '/dashboard/settings/doc-types', icon: FileText },
         { label: 'Payment Modes', to: '/dashboard/settings/payment-modes', icon: CreditCard }
      ]}
    ], [
       { title: 'Workflow & Automation', items: [
         { label: 'Approval Workflows', to: '/dashboard/settings/workflows', icon: GitBranch },
         { label: 'Automation Rules', to: '/dashboard/settings/automation', icon: Zap },
         { label: 'Auto-Creation Rules', to: '/dashboard/settings/auto-creation', icon: Plus },
         { label: 'Notification Rules', to: '/dashboard/settings/notifications', icon: Bell }
       ]},
       { title: 'Access Control', items: [
         { label: 'Role Mapping', to: '/dashboard/settings/roles', icon: UserCheck },
         { label: 'Permission Matrix', to: '/dashboard/settings/permissions', icon: Shield }
       ]}
    ]]
  },
  {
    label: 'Administration',
    icon: Shield,
    children: true,
    superadminOnly: true,  // Only show for superadmin
    columns: [[
      { title: 'User Management', items: [
         { label: 'Generate Login Activation Code', to: '/admin/users', icon: KeyRound },
         { label: 'Employee Whitelist', to: '/admin/employees', icon: Users },
         { label: 'All Users', to: '/admin/users', icon: UserCheck },
         { label: 'Roles & Permissions', to: '/admin/roles', icon: Lock }
      ]},
      { title: 'Organization', items: [
         { label: 'Departments', to: '/admin/departments', icon: Building },
         { label: 'Cost Centers', to: '/admin/cost-centers', icon: Target }
      ]}
    ], [
       { title: 'System', items: [
         { label: 'Audit Logs', to: '/admin/audit-logs', icon: History },
         { label: 'System Logs', to: '/admin/system-logs', icon: FileText },
         { label: 'Data Retention', to: '/admin/retention', icon: ShieldAlert }
       ]}
    ]]
  }
]
</script>

<style scoped>
.top-nav {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 52px;
  background: var(--nav-bg, rgba(10, 10, 12, 0.8)); /* Deeper Noir */
  backdrop-filter: blur(24px) saturate(180%);
  -webkit-backdrop-filter: blur(24px) saturate(180%);
  border-bottom: 1px solid var(--nav-border, rgba(255, 255, 255, 0.08));
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}

[data-theme="light"] .top-nav {
  --nav-bg: rgba(255, 250, 240, 0.78);
  --nav-border: rgba(40, 25, 10, 0.10);
}

/* Noir Grain Effect */
.top-nav::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
  opacity: 0.015;
  pointer-events: none;
  z-index: -1;
}

.nav-content {
  width: 100%;
  max-width: 1600px;
  padding: 0 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 32px;
}

.brand-link {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  color: #fff;
  margin-right: 12px;
  position: relative;
}

.brand-icon { 
  width: 26px; 
  height: 26px;
  filter: drop-shadow(0 0 8px rgba(255,255,255,0.2));
  transition: transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.brand-link:hover .brand-icon {
  transform: scale(1.1) rotate(5deg);
}

.brand-name {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.03em;
  opacity: 0.9;
}

/* Right Section - Bell & Profile */
.nav-right {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 100%;
}

/* User Menu */
.user-menu-wrapper { position: relative; }
.profile-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  color: #e5e5e5;
  cursor: pointer;
  padding: 5px 12px;
  border-radius: 40px; /* Pill shape */
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.profile-btn:hover { 
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

.avatar {
  width: 22px; height: 22px;
  border-radius: 50%;
  background: linear-gradient(135deg, #3a3a3c 0%, #1c1c1e 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 700;
  border: 1px solid rgba(255,255,255,0.1);
}
.avatar-img {
  width: 22px; height: 22px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(255,255,255,0.1);
}
.user-name { font-size: 12px; font-weight: 600; opacity: 0.8; }


/* Main Menu */
.main-menu {
  display: flex;
  align-items: center;
  gap: 8px;
}

.menu-item-wrapper {
  position: relative;
  height: 52px;
  display: flex;
  align-items: center;
}

.menu-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.45);
  font-size: 12.5px;
  font-weight: 600;
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  gap: 8px;
  position: relative;
}

.menu-btn-icon {
  opacity: 0.6;
  transition: inherit;
}

.menu-btn:hover, .menu-btn.active {
  color: #fff;
  background: rgba(255, 255, 255, 0.05);
}

.menu-btn.active::after {
  content: "";
  position: absolute;
  bottom: 0px;
  left: 14px;
  right: 14px;
  height: 2px;
  background: #fff;
  border-radius: 2px 2px 0 0;
  animation: slideWidth 0.3s ease;
}

@keyframes slideWidth {
  from { left: 50%; right: 50%; }
  to { left: 14px; right: 14px; }
}

.menu-btn:hover .menu-btn-icon, .menu-btn.active .menu-btn-icon {
  opacity: 1;
  transform: scale(1.1);
}

.chevron { 
  opacity: 0.3; 
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1); 
}
.menu-btn.active .chevron { 
  transform: rotate(180deg); 
  opacity: 0.8; 
}

/* Dropdowns */
.dropdown-menu {
  position: absolute;
  top: calc(100% - 4px);
  left: 0;
  background: rgba(12, 12, 14, 0.98);
  backdrop-filter: blur(32px);
  -webkit-backdrop-filter: blur(32px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 40px 80px rgba(0, 0, 0, 0.8);
  min-width: 240px;
  max-height: 80vh;
  overflow-y: auto;
  white-space: nowrap;
  animation: noirAppear 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
}

.dropdown-menu::-webkit-scrollbar { width: 6px; }
.dropdown-menu::-webkit-scrollbar-track { background: transparent; }
.dropdown-menu::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.2); border-radius: 4px; }

@keyframes noirAppear {
  from { opacity: 0; transform: translateY(10px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

/* User dropdown specific */
.user-dropdown {
  right: 0;
  left: auto;
  border-radius: 20px;
  margin-top: 8px;
  padding: 12px;
  min-width: 180px;
}

.dropdown-content {
  display: flex;
  gap: 48px;
}

.dropdown-column {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 180px;
}

.dropdown-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.group-title {
  font-size: 11px;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.3);
  font-weight: 800;
  letter-spacing: 0.1em;
  margin-bottom: 8px;
  padding-left: 12px;
}

.dropdown-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 13.5px;
  font-weight: 500;
  text-decoration: none;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  background: transparent;
  border: none;
  width: 100%;
  text-align: left;
  cursor: pointer;
}

.dropdown-link:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  transform: translateX(4px);
}

.dropdown-link.danger { color: #ff453a; }
.dropdown-link.danger:hover { 
  background: rgba(255, 69, 58, 0.15); 
  color: #ff453a; 
}

.link-icon { 
  opacity: 0.5; 
  transition: inherit;
}
.dropdown-link:hover .link-icon { opacity: 1; }

/* Custom Animation Stagger for Links */
.dropdown-group a:nth-child(2) { animation-delay: 0.05s; }
.dropdown-group a:nth-child(3) { animation-delay: 0.1s; }
.dropdown-group a:nth-child(4) { animation-delay: 0.15s; }
.dropdown-group a:nth-child(5) { animation-delay: 0.2s; }

/* Transitions */
.dropdown-fade-enter-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.dropdown-fade-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}
.dropdown-fade-enter-from,
.dropdown-fade-leave-to {
  opacity: 0;
  transform: translateY(10px) scale(0.99);
}

/* ─── Light theme overrides ───────────────────────────────────────────────
   Cream-tinted nav chrome with warm-near-black text. Dropdowns get a
   cream surface, light borders, soft warm shadow, and warm hover overlays.
   ────────────────────────────────────────────────────────────────────── */
[data-theme="light"] .brand-link { color: var(--text-primary); }
[data-theme="light"] .brand-icon { filter: drop-shadow(0 0 8px rgba(217, 119, 6, 0.25)); }

[data-theme="light"] .profile-btn {
  background: rgba(40, 25, 10, 0.04);
  border-color: rgba(40, 25, 10, 0.10);
  color: var(--text-primary);
}
[data-theme="light"] .profile-btn:hover {
  background: rgba(40, 25, 10, 0.08);
  border-color: rgba(40, 25, 10, 0.18);
  box-shadow: 0 4px 12px rgba(40, 25, 10, 0.12);
}
[data-theme="light"] .avatar {
  background: linear-gradient(135deg, #d97706 0%, #92400e 100%);
  color: #fff8ec;
  border-color: rgba(40, 25, 10, 0.12);
}
[data-theme="light"] .avatar-img { border-color: rgba(40, 25, 10, 0.12); }

[data-theme="light"] .menu-btn { color: rgba(26, 20, 16, 0.55); }
[data-theme="light"] .menu-btn:hover,
[data-theme="light"] .menu-btn.active {
  color: var(--text-primary);
  background: rgba(40, 25, 10, 0.06);
}
[data-theme="light"] .menu-btn.active::after { background: var(--accent-gold); }

[data-theme="light"] .dropdown-menu {
  background: rgba(255, 250, 240, 0.96);
  border-color: rgba(40, 25, 10, 0.10);
  box-shadow: 0 30px 60px rgba(40, 25, 10, 0.18);
  scrollbar-color: rgba(40, 25, 10, 0.25) transparent;
}
[data-theme="light"] .dropdown-menu::-webkit-scrollbar-thumb {
  background: rgba(40, 25, 10, 0.25);
}
[data-theme="light"] .group-title { color: rgba(26, 20, 16, 0.45); }
[data-theme="light"] .dropdown-link { color: rgba(26, 20, 16, 0.72); }
[data-theme="light"] .dropdown-link:hover {
  background: rgba(217, 119, 6, 0.10);
  color: var(--text-primary);
}
[data-theme="light"] .dropdown-link.danger { color: #b91c1c; }
[data-theme="light"] .dropdown-link.danger:hover {
  background: rgba(220, 38, 38, 0.10);
  color: #991b1b;
}
</style>
